import { NextRequest } from 'next/server';
import {
  getAcademySettings,
  updateAcademySettings,
} from '@/services/settingsService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { AcademyLocationAndTiming, DEFAULT_ACADEMY_SETTINGS } from '@/src/types';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager']);
  if ('response' in auth) return auth.response;
  try {
    const settings = await getAcademySettings();
    return successResponse(settings, 'Academy settings retrieved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch academy settings';
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const settings: AcademyLocationAndTiming = {
      ...DEFAULT_ACADEMY_SETTINGS,
      ...body,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      radiusMeters: Number(body.radiusMeters),
      gracePeriodMinutes: Number(body.gracePeriodMinutes),
    };
    if (Number.isNaN(settings.latitude) || Number.isNaN(settings.longitude)) {
      return errorResponse('Valid latitude and longitude are required', 400);
    }
    if (settings.radiusMeters <= 0) {
      return errorResponse('Radius must be a positive number of meters', 400);
    }
    const updated = await updateAcademySettings(settings);
    return successResponse(updated, 'Academy settings updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update academy settings';
    return errorResponse(message, 500);
  }
}
