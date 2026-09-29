import { Invoice, Subscription } from '../types';
import { shiftMonthsClamped } from './attendance-dates';

const norm = (value: string | undefined): string => (value || '').trim().toLowerCase();

/**
 * Whether this player has ever settled a bill for this course.
 *
 * `nextBillingDate` is stamped at enrolment, not at payment, so a freshly
 * registered player carries a next-charge date before any money has moved.
 * Announcing that date as a scheduled charge would promise a debit that no
 * mandate is set up to collect, so every surface that quotes it checks this
 * first: a recurring schedule only exists once the first payment is settled.
 *
 * Player and course must both match, and the parent must match whenever both
 * sides carry an email — two families can share a player's name, and a payment
 * for one of them says nothing about the other's billing cycle.
 */
export const hasPaidFirstPayment = (
  subscription: Subscription,
  invoices: Invoice[]
): boolean => {
  const student = norm(subscription.studentName);
  const course = norm(subscription.courseName);
  const parent = norm(subscription.parentEmail);

  return invoices.some((inv) => {
    if (inv.status !== 'Success') return false;
    if (norm(inv.studentName) !== student) return false;
    if (norm(inv.courseName) !== course) return false;
    const invParent = norm(inv.parentEmail);
    return !parent || !invParent || parent === invParent;
  });
};

/**
 * The billing date for the cycle after a payment made on `paidOn`.
 *
 * A payment settles the month it was made in, so the next charge is one month
 * from that day — never one month from the previous billing date, which
 * compounded any prior drift into a multi-month gap. The day is clamped to the
 * target month's length, so a 29 Sep payment bills 29 Oct and a 31 Jan payment
 * bills the last day of Feb rather than spilling into March.
 *
 * Shared by the billing service (advancing a subscription's cycle) and the
 * receipt/ledger UI (quoting the next due date for a settled invoice), so the
 * two can never disagree.
 */
export const nextBillingDateAfter = (paidOn: string): string => shiftMonthsClamped(paidOn, 1);
