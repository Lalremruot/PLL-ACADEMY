import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { processAllDueAutoDebits } from '@/services/subscriptionBillingService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

/**
 * Scheduled auto-debit run.
 *
 * This exists alongside the admin-triggered POST /api/razorpay/process-recurring
 * rather than replacing it. That route is guarded by an admin session, which a
 * scheduled job can never present — and weakening it would widen the surface on
 * an endpoint that moves real money. So the cron gets its own entry point with
 * its own credential.
 *
 * GET, because Vercel Cron issues GET requests. Vercel attaches
 * `Authorization: Bearer $CRON_SECRET` automatically once CRON_SECRET is set on
 * the project, so nothing needs to be configured on the schedule itself.
 */

// Charging runs serially over every due subscription, so give it room; Vercel
// caps this to whatever the plan allows.
export const maxDuration = 60;
// Never let a scheduled charge be served from a cache.
export const dynamic = 'force-dynamic';

function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // No secret configured means no authenticated caller is possible. Refusing is
  // the only safe reading — the alternative is an open endpoint that charges
  // every parent on demand.
  if (!secret) return false;

  const header = req.headers.get('authorization') || '';
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;

  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    // Deliberately vague: this endpoint should look inert to anyone probing it.
    return errorResponse('Unauthorized', 401);
  }

  try {
    const results = await processAllDueAutoDebits();
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Surfaces in the Vercel function logs, which is the only place anyone will
    // look when a parent asks why they were or were not charged.
    console.log(
      `[cron] auto-debit run: ${results.length} due, ${succeeded} succeeded, ${failed} failed`
    );
    for (const r of results.filter((x) => !x.success)) {
      console.error(`[cron] auto-debit failed for ${r.subscriptionId}: ${r.error}`);
    }

    return successResponse(
      { processed: results.length, succeeded, failed, results },
      results.length === 0
        ? 'No due auto-debit subscriptions to process'
        : `Processed ${results.length} subscription(s): ${succeeded} succeeded, ${failed} failed`
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scheduled auto-debit run failed';
    console.error('[cron] auto-debit run threw:', message);
    return errorResponse(message, 500);
  }
}
