import { Invoice } from '../types';

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
