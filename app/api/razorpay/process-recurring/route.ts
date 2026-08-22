import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/authGuard';
import { processAllDueAutoDebits, getDueAutoDebitSubscriptions } from '@/services/subscriptionBillingService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;

  try {
    const due = await getDueAutoDebitSubscriptions();
    return successResponse(
      {
        count: due.length,
        subscriptions: due.map((s) => ({
          id: s.id,
          studentName: s.studentName,
          parentEmail: s.parentEmail,
          nextBillingDate: s.nextBillingDate,
          monthlyFee: s.monthlyFee,
        })),
      },
      'Due auto-debit subscriptions retrieved'
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list due subscriptions';
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;

  try {
    const results = await processAllDueAutoDebits();
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return successResponse(
      { processed: results.length, succeeded, failed, results },
      results.length === 0
        ? 'No due auto-debit subscriptions to process'
        : `Processed ${results.length} subscription(s): ${succeeded} succeeded, ${failed} failed`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process recurring charges';
    return errorResponse(message, 500);
  }
}
