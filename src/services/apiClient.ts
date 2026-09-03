import { Invoice, Subscription, FilmCourse, ManagerPermissions, AcademyLocationAndTiming, StudentAttendanceRecord, ManagerAttendanceRecord } from '../types';

export interface SessionUser {
  email: string;
  role: 'admin' | 'manager' | 'parent';
  name?: string;
  subscriptionId?: string;
  studentName?: string;
  parentLoginId?: string;
}

export interface StaffAccount {
  email: string;
  role: 'admin' | 'manager';
  name?: string;
  designation?: string;
  phone?: string;
  address?: string;
  profilePic?: string;
}

export async function apiUpdateStaffProfile(input: {
  email: string;
  name?: string;
  designation?: string;
  phone?: string;
  address?: string;
  profilePic?: string;
}): Promise<StaffAccount> {
  const res = await fetch('/api/auth/users/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update staff profile');
  }
  return data.data;
}

export async function apiLogin(
  email: string,
  role: 'admin' | 'manager',
  password: string
): Promise<SessionUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, role, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Login failed');
  }
  return data.data;
}

export async function apiLoginParent(parentLoginId: string): Promise<SessionUser> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'parent', parentLoginId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Login failed');
  }
  return data.data;
}

export async function apiFetchMe(): Promise<SessionUser> {
  const res = await fetch('/api/auth/me');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Not authenticated');
  }
  return data.data;
}

export async function apiLogout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function apiFetchStaffAccounts(): Promise<StaffAccount[]> {
  const res = await fetch('/api/auth/users');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch staff accounts');
  }
  return data.data;
}

export async function apiCreateUserAccount(input: {
  email: string;
  role: 'admin' | 'manager';
  password: string;
  name?: string;
  designation?: string;
  phone?: string;
  address?: string;
  profilePic?: string;
}): Promise<StaffAccount> {
  const res = await fetch('/api/auth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create account');
  }
  return data.data;
}

export async function apiChangeUserPassword(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}): Promise<StaffAccount> {
  const res = await fetch('/api/auth/users', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update password');
  }
  return data.data;
}

export async function apiFetchInvoices(): Promise<Invoice[]> {
  const res = await fetch('/api/invoices');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch invoices');
  }
  return data.data;
}

export async function apiPayInvoice(invoiceId: string): Promise<Invoice> {
  const res = await fetch('/api/invoices/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to pay invoice');
  }
  return data.data;
}

export interface RazorpayPublicCredentials {
  keyId: string;
  mode: 'Live' | 'Test';
  configured: boolean;
  /** Credentials come from the server environment; the Settings form is read-only. */
  managedByEnv: boolean;
}

export interface RazorpayOrderResult {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
}

/** Mandate registration orders also carry the customer the mandate belongs to. */
export interface RazorpayMandateOrderResult extends RazorpayOrderResult {
  customerId: string;
}

export async function apiFetchRazorpayCredentials(): Promise<RazorpayPublicCredentials> {
  const res = await fetch('/api/razorpay/credentials');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load Razorpay configuration');
  }
  return data.data;
}

export async function apiSaveRazorpayCredentials(input: {
  keyId: string;
  keySecret?: string;
  webhookSecret?: string;
  mode?: 'Live' | 'Test';
}): Promise<RazorpayPublicCredentials> {
  const res = await fetch('/api/razorpay/credentials', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to save Razorpay configuration');
  }
  return data.data;
}

export async function apiCreateRazorpayOrder(invoiceId: string): Promise<RazorpayOrderResult> {
  const res = await fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create Razorpay order');
  }
  return data.data;
}

export async function apiVerifyRazorpayPayment(input: {
  invoiceId: string;
  paymentId: string;
  orderId: string;
  signature: string;
}): Promise<Invoice> {
  const res = await fetch('/api/razorpay/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Payment verification failed');
  }
  return data.data;
}

export async function apiCreateRazorpaySubscriptionOrder(
  subscriptionId: string
): Promise<RazorpayMandateOrderResult> {
  const res = await fetch('/api/razorpay/subscription-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create Razorpay mandate order');
  }
  return data.data;
}

export async function apiVerifyRazorpaySubscriptionPayment(input: {
  subscriptionId: string;
  paymentId: string;
  orderId: string;
  signature: string;
}): Promise<Subscription> {
  const res = await fetch('/api/razorpay/subscription-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Subscription payment verification failed');
  }
  return data.data;
}

export async function apiCancelAutoDebit(subscriptionId: string): Promise<Subscription> {
  const res = await fetch('/api/razorpay/cancel-auto-debit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriptionId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to cancel auto-debit');
  }
  return data.data;
}

export async function apiProcessDueAutoDebits(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ subscriptionId: string; success: boolean; paymentId?: string; error?: string }>;
}> {
  const res = await fetch('/api/razorpay/process-recurring', { method: 'POST' });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to process recurring payments');
  }
  return data.data;
}

export interface AutoDebitTestRow {
  id: string;
  studentName: string;
  parentName: string;
  monthlyFee: number;
  status: string;
  autoDebit: boolean;
  simulated: boolean;
  hasToken: boolean;
  nextBillingDate: string;
  due: boolean;
}

export interface AutoDebitTestState {
  mode: 'Live' | 'Test';
  configured: boolean;
  simulationAllowed: boolean;
  subscriptions: AutoDebitTestRow[];
}

export async function apiFetchAutoDebitTestState(): Promise<AutoDebitTestState> {
  const res = await fetch('/api/razorpay/test-auto-debit');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to load auto-debit test state');
  }
  return data.data;
}

export async function apiRunAutoDebitTestAction(
  action: 'attach' | 'charge' | 'detach',
  subscriptionId: string
): Promise<string> {
  const res = await fetch('/api/razorpay/test-auto-debit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, subscriptionId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Auto-debit simulation failed');
  }
  return data.message as string;
}

export async function apiUpdateInvoices(invoices: Invoice[]): Promise<Invoice[]> {
  const res = await fetch('/api/invoices', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoices),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update invoices');
  }
  return data.data;
}

export async function apiFetchSubscriptions(): Promise<Subscription[]> {
  const res = await fetch('/api/subscriptions');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch subscriptions');
  }
  return data.data;
}

export async function apiUpdateSubscription(subscription: Subscription): Promise<Subscription> {
  const res = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update subscription');
  }
  return data.data;
}

export async function apiUpdateSubscriptionStatus(subId: string, newStatus: 'Active' | 'Paused' | 'Canceled'): Promise<Subscription> {
  const res = await fetch('/api/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'updateStatus', subId, newStatus }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update subscription status');
  }
  return data.data;
}

export async function apiUpdateAllSubscriptions(subscriptions: Subscription[]): Promise<Subscription[]> {
  const res = await fetch('/api/subscriptions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscriptions),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update subscriptions');
  }
  return data.data;
}

export async function apiFetchCourses(): Promise<FilmCourse[]> {
  const res = await fetch('/api/courses');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch courses');
  }
  return data.data;
}

export async function apiUpdateCourses(courses: FilmCourse[]): Promise<FilmCourse[]> {
  const res = await fetch('/api/courses', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(courses),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update courses');
  }
  return data.data;
}

export async function apiFetchBatches(): Promise<string[]> {
  const res = await fetch('/api/batches');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch batches');
  }
  return data.data;
}

export async function apiCreateBatch(name: string): Promise<string> {
  const res = await fetch('/api/batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create batch');
  }
  return data.data;
}

export async function apiUpdateBatches(batches: string[]): Promise<string[]> {
  const res = await fetch('/api/batches', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batches),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update batches');
  }
  return data.data;
}

export async function apiFetchManagerPermissions(): Promise<ManagerPermissions> {
  const res = await fetch('/api/settings/permissions');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch manager permissions');
  }
  return data.data;
}

export async function apiUpdateManagerPermissions(
  permissions: ManagerPermissions
): Promise<ManagerPermissions> {
  const res = await fetch('/api/settings/permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(permissions),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update manager permissions');
  }
  return data.data;
}

export async function apiFetchAcademySettings(): Promise<AcademyLocationAndTiming> {
  const res = await fetch('/api/settings/academy');
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch academy settings');
  }
  return data.data;
}

export async function apiUpdateAcademySettings(
  settings: AcademyLocationAndTiming
): Promise<AcademyLocationAndTiming> {
  const res = await fetch('/api/settings/academy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update academy settings');
  }
  return data.data;
}

export async function apiFetchStudentAttendance(
  date: string,
  batch?: string
): Promise<StudentAttendanceRecord[]> {
  const params = new URLSearchParams({ date });
  if (batch) {
    params.set('batch', batch);
  }
  const res = await fetch(`/api/attendance/students?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch student attendance');
  }
  return data.data;
}

export async function apiFetchStudentAttendanceRange(filters: {
  from: string;
  to: string;
  batch?: string;
  studentId?: string;
}): Promise<StudentAttendanceRecord[]> {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.batch) {
    params.set('batch', filters.batch);
  }
  if (filters.studentId) {
    params.set('studentId', filters.studentId);
  }
  const res = await fetch(`/api/attendance/students?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch student attendance range');
  }
  return data.data;
}

export async function apiSaveStudentAttendance(
  records: Array<Omit<StudentAttendanceRecord, 'id' | 'timestamp'> & { id?: string; timestamp?: string }>
): Promise<StudentAttendanceRecord[]> {
  const res = await fetch('/api/attendance/students', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(records),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to save student attendance');
  }
  return data.data;
}

export async function apiFetchManagerAttendance(filters?: {
  managerEmail?: string;
  date?: string;
  from?: string;
  to?: string;
}): Promise<ManagerAttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.managerEmail) {
    params.set('managerEmail', filters.managerEmail);
  }
  if (filters?.date) {
    params.set('date', filters.date);
  }
  if (filters?.from) {
    params.set('from', filters.from);
  }
  if (filters?.to) {
    params.set('to', filters.to);
  }
  const query = params.toString();
  const res = await fetch(`/api/attendance/managers${query ? `?${query}` : ''}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch manager attendance');
  }
  return data.data;
}

export async function apiManagerCheckIn(
  record: Omit<ManagerAttendanceRecord, 'id'> & { id?: string }
): Promise<ManagerAttendanceRecord> {
  const res = await fetch('/api/attendance/managers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to record manager check-in');
  }
  return data.data;
}

export async function apiManagerCheckOut(input: {
  managerEmail: string;
  date: string;
  checkOutTime: string;
  latitude: number;
  longitude: number;
  distanceFromAcademyMeters: number;
  verifiedGPS: boolean;
}): Promise<ManagerAttendanceRecord> {
  const res = await fetch('/api/attendance/managers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'checkout', ...input }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to record manager check-out');
  }
  return data.data;
}
