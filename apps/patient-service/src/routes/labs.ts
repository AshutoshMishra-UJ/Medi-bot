import { Router, Request, Response } from 'express';
import { prisma } from '@medibot/db';
import { AddLabResultSchema, paginate } from '@medibot/types';
import { getOwnedPatient, withProvenance, manualEntryProvenance } from '../services/provenance';

export const labRouter = Router();

labRouter.get('/:patientId/labs', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const loincCode = req.query.loincCode ? String(req.query.loincCode) : undefined;
  const from      = req.query.from      ? String(req.query.from)      : undefined;
  const to        = req.query.to        ? String(req.query.to)        : undefined;
  const { take, skip } = paginate(req.query as any);

  const labs = await prisma.labResult.findMany({
    where: {
      patientId,
      deletedAt: null,
      ...(loincCode ? { loincCode } : {}),
      ...(from || to ? {
        observedAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      } : {}),
    },
    include: { provenance: true },
    orderBy: { observedAt: 'desc' },
    take,
    skip,
  });

  return res.json({ labs, count: labs.length });
});

labRouter.post('/:patientId/labs', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = AddLabResultSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { provenance: prov, ...labData } = parsed.data;

  try {
    const lab = await withProvenance(prov ?? manualEntryProvenance(), (provenanceId) =>
      prisma.labResult.create({
        data: {
          patientId,
          provenanceId,
          testName:       labData.testName,
          loincCode:      labData.loincCode ?? null,
          value:          labData.value ?? null,
          valueText:      labData.valueText ?? null,
          unit:           labData.unit ?? null,
          referenceRange: labData.referenceRange ?? null,
          isAbnormal:     labData.isAbnormal ?? null,
          observedAt:     new Date(labData.observedAt),
        },
        include: { provenance: true },
      })
    );

    const abnormalNote = labData.isAbnormal ? ' ⚠️ ABNORMAL' : '';
    await prisma.healthEvent.create({
      data: {
        patientId,
        eventType:      'lab_result',
        eventTime:      new Date(labData.observedAt),
        summary:        `Lab result: ${labData.testName}${labData.value !== undefined ? ` = ${labData.value}${labData.unit ?? ''}` : ''}${abnormalNote}`,
        structuredData: labData,
        provenanceId:   lab.provenanceId,
      },
    });

    return res.status(201).json(lab);
  } catch (err) {
    console.error('[POST /labs]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
