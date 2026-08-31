import { Subscription, Invoice } from './types';

/* Production starts with an empty ledger — no sample students, invoices, or
 * subscriptions. All records are created by academy staff or via real
 * payments once deployed. */
export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [];
