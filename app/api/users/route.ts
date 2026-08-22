import { getAllUsers } from '@/services/userService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET() {
  try {
    const users = await getAllUsers();
    return successResponse(users, 'Users retrieved successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch users', 500);
  }
}
