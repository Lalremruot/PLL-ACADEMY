import { Invoice, Subscription } from '../types';

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
