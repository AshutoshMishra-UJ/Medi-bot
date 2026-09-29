import OpenAI from 'openai';
import { medicalTools } from './toolDefinitions';

// vLLM exposes an OpenAI-compatible REST API — we reuse the openai npm package
// No changes needed to the Orchestrator. Only the .env LLM_PROVIDER needs to flip.
const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'http://localhost:8000/v1',
  apiKey:  process.env.OPENAI_API_KEY  || 'local-key', // vLLM accepts any non-empty string
});

const SYSTEM_PROMPT = `You are MediBot, a specialized, safe, and professional medical assistant. 
Your role is to help patients understand their health data, symptoms, and medical history.
You do NOT have direct access to patient data unless you call tools to retrieve it.
If a user asks about their medications, labs, allergies, or history, YOU MUST use the provided tools to fetch that data before answering.
Never hallucinate or guess medical data. If a tool returns no data, inform the user that the record is not available.
Maintain a compassionate but bounded tone. Do not diagnose conditions or prescribe medications.`;

// Convert Gemini-style FunctionDeclarations to OpenAI-compatible tool format
const openAiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = medicalTools.map(tool => ({
  type: 'function' as const,
  function: {
    name:        tool.name,
    description: tool.description,
    parameters:  tool.parameters as Record<string, unknown>,
  },
}));

export async function generateMedicalResponseLlama(history: any[], message: string) {
  try {
    // Convert Gemini-style history to OpenAI-style messages
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((h: any) => ({
        role:    (h.role === 'model' ? 'assistant' : h.role) as 'user' | 'assistant',
        content: h.parts?.[0]?.text ?? h.content ?? '',
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await client.chat.completions.create({
      model:       process.env.LLM_MODEL_NAME || 'medibot-llama3-medical',
      messages,
      tools:       openAiTools,
      tool_choice: 'auto',
      max_tokens:  1024,
      temperature: 0.2, // Low temperature = more deterministic, safer medical responses
    });

    const choice    = response.choices[0];
    const toolCalls = choice.message.tool_calls ?? [];

    // Convert back to the Orchestrator's expected format — identical to Gemini output shape
    const functionCalls = toolCalls.map(tc => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments),
    }));

    return {
      text:          choice.message.content ?? '',
      functionCalls,
    };
  } catch (error: any) {
    console.error('[LlamaClient] Error generating response:', error.message);
    throw error;
  }
}
