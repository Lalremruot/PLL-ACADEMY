import { NextRequest } from 'next/server';
import { createRazorpaySubscriptionOrder } from '@/services/razorpayService';
import { getAllSubscriptions } from '@/services/subscriptionService';
import { requireAuth } from '@/lib/authGuard';
import { rateLimit } from '@/lib/rateLimit';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;
  const limited = rateLimit(req, 'rzp-subscription-order', 20, auth.user.email);
  if (limited) return limited;
  try {
    const body = await req.json();
    const { subscriptionId } = body;
    if (!subscriptionId) {
      return errorResponse('subscriptionId is required', 400);
    }

    const subscriptions = await getAllSubscriptions();
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) {
      return errorResponse(`Subscription ${subscriptionId} not found`, 404);
    }
    if (auth.user.role === 'parent' && sub.parentEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
      return errorResponse('You do not have permission to manage this subscription.', 403);
    }
    if (auth.user.role === 'parent' && auth.user.subscriptionId && auth.user.subscriptionId !== sub.id) {
      return errorResponse('You do not have permission to manage this subscription.', 403);
    }
    if (sub.status !== 'Active') {
      return errorResponse('Only active subscriptions can set up auto-debit.', 400);
    }
    if (sub.autoDebit && sub.razorpayTokenId) {
      return errorResponse('Auto-debit is already enabled for this subscription.', 400);
    }

    const order = await createRazorpaySubscriptionOrder({
      subscriptionId: sub.id,
      amount: sub.monthlyFee,
      parentName: sub.parentName,
      parentEmail: sub.parentEmail,
    });

    return successResponse(order, 'Razorpay mandate order created', 200);
  } catch (err: any) {
    // Surface the underlying Razorpay reason (detail/description) so the
    // parent gets something actionable, not just the generic fallback.
    const detail =
      err?.error?.description ||
      err?.error?.reason ||
      err?.response?.data?.error?.description ||
      err?.message;
    return errorResponse(detail || 'Failed to create mandate order', 500);
  }
}
