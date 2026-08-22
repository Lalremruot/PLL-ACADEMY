import { SESSION_COOKIE_NAME } from '@/lib/session';
import { successResponse } from '@/utils/apiResponse';

export async function POST() {
  const response = successResponse({ loggedOut: true }, 'Logged out successfully');
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
