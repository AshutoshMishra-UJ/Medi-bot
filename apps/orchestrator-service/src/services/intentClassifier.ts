import axios from 'axios';

const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL || 'http://localhost:3004/api';

export type Intent = 'factual_record_query' | 'symptom_report' | 'general_health_question' | 'out_of_scope';

export async function classifyIntent(message: string): Promise<Intent> {
  try {
    const history = [
      {
        role: 'user',
        parts: [{ text: `You are an Intent Classifier. 
Classify the following user message into exactly one of these categories:
1. factual_record_query (e.g., "What are my medications?", "When was my last lab?", "Do I have allergies?")
2. symptom_report (e.g., "I have a headache", "My stomach hurts", "I feel dizzy")
3. general_health_question (e.g., "What is diabetes?", "How much water should I drink?")
4. out_of_scope (e.g., "Write me a poem", "What is the capital of France?", "Who won the game?")

Respond with ONLY the exact category name. Do not include any other text.` }],
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will respond with only the category name.' }]
      }
    ];

    const response = await axios.post(`${LLM_GATEWAY_URL}/generate`, {
      history,
      message,
    });

    // We don't want tool calls for classification, so we ensure we just grab text
    const text = response.data.text.trim().toLowerCase();

    if (text.includes('factual_record_query')) return 'factual_record_query';
    if (text.includes('symptom_report')) return 'symptom_report';
    if (text.includes('general_health_question')) return 'general_health_question';
    
    return 'out_of_scope';
  } catch (error) {
    console.error('[IntentClassifier] Failed to classify intent, defaulting to general_health_question.', error);
    return 'general_health_question';
  }
}
