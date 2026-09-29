import { Router, Request, Response } from 'express';
import { prisma } from '@medibot/db';
import { AddConditionSchema, UpdateConditionSchema } from '@medibot/types';
import { getOwnedPatient, withProvenance, manualEntryProvenance } from '../services/provenance';

export const conditionRouter = Router();

conditionRouter.get('/:patientId/conditions', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const conditions = await prisma.medicalCondition.findMany({
    where:   { patientId, deletedAt: null },
    include: { provenance: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ conditions });
});

conditionRouter.post('/:patientId/conditions', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = AddConditionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { provenance: prov, ...conditionData } = parsed.data;
  const provenanceSource = prov ?? manualEntryProvenance();

  try {
    const condition = await withProvenance(provenanceSource, (provenanceId) =>
      prisma.medicalCondition.create({
        data: {
          patientId,
          provenanceId,
          name:      conditionData.name,
          icdCode:   conditionData.icdCode ?? null,
          status:    conditionData.status,
          onsetDate: conditionData.onsetDate ? new Date(conditionData.onsetDate) : null,
        },
        include: { provenance: true },
      })
    );

    await prisma.healthEvent.create({
      data: {
        patientId,
        eventType:      'diagnosis',
        eventTime:      new Date(),
        summary:        `Condition added: ${conditionData.name}`,
        structuredData: { name: conditionData.name, icdCode: conditionData.icdCode, status: conditionData.status },
        provenanceId:   condition.provenanceId,
      },
    });

    return res.status(201).json(condition);
  } catch (err) {
    console.error('[POST /conditions]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

conditionRouter.put('/:patientId/conditions/:id', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const conditionId = String(req.params.id);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = UpdateConditionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const updated = await prisma.medicalCondition.update({
      where: { conditionId },
      data:  parsed.data,
    });
    return res.json(updated);
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Condition not found' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

conditionRouter.delete('/:patientId/conditions/:id', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const conditionId = String(req.params.id);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  try {
    await prisma.medicalCondition.update({
      where: { conditionId },
      data:  { deletedAt: new Date() },
    });
    return res.json({ message: 'Condition removed' });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Condition not found' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});
