import axios from 'axios';
import type { NEREntity } from '@medibot/types';

interface NormalizedEntity extends NEREntity {
  fieldName:       string;
  normalizedValue: string;
  rxNormCode?:     string;
  loincCode?:      string;
  icdCode?:        string;
}

/**
 * Maps NER entities to structured field names and enriches with
 * RxNorm codes (drugs) and optionally LOINC/ICD codes.
 * Normalization failures are NON-FATAL — proceed without code if lookup fails.
 */
export async function normalizeEntities(entities: NEREntity[]): Promise<NormalizedEntity[]> {
  return Promise.all(entities.map(async (entity) => {
    if (entity.label === 'CHEMICAL') {
      const rxNormCode = await lookupRxNorm(entity.text);
      return {
        ...entity,
        fieldName:       'medication_name',
        normalizedValue: entity.text.toLowerCase().trim(),
        rxNormCode:      rxNormCode ?? undefined,
      };
    }

    if (entity.label === 'DISEASE') {
      return {
        ...entity,
        fieldName:       'diagnosis',
        normalizedValue: entity.text.trim(),
      };
    }

    if (entity.label === 'ANATOMY') {
      return {
        ...entity,
        fieldName:       'body_location',
        normalizedValue: entity.text.trim(),
      };
    }

    return {
      ...entity,
      fieldName:       'other',
      normalizedValue: entity.text.trim(),
    };
  }));
}

async function lookupRxNorm(drugName: string): Promise<string | null> {
  try {
    const resp = await axios.get(
      `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}&search=1`,
      { timeout: 5_000 },
    );
    return resp.data?.idGroup?.rxnormId?.[0] ?? null;
  } catch {
    return null; // Non-fatal — normalization failure is acceptable
  }
}
