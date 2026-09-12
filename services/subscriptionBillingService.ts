import { getAllInvoices, createInvoice, payInvoice } from '@/services/invoiceService';
import { getAllSubscriptions, updateSubscription } from '@/services/subscriptionService';
import { chargeRecurringWithToken } from '@/services/razorpayService';
import { Subscription } from '@/src/types';

/**
 * Formats a Date as YYYY-MM-DD in local time. `toISOString()` converts to UTC
 * first, which in any timezone ahead of UTC rolls the date back a day.
 */
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) {
    return toDateKey(new Date(Date.now() + months * 30 * 86400000));
  }
  return toDateKey(new Date(year, month - 1 + months, day));
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function todayKey(): string {
  return toDateKey(new Date());
}

export async function settleSubscriptionCycle(
  subscriptionId: string,
  paymentId: string,
  tokenId?: string
): Promise<Subscription | null> {
  const subs = await getAllSubscriptions();
  const sub = subs.find((s) => s.id === subscriptionId);
  if (!sub) return null;

  const now = new Date();
  const invoiceId = `INV-${sub.id.replace('SUB-', '')}-${monthKey(now)}`;
  const invoices = await getAllInvoices();
  const existing = invoices.find((inv) => inv.id === invoiceId);

  // This runs up to three times for one payment: the client verify call, the
  // payment.captured webhook, and the recurring charge itself. Advancing the
  // billing date once per caller gives the parent a free month, so settlement
  // is idempotent on two keys — the payment id (same payment replayed) and the
  // cycle invoice (this month is already paid; monthly billing means at most
  // one settlement per calendar month).
  const paymentAlreadyRecorded =
    Boolean(paymentId) && invoices.some((inv) => inv.transactionId === paymentId);
  const cycleAlreadySettled = Boolean(existing) && existing!.status === 'Success';

  if (paymentAlreadyRecorded || cycleAlreadySettled) {
    // Webhooks can beat the client callback, and only the client call carries
    // the mandate token — still persist it, just don't re-advance the cycle.
    if (tokenId && sub.razorpayTokenId !== tokenId) {
      return updateSubscription({ ...sub, autoDebit: true, razorpayTokenId: tokenId });
    }
    return sub;
  }

  if (!existing) {
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    await createInvoice({
      id: invoiceId,
      studentName: sub.studentName,
      parentName: sub.parentName,
      parentEmail: sub.parentEmail,
      amount: sub.monthlyFee,
      courseName: sub.courseName,
      date: toDateKey(now),
      dueDate: toDateKey(now),
      status: 'Success',
      transactionId: paymentId,
      semester: monthName,
    });
  } else if (existing.status !== 'Success') {
    // A charge failed earlier this month and left a Failed invoice under the
    // same deterministic id. The retry succeeded, so settle that row rather
    // than leaving a paid month showing as failed.
    await payInvoice(invoiceId, paymentId);
  }

  // A payment settles the month it was made in, so the next billing date is
  // one month from today — not one month from the PREVIOUS billing date.
  // Advancing from the old date compounded any prior drift into a multi-month
  // gap (paying 12 Sep must set the next charge on 12 Oct, never in Nov/Dec).
  const nextBillingDate = addMonths(todayKey(), 1);
  const updated = await updateSubscription({
    ...sub,
    nextBillingDate,
    autoDebit: true,
    razorpayTokenId: tokenId || sub.razorpayTokenId,
  });

  return updated;
}

async function recordFailedCycle(sub: Subscription, reason: string): Promise<void> {
  const now = new Date();
  const invoiceId = `INV-${sub.id.replace('SUB-', '')}-${monthKey(now)}`;
  const invoices = await getAllInvoices();
  if (invoices.some((inv) => inv.id === invoiceId)) return;

  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  await createInvoice({
    id: invoiceId,
    studentName: sub.studentName,
    parentName: sub.parentName,
    parentEmail: sub.parentEmail,
    amount: sub.monthlyFee,
    courseName: sub.courseName,
    date: todayKey(),
    dueDate: todayKey(),
    status: 'Failed',
    semester: `${monthName} (auto-debit: ${reason.slice(0, 40)})`,
  });
}

/** Subscriptions with an active mandate whose billing date is today or past. */
export async function getDueAutoDebitSubscriptions(): Promise<Subscription[]> {
  const today = todayKey();
  const subs = await getAllSubscriptions();
  return subs.filter(
    (s) =>
      s.status === 'Active' &&
      s.autoDebit === true &&
      Boolean(s.razorpayTokenId) &&
      s.nextBillingDate <= today
  );
}

/** Marks a mandate token as belonging to a simulated (non-bank) test mandate. */
export const TEST_MANDATE_TOKEN_PREFIX = 'token_sim_';
const TEST_PAYMENT_PREFIX = 'pay_sim_';

export function isSimulatedMandate(sub: Subscription): boolean {
  return Boolean(sub.razorpayTokenId?.startsWith(TEST_MANDATE_TOKEN_PREFIX));
}

/** Runs one Razorpay token charge for a due subscription. */
export async function processAutoDebitCharge(
  sub: Subscription
): Promise<{ subscriptionId: string; success: boolean; paymentId?: string; error?: string }> {
  if (!sub.razorpayTokenId) {
    return { subscriptionId: sub.id, success: false, error: 'No mandate token on file' };
  }
  if (isSimulatedMandate(sub)) {
    return {
      subscriptionId: sub.id,
      success: false,
      error: 'Simulated test mandate — use "Simulate charge" instead of a live charge.',
    };
  }

  try {
    const { paymentId } = await chargeRecurringWithToken({
      subscriptionId: sub.id,
      amount: sub.monthlyFee,
      tokenId: sub.razorpayTokenId,
      parentEmail: sub.parentEmail,
      parentName: sub.parentName,
    });
    await settleSubscriptionCycle(sub.id, paymentId, sub.razorpayTokenId);
    return { subscriptionId: sub.id, success: true, paymentId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Recurring charge failed';
    await recordFailedCycle(sub, message);
    return { subscriptionId: sub.id, success: false, error: message };
  }
}

/** Processes all due auto-debit subscriptions (for cron or admin trigger). */
export async function processAllDueAutoDebits(): Promise<
  Array<{ subscriptionId: string; success: boolean; paymentId?: string; error?: string }>
> {
  const due = await getDueAutoDebitSubscriptions();
  const results = [];
  for (const sub of due) {
    results.push(await processAutoDebitCharge(sub));
  }
  return results;
}

/**
 * Attaches a simulated mandate so an admin can exercise the auto-debit
 * pipeline — due detection, settlement, invoice write, billing-date advance —
 * without a real bank e-mandate. `dueNow` backdates the billing date so the
 * subscription shows up immediately in the due list.
 *
 * Callers must confirm the gateway is not in Live mode before using this.
 */
export async function attachSimulatedMandate(
  subscriptionId: string,
  dueNow = true
): Promise<Subscription | null> {
  const subs = await getAllSubscriptions();
  const sub = subs.find((s) => s.id === subscriptionId);
  if (!sub) return null;

  return updateSubscription({
    ...sub,
    autoDebit: true,
    razorpayTokenId: `${TEST_MANDATE_TOKEN_PREFIX}${sub.id}`,
    nextBillingDate: dueNow ? todayKey() : sub.nextBillingDate,
  });
}

/**
 * Runs the settlement half of an auto-debit cycle with a synthetic payment id,
 * skipping the Razorpay charge. Everything after the gateway call — the
 * idempotency guard, invoice write and billing-date advance — is the same code
 * a live charge runs.
 */
export async function simulateAutoDebitCharge(
  subscriptionId: string
): Promise<{ subscriptionId: string; success: boolean; paymentId?: string; error?: string }> {
  const subs = await getAllSubscriptions();
  const sub = subs.find((s) => s.id === subscriptionId);
  if (!sub) {
    return { subscriptionId, success: false, error: 'Subscription not found' };
  }
  if (!isSimulatedMandate(sub)) {
    return {
      subscriptionId,
      success: false,
      error: 'This subscription has no simulated mandate. Attach one first.',
    };
  }

  const paymentId = `${TEST_PAYMENT_PREFIX}${Math.random().toString(36).slice(2, 10)}`;
  const before = sub.nextBillingDate;
  const updated = await settleSubscriptionCycle(sub.id, paymentId, sub.razorpayTokenId);
  if (!updated) {
    return { subscriptionId, success: false, error: 'Settlement failed' };
  }
  if (updated.nextBillingDate === before) {
    return {
      subscriptionId,
      success: false,
      error: `Cycle for this month is already settled — billing date stays ${before}. This is the duplicate-charge guard working.`,
    };
  }

  return { subscriptionId, success: true, paymentId };
}

/** Parent or admin cancels auto-debit locally (mandate revoked in academy records). */
export async function disableAutoDebit(subscriptionId: string): Promise<Subscription | null> {
  const subs = await getAllSubscriptions();
  const sub = subs.find((s) => s.id === subscriptionId);
  if (!sub) return null;

  return updateSubscription({
    ...sub,
    autoDebit: false,
    razorpayTokenId: undefined,
  });
}
