import { NextRequest } from 'next/server';
import { AuthenticationError, loginParentByLoginId, loginUser } from '@/services/authService';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 'login', 10);
  if (limited) return limited;
  try {
    const body = await req.json();
    const { email, role, password, parentLoginId } = body;

    if (!role || !['admin', 'manager', 'parent'].includes(role)) {
      return errorResponse('Valid user role (admin, manager, or parent) is required', 400);
    }

    let user;
    if (role === 'parent') {
      if (!parentLoginId || typeof parentLoginId !== 'string') {
        return errorResponse('Parent login ID is required', 400);
      }
      user = await loginParentByLoginId(parentLoginId);
    } else {
      if (!email || typeof email !== 'string') {
        return errorResponse('Email address is required', 400);
      }
      if (!password || typeof password !== 'string') {
        return errorResponse('Password is required', 400);
      }
      user = await loginUser(email, role, password);
    }

    const token = createSessionToken(user);
    const response = successResponse(user, 'Authentication successful');
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof AuthenticationError) {
      return errorResponse(err.message, 401);
    }
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return errorResponse(message, 500);
  }
}
