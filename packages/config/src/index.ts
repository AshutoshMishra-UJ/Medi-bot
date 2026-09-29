import dotenv from 'dotenv';
import path from 'path';

// Load .env from the monorepo root (medibot/.env) regardless of which app is running it
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  nodeEnv:  optionalEnv('NODE_ENV', 'development'),
  isDev:    optionalEnv('NODE_ENV', 'development') === 'development',
  isProd:   process.env.NODE_ENV === 'production',

  db: {
    url: requireEnv('DATABASE_URL'),
  },

  auth: {
    jwtSecret:    requireEnv('JWT_SECRET'),
    jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),
  },

  ports: {
    gateway:  parseInt(optionalEnv('API_GATEWAY_PORT', '3000')),
    patient:  parseInt(optionalEnv('PATIENT_SERVICE_PORT', '3001')),
    document: parseInt(optionalEnv('DOCUMENT_SERVICE_PORT', '3002')),
  },

  services: {
    patientUrl:  optionalEnv('PATIENT_SERVICE_URL', 'http://localhost:3001'),
    documentUrl: optionalEnv('DOCUMENT_SERVICE_URL', 'http://localhost:3002'),
    nerUrl:      optionalEnv('NER_SERVICE_URL', 'http://localhost:8000'),
  },

  uploads: {
    dir:        optionalEnv('UPLOAD_DIR', './uploads'),
    maxSizeMb:  parseInt(optionalEnv('MAX_FILE_SIZE_MB', '20')),
    ocrProvider: optionalEnv('OCR_PROVIDER', 'local_tesseract') as 'local_tesseract' | 'textract',
  },

  redis: {
    host: optionalEnv('REDIS_HOST', 'localhost'),
    port: parseInt(optionalEnv('REDIS_PORT', '6379')),
  },

  rateLimit: {
    windowMs: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000')),
    max:      parseInt(optionalEnv('RATE_LIMIT_MAX', '100')),
  },

  confidence: {
    autoCommit:  parseFloat(optionalEnv('CONFIDENCE_AUTO_COMMIT', '0.85')),
    userConfirm: parseFloat(optionalEnv('CONFIDENCE_USER_CONFIRM', '0.60')),
  },

  cors: {
    allowedOrigins: optionalEnv('ALLOWED_ORIGINS', 'http://localhost:3000').split(','),
  },
};
