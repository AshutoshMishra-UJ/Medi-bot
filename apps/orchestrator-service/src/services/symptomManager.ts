import axios from 'axios';

const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL || 'http://localhost:3004/api';

export interface SymptomState {
  primary_symptom: string | null;
  severity: string | null;
  duration: string | null;
  location: string | null;
  associated_symptoms: string[] | null;
  [key: string]: any; // Allow dynamic fields based on matrix
}

// Clinician-Approved Diagnostic Questioning Matrix
const CLINICAL_PRIORITY_MATRIX = [
  { field: 'primary_symptom', question: "Could you please tell me what symptom is bothering you the most?" },
  { field: 'severity', question: "On a scale of 1 to 10, how severe is this symptom?" },
  { field: 'duration', question: "How long have you been experiencing this?" },
  { 
    field: 'location', 
    question: "Can you point to exactly where it is located?", 
    condition: (state: SymptomState) => !!state.primary_symptom && (state.primary_symptom.toLowerCase().includes('pain') || state.primary_symptom.toLowerCase().includes('ache')) 
  },
  { field: 'associated_symptoms', question: "Are you experiencing any other symptoms along with this (e.g. nausea, fever, dizziness)?" },
];

export async function extractSymptomState(message: string): Promise<SymptomState> {
  const defaultState: SymptomState = {
    primary_symptom: null,
    severity: null,
    duration: null,
    location: null,
    associated_symptoms: null,
  };

  try {
    const history = [
      {
        role: 'user',
        parts: [{ text: `You are a medical data extractor. Extract the symptom information from the user's message into a strict JSON object.
Required keys: "primary_symptom", "severity", "duration", "location", "associated_symptoms".
If a field is not mentioned, set its value to null. 
Do not return any markdown or extra text, only the raw JSON object.` }],
      },
      {
        role: 'model',
        parts: [{ text: '{"primary_symptom": null, "severity": null, "duration": null, "location": null, "associated_symptoms": null}' }]
      }
    ];

    const response = await axios.post(`${LLM_GATEWAY_URL}/generate`, {
      history,
      message,
    });

    let text = response.data.text.trim();
    if (text.startsWith('```json')) text = text.slice(7);
    if (text.startsWith('```')) text = text.slice(3);
    if (text.endsWith('```')) text = text.slice(0, -3);

    const parsed = JSON.parse(text);
    return { ...defaultState, ...parsed };
  } catch (error) {
    console.error('[SymptomManager] Failed to extract symptom state:', error);
    return defaultState;
  }
}

export function getNextSymptomQuestion(state: SymptomState): string | null {
  // Traverse the Priority Matrix dynamically
  for (const rule of CLINICAL_PRIORITY_MATRIX) {
    // If the field is missing, check if it meets the condition to be asked
    if (!state[rule.field]) {
      // If there is no specific condition, or the condition evaluates to true, ask it
      if (!rule.condition || rule.condition(state)) {
        return rule.question;
      }
    }
  }

  // All applicable priority fields are collected!
  return null;
}
