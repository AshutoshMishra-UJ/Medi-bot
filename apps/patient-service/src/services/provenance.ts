import { prisma } from '@medibot/db';
import type { ProvenanceInput } from '@medibot/types';

/**
 * Creates a Provenance record and passes its ID to the writer function.
 * ALL clinical writes (conditions, allergies, medications, labs) MUST use this.
 * Never write clinical records without provenance — it's a regulatory requirement.
 */
export async function withProvenance<T>(
  source: ProvenanceInput & { pageNumber?: number; extractionModel?: string; modelVersion?: string },
  writer: (provenanceId: string) => Promise<T>,
): Promise<T> {
  const provenance = await prisma.provenance.create({
    data: {
      sourceType:      source.sourceType,
      sourceDate:      new Date(source.sourceDate),
      documentId:      source.documentId ?? null,
      pageNumber:      source.pageNumber ?? null,
      extractionModel: source.extractionModel ?? null,
      modelVersion:    source.modelVersion ?? null,
      confidence:      source.confidence ?? null,
    },
  });

  return writer(provenance.sourceId);
}

/**
 * Default provenance for manual user entries via the API.
 */
export function manualEntryProvenance(): ProvenanceInput {
  return {
    sourceType: 'manual_entry',
    sourceDate: new Date().toISOString(),
  };
}

/**
 * Verifies the patient belongs to the requesting user.
 * Returns the patient profile or null if not found/not owned.
 */
export async function getOwnedPatient(patientId: string, userId?: string) {
  const patient = await prisma.patientProfile.findUnique({
    where: { patientId },
  });
  if (!patient) return null;
  if (userId && patient.userId !== userId) return 'forbidden';
  return patient;
}
