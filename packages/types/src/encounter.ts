import { z } from 'zod';

// ─── Encounter ────────────────────────────────────────────────────────────────

export const CreateEncounterSchema = z.object({
  patientId: z.string().uuid(),
  intent:    z.enum(['symptom', 'medication_query', 'record_query', 'general']).optional(),
});

export const UpdateEncounterStatusSchema = z.object({
  status:          z.enum(['IN_PROGRESS', 'COMPLETE', 'HIGH_RISK', 'ABANDONED']),
  riskLevel:       z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  flaggedForReview: z.boolean().optional(),
  modelVersion:    z.string().optional(),
});

// ─── Messages ────────────────────────────────────────────────────────────────

export const AppendMessageSchema = z.object({
  role:    z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1),
});

// ─── Symptom State ────────────────────────────────────────────────────────────

export const UpdateSymptomStateSchema = z.object({
  primarySymptom:      z.string().optional(),
  onset:               z.string().optional(),
  duration:            z.string().optional(),
  severity:            z.number().int().min(0).max(10).optional(),
  character:           z.string().optional(),
  location:            z.string().optional(),
  radiation:           z.string().optional(),
  aggravatingFactors:  z.string().optional(),
  relievingFactors:    z.string().optional(),
  associatedSymptoms:  z.array(z.string()).optional(),
  extractionConfidence: z.number().min(0).max(1).optional(),
  isComplete:          z.boolean().optional(),
});

// ─── Tool Call & Model Run ────────────────────────────────────────────────────

export const LogToolCallSchema = z.object({
  toolName:  z.string().min(1),
  arguments: z.record(z.unknown()),
  result:    z.record(z.unknown()).optional(),
  status:    z.enum(['pending', 'success', 'error']),
  latencyMs: z.number().int().optional(),
});

export const LogModelRunSchema = z.object({
  modelName:    z.string().min(1),
  modelVersion: z.string().min(1),
  promptHash:   z.string().optional(),
  inputTokens:  z.number().int().optional(),
  outputTokens: z.number().int().optional(),
  latencyMs:    z.number().int().optional(),
});

// ─── TypeScript Types ─────────────────────────────────────────────────────────

export type CreateEncounterInput        = z.infer<typeof CreateEncounterSchema>;
export type UpdateEncounterStatusInput  = z.infer<typeof UpdateEncounterStatusSchema>;
export type AppendMessageInput          = z.infer<typeof AppendMessageSchema>;
export type UpdateSymptomStateInput     = z.infer<typeof UpdateSymptomStateSchema>;
export type LogToolCallInput            = z.infer<typeof LogToolCallSchema>;
export type LogModelRunInput            = z.infer<typeof LogModelRunSchema>;
