import { Router, Request, Response } from 'express';
import { prisma } from '@medibot/db';
import OpenAI from 'openai';

export const ragRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

ragRouter.get('/search', async (req: Request, res: Response) => {
  const query = req.query.query as string;
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  try {
    // 1. Generate embedding for the query using OpenAI
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    const embedding = embeddingRes.data[0].embedding;

    // 2. We use Prisma `$queryRaw` to do a semantic search against the MedicalKnowledge table
    // The `<->` operator in pgvector does L2 distance
    // This requires the pgvector extension to be installed on PostgreSQL and the DB seeded.
    const results = await prisma.$queryRaw`
      SELECT content, 1 - (embedding <=> ${embedding}::vector) as similarity
      FROM "MedicalKnowledge"
      ORDER BY embedding <-> ${embedding}::vector
      LIMIT 3;
    `;

    return res.json({ results });
  } catch (error: any) {
    console.error('[RAG Engine] Search error:', error.message);
    
    // Fallback if table doesn't exist or pgvector not set up yet
    if (error.message.includes('relation "MedicalKnowledge" does not exist') || error.message.includes('type "vector" does not exist')) {
        return res.json({ 
            results: [
                { content: "Mocked Guideline: Standard care for this condition involves lifestyle modification and observation." },
                { content: "Warning: RAG Database (pgvector) is not yet initialized by the Database Team. Returning fallback results." }
            ] 
        });
    }

    return res.status(500).json({ error: 'Internal Server Error during RAG retrieval' });
  }
});
