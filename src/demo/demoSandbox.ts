import { DemoSessionContext, handleDemoApiRequest, resetDemoData } from './demoApi';

/**
 * Installs the browser-local academy API for a demo session.
 *
 * While installed, every `fetch('/api/...')` from the app is answered from the
 * in-memory dataset in demoApi.ts instead of the server, so the demo never
 * touches real academy data. Three things deliberately still reach the server:
 *
 *   - `/api/auth/demo`  (creating the session in the first place)
 *   - `/api/auth/me`    (so a page reload can re-identify the session)
 *   - `/api/auth/logout` (so the cookie is actually cleared)
 *
 * That leaves the sandbox's guarantees: no academy data crosses the network in
 * either direction, and the server independently refuses the session anyway
 * (see lib/authGuard.ts), so a bypass of this shim still gets a 403.
 *
 * `window.Razorpay` is stubbed so the parent payment flow runs its real code
 * path and settles instantly, instead of trying to open a checkout with a
 * fictional key id.
 */

const PASSTHROUGH_API_PATHS = new Set(['/api/auth/demo', '/api/auth/me', '/api/auth/logout']);

const isApiCall = (url: string, origin: string): URL | null => {
  // Only same-origin paths are intercepted; assets, HMR and cross-origin calls
  // are left completely alone.
  if (!url.startsWith('/')) return null;
  const parsed = new URL(url, origin);
  if (parsed.origin !== origin) return null;
  if (!parsed.pathname.startsWith('/api/')) return null;
  if (PASSTHROUGH_API_PATHS.has(parsed.pathname)) return null;
  return parsed;
};

let uninstallCurrent: (() => void) | null = null;

/** Removes the sandbox, restoring the real fetch and Razorpay globals. */
export function uninstallDemoSandbox(): void {
  uninstallCurrent?.();
  uninstallCurrent = null;
}

export function isDemoSandboxActive(): boolean {
  return uninstallCurrent !== null;
}

export function installDemoSandbox(session: DemoSessionContext): () => void {
  // Re-installing (switching demo roles) starts from the fixtures again.
  uninstallDemoSandbox();
  resetDemoData();

  const realFetch = window.fetch.bind(window);
  const hadRazorpay = 'Razorpay' in window;
  const previousRazorpay = (window as any).Razorpay;

  const demoFetch: typeof window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const target = isApiCall(url, window.location.origin);
    if (!target) {
      return realFetch(input as RequestInfo, init);
    }

    const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : undefined) ?? 'GET';

    let body: unknown;
    if (typeof init?.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    } else if (init?.body) {
      body = init.body;
    }

    const envelope = handleDemoApiRequest(target.pathname, method, target.searchParams, body, session);

    // Mirrors the server's contract closely enough that every apiClient wrapper
    // — which checks `res.ok` and `data.success` — behaves identically.
    return new Response(JSON.stringify(envelope), {
      status: envelope.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  window.fetch = demoFetch;

  /**
   * A stand-in for the Razorpay checkout constructor. It immediately reports a
   * successful payment through the same `handler` callback the real checkout
   * uses, so ParentPortal's verify-and-settle path runs unchanged.
   */
  class DemoRazorpay {
    private readonly options: any;

    constructor(options: any) {
      this.options = options;
    }

    open(): void {
      const { handler, order_id: orderId, amount } = this.options;
      const paymentId = `pay_demo_${Math.random().toString(36).slice(2, 12)}`;
      setTimeout(() => {
        if (typeof handler === 'function') {
          handler({
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId ?? `order_demo_${paymentId}`,
            razorpay_signature: `demo_signature_${amount ?? 0}`,
          });
        }
      }, 350);
    }

    close(): void {}
    on(event: string, cb: (...args: any[]) => void): void {
      if (event === 'payment.failed' || event === 'payment.closed') {
        this.options[`__${event}`] = cb;
      }
    }
  }

  (window as any).Razorpay = DemoRazorpay;

  const uninstall = () => {
    window.fetch = realFetch;
    if (hadRazorpay) {
      (window as any).Razorpay = previousRazorpay;
    } else {
      delete (window as any).Razorpay;
    }
    if (uninstallCurrent === uninstall) {
      uninstallCurrent = null;
    }
  };

  uninstallCurrent = uninstall;
  return uninstall;
}
