import { NextRequest } from 'next/server';
import {
  getManagerPermissions,
  updateManagerPermissions,
} from '@/services/settingsService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { DEFAULT_MANAGER_PERMISSIONS, ManagerPermissions } from '@/src/types';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager']);
  if ('response' in auth) return auth.response;
  try {
    const permissions = await getManagerPermissions();
    return successResponse(permissions, 'Manager permissions retrieved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch permissions';
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const permissions: ManagerPermissions = {
      ...DEFAULT_MANAGER_PERMISSIONS,
      ...body,
    };
    const updated = await updateManagerPermissions(permissions);
    return successResponse(updated, 'Manager permissions updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update permissions';
    return errorResponse(message, 500);
  }
}
