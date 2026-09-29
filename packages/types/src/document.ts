import { z } from 'zod';

// ─── Document Upload ──────────────────────────────────────────────────────────

export const DocumentTypeEnum = z.enum([
  'prescription',
  'lab_report',
  'discharge_summary',
  'imaging',
  'other',
]);

// Form data schema (used for validation after multer parses the body)
export const UploadDocumentSchema = z.object({
  patientId:    z.string().uuid('Invalid patientId'),
  documentType: DocumentTypeEnum.default('other'),
});

// ─── Field Confirmation ───────────────────────────────────────────────────────

const FieldConfirmationSchema = z.object({
  fieldId:        z.string().uuid(),
  accepted:       z.boolean(),
  correctedValue: z.string().optional(),
});

export const ConfirmFieldsSchema = z.object({
  confirmations: z.array(FieldConfirmationSchema).min(1),
});

// ─── TypeScript Types ─────────────────────────────────────────────────────────

export type UploadDocumentInput   = z.infer<typeof UploadDocumentSchema>;
export type ConfirmFieldsInput    = z.infer<typeof ConfirmFieldsSchema>;
export type FieldConfirmation     = z.infer<typeof FieldConfirmationSchema>;

// ─── NER Entity (returned by Python service) ──────────────────────────────────

export interface NEREntity {
  text:  string;
  label: 'CHEMICAL' | 'DISEASE' | 'ANATOMY' | 'ORGANISM' | string;
  start: number;
  end:   number;
}

// ─── Extraction Pipeline Internal Types ──────────────────────────────────────

export interface ScoredField {
  fieldName:       string;
  rawValue:        string;
  normalizedValue: string;
  rxNormCode?:     string;
  loincCode?:      string;
  icdCode?:        string;
  confidence:      number;
  status:          'confirmed' | 'pending' | 'review_needed';
}

export interface ExtractionResult {
  fields:          ScoredField[];
  avgConfidence:   number;
}
