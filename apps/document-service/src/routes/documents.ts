import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { prisma } from '@medibot/db';
import { config } from '@medibot/config';
import { UploadDocumentSchema, ConfirmFieldsSchema } from '@medibot/types';
import { extractionQueue } from '../jobs/queue';
import { commitConfirmedFields } from '../services/commit';
import fs from 'fs';

// ─── MULTER CONFIG ────────────────────────────────────────────────────────────
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
const MAX_SIZE      = config.uploads.maxSizeMb * 1024 * 1024;

// Ensure uploads directory exists
if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: config.uploads.dir,
  filename:    (_req, file, cb) => {
    // NEVER use original filename — always UUID to prevent PHI in storage path
    cb(null, `${uuid()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits:     { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, PNG, JPEG, TIFF`));
    }
  },
});

export const documentRouter = Router();

import { scanForMalware } from '../services/malware';

// ─── POST /documents — Upload document ───────────────────────────────────────
documentRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const parsed = UploadDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    fs.unlinkSync(req.file.path); // Clean up
    return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
  }

  // 1. Malware / file validation
  const scanResult = await scanForMalware(req.file.path);
  if (!scanResult.isSafe) {
    fs.unlinkSync(req.file.path); // Destroy infected file immediately
    console.error(`[POST /documents] Malware detected: ${scanResult.threat}`);
    return res.status(400).json({ error: 'Upload rejected: Security policy violation' });
  }

  const { patientId, documentType } = parsed.data;

  try {
    const doc = await prisma.healthDocument.create({
      data: {
        patientId,
        type:             documentType,
        originalFilename: req.file.originalname,
        storageUri:       req.file.path,
        mimeType:         req.file.mimetype,
        extractionStatus: 'pending',
      },
    });

    await extractionQueue.add('extract', {
      documentId: doc.documentId,
      filePath:   req.file.path,
    });

    return res.status(202).json({
      documentId: doc.documentId,
      status:     'pending',
      message:    'Document uploaded. Extraction has been queued.',
    });
  } catch (err) {
    console.error('[POST /documents]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /documents/:id/status ────────────────────────────────────────────────
documentRouter.get('/:id/status', async (req: Request, res: Response) => {
  const documentId = String(req.params.id);

  const doc = await prisma.healthDocument.findUnique({
    where:  { documentId },
    select: { documentId: true, extractionStatus: true, type: true, uploadedAt: true, mimeType: true },
  });
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  return res.json(doc);
});

// ─── GET /documents/:id/extracted — Fields pending confirmation ───────────────
documentRouter.get('/:id/extracted', async (req: Request, res: Response) => {
  const documentId = String(req.params.id);

  const fields = await prisma.extractedField.findMany({
    where:   { documentId },
    include: { provenance: true },
    orderBy: { confidence: 'desc' },
  });
  return res.json({ fields, count: fields.length });
});

// ─── POST /documents/:id/confirm — User confirms/rejects fields ───────────────
documentRouter.post('/:id/confirm', async (req: Request, res: Response) => {
  const documentId = String(req.params.id);
  const parsed     = ConfirmFieldsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    await Promise.all(
      parsed.data.confirmations.map(async ({ fieldId, accepted, correctedValue }) => {
        await prisma.extractedField.update({
          where: { fieldId },
          data: {
            status:          accepted ? 'confirmed' : 'rejected',
            normalizedValue: correctedValue ?? undefined,
            confirmedAt:     new Date(),
          },
        });
      }),
    );

    const committed = await commitConfirmedFields(documentId);
    return res.json({ message: 'Confirmations processed', committed: committed.length });
  } catch (err) {
    console.error('[POST /confirm]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /documents/patient/:patientId — List patient documents ───────────────
documentRouter.get('/patient/:patientId', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const type      = req.query.type   ? String(req.query.type)   : undefined;
  const status    = req.query.status ? String(req.query.status) : undefined;
  const take      = Math.min(parseInt(req.query.limit  ? String(req.query.limit)  : '20'), 100);
  const skip      = parseInt(req.query.offset ? String(req.query.offset) : '0');

  const docs = await prisma.healthDocument.findMany({
    where: {
      patientId,
      ...(type   ? { type }             : {}),
      ...(status ? { extractionStatus: status } : {}),
    },
    orderBy: { uploadedAt: 'desc' },
    take,
    skip,
  });

  return res.json({ documents: docs, count: docs.length });
});
