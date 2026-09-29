import { Router, Request, Response } from 'express';
import { prisma, Prisma } from '@medibot/db';
import {
  CreateEncounterSchema,
  UpdateEncounterStatusSchema,
  AppendMessageSchema,
  LogToolCallSchema,
  LogModelRunSchema,
  UpdateSymptomStateSchema,
} from '@medibot/types';
import { getOwnedPatient } from '../services/provenance';

export const encounterRouter = Router();

// ─── POST /encounters — Create new encounter ──────────────────────────────────
encounterRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateEncounterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const patient = await getOwnedPatient(parsed.data.patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  try {
    const encounter = await prisma.encounter.create({
      data: {
        patientId: parsed.data.patientId,
        intent:    parsed.data.intent ?? null,
      },
    });

    const conversation = await prisma.conversation.create({
      data: { encounterId: encounter.encounterId },
    });

    return res.status(201).json({ ...encounter, conversationId: conversation.conversationId });
  } catch (err) {
    console.error('[POST /encounters]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /encounters/:id ──────────────────────────────────────────────────────
encounterRouter.get('/:encounterId', async (req: Request, res: Response) => {
  const encounterId = String(req.params.encounterId);

  const encounter = await prisma.encounter.findUnique({
    where:   { encounterId },
    include: {
      conversations: { include: { messages: { orderBy: { createdAt: 'asc' } } } },
      symptomState:  true,
      toolCalls:     { orderBy: { createdAt: 'asc' } },
      modelRuns:     { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!encounter) return res.status(404).json({ error: 'Encounter not found' });
  return res.json(encounter);
});

// ─── PUT /encounters/:id/status ───────────────────────────────────────────────
encounterRouter.put('/:encounterId/status', async (req: Request, res: Response) => {
  const encounterId = String(req.params.encounterId);
  const parsed = UpdateEncounterStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const terminalStatuses = ['COMPLETE', 'HIGH_RISK', 'ABANDONED'];

  try {
    const encounter = await prisma.encounter.update({
      where: { encounterId },
      data: {
        status:          parsed.data.status,
        riskLevel:       parsed.data.riskLevel ?? undefined,
        flaggedForReview: parsed.data.flaggedForReview ?? undefined,
        modelVersion:    parsed.data.modelVersion ?? undefined,
        endedAt: terminalStatuses.includes(parsed.data.status) ? new Date() : undefined,
      },
    });
    return res.json(encounter);
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Encounter not found' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /encounters/:id/messages ────────────────────────────────────────────
encounterRouter.post('/:encounterId/messages', async (req: Request, res: Response) => {
  const encounterId = String(req.params.encounterId);
  const parsed = AppendMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { encounterId },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found for this encounter' });

    const message = await prisma.message.create({
      data: { conversationId: conversation.conversationId, ...parsed.data },
    });
    return res.status(201).json(message);
  } catch (err) {
    console.error('[POST /messages]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /encounters/:id/symptom-state ───────────────────────────────────────
encounterRouter.get('/:encounterId/symptom-state', async (req: Request, res: Response) => {
  const encounterId = String(req.params.encounterId);

  const state = await prisma.symptomState.findUnique({
    where: { encounterId },
  });
  if (!state) return res.status(404).json({ error: 'No symptom state for this encounter' });
  return res.json(state);
});

// ─── PUT /encounters/:id/symptom-state ───────────────────────────────────────
encounterRouter.put('/:encounterId/symptom-state', async (req: Request, res: Response) => {
  const encounterId = String(req.params.encounterId);
  const parsed = UpdateSymptomStateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const state = await prisma.symptomState.upsert({
      where:  { encounterId },
      create: {
        encounterId,
        ...parsed.data,
        associatedSymptoms: parsed.data.associatedSymptoms ?? [],
        completedAt:        parsed.data.isComplete ? new Date() : null,
      },
      update: {
        ...parsed.data,
        associatedSymptoms: parsed.data.associatedSymptoms ?? undefined,
        completedAt:        parsed.data.isComplete ? new Date() : undefined,
      },
    });
    return res.json(state);
  } catch (err) {
    console.error('[PUT /symptom-state]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /encounters/:id/toolcall ───────────────────────────────────────────
encounterRouter.post('/:encounterId/toolcall', async (req: Request, res: Response) => {
  const encounterId = String(req.params.encounterId);
  const parsed = LogToolCallSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const toolCall = await prisma.toolCall.create({
      data: {
        encounterId,
        toolName:  parsed.data.toolName,
        arguments: parsed.data.arguments as unknown as Prisma.InputJsonValue,
        result:    parsed.data.result
                     ? (parsed.data.result as unknown as Prisma.InputJsonValue)
                     : undefined,
        status:    parsed.data.status,
        latencyMs: parsed.data.latencyMs ?? null,
      },
    });
    return res.status(201).json(toolCall);
  } catch (err) {
    console.error('[POST /toolcall]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /encounters/:id/modelrun ───────────────────────────────────────────
encounterRouter.post('/:encounterId/modelrun', async (req: Request, res: Response) => {
  const encounterId = String(req.params.encounterId);
  const parsed = LogModelRunSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const run = await prisma.modelRun.create({
      data: {
        encounterId,
        modelName:    parsed.data.modelName,
        modelVersion: parsed.data.modelVersion,
        promptHash:   parsed.data.promptHash ?? null,
        inputTokens:  parsed.data.inputTokens ?? null,
        outputTokens: parsed.data.outputTokens ?? null,
        latencyMs:    parsed.data.latencyMs ?? null,
      },
    });
    return res.status(201).json(run);
  } catch (err) {
    console.error('[POST /modelrun]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /encounters/patient/:patientId ──────────────────────────────────────
encounterRouter.get('/patient/:patientId', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const status = req.query.status ? String(req.query.status) : undefined;

  const encounters = await prisma.encounter.findMany({
    where: {
      patientId,
      ...(status ? { status } : {}),
    },
    include: { symptomState: true },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });
  return res.json({ encounters });
});
