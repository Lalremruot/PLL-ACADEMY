import { NextRequest } from 'next/server';
import { payInvoice } from '@/services/invoiceService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return errorResponse('invoiceId is required', 400);
    }

    const updated = await payInvoice(invoiceId);
    if (!updated) {
      return errorResponse(`Invoice with ID ${invoiceId} not found`, 404);
    }

    return successResponse(updated, 'Invoice paid successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to process payment', 500);
  }
}
