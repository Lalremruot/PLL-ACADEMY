import { NextRequest } from 'next/server';
import {
  getManagerLocationAssignments,
  updateManagerLocationAssignments,
} from '@/services/settingsService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { ManagerLocationAssignment } from '@/src/types';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const assignments = await getManagerLocationAssignments();
    return successResponse(assignments, 'Manager location assignments retrieved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch assignments';
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return errorResponse('Assignments must be a manager → locationId object', 400);
    }
    const assignments: ManagerLocationAssignment = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (typeof value === 'string' && value) {
        assignments[key.toLowerCase().trim()] = value;
      }
    }
    const saved = await updateManagerLocationAssignments(assignments);
    return successResponse(saved, 'Manager location assignments updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update assignments';
    return errorResponse(message, 400);
  }
}
