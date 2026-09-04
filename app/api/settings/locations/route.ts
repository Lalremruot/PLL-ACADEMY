import { NextRequest } from 'next/server';
import {
  getLocations,
  updateLocations,
  getManagerLocationAssignments,
  updateManagerLocationAssignments,
} from '@/services/settingsService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';
import { AcademyLocation } from '@/src/types';

async function makeLocation(raw: unknown): Promise<AcademyLocation | null> {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const b = raw as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const address = typeof b.address === 'string' ? b.address.trim() : '';
  const latitude = Number(b.latitude);
  const longitude = Number(b.longitude);
  const radiusMeters = Number(b.radiusMeters);
  const gracePeriodMinutes = Number(b.gracePeriodMinutes);
  const shiftStartTime = typeof b.shiftStartTime === 'string' ? b.shiftStartTime : '09:00';
  const shiftEndTime = typeof b.shiftEndTime === 'string' ? b.shiftEndTime : '17:00';
  if (!name) {
    throw new Error('Location name is required');
  }
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error('Valid latitude and longitude are required');
  }
  if (!(radiusMeters > 0)) {
    throw new Error('Radius must be a positive number of meters');
  }
  if (!(gracePeriodMinutes >= 0)) {
    throw new Error('Grace period must be zero or more minutes');
  }
  return {
    id: typeof b.id === 'string' && b.id ? b.id : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    address,
    latitude,
    longitude,
    radiusMeters,
    gracePeriodMinutes,
    shiftStartTime,
    shiftEndTime,
  };
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager']);
  if ('response' in auth) return auth.response;
  try {
    const locations = await getLocations();
    return successResponse(locations, 'Locations retrieved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch locations';
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const location = await makeLocation(body);
    if (!location) {
      return errorResponse('Invalid location payload', 400);
    }
    const current = await getLocations();
    const next = [...current, location];
    const saved = await updateLocations(next);
    return successResponse(saved, 'Location added successfully', 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add location';
    return errorResponse(message, 400);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { id } = body as { id?: string };
    if (!id || typeof id !== 'string') {
      return errorResponse('Location id is required', 400);
    }
    const location = await makeLocation({ ...body, id });
    if (!location) {
      return errorResponse('Invalid location payload', 400);
    }
    const current = await getLocations();
    const next = current.map((loc) => (loc.id === id ? location : loc));
    if (!next.some((loc) => loc.id === id)) {
      return errorResponse('Location not found', 404);
    }
    const saved = await updateLocations(next);
    return successResponse(saved, 'Location updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update location';
    return errorResponse(message, 400);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return errorResponse('Location id is required', 400);
    }
    const current = await getLocations();
    if (!current.some((loc) => loc.id === id)) {
      return errorResponse('Location not found', 404);
    }
    const next = current.filter((loc) => loc.id !== id);
    const saved = await updateLocations(next);
    const assignments = await getManagerLocationAssignments();
    const pruned = Object.fromEntries(
      Object.entries(assignments).filter(([, locId]) => locId !== id)
    );
    await updateManagerLocationAssignments(pruned);
    return successResponse(saved, 'Location deleted successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete location';
    return errorResponse(message, 400);
  }
}
