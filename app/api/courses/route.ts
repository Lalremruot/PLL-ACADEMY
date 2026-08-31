import { NextRequest } from 'next/server';
import { getAllCourses, createCourse, updateCourses } from '@/services/courseService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;
  try {
    const courses = await getAllCourses();
    return successResponse(courses, 'Courses retrieved successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch courses', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateCourses(body);
      return successResponse(updated, 'Courses updated successfully');
    }
    const created = await createCourse(body);
    return successResponse(created, 'Course created successfully', 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to process course request', 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateCourses(body);
      return successResponse(updated, 'Courses updated successfully');
    }
    return errorResponse('Expected array of courses for bulk update', 400);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update courses', 500);
  }
}
