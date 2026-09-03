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
 */
export function createSessionToken(input: {
  email: string;
  role: 'admin' | 'manager' | 'parent';
  name?: string;
  subscriptionId?: string;
  studentName?: string;
  parentLoginId?: string;
  assignedBatch?: string;
}): string {
  const body: SessionPayload = { ...input, exp: Date.now() + SESSION_TTL_MS };
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
