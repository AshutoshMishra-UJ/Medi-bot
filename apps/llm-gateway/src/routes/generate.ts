import { Router, Request, Response } from 'express';
import { generateMedicalResponse }      from '../services/geminiClient';
import { generateMedicalResponseLlama } from '../services/llamaClient';
import { Content } from '@google/generative-ai';

const router = Router();

router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { history, message } = req.body as { history: Content[], message: string };

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    let result;
    const provider = process.env.LLM_PROVIDER || 'gemini';

    if (provider === 'llama') {
      console.log('[LLM Gateway] Using provider: local-llama (vLLM)');
      result = await generateMedicalResponseLlama(history || [], message);
    } else {
      console.log('[LLM Gateway] Using provider: gemini');
      result = await generateMedicalResponse(history || [], message);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
});

export default router;

