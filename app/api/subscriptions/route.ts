import { NextRequest } from 'next/server';
import { 
  getAllSubscriptions, 
  createSubscription, 
  updateSubscription, 
  updateSubscriptionStatus, 
  updateAllSubscriptions 
} from '@/services/subscriptionService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET() {
  try {
    const subscriptions = await getAllSubscriptions();
    return successResponse(subscriptions, 'Subscriptions retrieved successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch subscriptions', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateAllSubscriptions(body);
      return successResponse(updated, 'Subscriptions synchronized successfully');
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

    const created = await createSubscription(body);
    return successResponse(created, 'Subscription created successfully', 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to process subscription request', 500);
  }
}

export async function PUT(req: NextRequest) {
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
