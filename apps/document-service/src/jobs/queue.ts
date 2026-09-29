import { runExtractionPipeline } from '../services/extraction';

// A simple in-memory queue to replace Redis/BullMQ for local testing
const queue: { documentId: string; filePath: string }[] = [];
let isProcessing = false;

export const extractionQueue = {
  add: async (name: string, data: { documentId: string; filePath: string }) => {
    console.log(`[Queue] Added document ${data.documentId} to in-memory queue`);
    queue.push(data);
    processNext();
  }
};

async function processNext() {
  if (isProcessing || queue.length === 0) return;
  
  isProcessing = true;
  const job = queue.shift();
  
  if (job) {
    console.log(`[Worker] Processing document: ${job.documentId}`);
    try {
      await runExtractionPipeline(job.documentId, job.filePath);
      console.log(`[Worker] ✅ Completed: ${job.documentId}`);
    } catch (err: any) {
      console.error(`[Worker] ❌ Failed: ${job.documentId}`, err.message);
    }
  }
  
  isProcessing = false;
  // Automatically process the next item in the queue if any
  if (queue.length > 0) {
    processNext();
  }
}
