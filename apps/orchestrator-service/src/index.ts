import express from 'express';
import cors from 'cors';
import { config } from '@medibot/config';
import { chatRouter } from './routes/chat';
import { ragRouter } from './routes/rag';

const app = express();

app.use(cors({ origin: config.cors.allowedOrigins }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'orchestrator-service', timestamp: new Date().toISOString() }));

app.use('/chat', chatRouter);
app.use('/rag', ragRouter);

// Fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Orchestrator Error]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = 3003; // Using port 3003 for orchestrator
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✅ Orchestrator Service running on http://localhost:${PORT}`);
  });
}

export default app;
