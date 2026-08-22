import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken, SessionPayload } from './session';
import { errorResponse } from '@/utils/apiResponse';

export type AuthResult =
  | { ok: true; user: SessionPayload }
  | { ok: false; response: NextResponse };

/**
 * Reads and verifies the httpOnly session cookie from the request.
 * Returns the session payload or null when the cookie is absent/invalid.
 */
export function getSessionUser(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Guards an API route: returns the session user when the request carries a
 * valid session whose role is included in `roles`, otherwise an error response
 * (401 when unauthenticated, 403 when authenticated but unauthorized).
 */
export function requireAuth(
  req: NextRequest,
  roles: SessionPayload['role'][] = ['admin', 'manager', 'parent']
): AuthResult {
  const user = getSessionUser(req);
  if (!user) {
    return { ok: false, response: errorResponse('Authentication required. Please log in.', 401) };
  }
  if (!roles.includes(user.role)) {
    return { ok: false, response: errorResponse('You do not have permission to access this resource.', 403) };
  }
  return { ok: true, user };
}
