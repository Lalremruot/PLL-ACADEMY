import { NextRequest } from 'next/server';
import {
  changeUserPassword,
  createUserAccount,
  listStaffAccounts,
} from '@/services/authService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const accounts = await listStaffAccounts();
    return successResponse(accounts, 'Staff accounts retrieved successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch staff accounts';
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { email, role, password } = body;
    if (!email || typeof email !== 'string') {
      return errorResponse('Email address is required', 400);
    }
    if (!role || !['admin', 'manager'].includes(role)) {
      return errorResponse('Role must be either admin or manager', 400);
    }
    if (!password || typeof password !== 'string') {
      return errorResponse('Password is required', 400);
    }
    if (password.length < 6) {
      return errorResponse('Password must be at least 6 characters.', 400);
    }
    const account = await createUserAccount({
      email,
      role,
      password,
      name: typeof body.name === 'string' ? body.name : undefined,
      designation: typeof body.designation === 'string' ? body.designation : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      profilePic: typeof body.profilePic === 'string' ? body.profilePic : undefined,
    });
    return successResponse(account, 'Account created successfully', 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create account';
    return errorResponse(message, 400);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { email, currentPassword, newPassword } = body;
    if (!email || typeof email !== 'string') {
      return errorResponse('Email address is required', 400);
    }
    if (!currentPassword || !newPassword) {
      return errorResponse('Current and new password are required', 400);
    }
    const account = await changeUserPassword({ email, currentPassword, newPassword });
    return successResponse(account, 'Password updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update password';
    return errorResponse(message, 400);
  }
}
