import { NextRequest } from 'next/server';
import { confirmPaymentViaWebhook } from '@/services/razorpayService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const acknowledged = await confirmPaymentViaWebhook(bodyText, signature);
    if (!acknowledged) {
      return errorResponse('Invalid webhook signature', 400);
    }
    return successResponse({ received: true }, 'Webhook acknowledged');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to process webhook', 500);
  }
}
