import { NextRequest } from 'next/server';
import { getAllBatches, createBatch, updateBatches } from '@/services/batchService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET() {
  try {
    const batches = await getAllBatches();
    return successResponse(batches, 'Batches retrieved successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch batches', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateBatches(body);
      return successResponse(updated, 'Batches updated successfully');
    }
    const { name } = body;
    if (!name) return errorResponse('Batch name is required', 400);

    const created = await createBatch(name);
    return successResponse(created, 'Batch created successfully', 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create batch', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateBatches(body);
      return successResponse(updated, 'Batches updated successfully');
    }
    return errorResponse('Expected array of batch strings', 400);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update batches', 500);
  }
}
