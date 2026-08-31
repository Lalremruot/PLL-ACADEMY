import { NextRequest } from 'next/server';
import { getAllUsers } from '@/services/userService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const users = await getAllUsers();
    return successResponse(users, 'Users retrieved successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch users', 500);
  }
}
