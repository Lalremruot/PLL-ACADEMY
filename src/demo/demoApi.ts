import {
  AcademyLocation,
  AcademyLocationAndTiming,
  FilmCourse,
  Invoice,
  ManagerAttendanceRecord,
  ManagerPermissions,
  StudentAttendanceRecord,
  Subscription,
} from '../types';
import { formatDateKey } from '../utils/attendance-dates';
import { hasPaidFirstPayment } from '../utils/subscription-billing';
import { buildDemoDataset, DemoDataset } from './demoData';

/**
 * A browser-local stand-in for the academy API, used only while a demo session
 * is active.
 *
 * It mirrors the wire contract of app/api/** — same `{success, message, data}`
 * envelope, same role scoping — so every component, service call and hook runs
 * its real code path unchanged. The dataset lives in this tab's memory: a
 * reload restores the fixtures, and nothing is ever written to the server.
 *
 * The server is the actual guarantee (lib/authGuard.ts rejects demo sessions
 * on every route); this exists so the demo is usable rather than a wall of
 * 403s.
 */

export interface DemoApiEnvelope {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

/** Mirrors the caller's role so parent/manager scoping is exercised for real. */
export interface DemoSessionContext {
  role: 'admin' | 'manager' | 'parent';
  email: string;
  assignedBatch?: string;
}

let db: DemoDataset = buildDemoDataset();

/** Restores the fixtures — used when a demo session starts. */
export const resetDemoData = (): void => {
  db = buildDemoDataset();
};

const ok = (data: unknown, message = 'Operation completed successfully'): DemoApiEnvelope => ({
  success: true,
  message,
  data,
});

const fail = (error: string): DemoApiEnvelope => ({ success: false, error });

const scopedSubscriptions = (session: DemoSessionContext): Subscription[] => {
  if (session.role === 'parent') {
    return db.subscriptions.filter((s) => s.parentEmail.toLowerCase() === session.email.toLowerCase());
  }
  if (session.role === 'manager') {
    return session.assignedBatch ? db.subscriptions.filter((s) => s.batch === session.assignedBatch) : [];
  }
  return db.subscriptions;
};

const scopedInvoices = (session: DemoSessionContext, subs: Subscription[]): Invoice[] => {
  if (session.role === 'parent') {
    const emails = new Set(subs.map((s) => s.parentEmail.toLowerCase()));
    return db.invoices.filter((inv) => emails.has(inv.parentEmail.toLowerCase()));
  }
  return db.invoices;
};

/** Marks an invoice settled, mirroring payInvoice's date semantics. */
function settleInvoice(invoice: Invoice, transactionId: string): Invoice {
  const paidAt = formatDateKey(new Date());
  return { ...invoice, status: 'Success', transactionId, paidAt };
}

const upsertLocation = (draft: Record<string, any>): AcademyLocation[] => {
  if (draft.id) {
    db.locations = db.locations.map((loc) => (loc.id === draft.id ? { ...loc, ...draft } : loc));
  } else {
    db.locations = [
      ...db.locations,
      { ...draft, id: `LOC-DEMO-${db.locations.length + 1}` } as AcademyLocation,
    ];
  }
  return db.locations;
};

/**
 * Serves one request against the in-memory dataset.
 *
 * `pathname` is the bare path; `searchParams` carries the query string, matching
 * how the route handlers receive it. Anything not listed here returns a failure
 * rather than falling through, so a new endpoint the app starts calling surfaces
 * as an obvious demo error instead of quietly reaching the real backend.
 */
export function handleDemoApiRequest(
  pathname: string,
  method: string,
  searchParams: URLSearchParams,
  body: unknown,
  session: DemoSessionContext
): DemoApiEnvelope {
  const verb = method.toUpperCase();
  const payload = (body ?? {}) as Record<string, any>;
  const subs = scopedSubscriptions(session);
  const invoices = scopedInvoices(session, subs);

  switch (`${verb} ${pathname}`) {
    /* ---------------- Ledger ---------------- */

    case 'GET /api/invoices':
      return ok(invoices, 'Invoices retrieved successfully');

    case 'POST /api/invoices': {
      const created: Invoice = {
        id: payload.id || `INV-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        studentName: payload.studentName ?? 'Demo Student',
        parentName: payload.parentName ?? 'Demo Parent',
        parentEmail: payload.parentEmail ?? 'demo.parent@pll-demo.invalid',
        amount: payload.amount ?? 0,
        courseName: payload.courseName ?? 'U15 Development',
        date: payload.date ?? formatDateKey(new Date()),
        dueDate: payload.dueDate ?? formatDateKey(new Date()),
        status: payload.status ?? 'Pending',
        paidAt: payload.paidAt,
        transactionId: payload.transactionId,
        semester: payload.semester ?? 'Demo Term',
      };
      db.invoices = [created, ...db.invoices];
      return ok(created, 'Invoice created successfully');
    }

    case 'DELETE /api/invoices': {
      const before = db.invoices.length;
      db.invoices = db.invoices.filter((inv) => inv.id !== payload.id);
      if (db.invoices.length === before) {
        return fail('Invoice not found');
      }
      return ok({ id: payload.id }, 'Invoice deleted successfully');
    }

    case 'POST /api/invoices/pay': {
      const target = db.invoices.find((inv) => inv.id === payload.invoiceId);
      if (!target) return fail('Invoice not found');
      const settled = settleInvoice(target, `pay_demo_${Date.now().toString(36)}`);
      db.invoices = db.invoices.map((inv) => (inv.id === target.id ? settled : inv));
      return ok(settled, 'Payment recorded successfully');
    }

    /* ---------------- Subscriptions ---------------- */

    case 'GET /api/subscriptions':
      return ok(subs, 'Subscriptions retrieved successfully');

    case 'POST /api/subscriptions': {
      if (payload.action === 'updateStatus') {
        const target = db.subscriptions.find((s) => s.id === payload.subId);
        if (!target) return fail('Subscription not found');
        if (session.role === 'manager' && target.batch !== session.assignedBatch) {
          return fail('You do not have permission to manage this subscription.');
        }
        const updated: Subscription = { ...target, status: payload.newStatus };
        db.subscriptions = db.subscriptions.map((s) => (s.id === target.id ? updated : s));
        return ok(updated, 'Subscription status updated');
      }

      if (payload.id) {
        const target = db.subscriptions.find((s) => s.id === payload.id);
        if (!target) return fail('Subscription not found');
        if (session.role === 'manager' && target.batch !== session.assignedBatch) {
          return fail('You do not have permission to manage this subscription.');
        }
        const updated: Subscription = { ...target, ...payload, id: target.id };
        db.subscriptions = db.subscriptions.map((s) => (s.id === target.id ? updated : s));
        return ok(updated, 'Subscription updated successfully');
      }

      if (session.role !== 'admin') {
        return fail('Only an admin can create subscriptions.');
      }
      const created: Subscription = {
        id: payload.id || `SUB-DEMO-${Math.floor(1000 + Math.random() * 9000)}`,
        studentName: payload.studentName ?? 'Demo Student',
        parentName: payload.parentName ?? 'Demo Parent',
        parentEmail: payload.parentEmail ?? 'demo.parent@pll-demo.invalid',
        courseName: payload.courseName ?? 'U15 Development',
        status: payload.status ?? 'Active',
        tier: payload.tier ?? 'Standard',
        monthlyFee: payload.monthlyFee ?? 2800,
        nextBillingDate: payload.nextBillingDate ?? formatDateKey(new Date()),
        batch: payload.batch,
        age: payload.age,
        height: payload.height,
        weight: payload.weight,
        parentLoginId: payload.parentLoginId,
        phoneNumber: payload.phoneNumber,
        autoDebit: payload.autoDebit,
        footballStats: payload.footballStats,
      };
      db.subscriptions = [created, ...db.subscriptions];
      return ok(created, 'Subscription created successfully');
    }

    case 'DELETE /api/subscriptions': {
      const target = db.subscriptions.find((s) => s.id === payload.id);
      if (!target) return fail('Subscription not found');
      if (session.role === 'manager' && target.batch !== session.assignedBatch) {
        return fail('You do not have permission to manage this subscription.');
      }
      db.subscriptions = db.subscriptions.filter((s) => s.id !== payload.id);
      db.invoices = db.invoices.filter((inv) => inv.studentName !== target.studentName);
      return ok({ id: payload.id }, 'Subscription deleted successfully');
    }

    /* ---------------- Catalogue ---------------- */

    case 'GET /api/courses':
      return ok(db.courses, 'Courses retrieved successfully');

    case 'PUT /api/courses': {
      const incoming = payload as unknown as FilmCourse[];
      db.courses = Array.isArray(incoming) ? incoming : db.courses;
      return ok(db.courses, 'Courses updated successfully');
    }

    case 'GET /api/batches':
      return ok(db.batches, 'Batches retrieved successfully');

    case 'POST /api/batches': {
      if (typeof payload.name !== 'string' || payload.name.trim() === '') {
        return fail('Batch name is required');
      }
      if (!db.batches.includes(payload.name)) {
        db.batches = [...db.batches, payload.name];
      }
      return ok(payload.name, 'Batch created successfully');
    }

    case 'PUT /api/batches': {
      const incoming = payload as unknown as string[];
      if (Array.isArray(incoming)) {
        db.batches = incoming;
      }
      return ok(db.batches, 'Batches updated successfully');
    }

    /* ---------------- Settings ---------------- */

    case 'GET /api/settings/permissions':
      return ok(db.managerPermissions, 'Manager permissions retrieved successfully');

    case 'PUT /api/settings/permissions': {
      db.managerPermissions = payload as unknown as ManagerPermissions;
      return ok(db.managerPermissions, 'Manager permissions saved successfully');
    }

    case 'GET /api/settings/academy':
      return ok(db.academySettings, 'Academy settings retrieved successfully');

    case 'PUT /api/settings/academy': {
      db.academySettings = payload as unknown as AcademyLocationAndTiming;
      return ok(db.academySettings, 'Academy settings saved successfully');
    }

    case 'GET /api/settings/locations':
      return ok(db.locations, 'Locations retrieved successfully');

    case 'POST /api/settings/locations':
      return ok(upsertLocation(payload), 'Location added successfully');

    case 'PUT /api/settings/locations':
      return ok(upsertLocation(payload), 'Location updated successfully');

    case 'DELETE /api/settings/locations': {
      const id = searchParams.get('id') ?? payload.id;
      db.locations = db.locations.filter((loc) => loc.id !== id);
      return ok(db.locations, 'Location deleted successfully');
    }

    case 'GET /api/settings/locations/assignments':
      return ok(db.managerAssignments, 'Manager assignments retrieved successfully');

    case 'PUT /api/settings/locations/assignments': {
      db.managerAssignments = payload as unknown as Record<string, string>;
      return ok(db.managerAssignments, 'Manager assignments saved successfully');
    }

    /* ---------------- Staff accounts ---------------- */

    case 'GET /api/auth/users':
      return ok(db.staffAccounts, 'Staff accounts retrieved successfully');

    case 'POST /api/auth/users': {
      const email = String(payload.email ?? '').toLowerCase().trim();
      if (!email) return fail('Email address is required');
      if (db.staffAccounts.some((acc) => acc.email === email)) {
        return fail(`A ${payload.role} with this email already exists.`);
      }
      const created = {
        email,
        role: payload.role === 'admin' ? ('admin' as const) : ('manager' as const),
        name: payload.name,
        designation: payload.designation,
        assignedBatch: payload.assignedBatch,
        assignedLocationId: payload.assignedLocationId,
      };
      db.staffAccounts = [...db.staffAccounts, created];
      return ok(created, 'Account created successfully');
    }

    case 'PUT /api/auth/users': {
      const email = String(payload.email ?? '').toLowerCase().trim();
      const target = db.staffAccounts.find((acc) => acc.email === email);
      if (!target) return fail('Account not found.');
      // Passwords are never stored in the fixture and never returned.
      return ok(target, 'Password updated successfully');
    }

    case 'PUT /api/auth/users/profile': {
      const email = String(payload.email ?? '').toLowerCase().trim();
      const target = db.staffAccounts.find((acc) => acc.email === email);
      if (!target) return fail('Account not found.');
      const updated = { ...target, ...payload, email: target.email };
      db.staffAccounts = db.staffAccounts.map((acc) => (acc.email === email ? updated : acc));
      return ok(updated, 'Profile updated successfully');
    }

    /* ---------------- Attendance ---------------- */

    case 'GET /api/attendance/students': {
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const date = searchParams.get('date');
      const batch = searchParams.get('batch');
      const studentId = searchParams.get('studentId');

      const visible = new Set(subs.map((s) => s.id));
      const inScope = db.studentAttendance.filter(
        (rec) =>
          (session.role !== 'manager' || rec.batch === session.assignedBatch) &&
          visible.has(rec.studentId)
      );

      const filtered = inScope.filter((rec) => {
        if (batch && rec.batch !== batch) return false;
        if (studentId && rec.studentId !== studentId) return false;
        if (from && rec.date < from) return false;
        if (to && rec.date > to) return false;
        if (!from && !to && date && rec.date !== date) return false;
        return true;
      });
      return ok(filtered, 'Student attendance retrieved successfully');
    }

    case 'PUT /api/attendance/students':
    case 'POST /api/attendance/students': {
      const incoming = (Array.isArray(payload) ? payload : [payload]) as Array<
        Partial<StudentAttendanceRecord> & { id?: string }
      >;
      const saved: StudentAttendanceRecord[] = incoming.map((rec, index) => {
        const existing = rec.id ? db.studentAttendance.find((r) => r.id === rec.id) : undefined;
        const record: StudentAttendanceRecord = {
          id: rec.id || `ATT-DEMO-${Date.now().toString(36)}-${index}`,
          studentId: rec.studentId ?? existing?.studentId ?? '',
          studentName: rec.studentName ?? existing?.studentName ?? '',
          batch: rec.batch ?? existing?.batch ?? '',
          date: rec.date ?? existing?.date ?? formatDateKey(new Date()),
          status: rec.status ?? existing?.status ?? 'Present',
          markedBy: rec.markedBy ?? session.email,
          markedByRole: rec.markedByRole ?? (session.role === 'manager' ? 'manager' : 'admin'),
          timestamp: new Date().toISOString(),
          notes: rec.notes,
        };
        db.studentAttendance = [
          ...db.studentAttendance.filter((r) => r.id !== record.id),
          record,
        ];
        return record;
      });
      return ok(saved, 'Student attendance saved successfully');
    }

    case 'GET /api/attendance/managers': {
      const email = searchParams.get('managerEmail');
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const date = searchParams.get('date');
      // Managers see only their own log; admins see the whole academy.
      const visible =
        session.role === 'manager' ? db.managerAttendance.filter((r) => r.managerEmail === session.email) : db.managerAttendance;

      return ok(
        visible.filter((rec) => {
          if (email && rec.managerEmail !== email) return false;
          if (from && rec.date < from) return false;
          if (to && rec.date > to) return false;
          if (!from && !to && date && rec.date !== date) return false;
          return true;
        }),
        'Manager attendance retrieved successfully'
      );
    }

    case 'POST /api/attendance/managers': {
      if (session.role === 'manager' && payload.managerEmail && payload.managerEmail !== session.email) {
        return fail('You can only record your own attendance.');
      }
      if (payload.action === 'checkout') {
        const target = db.managerAttendance.find(
          (rec) => rec.managerEmail === payload.managerEmail && rec.date === payload.date
        );
        if (!target) return fail('No check-in found for that date.');
        const updated: ManagerAttendanceRecord = { ...target, checkOutTime: payload.checkOutTime };
        db.managerAttendance = db.managerAttendance.map((rec) => (rec.id === target.id ? updated : rec));
        return ok(updated, 'Checked out successfully');
      }
      const record: ManagerAttendanceRecord = {
        id: payload.id || `MATT-DEMO-${Date.now().toString(36)}`,
        managerEmail: payload.managerEmail ?? session.email,
        managerName: payload.managerName,
        date: payload.date ?? formatDateKey(new Date()),
        checkInTime: payload.checkInTime,
        status: payload.status ?? 'On Time',
        latitude: payload.latitude ?? 0,
        longitude: payload.longitude ?? 0,
        distanceFromAcademyMeters: payload.distanceFromAcademyMeters ?? 0,
        verifiedGPS: payload.verifiedGPS ?? false,
        notes: payload.notes,
      };
      db.managerAttendance = [
        ...db.managerAttendance.filter((r) => r.id !== record.id),
        record,
      ];
      return ok(record, 'Check-in recorded successfully');
    }

    /* ---------------- Payments ---------------- */

    case 'GET /api/razorpay/credentials':
      return ok(
        { keyId: 'rzp_test_demo', mode: 'Test', configured: true, managedByEnv: false },
        'Razorpay is not connected in the demo — the checkout button simulates a settlement instead.'
      );

    case 'PUT /api/razorpay/credentials':
      return ok(
        { keyId: payload.keyId || 'rzp_test_demo', mode: payload.mode === 'Live' ? 'Live' : 'Test', configured: true, managedByEnv: false },
        'Demo mode never stores payment credentials. The key secret is discarded.'
      );

    case 'POST /api/razorpay/create-order': {
      const target = db.invoices.find((inv) => inv.id === payload.invoiceId);
      if (!target) return fail('Invoice not found');
      return ok({
        orderId: `order_demo_${Date.now().toString(36)}`,
        keyId: 'rzp_test_demo',
        amount: target.amount,
        currency: 'INR',
      });
    }

    case 'POST /api/razorpay/verify': {
      const target = db.invoices.find((inv) => inv.id === payload.invoiceId);
      if (!target) return fail('Invoice not found');
      const settled = settleInvoice(target, payload.paymentId || `pay_demo_${Date.now().toString(36)}`);
      db.invoices = db.invoices.map((inv) => (inv.id === target.id ? settled : inv));
      return ok(settled, 'Payment verified successfully');
    }

    case 'POST /api/razorpay/subscription-order': {
      const target = db.subscriptions.find((s) => s.id === payload.subscriptionId);
      if (!target) return fail('Subscription not found');
      return ok({
        orderId: `order_demo_${Date.now().toString(36)}`,
        customerId: `cust_demo_${target.id}`,
        keyId: 'rzp_test_demo',
        amount: target.monthlyFee,
        currency: 'INR',
        // A demo mandate must not ask for real card or bank details; the
        // sandbox stub in demoSandbox.ts settles it without any form.
        demo: true,
      });
    }

    case 'POST /api/razorpay/subscription-verify': {
      const target = db.subscriptions.find((s) => s.id === payload.subscriptionId);
      if (!target) return fail('Subscription not found');
      const today = formatDateKey(new Date());
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      const updated: Subscription = {
        ...target,
        autoDebit: true,
        razorpayTokenId: `token_demo_${target.id}`,
        nextBillingDate: formatDateKey(next),
      };
      db.subscriptions = db.subscriptions.map((s) => (s.id === target.id ? updated : s));
      // A first mandate payment settles the current cycle immediately.
      const cycleId = `INV-${target.id.replace('SUB-DEMO-', '')}-${today.slice(0, 7).replace('-', '')}`;
      if (!db.invoices.some((inv) => inv.id === cycleId)) {
        db.invoices = [
          {
            id: cycleId,
            studentName: target.studentName,
            parentName: target.parentName,
            parentEmail: target.parentEmail,
            amount: target.monthlyFee,
            courseName: target.courseName,
            date: today,
            dueDate: today,
            status: 'Success',
            paidAt: today,
            transactionId: payload.paymentId || `pay_demo_${Date.now().toString(36)}`,
            semester: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          },
          ...db.invoices,
        ];
      }
      return ok(updated, 'Auto-debit enabled');
    }

    case 'POST /api/razorpay/cancel-auto-debit': {
      const target = db.subscriptions.find((s) => s.id === payload.subscriptionId);
      if (!target) return fail('Subscription not found');
      const updated: Subscription = {
        ...target,
        autoDebit: false,
        razorpayTokenId: undefined,
      };
      db.subscriptions = db.subscriptions.map((s) => (s.id === target.id ? updated : s));
      return ok(updated, 'Auto-debit cancelled');
    }

    case 'POST /api/razorpay/process-recurring': {
      const today = formatDateKey(new Date());
      const results = db.subscriptions
        .filter((s) => s.status === 'Active' && s.autoDebit && s.nextBillingDate <= today)
        .map((s) => {
          const settled = settleInvoice(
            {
              id: `INV-${s.id.replace('SUB-DEMO-', '')}-${today.slice(0, 7).replace('-', '')}`,
              studentName: s.studentName,
              parentName: s.parentName,
              parentEmail: s.parentEmail,
              amount: s.monthlyFee,
              courseName: s.courseName,
              date: today,
              dueDate: today,
              status: 'Pending',
              semester: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            },
            `pay_demo_auto_${s.id}`
          );
          db.invoices = [settled, ...db.invoices.filter((inv) => inv.id !== settled.id)];
          const next = new Date();
          next.setMonth(next.getMonth() + 1);
          const advanced: Subscription = { ...s, nextBillingDate: formatDateKey(next) };
          db.subscriptions = db.subscriptions.map((x) => (x.id === s.id ? advanced : x));
          return { subscriptionId: s.id, success: true, paymentId: settled.transactionId };
        });
      return ok(
        {
          processed: results.length,
          succeeded: results.length,
          failed: 0,
          results,
        },
        'Recurring payments processed'
      );
    }

    case 'GET /api/razorpay/test-auto-debit':
      return ok(
        {
          mode: 'Test',
          configured: true,
          simulationAllowed: true,
          subscriptions: db.subscriptions.map((s) => ({
            id: s.id,
            studentName: s.studentName,
            parentName: s.parentName,
            monthlyFee: s.monthlyFee,
            status: s.status,
            autoDebit: Boolean(s.autoDebit),
            simulated: false,
            hasToken: Boolean(s.razorpayTokenId),
            nextBillingDate: s.nextBillingDate,
            hasPaid: hasPaidFirstPayment(s, db.invoices),
            due: s.nextBillingDate <= formatDateKey(new Date()),
          })),
        },
        'Auto-debit state retrieved'
      );

    case 'POST /api/razorpay/test-auto-debit': {
      const target = db.subscriptions.find((s) => s.id === payload.subscriptionId);
      if (!target) return fail('Subscription not found');
      if (payload.action === 'attach') {
        const next = new Date();
        next.setDate(next.getDate() - 1);
        db.subscriptions = db.subscriptions.map((s) =>
          s.id === target.id
            ? { ...s, autoDebit: true, razorpayTokenId: `token_sim_${s.id}`, nextBillingDate: formatDateKey(next) }
            : s
        );
        return { success: true, message: `Simulated mandate attached to ${target.studentName}.` };
      }
      if (payload.action === 'detach') {
        db.subscriptions = db.subscriptions.map((s) =>
          s.id === target.id ? { ...s, autoDebit: false, razorpayTokenId: undefined } : s
        );
        return { success: true, message: `Simulated mandate removed from ${target.studentName}.` };
      }
      const settled = settleInvoice(
        {
          id: `INV-${target.id.replace('SUB-DEMO-', '')}-${formatDateKey(new Date()).slice(0, 7).replace('-', '')}`,
          studentName: target.studentName,
          parentName: target.parentName,
          parentEmail: target.parentEmail,
          amount: target.monthlyFee,
          courseName: target.courseName,
          date: formatDateKey(new Date()),
          dueDate: formatDateKey(new Date()),
          status: 'Pending',
          semester: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
        },
        `pay_sim_${Date.now().toString(36)}`
      );
      db.invoices = [settled, ...db.invoices.filter((inv) => inv.id !== settled.id)];
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      db.subscriptions = db.subscriptions.map((s) =>
        s.id === target.id ? { ...s, nextBillingDate: formatDateKey(next) } : s
      );
      return { success: true, message: `Simulated charge settled for ${target.studentName}.` };
    }

    default:
      return fail(
        `Demo mode does not implement ${verb} ${pathname}. Academy data is never reachable from a demo session.`
      );
  }
}
