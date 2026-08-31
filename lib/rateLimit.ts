import { NextRequest, NextResponse } from 'next/server';

/**
 * Lightweight in-memory token-bucket rate limiter.
 *
 * Designed to blunt brute-force and abuse on sensitive endpoints (auth/login,
 * Razorpay order creation/verification). Buckets are keyed by a string (IP or
 * identifier) and tracked in an in-memory Map.
 *
 * WARNING: this is per-process state. On Vercel's serverless runtime each
 * invocation may run on a fresh container, so the limit is best-effort there —
 * it still helps on long-running self-hosted deployments and during local
 * development. For hard guarantees on serverless, pair this with a real
 * rate-limiter as a service (Upstash/Vercel limits) or edge middleware.
 */
interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();
const REFILL_INTERVAL_MS = 60_000; // tokens refill over a 60s window

/**
 * Consumes a token for `key` if available. Returns true when the request is
 * allowed, false when it is rate-limited (too many calls in the window).
 */
export function consumeToken(
  key: string,
  limit: number,
  now: number = Date.now()
): boolean {
  const bucket = buckets.get(key);
  if (!bucket) {
    buckets.set(key, { tokens: limit - 1, lastRefill: now });
    return true;
  }

  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / REFILL_INTERVAL_MS) * limit;
  bucket.tokens = Math.min(limit, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

/** Best-effort IP address from a NextRequest (honours x-forwarded-for). */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0].trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * Guards a request with a per-client token budget. Returns a NextResponse with
 * 429 when the budget is exhausted, or null when the request may proceed.
 */
export function rateLimit(
  req: NextRequest,
  key: string,
  limit: number,
  windowIdentifier?: string
): NextResponse | null {
  const id = windowIdentifier || clientIp(req);
  if (!consumeToken(`${key}:${id}`, limit)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429 }
    );
  }
  return null;
}
