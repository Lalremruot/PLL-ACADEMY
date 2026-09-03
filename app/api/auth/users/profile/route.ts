import { NextRequest } from 'next/server';
import { updateStaffProfile } from '@/services/authService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager']);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!email) {
      return errorResponse('Account email is required', 400);
    }

    // Managers may only edit their own profile; admins may edit any staff account.
    if (auth.user.role !== 'admin' && auth.user.email.toLowerCase() !== email) {
      return errorResponse('You are not authorized to edit this account.', 403);
    }

    const account = await updateStaffProfile({
      email,
      name: typeof body.name === 'string' ? body.name : undefined,
      designation: typeof body.designation === 'string' ? body.designation : undefined,
      phone: typeof body.phone === 'string' ? body.phone : undefined,
      address: typeof body.address === 'string' ? body.address : undefined,
      profilePic: typeof body.profilePic === 'string' ? body.profilePic : undefined,
      // Only admins may change a manager's batch assignment.
      assignedBatch:
        auth.user.role === 'admin' && typeof body.assignedBatch === 'string'
          ? body.assignedBatch
          : undefined,
    });
    return successResponse(account, 'Profile updated successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    return errorResponse(message, 400);
  }
}