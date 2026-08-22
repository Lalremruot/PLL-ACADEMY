import { NextRequest } from 'next/server';
import { createRazorpaySubscriptionOrder } from '@/services/razorpayService';
import { getAllSubscriptions } from '@/services/subscriptionService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;
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
    return errorResponse(err.message || 'Failed to create mandate order', 500);
  }
}
