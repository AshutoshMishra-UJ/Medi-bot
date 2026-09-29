import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import proxy from 'express-http-proxy';
import { config } from '@medibot/config';
import { authRouter } from './routes/auth';
import { authMiddleware } from './middleware/auth';
import { consentMiddleware } from './middleware/consent';
import { auditMiddleware } from './middleware/audit';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max:      config.rateLimit.max,
  message:  { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

// ─── AUDIT (wraps all responses) ──────────────────────────────────────────────
app.use(auditMiddleware);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ─── PUBLIC ROUTES (no auth required) ────────────────────────────────────────
app.use('/auth', authRouter);

// ─── PROTECTED ROUTES — auth + consent required ───────────────────────────────
// Every route below this point requires a valid JWT AND granted consent
app.use('/patients',  authMiddleware, consentMiddleware, proxy(config.services.patientUrl));
app.use('/documents', authMiddleware, consentMiddleware, proxy(config.services.documentUrl));
app.use('/encounters',authMiddleware, consentMiddleware, proxy(config.services.patientUrl));
app.use('/chat',      authMiddleware, consentMiddleware, proxy('http://localhost:3003'));

// ─── 404 HANDLER ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API Gateway Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(config.ports.gateway, () => {
  console.log(`✅ API Gateway running on http://localhost:${config.ports.gateway}`);
  console.log(`   → /patients  → ${config.services.patientUrl}`);
  console.log(`   → /documents → ${config.services.documentUrl}`);
});

export default app;
