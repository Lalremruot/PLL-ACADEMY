import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { getAllSubscriptions } from '@/services/subscriptionService';
import { disableAutoDebit } from '@/services/subscriptionBillingService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'parent']);
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

    if (!sub.autoDebit) {
      return errorResponse('Auto-debit is not enabled for this subscription.', 400);
    }

    const updated = await disableAutoDebit(subscriptionId);
    if (!updated) {
      return errorResponse('Failed to cancel auto-debit', 500);
    }

    return successResponse(updated, 'Auto-debit cancelled. Pay invoices manually or re-enable mandate anytime.');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel auto-debit';
    return errorResponse(message, 500);
  }
}
