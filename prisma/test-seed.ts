import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Create Provenance records
  const provenanceManual = await prisma.provenance.create({
    data: {
      sourceType: 'manual_entry',
      sourceDate: new Date('2024-01-01'),
      confidence: 1.0,
    }
  });

  const provenanceDoc = await prisma.provenance.create({
    data: {
      sourceType: 'document',
      sourceDate: new Date('2024-03-15'),
      extractionModel: 'scispacy-v3',
      modelVersion: '1.0.0',
      confidence: 0.95,
    }
  });
  
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: 'dummyhash',
      profile: {
        create: {
          dateOfBirth: new Date('1985-05-15'),
          sex: 'male',
          bloodGroup: 'O+',
          conditions: {
            create: [
              { name: 'Type 2 Diabetes', status: 'active', onsetDate: new Date('2020-01-01'), provenanceId: provenanceManual.sourceId },
              { name: 'Hypertension', status: 'active', onsetDate: new Date('2018-06-15'), provenanceId: provenanceManual.sourceId }
            ]
          },
          medications: {
            create: [
              { name: 'Metformin', dose: '500mg', frequency: 'twice daily', status: 'active', provenanceId: provenanceManual.sourceId },
              { name: 'Lisinopril', dose: '10mg', frequency: 'once daily', status: 'active', provenanceId: provenanceManual.sourceId }
            ]
          },
          allergies: {
            create: [
              { substance: 'Penicillin', reaction: 'Hives', severity: 'severe', provenanceId: provenanceManual.sourceId }
            ]
          }
        }
      }
    },
    include: {
      profile: true
    }
  });

  const patientId = user.profile!.patientId;

  // Add HealthDocument
  const doc = await prisma.healthDocument.create({
    data: {
      patientId,
      type: 'lab_report',
      originalFilename: 'routine_bloodwork.pdf',
      storageUri: '/mock/storage/path/123.pdf',
      mimeType: 'application/pdf',
      extractionStatus: 'done',
      provenanceId: provenanceDoc.sourceId,
    }
  });

  // Add Lab Result
  const lab = await prisma.labResult.create({
    data: {
      patientId,
      testName: 'HbA1c',
      loincCode: '4548-4',
      value: 6.8,
      valueText: '6.8',
      unit: '%',
      referenceRange: '4.0 - 5.6',
      isAbnormal: true,
      observedAt: new Date('2024-03-14T08:30:00Z'),
      provenanceId: provenanceDoc.sourceId,
    }
  });

  // Add Health Events (Timeline)
  await prisma.healthEvent.createMany({
    data: [
      {
        patientId,
        eventType: 'diagnosis',
        eventTime: new Date('2020-01-01'),
        summary: 'Diagnosed with Type 2 Diabetes',
        provenanceId: provenanceManual.sourceId,
      },
      {
        patientId,
        eventType: 'medication_start',
        eventTime: new Date('2020-01-02'),
        summary: 'Started Metformin 500mg twice daily',
        provenanceId: provenanceManual.sourceId,
      },
      {
        patientId,
        eventType: 'lab_result',
        eventTime: new Date('2024-03-14T08:30:00Z'),
        summary: 'Lab result extracted from document: HbA1c 6.8%',
        structuredData: { labId: lab.labId, testName: 'HbA1c', value: 6.8 },
        provenanceId: provenanceDoc.sourceId,
      }
    ]
  });

  console.log('Seed completed successfully!');
  console.log('Created test patient ID:', patientId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
