# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev      # node dev.js -> next dev (defaults: -p 3000 -H 0.0.0.0; accepts --port/-p, --host/-H, --turbo)
npm run build    # next build
npm start        # node start.js -> next start
npm run lint     # tsc --noEmit  (the only check in the repo — there is no ESLint config and no test suite)
npm run clean    # rm -rf .next dist
```

There are no tests. `npm run lint` is a type-check only, and `tsconfig.json` sets `strict: false`, so it catches shape errors but not nullability.

Required env vars (see [.env.example](.env.example), real values in `.env.local`):
- `SESSION_SECRET` — HMAC key for session cookies. Missing ⇒ every login and auth-guarded route throws.
- `RAZORPAY_ENCRYPTION_KEY` — AES-256-GCM key for Razorpay secrets at rest; also the fallback session secret.
- `MONGODB_URI` — optional; see the persistence fallback below.

## Architecture

Next.js 16 App Router. `next` is the real runtime, but the app is a **single-page client app**: [app/page.tsx](app/page.tsx) is a thin `'use client'` wrapper that renders [src/App.tsx](src/App.tsx), and all "routing" is React state (`ConsoleTab` in [src/App.tsx](src/App.tsx)), not file routes. The server side is entirely `app/api/**` route handlers.

Layer flow: `src/components/*` → [src/services/apiClient.ts](src/services/apiClient.ts) (fetch wrappers, one per endpoint) → `app/api/**/route.ts` (auth + validation only) → `services/*.ts` (business logic + persistence) → `models/*.ts` (Mongoose).

### Vite / AI Studio leftovers

[vite.config.ts](vite.config.ts), [index.html](index.html), [src/main.tsx](src/main.tsx), and [src/index.css](src/index.css) are a second, unused entry path inherited from the Google AI Studio scaffold ([README.md](README.md) and [metadata.json](metadata.json) still describe that app). Nothing in the Next build reads them. When editing global styles, edit [app/globals.css](app/globals.css) — `src/index.css` is a near-duplicate with no effect. The `@google/genai` dependency is likewise unused; there is no Gemini code.

### Persistence: MongoDB with in-memory fallback

[lib/mongodb.ts](lib/mongodb.ts) `connectToDatabase()` **never throws** — on a missing URI or a >10s connect it returns `null`. Every service in [services/](services/) branches on that:

```ts
const db = await connectToDatabase();
if (db) { /* Mongoose path, self-seeding from src/seedData.ts when the collection is empty */ }
return memoryX;  // module-level array/object, seeded from INITIAL_* constants
```

Preserve this shape when adding a service or a write path — dropping the fallback branch makes the app dead when Mongo is unreachable. The in-memory store is per-process and resets on restart, so a Mongo-down session silently loses writes.

Settings that aren't domain entities (manager permissions, academy geofence, Razorpay credentials) all live in one key/value `SettingsModel` collection, keyed by string (`manager_permissions`, `academy`, `razorpay_credentials`).

### Auth & roles

Three roles: `admin`, `manager`, `parent`.

- Session = HMAC-SHA256-signed base64url payload in an httpOnly cookie `academy_session`, 7-day TTL ([lib/session.ts](lib/session.ts)). Not a JWT; no revocation list.
- Admin/manager log in with email + role + password (scrypt hash, [services/authService.ts](services/authService.ts)). Parents log in **passwordless** with a generated `parentLoginId` (e.g. `Liam48291`, see [src/utils/parent-login-id.ts](src/utils/parent-login-id.ts)) that resolves to exactly one subscription — the parent session is scoped to that one child via `subscriptionId`.
- Route handlers guard with `requireAuth(req, roles)` from [lib/authGuard.ts](lib/authGuard.ts), returning `{ok:true,user}` or `{ok:false,response}`; the idiom in every route is `if ('response' in auth) return auth.response;`.
- **Coverage is uneven, and worth knowing before you touch it:** `auth/users`, `invoices`, `seed`, `settings/*`, and `razorpay/*` are guarded; `attendance/*`, `batches`, `courses`, `subscriptions`, and `users` currently have **no** guard. Adding one there changes behaviour for existing callers — do it deliberately, not as drive-by cleanup.

Manager capabilities are a second, finer layer: a `ManagerPermissions` flag set ([src/types.ts](src/types.ts), defaults in `DEFAULT_MANAGER_PERMISSIONS`) stored in settings, fetched by the client, and gated in [src/App.tsx](src/App.tsx) via `hasPermission(...)` to decide which console tabs exist. This is client-side gating over largely unguarded APIs — it hides UI, it does not enforce access.

### Payments (Razorpay)

Credentials are entered in the admin Settings UI, encrypted with AES-256-GCM ([lib/crypto.ts](lib/crypto.ts)) and stored in `SettingsModel`; only `keyId`/`mode`/`configured` are ever returned to the client. There is no `RAZORPAY_KEY_ID` env var.

Two flows, in [services/razorpayService.ts](services/razorpayService.ts) and [services/subscriptionBillingService.ts](services/subscriptionBillingService.ts):

1. **One-off invoice** — `create-order` → Razorpay Checkout in [src/components/ParentPortal.tsx](src/components/ParentPortal.tsx) (script injected at runtime from `checkout.razorpay.com`) → `verify` (signature check) → `payInvoice`.
2. **Auto-debit mandate** — `subscription-order` → `subscription-verify` stores a `razorpayTokenId` on the subscription → `process-recurring` (admin-triggered) charges every subscription whose `nextBillingDate <= today`, then `settleSubscriptionCycle` writes a `Success` invoice and advances the billing date; failures write a `Failed` invoice instead. Recurring invoice ids are deterministic (`INV-<sub>-<YYYYMM>`), which is what makes a re-run idempotent within a month.

[app/api/razorpay/webhook/route.ts](app/api/razorpay/webhook/route.ts) verifies `x-razorpay-signature` against the stored webhook secret and is the one endpoint that is unauthenticated by design.

### Attendance

Two independent subsystems: student attendance (marked by admin/manager, batch-based) and manager check-in/out, which is GPS-geofenced. [src/components/ManagerCheckIn.tsx](src/components/ManagerCheckIn.tsx) reads `navigator.geolocation`, computes `calculateHaversineDistance` against the academy coordinates from settings, and refuses check-in outside `radiusMeters`; on-time vs late comes from `shiftStartTime` + `gracePeriodMinutes` (`evaluateManagerCheckInTime`). All of this runs client-side and the API stores whatever coordinates it is sent — the geofence is advisory. Report export is jsPDF + autotable in [src/utils/attendance-pdf.ts](src/utils/attendance-pdf.ts).

### Conventions

- Every API response goes through `successResponse` / `errorResponse` in [utils/apiResponse.ts](utils/apiResponse.ts) → `{success, message, data}` / `{success, error}`. The client checks `!res.ok || !data.success` and throws `data.error`.
- `@/*` maps to the repo root, so imports cross freely between `app/`, `services/`, `lib/`, and `src/`. Shared domain types live in [src/types.ts](src/types.ts) and are imported by server code as `@/src/types`.
- Seed data is [src/seedData.ts](src/seedData.ts) (`INITIAL_INVOICES`, `INITIAL_SUBSCRIPTIONS`) plus `FILM_COURSES` in `src/types.ts`. `POST /api/seed` (admin) wipes and reinserts everything; the "Reset Ledger" button calls it.
- Styling is Tailwind v4 configured entirely in CSS via `@theme` in [app/globals.css](app/globals.css) — there is no `tailwind.config`. Use the `brand-*` tokens (`brand-gold`, `brand-charcoal`, `brand-surface-card`, …) and the `glow-gold`/`glow-emerald` utilities rather than raw hex. The dark theme is unconditional (`bg-black text-white` on `<body>`).
- Animation is `motion/react`; icons are `lucide-react`.
- The domain is a football academy, but several identifiers still say "film"/"cinematic" (`FilmCourse`, `FILM_COURSES`, the page title). They name courses and the product, not a separate feature.
