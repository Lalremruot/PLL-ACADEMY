import { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/session';
import { getManagerLocationAssignments } from '@/services/settingsService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySessionToken(token);
    if (!session) {
      return errorResponse('Not authenticated', 401);
    }
    let assignedLocationId = session.assignedLocationId;
    if (session.role === 'manager') {
      const assignments = await getManagerLocationAssignments();
      assignedLocationId = assignments[session.email] || assignedLocationId;
    }
    return successResponse(
      {
        email: session.email,
        role: session.role,
        name: session.name,
        subscriptionId: session.subscriptionId,
        studentName: session.studentName,
        parentLoginId: session.parentLoginId,
        assignedBatch: session.assignedBatch,
        assignedLocationId,
      },
      'Session active'
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Session verification failed';
    return errorResponse(message, 500);
  }
}