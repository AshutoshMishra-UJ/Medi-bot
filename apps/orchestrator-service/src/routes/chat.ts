import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@medibot/db';
import { processChatTurn } from '../services/modelRouter';

export const chatRouter = Router();

const ChatRequestSchema = z.object({
  patientId: z.string().uuid(),
  message: z.string().min(1),
});

chatRouter.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { patientId, message } = ChatRequestSchema.parse(req.body);

    // 1. Get initial context (Patient Profile summary)
    const profile = await prisma.patientProfile.findUnique({ where: { patientId } });
    if (!profile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    console.log(`[Chat] Starting conversation loop for patient ${patientId}`);
    
    // 2. Delegate to Model Router to handle the LLM interaction and tool execution
    const result = await processChatTurn(message, patientId);

    const status = result.riskLevel === 'HIGH' || result.riskLevel === 'HIGH_RISK' ? 'HIGH_RISK' : 'COMPLETE';
    
    // 3. Log the conversation to Encounters (Provenance)
    const encounter = await prisma.encounter.create({
      data: {
        patientId,
        status,
        riskLevel: result.riskLevel || 'LOW',
      }
    });

    // 4. Trigger Escalation Webhook if HIGH_RISK
    if (status === 'HIGH_RISK') {
      console.log(`🚨 [ESCALATION] Encounter ${encounter.encounterId} flagged as HIGH RISK. Notifying clinical dashboard...`);
      try {
        // In a real app, this goes to BullMQ or an external alerting service (PagerDuty, Twilio)
        await fetch('http://localhost:3000/api/webhooks/escalate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encounterId: encounter.encounterId, patientId, reason: result.reply }),
        }).catch(() => {}); // fire and forget
      } catch (e) {
        console.error('Failed to dispatch escalation webhook');
      }
    }

    return res.json({ response: result.reply, _metadata: { toolsUsed: result.toolsUsed, riskLevel: result.riskLevel } });

  } catch (error: any) {
    console.error('[Chat Error]', error);
    return res.status(400).json({ error: error.message });
  }
});

