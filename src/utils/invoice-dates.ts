import { Invoice } from '../types';
import { shiftMonthsClamped } from './attendance-dates';

/**
 * The day a settled invoice's payment actually landed (YYYY-MM-DD).
 *
 * `paidAt` is the authoritative record. Invoices settled before the field
 * existed fall back to `date`, which for an auto-debit cycle is the day the
 * charge cleared — the best available answer rather than a blank on a receipt.
 */
export const getInvoicePaidAt = (invoice: Invoice): string =>
  invoice.paidAt || (invoice.status === 'Success' ? invoice.date : '');

/**
 * Whether `dueDate` still means anything for this invoice.
 *
 * A settled invoice has no outstanding deadline, so printing its due date
 * alongside the payment date is the "due date equals payment date" bug — it
 * reads as a second, conflicting date for the same event.
 */
export const hasOpenDueDate = (invoice: Invoice): boolean => invoice.status !== 'Success';

/**
 * The date this fee is next due.
 *
 * Unpaid, that is the invoice's own deadline. Once settled, the outstanding
 * deadline is gone and what matters is when the NEXT cycle falls — one month
 * after the payment, which is the same rule the billing service applies when it
 * advances `nextBillingDate`. Showing the settled invoice's old due date instead
 * would report a date that has already passed (paid on 29 Sep, "due 29 Sep").
 */
export const getInvoiceNextDueDate = (invoice: Invoice): string => {
  if (hasOpenDueDate(invoice)) return invoice.dueDate;
  const paidOn = getInvoicePaidAt(invoice);
  return paidOn ? shiftMonthsClamped(paidOn, 1) : invoice.dueDate;
};
