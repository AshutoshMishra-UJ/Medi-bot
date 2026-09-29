import { prisma } from '@medibot/db';

/**
 * Auto-commits HIGH confidence (status='confirmed') fields to Patient 360.
 * Called automatically after extraction pipeline completes.
 */
export async function autoCommitHighConfidence(documentId: string): Promise<void> {
  const doc = await prisma.healthDocument.findUnique({ where: { documentId } });
  if (!doc) return;

  const highConfFields = await prisma.extractedField.findMany({
    where: { documentId, confidence: { gte: 0.85 }, status: 'confirmed' },
  });

  for (const field of highConfFields) {
    await commitFieldToPatient360(doc.patientId, field);
  }
}

/**
 * Commits all user-confirmed fields to Patient 360 after confirmation POST.
 * Returns the list of committed field IDs.
 */
export async function commitConfirmedFields(documentId: string): Promise<string[]> {
  const doc = await prisma.healthDocument.findUnique({ where: { documentId } });
  if (!doc) return [];

  const confirmedFields = await prisma.extractedField.findMany({
    where: { documentId, status: 'confirmed' },
  });

  const committed: string[] = [];
  for (const field of confirmedFields) {
    const ok = await commitFieldToPatient360(doc.patientId, field);
    if (ok) committed.push(field.fieldId);
  }
  return committed;
}

/**
 * Maps a confirmed ExtractedField to the appropriate Patient 360 table.
 * Each write also creates a HealthEvent for the Medical Timeline.
 */
async function commitFieldToPatient360(patientId: string, field: any): Promise<boolean> {
  const provenanceId = field.provenanceId;

  try {
    if (field.fieldName === 'medication_name') {
      await prisma.medication.create({
        data: {
          patientId,
          name:        field.normalizedValue ?? field.rawValue,
          rxNormCode:  field.rxNormCode ?? null,
          provenanceId,
        },
      });
      await prisma.healthEvent.create({
        data: {
          patientId,
          eventType:     'prescription',
          eventTime:     new Date(),
          summary:       `Medication extracted from document: ${field.normalizedValue ?? field.rawValue}`,
          structuredData: { fieldId: field.fieldId, rxNormCode: field.rxNormCode },
          provenanceId,
        },
      });
      return true;
    }

    if (field.fieldName === 'diagnosis') {
      await prisma.medicalCondition.create({
        data: {
          patientId,
          name:        field.normalizedValue ?? field.rawValue,
          icdCode:     field.icdCode ?? null,
          provenanceId,
        },
      });
      await prisma.healthEvent.create({
        data: {
          patientId,
          eventType:     'diagnosis',
          eventTime:     new Date(),
          summary:       `Diagnosis extracted from document: ${field.normalizedValue ?? field.rawValue}`,
          structuredData: { fieldId: field.fieldId, icdCode: field.icdCode },
          provenanceId,
        },
      });
      return true;
    }

    if (field.fieldName === 'lab_value' && field.rawValue) {
      const numericValue = parseFloat(field.rawValue);
      await prisma.labResult.create({
        data: {
          patientId,
          testName:    field.normalizedValue ?? 'Unknown test',
          loincCode:   field.loincCode ?? null,
          value:       isNaN(numericValue) ? null : numericValue,
          valueText:   isNaN(numericValue) ? field.rawValue : null,
          observedAt:  new Date(),
          provenanceId,
        },
      });
      await prisma.healthEvent.create({
        data: {
          patientId,
          eventType:     'lab_result',
          eventTime:     new Date(),
          summary:       `Lab result extracted from document: ${field.normalizedValue ?? field.rawValue}`,
          structuredData: { fieldId: field.fieldId, loincCode: field.loincCode },
          provenanceId,
        },
      });
      return true;
    }

    if (field.fieldName === 'allergy') {
      await prisma.allergy.create({
        data: { patientId, substance: field.normalizedValue ?? field.rawValue, provenanceId },
      });
      await prisma.healthEvent.create({
        data: {
          patientId,
          eventType:     'allergy',
          eventTime:     new Date(),
          summary:       `Allergy extracted from document: ${field.normalizedValue ?? field.rawValue}`,
          structuredData: { fieldId: field.fieldId },
          provenanceId,
        },
      });
      return true;
    }

    // Unhandled field type — log and skip
    console.warn(`[commit] Unhandled field type: ${field.fieldName}`);
    return false;

  } catch (err: any) {
    console.error(`[commit] Failed to commit field ${field.fieldId}:`, err.message);
    return false;
  }
}
