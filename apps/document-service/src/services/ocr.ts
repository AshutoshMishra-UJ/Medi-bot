import { config } from '@medibot/config';

/**
 * OCR service — converts uploaded document to raw text.
 * Supports: local_tesseract (default, no keys needed) | textract (AWS)
 */
export async function runOCR(filePath: string): Promise<string> {
  const provider = config.uploads.ocrProvider;

  console.log(`[OCR] Using provider: ${provider}`);

  if (provider === 'local_tesseract') {
    return runTesseractLocal(filePath);
  }

  if (provider === 'textract') {
    return runAWSTextract(filePath);
  }

  throw new Error(`Unknown OCR provider: ${provider}`);
}

async function runTesseractLocal(filePath: string): Promise<string> {
  // npm install tesseract.js (installed via document-service dependencies)
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');

  try {
    const { data } = await worker.recognize(filePath);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

async function runAWSTextract(filePath: string): Promise<string> {
  const fs = await import('fs');
  const { TextractClient, DetectDocumentTextCommand } = await import('@aws-sdk/client-textract');

  const client = new TextractClient({
    region:      process.env.AWS_REGION ?? 'ap-south-1',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });

  const fileBytes = fs.readFileSync(filePath);
  const response  = await client.send(new DetectDocumentTextCommand({
    Document: { Bytes: fileBytes },
  }));

  return (response.Blocks ?? [])
    .filter((b: { BlockType?: string; Text?: string }) => b.BlockType === 'LINE' && b.Text)
    .map((b: { Text?: string }) => b.Text!)
    .join('\n');
}
