import { Router, Request, Response } from 'express';
import { prisma } from '@medibot/db';
import { AddMedicationSchema, StopMedicationSchema } from '@medibot/types';
import { getOwnedPatient, withProvenance, manualEntryProvenance } from '../services/provenance';

export const medicationRouter = Router();

medicationRouter.get('/:patientId/medications', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const status = String(req.query.status ?? 'active');

  const medications = await prisma.medication.findMany({
    where:   { patientId, deletedAt: null, status },
    include: { provenance: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ medications });
});

medicationRouter.post('/:patientId/medications', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = AddMedicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { provenance: prov, ...medData } = parsed.data;

  try {
    const medication = await withProvenance(prov ?? manualEntryProvenance(), (provenanceId) =>
      prisma.medication.create({
        data: {
          patientId,
          provenanceId,
          name:       medData.name,
          rxNormCode: medData.rxNormCode ?? null,
          dose:       medData.dose ?? null,
          frequency:  medData.frequency ?? null,
          route:      medData.route ?? null,
          startedAt:  medData.startedAt ? new Date(medData.startedAt) : null,
        },
        include: { provenance: true },
      })
    );

    await prisma.healthEvent.create({
      data: {
        patientId,
        eventType:      'medication_start',
        eventTime:      new Date(),
        summary:        `Medication started: ${medData.name}${medData.dose ? ` ${medData.dose}` : ''}`,
        structuredData: medData,
        provenanceId:   medication.provenanceId,
      },
    });

    return res.status(201).json(medication);
  } catch (err) {
    console.error('[POST /medications]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /patients/:patientId/medications/:id/stop ────────────────────────────
medicationRouter.put('/:patientId/medications/:id/stop', async (req: Request, res: Response) => {
  const patientId    = String(req.params.patientId);
  const medicationId = String(req.params.id);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = StopMedicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const stoppedAt = parsed.data.stoppedAt ? new Date(parsed.data.stoppedAt) : new Date();

  try {
    const medication = await prisma.medication.update({
      where: { medicationId },
      data:  { status: 'stopped', stoppedAt },
    });

    await prisma.healthEvent.create({
      data: {
        patientId,
        eventType:      'medication_stop',
        eventTime:      stoppedAt,
        summary:        `Medication stopped: ${medication.name}`,
        structuredData: { medicationId: medication.medicationId, name: medication.name, stoppedAt },
      },
    });

    return res.json(medication);
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Medication not found' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});
