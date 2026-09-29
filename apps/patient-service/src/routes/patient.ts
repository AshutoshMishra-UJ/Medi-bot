import { Router, Request, Response } from 'express';
import { prisma, Prisma } from '@medibot/db';
import { CreatePatientSchema, UpdatePatientSchema } from '@medibot/types';
import { getOwnedPatient } from '../services/provenance';

export const patientRouter = Router();

// ─── POST /patients/:userId/profile ──────────────────────────────────────────
patientRouter.post('/:userId/profile', async (req: Request, res: Response) => {
  const parsed = CreatePatientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  const userId = String(req.params.userId);
  const requestingUserId = (req as any).user?.userId as string | undefined;
  if (requestingUserId && requestingUserId !== userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const profile = await prisma.patientProfile.create({
      data: {
        userId,
        dateOfBirth:  parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined,
        sex:          parsed.data.sex,
        bloodGroup:   parsed.data.bloodGroup,
        preferences:  parsed.data.preferences
                        ? (parsed.data.preferences as unknown as Prisma.InputJsonValue)
                        : Prisma.JsonNull,
      },
    });
    return res.status(201).json(profile);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Profile already exists for this user' });
    if (e.code === 'P2003') return res.status(404).json({ error: 'User not found' });
    console.error('[POST /profile]', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /patients/:patientId — Full Patient 360 ──────────────────────────────
patientRouter.get('/:patientId', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const userId = (req as any).user?.userId as string;
  const patient = await getOwnedPatient(patientId, userId);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const fullProfile = await prisma.patientProfile.findUnique({
    where: { patientId },
    include: {
      conditions:  { where: { deletedAt: null }, include: { provenance: true } },
      allergies:   { where: { deletedAt: null }, include: { provenance: true } },
      medications: { where: { deletedAt: null, status: 'active' }, include: { provenance: true } },
      labResults:  { where: { deletedAt: null }, orderBy: { observedAt: 'desc' }, take: 20, include: { provenance: true } },
    },
  });

  return res.json(fullProfile);
});

// ─── PUT /patients/:patientId/profile ─────────────────────────────────────────
patientRouter.put('/:patientId/profile', async (req: Request, res: Response) => {
  const patientId = String(req.params.patientId);
  const userId = (req as any).user?.userId as string;
  const patient = await getOwnedPatient(patientId, userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  const parsed = UpdatePatientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });

  try {
    const updated = await prisma.patientProfile.update({
      where: { patientId },
      data: {
        dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined,
        sex:         parsed.data.sex,
        bloodGroup:  parsed.data.bloodGroup,
        preferences: parsed.data.preferences
                       ? (parsed.data.preferences as unknown as Prisma.InputJsonValue)
                       : undefined,
      },
    });
    return res.json(updated);
  } catch (err) {
    console.error('[PUT /profile]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
