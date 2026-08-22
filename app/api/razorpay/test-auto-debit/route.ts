import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { getRazorpayPublicCredentials } from '@/services/razorpayService';
import { getAllSubscriptions } from '@/services/subscriptionService';
import {
  attachSimulatedMandate,
  disableAutoDebit,
  getDueAutoDebitSubscriptions,
  isSimulatedMandate,
  simulateAutoDebitCharge,
} from '@/services/subscriptionBillingService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

/**
 * Simulated mandates write Success invoices without money moving, so this is
 * refused outright whenever the gateway is configured for Live. An unconfigured
 * gateway defaults to Test, which is what makes the pipeline testable before
 * any Razorpay keys exist.
 */
async function assertNotLive(): Promise<string | null> {
  const creds = await getRazorpayPublicCredentials();
  if (creds.configured && creds.mode === 'Live') {
    return 'Auto-debit simulation is disabled while Razorpay is in Live mode. Switch to Test mode first.';
  }
  return null;
}

/** Snapshot of every subscription's mandate state, for the admin test panel. */
export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;

  try {
    const [creds, subs, due] = await Promise.all([
      getRazorpayPublicCredentials(),
      getAllSubscriptions(),
      getDueAutoDebitSubscriptions(),
    ]);
    const dueIds = new Set(due.map((s) => s.id));

    return successResponse(
      {
        mode: creds.mode,
        configured: creds.configured,
        simulationAllowed: !(creds.configured && creds.mode === 'Live'),
        subscriptions: subs.map((s) => ({
          id: s.id,
          studentName: s.studentName,
          parentName: s.parentName,
          monthlyFee: s.monthlyFee,
          status: s.status,
          autoDebit: Boolean(s.autoDebit),
          simulated: isSimulatedMandate(s),
          hasToken: Boolean(s.razorpayTokenId),
          nextBillingDate: s.nextBillingDate,
          due: dueIds.has(s.id),
        })),
      },
      'Auto-debit test state retrieved'
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load auto-debit test state';
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;

  try {
    const blocked = await assertNotLive();
    if (blocked) return errorResponse(blocked, 403);

    const { action, subscriptionId } = await req.json();
    if (!subscriptionId) {
      return errorResponse('subscriptionId is required', 400);
    }

    switch (action) {
      case 'attach': {
        const updated = await attachSimulatedMandate(subscriptionId);
        if (!updated) return errorResponse(`Subscription ${subscriptionId} not found`, 404);
        return successResponse(
          updated,
          'Simulated mandate attached. The subscription is now due for auto-debit.'
        );
      }
      case 'charge': {
        const result = await simulateAutoDebitCharge(subscriptionId);
        if (!result.success) {
          return errorResponse(result.error || 'Simulated charge failed', 400);
        }
        return successResponse(result, `Simulated charge settled (${result.paymentId})`);
      }
      case 'detach': {
        const updated = await disableAutoDebit(subscriptionId);
        if (!updated) return errorResponse(`Subscription ${subscriptionId} not found`, 404);
        return successResponse(updated, 'Simulated mandate removed.');
      }
      default:
        return errorResponse('action must be one of: attach, charge, detach', 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auto-debit simulation failed';
    return errorResponse(message, 500);
  }
}
