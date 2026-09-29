import { z } from 'zod';
import { prisma } from '@medibot/db';

export const ToolArgsSchema = {
  get_patient_profile: z.object({}),
  get_medical_history: z.object({}),
  get_current_medications: z.object({}),
};

export async function executeTool(patientId: string, toolName: string, args: any): Promise<any> {
  console.log(`[Tool Executor] Executing ${toolName} for patient ${patientId}`);
  
  try {
    switch (toolName) {
      case 'get_patient_profile':
        const profile = await prisma.patientProfile.findUnique({ where: { patientId } });
        return profile ? profile : { error: 'Profile not found' };
        
      case 'get_medical_history':
        const conditions = await prisma.medicalCondition.findMany({ where: { patientId } });
        return { conditions };
        
      case 'get_current_medications':
        const medications = await prisma.medication.findMany({ where: { patientId, status: 'active' } });
        return { medications };

      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    console.error(`[Tool Executor Error] ${toolName}:`, error.message);
    return { error: `Failed to execute ${toolName}: ${error.message}` };
  }
}
