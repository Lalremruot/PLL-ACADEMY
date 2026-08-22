import { connectToDatabase } from '@/lib/mongodb';
import { BatchModel } from '@/models/Batch';

const INITIAL_BATCHES = [
  'Elite Pro Squad',
  'Under-15 Development Group',
  'Weekend Advanced Training',
  'Under-12 Elite Squad',
];

let memoryBatches: string[] = [...INITIAL_BATCHES];

export async function getAllBatches(): Promise<string[]> {
  const db = await connectToDatabase();
  if (db) {
    const count = await BatchModel.countDocuments();
    if (count === 0) {
      await BatchModel.insertMany(INITIAL_BATCHES.map(name => ({ name })));
    }
    const docs = await BatchModel.find({}).lean();
    return docs.map(doc => doc.name);
  }

  return memoryBatches;
}

export async function createBatch(batchName: string): Promise<string> {
  const trimmed = batchName.trim();
  if (!trimmed) throw new Error('Batch name cannot be empty');

  const db = await connectToDatabase();
  if (db) {
    await BatchModel.create({ name: trimmed });
  } else {
    if (!memoryBatches.includes(trimmed)) {
      memoryBatches.push(trimmed);
    }
  }

  return trimmed;
}

export async function updateBatches(batches: string[]): Promise<string[]> {
  const db = await connectToDatabase();
  if (db) {
    await BatchModel.deleteMany({});
    await BatchModel.insertMany(batches.map(name => ({ name })));
    return batches;
  }

  memoryBatches = [...batches];
  return memoryBatches;
}
