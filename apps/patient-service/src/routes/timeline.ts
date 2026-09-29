import { Router, Request, Response } from 'express';
import { prisma, Prisma } from '@medibot/db';
import { AddHealthEventSchema, paginate } from '@medibot/types';
import { getOwnedPatient } from '../services/provenance';

export const timelineRouter = Router();

// ─── GET /patients/:patientId/timeline ───────────────────────────────────────
timelineRouter.get('/:patientId/timeline', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const eventType = req.query.eventType ? String(req.query.eventType) : undefined;
  const from      = req.query.from      ? String(req.query.from)      : undefined;
  const to        = req.query.to        ? String(req.query.to)        : undefined;
  const { take, skip } = paginate(req.query as any);

  const events = await prisma.healthEvent.findMany({
    where: {
      patientId,
      ...(eventType ? { eventType } : {}),
      ...(from || to ? {
        eventTime: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    },
    include: { provenance: true },
    orderBy: { eventTime: 'desc' },
    take,
    skip,
  });

  return res.json({ events, count: events.length });
});

// ─── POST /patients/:patientId/events (Orchestrator write in Phase 3) ─────────
timelineRouter.post('/:patientId/events', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = AddHealthEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const event = await prisma.healthEvent.create({
      data: {
        patientId,
        encounterId:    parsed.data.encounterId ?? null,
        eventType:      parsed.data.eventType,
        eventTime:      new Date(parsed.data.eventTime),
        summary:        parsed.data.summary,
        structuredData: parsed.data.structuredData
                          ? (parsed.data.structuredData as unknown as Prisma.InputJsonValue)
                          : Prisma.JsonNull,
        provenanceId:   parsed.data.provenanceId ?? null,
      },
      include: { provenance: true },
    });
    return res.status(201).json(event);
  } catch (err) {
    console.error('[POST /events]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
