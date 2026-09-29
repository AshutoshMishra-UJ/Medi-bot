import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { config } from '@medibot/config';

import { patientRouter }    from './routes/patient';
import { conditionRouter }  from './routes/conditions';
import { allergyRouter }    from './routes/allergies';
import { medicationRouter } from './routes/medications';
import { labRouter }        from './routes/labs';
import { timelineRouter }   from './routes/timeline';
import { encounterRouter }  from './routes/encounters';
import { contextRouter }    from './routes/context';
import { wearableRouter }   from './routes/wearables';

const app = express();

app.use(cors({ origin: config.cors.allowedOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'patient-service', timestamp: new Date().toISOString() });
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
// Patient 360 core CRUD
app.use('/patients', patientRouter);
app.use('/patients', conditionRouter);
app.use('/patients', allergyRouter);
app.use('/patients', medicationRouter);
app.use('/patients', labRouter);
app.use('/patients', timelineRouter);
app.use('/patients', wearableRouter);

// AI Integration Contract routes (consumed by Orchestrator in Phase 3)
app.use('/patients', contextRouter);
app.use('/encounters', encounterRouter);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Patient Service Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.ports.patient, () => {
  console.log(`✅ Patient Service running on http://localhost:${config.ports.patient}`);
});

export default app;
