import { z } from 'zod';

// ─── Patient Profile ──────────────────────────────────────────────────────────

export const CreatePatientSchema = z.object({
  dateOfBirth: z.string().datetime().optional(),
  sex:         z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  bloodGroup:  z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  preferences: z.record(z.unknown()).optional(),
});

export const UpdatePatientSchema = CreatePatientSchema.partial();

// ─── Medical Conditions ───────────────────────────────────────────────────────

const ProvenanceInputSchema = z.object({
  sourceType: z.enum(['document', 'manual_entry', 'wearable', 'lab_api', 'user_input']),
  sourceDate: z.string().datetime(),
  documentId: z.string().uuid().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const AddConditionSchema = z.object({
  name:        z.string().min(1, 'Condition name is required'),
  icdCode:     z.string().optional(),
  status:      z.enum(['active', 'resolved', 'chronic']).default('active'),
  onsetDate:   z.string().datetime().optional(),
  provenance:  ProvenanceInputSchema.optional(),
});

export const UpdateConditionSchema = z.object({
  status:  z.enum(['active', 'resolved', 'chronic']).optional(),
  icdCode: z.string().optional(),
});

// ─── Allergies ────────────────────────────────────────────────────────────────

export const AddAllergySchema = z.object({
  substance:  z.string().min(1, 'Substance is required'),
  reaction:   z.string().optional(),
  severity:   z.enum(['mild', 'moderate', 'severe', 'life-threatening']).optional(),
  onsetDate:  z.string().datetime().optional(),
  provenance: ProvenanceInputSchema.optional(),
});

// ─── Medications ──────────────────────────────────────────────────────────────

export const AddMedicationSchema = z.object({
  name:       z.string().min(1, 'Medication name is required'),
  rxNormCode: z.string().optional(),
  dose:       z.string().optional(),
  frequency:  z.string().optional(),
  route:      z.string().optional(),
  startedAt:  z.string().datetime().optional(),
  provenance: ProvenanceInputSchema.optional(),
});

export const StopMedicationSchema = z.object({
  stoppedAt: z.string().datetime().optional(),
});

// ─── Lab Results ──────────────────────────────────────────────────────────────

export const AddLabResultSchema = z.object({
  testName:       z.string().min(1, 'Test name is required'),
  loincCode:      z.string().optional(),
  value:          z.number().optional(),
  valueText:      z.string().optional(),
  unit:           z.string().optional(),
  referenceRange: z.string().optional(),
  isAbnormal:     z.boolean().optional(),
  observedAt:     z.string().datetime(),
  provenance:     ProvenanceInputSchema.optional(),
});

// ─── Wearable ─────────────────────────────────────────────────────────────────

export const AddWearableReadingSchema = z.object({
  metric:     z.string().min(1),
  value:      z.number(),
  unit:       z.string().min(1),
  recordedAt: z.string().datetime(),
  source:     z.enum(['apple_health', 'fitbit', 'garmin', 'samsung_health', 'manual']).optional(),
});

// ─── Health Event ─────────────────────────────────────────────────────────────

export const AddHealthEventSchema = z.object({
  encounterId:    z.string().uuid().optional(),
  eventType:      z.string().min(1),
  eventTime:      z.string().datetime(),
  summary:        z.string().min(1),
  structuredData: z.record(z.unknown()).optional(),
  provenanceId:   z.string().uuid().optional(),
});

// ─── TypeScript Types ─────────────────────────────────────────────────────────

export type CreatePatientInput    = z.infer<typeof CreatePatientSchema>;
export type AddConditionInput     = z.infer<typeof AddConditionSchema>;
export type AddAllergyInput       = z.infer<typeof AddAllergySchema>;
export type AddMedicationInput    = z.infer<typeof AddMedicationSchema>;
export type AddLabResultInput     = z.infer<typeof AddLabResultSchema>;
export type AddWearableInput      = z.infer<typeof AddWearableReadingSchema>;
export type AddHealthEventInput   = z.infer<typeof AddHealthEventSchema>;
export type ProvenanceInput       = z.infer<typeof ProvenanceInputSchema>;
