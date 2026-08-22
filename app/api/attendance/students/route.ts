import { NextRequest } from 'next/server';
import {
  bulkUpsertStudentAttendance,
  getStudentAttendance,
  upsertStudentAttendance,
} from '@/services/studentAttendanceService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const batch = searchParams.get('batch') || undefined;
    const studentId = searchParams.get('studentId') || undefined;
    const records = await getStudentAttendance({
      date: date || (!from && !to ? new Date().toISOString().split('T')[0] : undefined),
      from,
      to,
      batch,
      studentId,
    });
    return successResponse(records, 'Student attendance retrieved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch student attendance';
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.markedByRole !== 'admin' && item.markedByRole !== 'manager') {
          return errorResponse('Only admin or manager can mark student attendance', 403);
        }
      }
      const updated = await bulkUpsertStudentAttendance(body);
      return successResponse(updated, 'Student attendance saved successfully');
    }
    if (body.markedByRole !== 'admin' && body.markedByRole !== 'manager') {
      return errorResponse('Only admin or manager can mark student attendance', 403);
    }
    const updated = await upsertStudentAttendance(body);
    return successResponse(updated, 'Student attendance saved successfully', 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save student attendance';
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item.markedByRole !== 'admin' && item.markedByRole !== 'manager') {
          return errorResponse('Only admin or manager can mark student attendance', 403);
        }
      }
      const updated = await bulkUpsertStudentAttendance(body);
      return successResponse(updated, 'Student attendance updated successfully');
    }
    if (body.markedByRole !== 'admin' && body.markedByRole !== 'manager') {
      return errorResponse('Only admin or manager can mark student attendance', 403);
    }
    const updated = await upsertStudentAttendance(body);
    return successResponse(updated, 'Student attendance updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update student attendance';
    return errorResponse(message, 500);
  }
}
