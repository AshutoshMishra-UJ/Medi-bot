import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from '@medibot/config';
import { documentRouter } from './routes/documents';

const app = express();

app.use(cors({ origin: config.cors.allowedOrigins, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'document-service', timestamp: new Date().toISOString() });
});

app.use('/documents', documentRouter);

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Document Service Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.ports.document, () => {
  console.log(`✅ Document Service running on http://localhost:${config.ports.document}`);
  console.log(`   Worker status: in-memory queue ready`);
});

export default app;
