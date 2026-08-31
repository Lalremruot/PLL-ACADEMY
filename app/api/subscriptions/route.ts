import { NextRequest } from 'next/server';
import { 
  getAllSubscriptions, 
  createSubscription, 
  updateSubscription, 
  updateSubscriptionStatus, 
  updateAllSubscriptions 
} from '@/services/subscriptionService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager', 'parent']);
  if ('response' in auth) return auth.response;
  try {
    const subscriptions = await getAllSubscriptions();
    // Parents only ever see their own child's subscription(s) — never the
    // full registry. Admin and managers get everything.
    const scoped =
      auth.user.role === 'parent'
        ? subscriptions.filter((s) => s.parentEmail.toLowerCase() === auth.user.email.toLowerCase())
        : subscriptions;
    return successResponse(scoped, 'Subscriptions retrieved successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch subscriptions', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager', 'parent']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      if (auth.user.role !== 'admin') {
        return errorResponse('Only an admin can replace the entire subscription registry.', 403);
      }
      const updated = await updateAllSubscriptions(body);
      return successResponse(updated, 'Subscriptions synchronized successfully');
    }

    if (body.id && auth.user.role === 'parent') {
      const target = body.id;
      const existing = (await getAllSubscriptions()).find((s) => s.id === target);
      if (!existing || existing.parentEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
        return errorResponse('You do not have permission to manage this subscription.', 403);
      }
    }

    if (body.action === 'updateStatus' && body.subId && body.newStatus) {
      const updated = await updateSubscriptionStatus(body.subId, body.newStatus);
      if (!updated) return errorResponse('Subscription not found', 404);
      return successResponse(updated, 'Subscription status updated');
    }

    if (body.id) {
      const updated = await updateSubscription(body);
      return successResponse(updated, 'Subscription updated successfully');
    }

    if (auth.user.role !== 'admin') {
      return errorResponse('Only an admin can create subscriptions.', 403);
    }

    const created = await createSubscription(body);
    return successResponse(created, 'Subscription created successfully', 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to process subscription request', 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateAllSubscriptions(body);
      return successResponse(updated, 'Subscriptions updated successfully');
    }

    const updated = await updateSubscription(body);
    return successResponse(updated, 'Subscription updated successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update subscription', 500);
  }
}
