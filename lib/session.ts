import { createHmac, timingSafeEqual } from 'crypto';

export const SESSION_COOKIE_NAME = 'academy_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  email: string;
  role: 'admin' | 'manager' | 'parent';
  name?: string;
  /** Set for parent sessions — scopes portal to one child */
  subscriptionId?: string;
  studentName?: string;
  parentLoginId?: string;
  /** Set for manager sessions — scopes the manager to one batch */
  assignedBatch?: string;
  /** Set for manager sessions — the location id the manager checks in at */
  assignedLocationId?: string;
  /**
   * Marks a read-only showcase session minted by /api/auth/demo.
   *
   * A demo session authenticates nobody and is scoped to a fictional dataset
   * held in the browser. Every academy API rejects it — see requireAuth in
   * lib/authGuard.ts — so it can never read or write production data.
   */
  isDemo?: boolean;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.RAZORPAY_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
}

function sign(data: string): string {
  return createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
}

/**
 * Creates an HMAC-signed session token from a session payload.
 *
 * `ttlMs` overrides the default 7-day lifetime. The signature only stops being
 * valid once `exp` passes, so shortening the cookie's `maxAge` alone is not
 * enough — a demo session must expire in the token too, or it stays replayable
 * for a week after the browser drops it.
 */
export function createSessionToken(
  input: {
    email: string;
    role: 'admin' | 'manager' | 'parent';
    name?: string;
    subscriptionId?: string;
    studentName?: string;
    parentLoginId?: string;
    assignedBatch?: string;
    assignedLocationId?: string;
    isDemo?: boolean;
  },
  ttlMs: number = SESSION_TTL_MS
): string {
  const body: SessionPayload = { ...input, exp: Date.now() + ttlMs };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verifies a session token's signature and expiry. Returns the payload or null.
 */
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [encoded, signature] = parts;
  const expected = Buffer.from(sign(encoded));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
