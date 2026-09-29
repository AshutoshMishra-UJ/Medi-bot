import { Router, Request, Response } from 'express';
import { prisma } from '@medibot/db';
import { AddWearableReadingSchema } from '@medibot/types';
import { getOwnedPatient } from '../services/provenance';

export const wearableRouter = Router();

wearableRouter.get('/:patientId/wearables/readings', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient   = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const metric = req.query.metric ? String(req.query.metric) : undefined;
  const from   = req.query.from   ? String(req.query.from)   : undefined;
  const to     = req.query.to     ? String(req.query.to)     : undefined;
  const take   = Math.min(parseInt(req.query.limit ? String(req.query.limit) : '100'), 500);

  const readings = await prisma.wearableReading.findMany({
    where: {
      patientId,
      ...(metric ? { metric } : {}),
      ...(from || to ? {
        recordedAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    },
    orderBy: { recordedAt: 'desc' },
    take,
  });
  return res.json({ readings, count: readings.length });
});

wearableRouter.get('/:patientId/wearables/trends', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient   = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const metric = req.query.metric ? String(req.query.metric) : undefined;

  const trends = await prisma.wearableTrend.findMany({
    where:   { patientId, ...(metric ? { metric } : {}) },
    orderBy: { computedAt: 'desc' },
  });
  return res.json({ trends });
});

wearableRouter.post('/:patientId/wearables/readings', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient   = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = AddWearableReadingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const reading = await prisma.wearableReading.create({
      data: {
        patientId,
        metric:     parsed.data.metric,
        value:      parsed.data.value,
        unit:       parsed.data.unit,
        recordedAt: new Date(parsed.data.recordedAt),
        source:     parsed.data.source ?? null,
      },
    });
    return res.status(201).json(reading);
  } catch (err) {
    console.error('[POST /wearables]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
