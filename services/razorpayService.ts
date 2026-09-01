import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { connectToDatabase } from '@/lib/mongodb';
import { SettingsModel } from '@/models/Settings';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { payInvoice } from '@/services/invoiceService';
import { settleSubscriptionCycle } from '@/services/subscriptionBillingService';

const CREDS_KEY = 'razorpay_credentials';

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: 'Live' | 'Test';
}

export interface RazorpayPublicCredentials {
  keyId: string;
  mode: 'Live' | 'Test';
  configured: boolean;
  /**
   * True when the credentials come from the server environment rather than the
   * Settings collection. The admin UI reads this to render the fields
   * read-only — otherwise an admin would type new keys, save, and silently
   * keep using the environment values.
   */
  managedByEnv: boolean;
}

interface StoredRazorpayCredentials {
  keyId: string;
  encryptedKeySecret: string;
  encryptedWebhookSecret?: string;
  mode: 'Live' | 'Test';
}

let memoryRazorpayCredentials: StoredRazorpayCredentials | null = null;

/**
 * Credentials supplied by the server environment. When these are set they win
 * over anything saved through Settings, so a production deploy never keeps the
 * key secret in the database and a compromised admin session cannot swap the
 * gateway out from under it. Rotating them requires a redeploy, which is the
 * trade being made.
 */
function getEnvCredentials(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;

  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '',
    mode: resolveEnvMode(keyId),
  };
}

/**
 * `RAZORPAY_MODE` wins when set; otherwise the mode is read off the key prefix.
 * Anything that is not explicitly `rzp_test_` is treated as Live — an
 * unrecognised key format must not silently unlock the auto-debit simulator
 * against a real gateway.
 */
function resolveEnvMode(keyId: string): 'Live' | 'Test' {
  const declared = process.env.RAZORPAY_MODE?.trim().toLowerCase();
  if (declared === 'live') return 'Live';
  if (declared === 'test') return 'Test';
  return keyId.startsWith('rzp_test_') ? 'Test' : 'Live';
}

/** True when the environment owns the credentials, making Settings read-only. */
export function isRazorpayEnvManaged(): boolean {
  return getEnvCredentials() !== null;
}

async function getStoredCredentials(): Promise<StoredRazorpayCredentials | null> {
  const db = await connectToDatabase();
  if (db) {
    const doc = await SettingsModel.findOne({ key: CREDS_KEY }).lean();
    return (doc?.value as StoredRazorpayCredentials | undefined) ?? null;
  }
  return memoryRazorpayCredentials;
}

async function persistCredentials(creds: StoredRazorpayCredentials): Promise<void> {
  const db = await connectToDatabase();
  if (db) {
    await SettingsModel.findOneAndUpdate(
      { key: CREDS_KEY },
      { key: CREDS_KEY, value: creds },
      { upsert: true, new: true }
    );
    return;
  }
  memoryRazorpayCredentials = creds;
}

export async function getRazorpayPublicCredentials(): Promise<RazorpayPublicCredentials> {
  const env = getEnvCredentials();
  if (env) {
    return { keyId: env.keyId, mode: env.mode, configured: true, managedByEnv: true };
  }

  const stored = await getStoredCredentials();
  return {
    keyId: stored?.keyId ?? '',
    mode: stored?.mode ?? 'Test',
    configured: !!(stored && stored.encryptedKeySecret),
    managedByEnv: false,
  };
}

export async function saveRazorpayCredentials(input: {
  keyId: string;
  keySecret?: string;
  webhookSecret?: string;
  mode?: 'Live' | 'Test';
}): Promise<RazorpayPublicCredentials> {
  if (isRazorpayEnvManaged()) {
    throw new Error(
      'Razorpay credentials are supplied by the server environment and cannot be changed here. ' +
        'Update RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and redeploy.'
    );
  }

  const existing = await getStoredCredentials();
  const next: StoredRazorpayCredentials = {
    keyId: input.keyId?.trim() || existing?.keyId || '',
    encryptedKeySecret: input.keySecret ? encryptSecret(input.keySecret) : existing?.encryptedKeySecret ?? '',
    encryptedWebhookSecret: input.webhookSecret
      ? encryptSecret(input.webhookSecret)
      : existing?.encryptedWebhookSecret,
    mode: input.mode || existing?.mode || 'Test',
  };

  if (!next.keyId || !next.encryptedKeySecret) {
    throw new Error('Razorpay Key ID and Key Secret are required.');
  }

  await persistCredentials(next);
  return {
    keyId: next.keyId,
    mode: next.mode,
    configured: true,
    managedByEnv: false,
  };
}

export async function getRazorpayCredentials(): Promise<RazorpayCredentials> {
  const env = getEnvCredentials();
  if (env) return env;

  const stored = await getStoredCredentials();
  if (!stored || !stored.keyId || !stored.encryptedKeySecret) {
    throw new Error('Razorpay is not configured. Add credentials in Settings.');
  }
  return {
    keyId: stored.keyId,
    keySecret: decryptSecret(stored.encryptedKeySecret),
    webhookSecret: stored.encryptedWebhookSecret ? decryptSecret(stored.encryptedWebhookSecret) : '',
    mode: stored.mode ?? 'Test',
  };
}

function getRazorpayClient(creds: RazorpayCredentials): Razorpay {
  return new Razorpay({
    key_id: creds.keyId,
    key_secret: creds.keySecret,
  });
}

export interface RazorpayOrderResult {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
}

export interface RazorpaySubscriptionOrderResult {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
  /** Checkout must be opened against the same customer the mandate order was created for. */
  customerId: string;
}

export async function createRazorpayOrder(input: {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrderResult> {
  const creds = await getRazorpayCredentials();
  const client = getRazorpayClient(creds);
  const amount = Math.round(input.amount * 100);
  const order = await client.orders.create({
    amount,
    currency: input.currency || 'INR',
    receipt: input.receipt,
    notes: input.notes,
  });
  return {
    orderId: order.id,
    keyId: creds.keyId,
    amount,
    currency: order.currency || input.currency || 'INR',
  };
}

/** Razorpay's hard bounds for an e-mandate token's max_amount, in paise. */
const MANDATE_MIN_AMOUNT_PAISE = 500;
const MANDATE_MAX_AMOUNT_PAISE = 100000000;
/**
 * Headroom on the mandate cap. The cap is fixed for the life of the mandate,
 * so charging exactly the current fee would break every future cycle after a
 * fee increase — the parent would have to re-authorize.
 */
const MANDATE_HEADROOM_MULTIPLIER = 3;
const MANDATE_FLOOR_PAISE = 100000; // ₹1,000

function resolveMandateMaxAmount(amountPaise: number): number {
  const withHeadroom = Math.max(amountPaise * MANDATE_HEADROOM_MULTIPLIER, MANDATE_FLOOR_PAISE);
  return Math.min(Math.max(withHeadroom, MANDATE_MIN_AMOUNT_PAISE), MANDATE_MAX_AMOUNT_PAISE);
}

/**
 * Returns the Razorpay customer id for a parent, creating the customer when it
 * does not exist yet. Idempotent: a parent with the same email (or contact) is
 * looked up first and reused, so repeated mandate setups never error with
 * "Customer already exists for this merchant" and never create duplicates.
 */
export async function ensureRazorpayCustomer(input: {
  name?: string;
  email?: string;
  contact?: string;
}): Promise<string> {
  const creds = await getRazorpayCredentials();
  const client = getRazorpayClient(creds);

  if (input.email) {
    // customers.all accepts an `email` filter at runtime even though the SDK
    // types only surface pagination options, so cast the params and result.
    const existing = (await client.customers.all({ email: input.email, count: 10 } as any)) as {
      items?: Array<{ id: string; email?: string }>;
    };
    const match = existing?.items?.find(
      (c) => c.email && c.email.toLowerCase() === (input.email as string).toLowerCase()
    );
    if (match) return match.id;
  }

  const customer = await client.customers.create({
    name: input.name || 'Academy Parent',
    email: input.email || undefined,
    contact: input.contact || undefined,
    fail_existing: 0,
  });
  return customer.id;
}

export async function createRazorpaySubscriptionOrder(input: {
  subscriptionId: string;
  amount: number;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}): Promise<RazorpaySubscriptionOrderResult> {
  const creds = await getRazorpayCredentials();
  const client = getRazorpayClient(creds);
  const amount = Math.round(input.amount * 100);
  // Razorpay caps an e-mandate token's expiry at 365 days from order creation.
  // Setting it further out (e.g. 10 years) makes Razorpay reject the order.
  const expireAt = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;

  // An e-mandate registration is an authorization order: Razorpay requires a
  // customer_id on it, and rejects the order outright without one. The
  // customer also needs the parent's 10-digit mobile as `contact`.
  const customerId = await ensureRazorpayCustomer({
    name: input.parentName,
    email: input.parentEmail,
    contact: input.parentPhone,
  });

  const params: any = {
    amount,
    currency: 'INR',
    receipt: `SUB-${input.subscriptionId}`,
    method: 'emandate',
    customer_id: customerId,
    payment_capture: 1,
    notes: { subscriptionId: input.subscriptionId, type: 'subscription' },
    token: {
      auth_type: 'netbanking',
      max_amount: resolveMandateMaxAmount(amount),
      expire_at: expireAt,
      notes: { subscriptionId: input.subscriptionId },
    },
  };

  const order = await client.orders.create(params);
  return {
    orderId: order.id,
    keyId: creds.keyId,
    amount,
    currency: order.currency || 'INR',
    customerId,
  };
}

export async function fetchRazorpayPaymentTokenId(paymentId: string): Promise<string | null> {
  const creds = await getRazorpayCredentials();
  const client = getRazorpayClient(creds);
  const payment = await client.payments.fetch(paymentId);
  return (payment as any).token_id || null;
}

/** Charges a stored e-mandate token for a recurring monthly academy fee. */
export async function chargeRecurringWithToken(input: {
  subscriptionId: string;
  amount: number;
  tokenId: string;
  parentEmail: string;
  parentName?: string;
}): Promise<{ orderId: string; paymentId: string }> {
  const creds = await getRazorpayCredentials();
  const client = getRazorpayClient(creds);
  const amount = Math.round(input.amount * 100);

  const order = await client.orders.create({
    amount,
    currency: 'INR',
    receipt: `REC-${input.subscriptionId}-${Date.now()}`,
    notes: {
      subscriptionId: input.subscriptionId,
      type: 'recurring',
    },
  });

  const payment = await (client.payments as any).createRecurringPayment({
    email: input.parentEmail,
    amount,
    currency: 'INR',
    order_id: order.id,
    token: input.tokenId,
    recurring: '1',
    description: `Academy monthly fee — ${input.parentName || input.parentEmail}`,
  });

  return {
    orderId: order.id,
    paymentId: payment.id as string,
  };
}

export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = crypto
    .createHmac('sha256', input.keySecret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(input.signature, 'utf8');
  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export function verifyWebhookSignature(body: string, signature: string, webhookSecret: string): boolean {
  if (!webhookSecret || !signature) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(signature, 'utf8');
  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export async function confirmPaymentViaWebhook(bodyText: string, signature: string): Promise<boolean> {
  const creds = await getRazorpayCredentials();
  if (!verifyWebhookSignature(bodyText, signature, creds.webhookSecret)) {
    return false;
  }

  const event = JSON.parse(bodyText);
  if (event.event !== 'payment.captured') {
    return true;
  }

  const payment = event.payload?.payment?.entity;
  const orderId = payment?.order_id;
  let invoiceId = payment?.notes?.invoiceId;
  let subscriptionId = payment?.notes?.subscriptionId;

  if (!invoiceId && !subscriptionId && orderId) {
    try {
      const client = getRazorpayClient(creds);
      const order: any = await client.orders.fetch(orderId);
      subscriptionId = order?.notes?.subscriptionId;
      invoiceId = order?.notes?.invoiceId;
    } catch {
      // Order lookup is best-effort; fall through to invoice mapping.
    }
  }

  if (subscriptionId) {
    await settleSubscriptionCycle(subscriptionId, payment.id);
    return true;
  }

  if (invoiceId) {
    await payInvoice(invoiceId, payment.id);
  }

  return true;
}
