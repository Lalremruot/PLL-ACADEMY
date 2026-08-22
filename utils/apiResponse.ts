import { NextResponse } from 'next/server';

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      message: message || 'Operation completed successfully',
      data,
    },
    { status }
  );
}

export function errorResponse(error: string | Error, status = 400) {
  const errorMessage = typeof error === 'string' ? error : error.message || 'An unexpected error occurred';
  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
    },
    { status }
  );
}
