import { Router, Request, Response } from 'express';
import { prisma } from '@medibot/db';
import { AddAllergySchema } from '@medibot/types';
import { getOwnedPatient, withProvenance, manualEntryProvenance } from '../services/provenance';

export const allergyRouter = Router();

allergyRouter.get('/:patientId/allergies', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const allergies = await prisma.allergy.findMany({
    where:   { patientId, deletedAt: null },
    include: { provenance: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ allergies });
});

allergyRouter.post('/:patientId/allergies', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = AddAllergySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const { provenance: prov, ...allergyData } = parsed.data;

  try {
    const allergy = await withProvenance(prov ?? manualEntryProvenance(), (provenanceId) =>
      prisma.allergy.create({
        data: { patientId, provenanceId, ...allergyData },
        include: { provenance: true },
      })
    );

    await prisma.healthEvent.create({
      data: {
        patientId,
        eventType:      'allergy',
        eventTime:      new Date(),
        summary:        `Allergy recorded: ${allergyData.substance}`,
        structuredData: allergyData,
        provenanceId:   allergy.provenanceId,
      },
    });

    return res.status(201).json(allergy);
  } catch (err) {
    console.error('[POST /allergies]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

allergyRouter.delete('/:patientId/allergies/:id', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const allergyId = String(req.params.id);
  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  try {
    await prisma.allergy.update({
      where: { allergyId },
      data:  { deletedAt: new Date() },
    });
    return res.json({ message: 'Allergy removed' });
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Allergy not found' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});
