import type { ScoredField, ExtractionResult } from '@medibot/types';

interface ConfidenceConfig {
  autoCommit:  number; // e.g. 0.85
  userConfirm: number; // e.g. 0.60
}

interface EntityInput {
  fieldName:       string;
  text:            string;
  normalizedValue: string;
  rxNormCode?:     string;
  loincCode?:      string;
  icdCode?:        string;
}

/**
 * Scores each extracted field and assigns it to a confidence tier:
 * >= autoCommit   → 'confirmed'     → auto-written to Patient 360
 * >= userConfirm  → 'pending'       → shown to user for confirmation
 * < userConfirm   → 'review_needed' → not shown, not written
 */
export function scoreConfidence(
  entities: EntityInput[],
  thresholds: ConfidenceConfig,
): ExtractionResult {
  const fields: ScoredField[] = entities.map((entity) => {
    const confidence = computeScore(entity);
    const status = confidence >= thresholds.autoCommit
      ? 'confirmed'
      : confidence >= thresholds.userConfirm
        ? 'pending'
        : 'review_needed';

    return {
      fieldName:       entity.fieldName,
      rawValue:        entity.text,
      normalizedValue: entity.normalizedValue,
      rxNormCode:      entity.rxNormCode,
      loincCode:       entity.loincCode,
      icdCode:         entity.icdCode,
      confidence,
      status,
    };
  });

  const avgConfidence = fields.length > 0
    ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
    : 0;

  return { fields, avgConfidence };
}

function computeScore(entity: EntityInput): number {
  let score = 0.70; // Base NER score

  if (entity.rxNormCode) score += 0.15; // Matched in authoritative RxNorm DB
  if (entity.loincCode)  score += 0.10; // Matched in LOINC
  if (entity.icdCode)    score += 0.10; // Matched in ICD

  if (entity.text.length > 3)  score += 0.03;
  if (entity.text.length > 10) score += 0.02;

  return Math.min(score, 1.0);
}
