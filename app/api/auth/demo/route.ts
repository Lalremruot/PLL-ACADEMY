import { NextRequest } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/session';
import { rateLimit } from '@/lib/rateLimit';
import { successResponse, errorResponse } from '@/utils/apiResponse';

/**
 * Credential-free showcase logins for admin, manager and parent.
 *
 * The route mints a real signed session cookie — the app then behaves normally
 * — but the session is flagged `isDemo`, and every academy API rejects that flag
 * (lib/authGuard.ts). The visitor browses a fictional dataset served from their
 * own browser by src/demo, so nothing here touches MongoDB, the settings
 * store, or the real ledger.
 *
 * Two ways in, both landing on the same identity: the one-click role buttons,
 * or the demo credentials typed into the normal login form. The password
 * comparison is a plain string check on a constant that exists purely for this
 * feature — it protects nothing and is not a credential store.
 *
 * Off unless DEMO_LOGIN_ENABLED=true, so a public demo is a deliberate act.
 */
const DEMO_ENABLED = () => process.env.DEMO_LOGIN_ENABLED === 'true';

/** Shorter than the 7-day staff session — a showcase shouldn't linger. */
const DEMO_TTL_SECONDS = 60 * 60 * 12;
const DEMO_TTL_MS = DEMO_TTL_SECONDS * 1000;

/** Overridable for self-hosted demos; defaults to the showcase accounts. */
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || 'demo@admin.com';
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'admin@123';
const DEMO_MANAGER_EMAIL = process.env.DEMO_MANAGER_EMAIL || 'coach@mail.com';
const DEMO_MANAGER_PASSWORD = process.env.DEMO_MANAGER_PASSWORD || 'coach@123';
const DEMO_PARENT_LOGIN_ID = process.env.DEMO_PARENT_LOGIN_ID || 'child98765';

const DEMO_IDENTITIES = {
  admin: {
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
    name: 'Priya Raghavan (Demo Admin)',
  },
  manager: {
    email: DEMO_MANAGER_EMAIL,
    password: DEMO_MANAGER_PASSWORD,
    name: 'Arjun Mehta (Demo Coach)',
  },
  parent: {
    // Deliberately the fixture's own parent email, not a demo@ address: the
    // real routes and ParentPortal scope a parent session by comparing
    // session.email to subscription.parentEmail, so a different address would
    // leave the portal empty. See src/demo/demoData.ts (SUB-DEMO-1001).
    email: 'deepa.iyer@example.invalid',
    parentLoginId: DEMO_PARENT_LOGIN_ID,
    name: 'Deepa Iyer (Demo Parent)',
  },
} as const;

type DemoRole = keyof typeof DEMO_IDENTITIES;

const isDemoRole = (value: unknown): value is DemoRole =>
  value === 'admin' || value === 'manager' || value === 'parent';

/** The child the demo parent is scoped to. Must match src/demo/demoData.ts. */
const DEMO_PARENT_SUBSCRIPTION = {
  subscriptionId: 'SUB-DEMO-1001',
  studentName: 'Aarav Sharma',
};

/** Managers are scoped to one batch, mirroring the real login. */
const DEMO_MANAGER_BATCH = 'U15 Development';

/** Lets the login screen hide the demo panel when the feature is switched off. */
export async function GET() {
  if (!DEMO_ENABLED()) {
    return successResponse({ enabled: false });
  }
  return successResponse({
    enabled: true,
    // Addresses are published so the panel can offer them as one-tap fills.
    // Passwords are sent too, deliberately: the demo exists so a stranger can
    // type the credentials they were given, and it guards no real data.
    accounts: {
      admin: { email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD },
      manager: { email: DEMO_MANAGER_EMAIL, password: DEMO_MANAGER_PASSWORD },
      parent: { parentLoginId: DEMO_PARENT_LOGIN_ID },
    },
  });
}

/** Resolves typed credentials to a demo role, or null when they are not ours. */
function matchCredentials(body: Record<string, unknown>): DemoRole | null {
  const loginId = typeof body.parentLoginId === 'string' ? body.parentLoginId.trim() : '';
  if (loginId && loginId.toLowerCase() === DEMO_PARENT_LOGIN_ID.toLowerCase()) {
    return 'parent';
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return null;

  if (email === DEMO_ADMIN_EMAIL.toLowerCase() && password === DEMO_ADMIN_PASSWORD) {
    return 'admin';
  }
  if (email === DEMO_MANAGER_EMAIL.toLowerCase() && password === DEMO_MANAGER_PASSWORD) {
    return 'manager';
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!DEMO_ENABLED()) {
    return errorResponse('The demo login is disabled on this deployment.', 404);
  }

  const limited = rateLimit(req, 'demo-login', 20);
  if (limited) return limited;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    // A one-click button sends { role }; the normal login form sends credentials.
    const role = isDemoRole(body?.role) ? body.role : matchCredentials(body);
    if (!role) {
      return errorResponse('Not a demo account. Use the demo buttons or the demo credentials.', 401);
    }

    const identity: { email: string; name: string; parentLoginId?: string } = DEMO_IDENTITIES[role];

    const user = {
      email: identity.email,
      role,
      name: identity.name,
      isDemo: true,
      ...(role === 'parent'
        ? { ...DEMO_PARENT_SUBSCRIPTION, parentLoginId: identity.parentLoginId }
        : role === 'manager'
          ? { assignedBatch: DEMO_MANAGER_BATCH }
          : {}),
    };

    const token = createSessionToken({ ...user }, DEMO_TTL_MS);

    const response = successResponse(user, `Demo ${role} session started.`);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: DEMO_TTL_SECONDS,
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not start a demo session';
    return errorResponse(message, 500);
  }
}
