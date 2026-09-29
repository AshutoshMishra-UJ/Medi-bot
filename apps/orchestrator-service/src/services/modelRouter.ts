import axios from 'axios';
import { executeTool } from './toolExecutor';
import { runSafetyPreCheck } from './safetyEngine';
import { classifyIntent } from './intentClassifier';
import { extractSymptomState, getNextSymptomQuestion } from './symptomManager';
import { validateResponse } from './responseValidator';

const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL || 'http://localhost:3004/api';
const CLINICAL_RULES_URL = process.env.CLINICAL_RULES_URL || 'http://localhost:3005/api';

export async function processChatTurn(message: string, patientId: string) {
  try {
    // 1. Safety Pre-Check
    const safetyCheck = runSafetyPreCheck(message);
    if (!safetyCheck.isSafe) {
      console.log(`[ModelRouter] Safety check failed. Returning escalation response.`);
      return {
        reply: safetyCheck.response,
        toolsUsed: [],
        riskLevel: safetyCheck.riskLevel
      };
    }

    // 2. Intent Classification
    const intent = await classifyIntent(message);
    console.log(`[ModelRouter] Intent classified as: ${intent}`);

    if (intent === 'out_of_scope') {
      return {
        reply: "I am a medical AI assistant. I can only help with health-related queries, retrieving your medical records, or assessing your symptoms.",
        toolsUsed: [],
        riskLevel: 'LOW'
      };
    }

    if (intent === 'symptom_report') {
      // Route to Adaptive Questioning Loop
      console.log(`[ModelRouter] Routing to Symptom Assessment loop...`);
      const extractedState = await extractSymptomState(message);
      const nextQuestion = getNextSymptomQuestion(extractedState);
      
      if (nextQuestion) {
        return {
          reply: nextQuestion,
          toolsUsed: ['symptom_assessment'],
          riskLevel: 'LOW',
          metadata: { symptomState: extractedState }
        };
      } else {
        // We have collected all symptoms, proceed to final risk assessment
        console.log(`[ModelRouter] Symptom collection complete. Running final risk assessment...`);
        const finalRiskCheck = runSafetyPreCheck(JSON.stringify(extractedState)); // Use safety engine for final check
        
        if (!finalRiskCheck.isSafe) {
          console.log(`[ModelRouter] Final risk assessment failed. Escalating.`);
          return {
            reply: finalRiskCheck.response,
            toolsUsed: ['symptom_assessment'],
            riskLevel: finalRiskCheck.riskLevel
          };
        }
        
        message += `\n[System Note: Symptom collection complete. State: ${JSON.stringify(extractedState)}. The final clinical risk assessment is SAFE. Please provide bounded informational guidance explaining this result, and explicitly tell the user to consult a doctor. Do not provide a diagnosis.]`;
      }
    }

    // 3. Initial Prompt to LLM with the patient context enforced
    const initialHistory = [
      {
        role: 'user',
        parts: [{ text: `System Context: The current user is patient with ID: ${patientId}. Only retrieve data for this patient. Always cite your sources when referring to patient records.` }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will restrict all data retrieval to this patient and cite sources.' }],
      }
    ];

    console.log(`[ModelRouter] Sending message to LLM Gateway...`);
    const llmResponse = await axios.post(`${LLM_GATEWAY_URL}/generate`, {
      history: initialHistory,
      message: message,
    });

    const { text, functionCalls } = llmResponse.data;

    // 2. Check if LLM wants to call tools
    if (functionCalls && functionCalls.length > 0) {
      console.log(`[ModelRouter] LLM requested ${functionCalls.length} tool calls.`);
      
      const functionResponses: any[] = [];
      
      // Execute each requested tool
      for (const call of functionCalls) {
        console.log(`[ModelRouter] Executing tool: ${call.name}`);
        // Force the patientId to be the authenticated user's ID for safety
        const args = { ...call.args, patientId }; 
        const result = await executeTool(call.name, args);
        
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: result
          }
        });
      }

      // 3. Clinical Rules Validation for Medication Queries
      // If medication tools were used, validate via Clinical Rules Engine
      const medicationTools = ['get_current_medications', 'get_allergies', 'search_drug_information', 'check_drug_interactions'];
      const usedMedTools = functionCalls.filter((fc: any) => medicationTools.includes(fc.name));
      
      let rulesValidationContext = '';
      if (usedMedTools.length > 0) {
        console.log(`[ModelRouter] Medication tools detected. Validating evidence via Clinical Rules Engine...`);
        try {
          const rulesResponse = await axios.post(`${CLINICAL_RULES_URL}/validate`, {
            patientId,
            evidence: functionResponses
          });
          rulesValidationContext = `\n[Clinical Rules Engine Validation Result: ${JSON.stringify(rulesResponse.data, null, 2)}]\nNote: You MUST explain this validated result to the patient. Do not alter the safety status or calculate dosages yourself.`;
        } catch (err: any) {
          console.warn(`[ModelRouter] Clinical Rules Engine unreachable or failed. Proceeding with caution.`, err.message);
          rulesValidationContext = `\n[Clinical Rules Engine Warning: Validation service unavailable. Warn the user.]`;
        }
      }

      // 4. Send tool results back to LLM to get the final answer
      console.log(`[ModelRouter] Sending tool results back to LLM...`);
      
      // Append the original request and the function calls to history
      const followupHistory = [
        ...initialHistory,
        {
          role: 'user',
          parts: [{ text: message }]
        },
        {
          role: 'model',
          parts: [{ text: `I need to call some tools to get this information: ${functionCalls.map((fc: any) => fc.name).join(', ')}` }]
        },
        {
          role: 'user',
          parts: [{ text: `Tool Execution Results:\n${JSON.stringify(functionResponses, null, 2)}\n${rulesValidationContext}\nPlease summarize the requested information based on the data retrieved and the rules engine validation. Do not hallucinate any medical data. Include provenance and sources.` }]
        }
      ];

      const finalLlmResponse = await axios.post(`${LLM_GATEWAY_URL}/generate`, {
        history: followupHistory,
        message: "Please summarize the requested information based on the data retrieved. Do not hallucinate any medical data. Cite sources.",
      });

      const finalReply = finalLlmResponse.data.text;
      const tools = functionCalls.map((fc: any) => fc.name);
      
      // 4. Response Safety Validation
      const validation = validateResponse(finalReply, tools);
      if (!validation.isValid) {
        console.error(`[ModelRouter] Response blocked by validator: ${validation.reason}`);
        return {
          reply: "I am sorry, but I cannot provide a safe answer to that based on the current medical guidelines. Please consult a doctor.",
          toolsUsed: tools,
          riskLevel: 'LOW'
        };
      }

      return {
        reply: finalReply,
        toolsUsed: tools,
        riskLevel: 'LOW'
      };
      
    } else {
      // Direct response (no tools needed)
      console.log(`[ModelRouter] LLM responded directly.`);
      
      const finalReply = text;
      const validation = validateResponse(finalReply, []);
      if (!validation.isValid) {
        console.error(`[ModelRouter] Response blocked by validator: ${validation.reason}`);
        return {
          reply: "I am sorry, but I cannot provide a safe answer to that based on the current medical guidelines. Please consult a doctor.",
          toolsUsed: [],
          riskLevel: 'LOW'
        };
      }

      return {
        reply: finalReply,
        toolsUsed: [],
        riskLevel: 'LOW'
      };
    }

  } catch (error: any) {
    console.error('[ModelRouter] Error processing chat turn:', error.message);
    throw error;
  }
}
