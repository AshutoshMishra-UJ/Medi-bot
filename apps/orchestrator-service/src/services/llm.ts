import OpenAI from 'openai';
import { config } from '@medibot/config';

// For local testing without a real LLM running, we can mock the response.
const USE_MOCK_LLM = process.env.USE_MOCK_LLM !== 'false';

// Initialize OpenAI SDK (which works perfectly with vLLM, Ollama, etc.)
const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY || 'mock-key',
  baseURL: process.env.LLM_BASE_URL || 'http://localhost:8000/v1',
});

// Define the tools available to the LLM
export const availableTools = [
  {
    type: 'function',
    function: {
      name: 'get_patient_profile',
      description: 'Get the basic demographics and profile of the patient.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_medical_history',
      description: 'Get the patient\'s active and past medical conditions.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_medications',
      description: 'Get the patient\'s currently active medications.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_allergies',
      description: 'Get the patient\'s allergy profile.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_labs',
      description: 'Get recent lab results with timestamps.',
      parameters: {
        type: 'object',
        properties: {
          test_name: { type: 'string', description: 'Name of the lab test' },
          limit: { type: 'number', description: 'Number of results to return' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_wearable_summary',
      description: 'Get trend summaries from wearable devices.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Metric to summarize (e.g. heart_rate)' },
          days: { type: 'number', description: 'Number of days to summarize' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_symptom_history',
      description: 'Get prior symptom encounters for the patient.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days to look back' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_relevant_documents',
      description: 'Search for matching health documents.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_medical_knowledge',
      description: 'Medical RAG retrieval for clinical knowledge.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Medical question or topic to search' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_drug_information',
      description: 'Look up authoritative drug facts and information.',
      parameters: {
        type: 'object',
        properties: {
          drug_name: { type: 'string', description: 'Name of the drug' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_drug_interactions',
      description: 'Check for interactions between multiple drugs.',
      parameters: {
        type: 'object',
        properties: {
          drugs: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of drug names to check',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_health_trends',
      description: 'Get derived health trend signals.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Health metric to track' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_clinical_guidelines',
      description: 'Get evidence-based clinical guidelines for a condition.',
      parameters: {
        type: 'object',
        properties: {
          condition: { type: 'string', description: 'Medical condition name' },
        },
      },
    },
  },
];

export async function generateChatResponse(messages: any[], tools: any[]): Promise<any> {
  if (USE_MOCK_LLM) {
    console.log('[Mock LLM] Intercepting request for mock response...');
    return mockLLMResponse(messages);
  }

  // Real LLM call
  const response = await openai.chat.completions.create({
    model: process.env.LLM_MODEL || 'mmed-llama3-8b',
    messages,
    tools: tools.length > 0 ? (tools as any) : undefined,
    tool_choice: 'auto',
    temperature: 0.1,
  });

  return response.choices[0].message;
}

/**
 * A simple mock LLM that hardcodes logic for testing the orchestrator loop.
 */
function mockLLMResponse(messages: any[]): any {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content?.toLowerCase() || '';
  const lastSystemMessage = messages[0]?.content || '';
  const hasProfileContext = lastSystemMessage.includes('"dateOfBirth"'); // Check if context was injected

  // 1. If user asks for medications, and we haven't fetched them yet, trigger the tool.
  if (lastUserMessage.includes('medication') || lastUserMessage.includes('meds')) {
    const hasMedicationContext = messages.some(m => m.role === 'tool' && m.name === 'get_current_medications');
    if (!hasMedicationContext) {
      return {
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_mock_123',
          type: 'function',
          function: { name: 'get_current_medications', arguments: '{}' }
        }]
      };
    } else {
      return {
        role: 'assistant',
        content: 'Based on your medical records, you are currently taking those medications.'
      };
    }
  }

  // 2. Default mock response
  return {
    role: 'assistant',
    content: 'I am the mock MediBot AI. I can check your profile, conditions, and medications.'
  };
}
