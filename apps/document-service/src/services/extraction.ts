import { prisma } from '@medibot/db';
import { runOCR } from './ocr';
import { runNER } from './ner';
import { normalizeEntities } from './normalize';
import { scoreConfidence } from './confidence';
import { autoCommitHighConfidence } from './commit';
import { config } from '@medibot/config';

/**
 * Full extraction pipeline — runs as a BullMQ background job.
 * Steps: OCR → NER → Normalize → Score → Write ExtractedFields → Auto-commit HIGH confidence
 */
export async function runExtractionPipeline(documentId: string, filePath: string): Promise<void> {
  // Mark as processing
  await prisma.healthDocument.update({
    where: { documentId },
    data:  { extractionStatus: 'processing' },
  });

  try {
    // Step 1: OCR → raw text
    console.log(`[Pipeline] Step 1: OCR for ${documentId}`);
    const rawText = await runOCR(filePath);

    if (!rawText || rawText.trim().length < 10) {
      throw new Error('OCR produced insufficient text — document may be blank or corrupt');
    }

    // Step 2: NER → medical entities
    console.log(`[Pipeline] Step 2: NER for ${documentId}`);
    const entities = await runNER(rawText);

    // Step 3: Normalize → RxNorm / LOINC codes
    console.log(`[Pipeline] Step 3: Normalize ${entities.length} entities`);
    const normalized = await normalizeEntities(entities);

    // Step 4: Score confidence per field
    const { fields, avgConfidence } = scoreConfidence(normalized, config.confidence);

    // Step 5: Create ONE Provenance record for this extraction run
    const provenance = await prisma.provenance.create({
      data: {
        sourceType:      'document',
        sourceDate:      new Date(),
        documentId,
        extractionModel: 'scispacy-v3',
        modelVersion:    '1.0.0',
        confidence:      avgConfidence,
      },
    });

    // Step 6: Write ExtractedField rows
    console.log(`[Pipeline] Step 6: Writing ${fields.length} extracted fields`);
    await Promise.all(fields.map((field) =>
      prisma.extractedField.create({
        data: {
          documentId,
          fieldName:       field.fieldName,
          rawValue:        field.rawValue,
          normalizedValue: field.normalizedValue,
          rxNormCode:      field.rxNormCode ?? null,
          loincCode:       field.loincCode ?? null,
          icdCode:         field.icdCode ?? null,
          confidence:      field.confidence,
          status:          field.status,
          provenanceId:    provenance.sourceId,
        },
      })
    ));

    // Step 7: Auto-commit HIGH confidence fields to Patient 360
    console.log(`[Pipeline] Step 7: Auto-committing high-confidence fields`);
    await autoCommitHighConfidence(documentId);

    // Mark complete
    await prisma.healthDocument.update({
      where: { documentId },
      data:  { extractionStatus: 'done' },
    });

    console.log(`[Pipeline] ✅ Done: ${documentId} — ${fields.length} fields, avg confidence: ${avgConfidence.toFixed(2)}`);

  } catch (err: any) {
    console.error(`[Pipeline] ❌ Failed: ${documentId}`, err.message);
    await prisma.healthDocument.update({
      where: { documentId },
      data:  { extractionStatus: 'failed' },
    });
    throw err; // re-throw so BullMQ can retry
  }
}
