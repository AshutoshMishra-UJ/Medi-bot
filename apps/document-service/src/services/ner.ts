import axios from 'axios';
import { config } from '@medibot/config';
import type { NEREntity } from '@medibot/types';

/**
 * Calls the Python FastAPI NER service to extract medical entities from text.
 * The Python service runs on port 8000 (services/ner-service/main.py).
 */
export async function runNER(text: string): Promise<NEREntity[]> {
  try {
    const response = await axios.post<NEREntity[]>(
      `${config.services.nerUrl}/ner`,
      { text },
      { timeout: 30_000 },
    );
    return response.data;
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('NER service is not running. Start it: cd services/ner-service && uvicorn main:app --port 8000');
    }
    throw new Error(`NER service error: ${err.message}`);
  }
}
