import { NextRequest } from 'next/server';
import { getRazorpayCredentials, verifyPaymentSignature } from '@/services/razorpayService';
import { payInvoice } from '@/services/invoiceService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { invoiceId, paymentId, orderId, signature } = body;
    if (!invoiceId || !paymentId || !orderId || !signature) {
      return errorResponse('invoiceId, paymentId, orderId and signature are required', 400);
    }

    const creds = await getRazorpayCredentials();
    const valid = verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
      keySecret: creds.keySecret,
    });
    if (!valid) {
      return errorResponse('Payment signature verification failed', 400);
    }

    const updated = await payInvoice(invoiceId, paymentId);
    if (!updated) {
      return errorResponse(`Invoice ${invoiceId} not found`, 404);
    }

    return successResponse(updated, 'Payment verified successfully', 200);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to verify payment', 500);
  }
}
