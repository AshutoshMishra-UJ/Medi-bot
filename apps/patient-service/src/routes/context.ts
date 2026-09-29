import { Router, Request, Response } from 'express';
import { prisma } from '@medibot/db';
import { getOwnedPatient } from '../services/provenance';

export const contextRouter = Router();

/**
 * GET /patients/:patientId/context
 * Query-scoped Patient 360 retrieval for the Orchestrator (Phase 3).
 */
contextRouter.get('/:patientId/context', async (req: Request, res: Response) => {
  const patientId   = String(req.params.patientId);
  const contextType = req.query.contextType ? String(req.query.contextType) : 'symptom';
  const take        = Math.min(parseInt(req.query.limit ? String(req.query.limit) : '10'), 50);

  const patient = await getOwnedPatient(patientId, (req as any).user?.userId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (patient === 'forbidden') return res.status(403).json({ error: 'Forbidden' });

  try {
    // Always fetch active medications + allergies — safety-critical for any query
    const [medications, allergies] = await Promise.all([
      prisma.medication.findMany({
        where:   { patientId, deletedAt: null, status: 'active' },
        include: { provenance: true },
        take,
      }),
      prisma.allergy.findMany({
        where:   { patientId, deletedAt: null },
        include: { provenance: true },
        take,
      }),
    ]);

    let relevantConditions: any[]  = [];
    let recentLabs:         any[]  = [];
    let wearableTrends:     any[]  = [];
    let priorEncounters:    any[]  = [];

    if (contextType === 'symptom' || contextType === 'full') {
      [relevantConditions, recentLabs, wearableTrends, priorEncounters] = await Promise.all([
        prisma.medicalCondition.findMany({
          where:   { patientId, deletedAt: null, status: { in: ['active', 'chronic'] } },
          include: { provenance: true },
          take,
        }),
        prisma.labResult.findMany({
          where:   { patientId, deletedAt: null },
          orderBy: { observedAt: 'desc' },
          take:    Math.min(take, 10),
        }),
        prisma.wearableTrend.findMany({
          where:   { patientId },
          orderBy: { computedAt: 'desc' },
          take:    Math.min(take, 5),
        }),
        prisma.encounter.findMany({
          where:   { patientId, status: 'COMPLETE' },
          include: { symptomState: true },
          orderBy: { startedAt: 'desc' },
          take:    5,
        }),
      ]);
    }

    if (contextType === 'medication') {
      [relevantConditions, recentLabs] = await Promise.all([
        prisma.medicalCondition.findMany({ where: { patientId, deletedAt: null }, take }),
        prisma.labResult.findMany({
          where:   { patientId, deletedAt: null },
          orderBy: { observedAt: 'desc' },
          take:    5,
        }),
      ]);
    }

    if (contextType === 'lab') {
      recentLabs = await prisma.labResult.findMany({
        where:   { patientId, deletedAt: null },
        orderBy: { observedAt: 'desc' },
        include: { provenance: true },
        take,
      });
    }

    const p = patient as any;
    return res.json({
      patientId,
      contextType,
      retrievedAt:          new Date().toISOString(),
      patientDemographics:  { dateOfBirth: p.dateOfBirth, sex: p.sex, bloodGroup: p.bloodGroup },
      activeMedications:    medications,
      allergies,
      relevantConditions,
      recentLabs,
      wearableTrends,
      priorSymptomEncounters: priorEncounters,
    });
  } catch (err) {
    console.error('[GET /context]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
