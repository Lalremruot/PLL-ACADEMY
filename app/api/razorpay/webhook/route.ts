import { NextRequest } from 'next/server';
import { confirmPaymentViaWebhook } from '@/services/razorpayService';
import { rateLimit } from '@/lib/rateLimit';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  // Generous cap: Razorpay retries webhooks, but blind unauthenticated traffic
  // that fails signature verification should not be able to waste CPU parsing
  // bodies indefinitely.
  const limited = rateLimit(req, 'rzp-webhook', 120);
  if (limited) return limited;
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
