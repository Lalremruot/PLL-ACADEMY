import { NextRequest } from 'next/server';
import {
  getRazorpayCredentials,
  verifyPaymentSignature,
  fetchRazorpayPaymentTokenId,
} from '@/services/razorpayService';
import { settleSubscriptionCycle } from '@/services/subscriptionBillingService';
import { getAllSubscriptions } from '@/services/subscriptionService';
import { requireAuth } from '@/lib/authGuard';
import { rateLimit } from '@/lib/rateLimit';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'parent']);
  if ('response' in auth) return auth.response;
  const limited = rateLimit(req, 'rzp-subscription-verify', 30, auth.user.email);
  if (limited) return limited;
  try {
    const body = await req.json();
    const { subscriptionId, paymentId, orderId, signature } = body;
    if (!subscriptionId || !paymentId || !orderId || !signature) {
      return errorResponse('subscriptionId, paymentId, orderId and signature are required', 400);
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

    const subscriptions = await getAllSubscriptions();
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) {
      return errorResponse(`Subscription ${subscriptionId} not found`, 404);
    }
    if (auth.user.role === 'parent' && sub.parentEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
      return errorResponse('You do not have permission to activate auto-debit for this subscription.', 403);
    }
    if (auth.user.role === 'parent' && auth.user.subscriptionId && auth.user.subscriptionId !== sub.id) {
      return errorResponse('You do not have permission to activate auto-debit for this subscription.', 403);
    }

    let tokenId: string | null = null;
    try {
      tokenId = await fetchRazorpayPaymentTokenId(paymentId);
    } catch {
      // Token lookup is best-effort; the mandate still activates without it.
    }

    const updated = await settleSubscriptionCycle(subscriptionId, paymentId, tokenId || undefined);
    if (!updated) {
      return errorResponse(`Subscription ${subscriptionId} not found`, 404);
    }

    return successResponse(updated, 'Auto-debit mandate activated and first cycle settled', 200);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to verify subscription payment', 500);
  }
}
