import { NextRequest } from 'next/server';
import {
  getManagerAttendance,
  updateManagerCheckOut,
  upsertManagerCheckIn,
} from '@/services/managerAttendanceService';
import { getAcademySettings } from '@/services/settingsService';
import { calculateHaversineDistance, parseClockTimeToMinutes } from '@/src/types';
import { successResponse, errorResponse } from '@/utils/apiResponse';

/**
 * Verifies a reported GPS coordinate against the academy pin entirely on the
 * server. Returns the computed distance or null when the coordinate is invalid.
 */
async function verifyProximityServerSide(latitude: unknown, longitude: unknown): Promise<number | null> {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  const settings = await getAcademySettings();
  return calculateHaversineDistance(lat, lng, settings.latitude, settings.longitude);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const managerEmail = searchParams.get('managerEmail') || undefined;
    const date = searchParams.get('date') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const records = await getManagerAttendance({ managerEmail, date, from, to });
    return successResponse(records, 'Manager attendance retrieved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch manager attendance';
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const proximity = await verifyProximityServerSide(body.latitude, body.longitude);
    if (proximity === null) {
      return errorResponse('A valid latitude and longitude are required.', 400);
    }
    const academySettings = await getAcademySettings();
    if (proximity > academySettings.radiusMeters) {
      return errorResponse(
        `GPS verification failed. You are ${proximity}m from the academy (allowed radius: ${academySettings.radiusMeters}m).`,
        403
      );
    }
    if (body.action === 'checkout') {
      if (!body.managerEmail || !body.date || !body.checkOutTime) {
        return errorResponse('managerEmail, date, and checkOutTime are required for checkout', 400);
      }
      const updated = await updateManagerCheckOut({
        managerEmail: body.managerEmail,
        date: body.date,
        checkOutTime: body.checkOutTime,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        distanceFromAcademyMeters: proximity,
        verifiedGPS: true,
      });
      return successResponse(updated, 'Manager check-out recorded successfully');
    }
    if (!body.managerEmail || !body.date || !body.checkInTime) {
      return errorResponse('managerEmail, date, and checkInTime are required', 400);
    }
    if (body.status === 'Late') {
      return errorResponse('Check-in window closed. Late attendance cannot be saved.', 403);
    }
    const startMinutes = parseClockTimeToMinutes(academySettings.shiftStartTime) ?? 0;
    const cutoffMinutes = startMinutes + academySettings.gracePeriodMinutes;
    const checkInMinutes = parseClockTimeToMinutes(body.checkInTime);
    if (checkInMinutes !== null && checkInMinutes > cutoffMinutes) {
      return errorResponse(
        `Check-in window closed. Check-ins are allowed until ${Math.floor(cutoffMinutes / 60)
          .toString()
          .padStart(2, '0')}:${String(cutoffMinutes % 60).padStart(2, '0')}.`,
        403
      );
    }
    const created = await upsertManagerCheckIn({
      ...body,
      distanceFromAcademyMeters: proximity,
      verifiedGPS: true,
    });
    return successResponse(created, 'Manager check-in recorded successfully', 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record manager attendance';
    return errorResponse(message, 500);
  }
}
