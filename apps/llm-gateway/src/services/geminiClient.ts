import { GoogleGenerativeAI, Content, Tool } from '@google/generative-ai';
import { medicalTools } from './toolDefinitions';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '../../.env');
console.log('[LLM-Gateway] Loading env from:', envPath);
dotenv.config({ path: envPath });

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the environment variables. Please add it to .env and restart.');
  }
  return new GoogleGenerativeAI(apiKey);
};

export const getGeminiClient = () => getGenAI().getGenerativeModel({
  model: 'gemini-3.5-flash',
  tools: [
    {
      functionDeclarations: medicalTools,
    },
  ],
  systemInstruction: `You are MediBot, a specialized, safe, and professional medical assistant. 
Your role is to help patients understand their health data, symptoms, and medical history.
You do NOT have direct access to patient data unless you call tools to retrieve it.
If a user asks about their medications, labs, allergies, or history, YOU MUST use the provided tools to fetch that data before answering.
Never hallucinate or guess medical data. If a tool returns no data, inform the user that the record is not available.
Maintain a compassionate but bounded tone. Do not diagnose conditions or prescribe medications.`,
});

export async function generateMedicalResponse(history: Content[], message: string) {
  try {
    const client = getGeminiClient();
    const chat = client.startChat({
      history,
    });

    const result = await chat.sendMessage(message);
    const response = result.response;
    
    // Check if the model wants to call a function
    const functionCalls = response.functionCalls();
    
    return {
      text: response.text(),
      functionCalls: functionCalls || [],
    };
  } catch (error) {
    console.error('Error in Gemini generation:', error);
    throw error;
  }
}
