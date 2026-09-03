/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, RotateCcw, LogOut, CalendarCheck, Navigation, Sun, Moon
} from 'lucide-react';

import {
  Invoice,
  Subscription,
  FilmCourse,
  FILM_COURSES,
  UserRole,
  ManagerPermissions,
  AcademyLocationAndTiming,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_ACADEMY_SETTINGS,
} from './types';
import { INITIAL_INVOICES, INITIAL_SUBSCRIPTIONS } from './seedData';
import { hasPermission } from './utils/permissions';
import { useIsMobile } from './hooks/useIsMobile';
import { useTheme } from './hooks/useTheme';
import AdminDashboard from './components/AdminDashboard';
import ParentPortal from './components/ParentPortal';
import StudentProfileView from './components/StudentProfileView';
import StudentRegistry from './components/StudentRegistry';
import InvoiceReceiptModal from './components/InvoiceReceiptModal';
import FinancialReports from './components/FinancialReports';
import Settings from './components/Settings';
import Login from './components/Login';
import StudentAttendance from './components/StudentAttendance';
import ManagerCheckIn from './components/ManagerCheckIn';
import {
  apiFetchInvoices,
  apiFetchSubscriptions,
  apiFetchCourses,
  apiFetchBatches,
  apiPayInvoice,
  apiVerifyRazorpayPayment,
  apiUpdateInvoices,
  apiUpdateSubscription,
  apiUpdateSubscriptionStatus,
  apiUpdateAllSubscriptions,
  apiUpdateCourses,
  apiUpdateBatches,
  apiCreateBatch,
  apiFetchManagerPermissions,
  apiUpdateManagerPermissions,
  apiFetchAcademySettings,
  apiUpdateAcademySettings,
  apiFetchMe,
  apiLogout,
} from './services/apiClient';

type ConsoleTab =
  | 'ledger'
  | 'students'
  | 'attendance'
  | 'managerCheckIn'
  | 'managerLog'
  | 'reports'
  | 'settings';

interface SessionUser {
  email: string;
  role: UserRole;
  name?: string;
  subscriptionId?: string;
  studentName?: string;
  parentLoginId?: string;
  assignedBatch?: string;
}

/**
 * Root client application shell with role-locked consoles and permission gates.
 */
export default function App() {
  const isMobileMode = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const [adminTab, setAdminTab] = useState<ConsoleTab>('ledger');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [courses, setCourses] = useState<FilmCourse[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<SessionUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [managerPermissions, setManagerPermissions] = useState<ManagerPermissions>(DEFAULT_MANAGER_PERMISSIONS);
  const [academySettings, setAcademySettings] = useState<AcademyLocationAndTiming>(DEFAULT_ACADEMY_SETTINGS);

  useEffect(() => {
    apiFetchMe()
      .then((user) => {
        setLoggedInUser(user);
      })
      .catch(() => {
        setLoggedInUser(null);
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, []);

  const handleLoginSuccess = (user: SessionUser): void => {
    setLoggedInUser(user);
    setAdminTab(user.role === 'manager' ? 'attendance' : 'ledger');
    loadAllData();
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await apiLogout();
    } catch {
      // Session cookie may already be gone; clear local state regardless.
    }
    setLoggedInUser(null);
    setSelectedSubscription(null);
    setSelectedInvoice(null);
    setAdminTab('ledger');
  };

  const loadAllData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [invData, subData, courseData, batchData, permData, academyData] = await Promise.all([
        apiFetchInvoices(),
        apiFetchSubscriptions(),
        apiFetchCourses(),
        apiFetchBatches(),
        apiFetchManagerPermissions().catch(() => DEFAULT_MANAGER_PERMISSIONS),
        apiFetchAcademySettings().catch(() => DEFAULT_ACADEMY_SETTINGS),
      ]);
      setInvoices(invData);
      setSubscriptions(subData);
      setCourses(courseData);
      setBatches(batchData);
      setManagerPermissions(permData);
      setAcademySettings(academyData);
    } catch (err) {
      console.error('Failed to load data from API routes:', err);
      setInvoices(INITIAL_INVOICES);
      setSubscriptions(INITIAL_SUBSCRIPTIONS);
      setCourses(FILM_COURSES);
      setBatches([]);
      setManagerPermissions(DEFAULT_MANAGER_PERMISSIONS);
      setAcademySettings(DEFAULT_ACADEMY_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loggedInUser) {
      loadAllData();
    }
  }, [loggedInUser]);

  const isAdmin = loggedInUser?.role === 'admin';
  const isManager = loggedInUser?.role === 'manager';
  const isParent = loggedInUser?.role === 'parent';

  const canViewLedger = isAdmin;
  const canViewStudents =
    isAdmin ||
    (isManager &&
      (hasPermission(managerPermissions, 'canViewStudents') ||
        hasPermission(managerPermissions, 'canManageStudents')));
  const canManageStudents = isAdmin || (isManager && hasPermission(managerPermissions, 'canManageStudents'));
  const canMarkAttendance =
    isAdmin || (isManager && hasPermission(managerPermissions, 'canMarkStudentAttendance'));
  const canAccessReports = isAdmin;
  const canManageBatches = isAdmin || (isManager && hasPermission(managerPermissions, 'canManageBatches'));
  const canManagerCheckIn =
    isManager && hasPermission(managerPermissions, 'canCheckInManagerAttendance');
  const canViewManagerLog = isAdmin;
  const canOpenSettings = isAdmin || isManager;

  useEffect(() => {
    if (!loggedInUser || loggedInUser.role === 'parent') {
      return;
    }
    const allowed: ConsoleTab[] = [];
    if (canViewLedger) allowed.push('ledger');
    if (canViewStudents) allowed.push('students');
    if (canMarkAttendance) allowed.push('attendance');
    if (canManagerCheckIn) allowed.push('managerCheckIn');
    if (canViewManagerLog) allowed.push('managerLog');
    if (canAccessReports) allowed.push('reports');
    if (canOpenSettings) allowed.push('settings');
    if (allowed.length > 0 && !allowed.includes(adminTab)) {
      setAdminTab(allowed[0]);
    }
  }, [
    loggedInUser,
    adminTab,
    canViewLedger,
    canViewStudents,
    canMarkAttendance,
    canManagerCheckIn,
    canViewManagerLog,
    canAccessReports,
    canOpenSettings,
  ]);

  const handleSaveManagerPermissions = async (permissions: ManagerPermissions): Promise<void> => {
    const updated = await apiUpdateManagerPermissions(permissions);
    setManagerPermissions(updated);
  };

  const handleSaveAcademySettings = async (settings: AcademyLocationAndTiming): Promise<void> => {
    const updated = await apiUpdateAcademySettings(settings);
    setAcademySettings(updated);
  };

  const handleAddCourse = async (newCourse: FilmCourse): Promise<void> => {
    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    try {
      await apiUpdateCourses(updatedCourses);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCourse = async (courseName: string): Promise<void> => {
    const updatedCourses = courses.filter((c) => c.name !== courseName);
    setCourses(updatedCourses);
    try {
      await apiUpdateCourses(updatedCourses);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddBatch = async (newBatch: string): Promise<void> => {
    try {
      const createdBatch = await apiCreateBatch(newBatch);
      if (!batches.includes(createdBatch)) {
        setBatches([...batches, createdBatch]);
      }
    } catch {
      const updatedBatches = [...batches, newBatch];
      setBatches(updatedBatches);
      await apiUpdateBatches(updatedBatches);
    }
  };

  const handleDeleteBatch = async (batchName: string): Promise<void> => {
    const updatedBatches = batches.filter((b) => b !== batchName);
    setBatches(updatedBatches);
    try {
      await apiUpdateBatches(updatedBatches);
    } catch (e) {
      console.error(e);
    }
  };

  const saveState = async (updatedInvoices: Invoice[], updatedSubs: Subscription[]): Promise<void> => {
    setInvoices(updatedInvoices);
    setSubscriptions(updatedSubs);
    try {
      await Promise.all([
        apiUpdateInvoices(updatedInvoices),
        apiUpdateAllSubscriptions(updatedSubs),
      ]);
    } catch (e) {
      console.error('API save failed:', e);
    }
  };

  const handleResetLedger = async (): Promise<void> => {
    try {
      await fetch('/api/seed', { method: 'POST' });
      const [invData, subData, courseData, batchData, permData, academyData] = await Promise.all([
        apiFetchInvoices(),
        apiFetchSubscriptions(),
        apiFetchCourses(),
        apiFetchBatches(),
        apiFetchManagerPermissions(),
        apiFetchAcademySettings(),
      ]);
      setInvoices(invData);
      setSubscriptions(subData);
      setCourses(courseData);
      setBatches(batchData);
      setManagerPermissions(permData);
      setAcademySettings(academyData);
    } catch {
      saveState(INITIAL_INVOICES, INITIAL_SUBSCRIPTIONS);
    }
    setSelectedInvoice(null);
    setSelectedSubscription(null);
  };

  const handleAddInvoice = (newInvoiceData: Omit<Invoice, 'id'>): void => {
    const nextId = `INV-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const newInvoice: Invoice = { ...newInvoiceData, id: nextId };
    saveState([newInvoice, ...invoices], subscriptions);
  };

  const handleDeleteInvoice = (id: string): void => {
    const updatedInvoices = invoices.filter((inv) => inv.id !== id);
    saveState(updatedInvoices, subscriptions);
    if (selectedInvoice?.id === id) {
      setSelectedInvoice(null);
    }
  };

  const handlePayInvoice = async (
    invoiceId: string,
    paymentDetails?: { paymentId: string; orderId: string; signature: string }
  ): Promise<void> => {
    const updatedInv = paymentDetails
      ? await apiVerifyRazorpayPayment({
          invoiceId,
          paymentId: paymentDetails.paymentId,
          orderId: paymentDetails.orderId,
          signature: paymentDetails.signature,
        })
      : await apiPayInvoice(invoiceId);
    const updatedInvoices = invoices.map((inv) => (inv.id === invoiceId ? updatedInv : inv));
    setInvoices(updatedInvoices);
    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice(updatedInv);
    }
  };

  const handleUpdateSubscriptionStatus = async (
    subId: string,
    newStatus: 'Active' | 'Paused' | 'Canceled'
  ): Promise<void> => {
    try {
      const updatedSub = await apiUpdateSubscriptionStatus(subId, newStatus);
      const updatedSubs = subscriptions.map((sub) => (sub.id === subId ? updatedSub : sub));
      setSubscriptions(updatedSubs);
      if (selectedSubscription?.id === subId) {
        setSelectedSubscription(updatedSub);
      }
    } catch {
      const updatedSubs = subscriptions.map((sub) => {
        if (sub.id === subId) {
          const updated = { ...sub, status: newStatus };
          if (selectedSubscription?.id === subId) {
            setSelectedSubscription(updated);
          }
          return updated;
        }
        return sub;
      });
      saveState(invoices, updatedSubs);
    }
  };

  const handleAddSubscription = (newSubData: Omit<Subscription, 'id'>): void => {
    const nextId = `SUB-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
    const newSub: Subscription = { ...newSubData, id: nextId };
    saveState(invoices, [newSub, ...subscriptions]);
  };

  const handleUpdateSubscription = async (updatedSub: Subscription): Promise<void> => {
    try {
      const resSub = await apiUpdateSubscription(updatedSub);
      const updatedSubs = subscriptions.map((sub) => (sub.id === resSub.id ? resSub : sub));
      setSubscriptions(updatedSubs);
      if (selectedSubscription?.id === updatedSub.id) {
        setSelectedSubscription(resSub);
      }
    } catch {
      const updatedSubs = subscriptions.map((sub) => (sub.id === updatedSub.id ? updatedSub : sub));
      saveState(invoices, updatedSubs);
    }
  };

  const handleDeleteSubscription = (id: string): void => {
    const updatedSubs = subscriptions.filter((sub) => sub.id !== id);
    saveState(invoices, updatedSubs);
    if (selectedSubscription?.id === id) {
      setSelectedSubscription(null);
    }
  };

  const roleBadgeLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Admin Console';
      case 'manager':
        return 'Manager Console';
      case 'parent':
        return 'Parent Portal';
      default: {
        const _exhaustive: never = role;
        return _exhaustive;
      }
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg font-sans">
        <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading session">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
            Restoring session
          </span>
        </div>
      </div>
    );
  }

  if (!loggedInUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderTabButton = (tab: ConsoleTab, label: string): React.ReactNode => (
    <button
      key={tab}
      type="button"
      onClick={() => setAdminTab(tab)}
      className={`shrink-0 whitespace-nowrap px-3 sm:px-4 py-2 text-[11px] sm:text-xs font-sans uppercase tracking-wider rounded-xs transition-all cursor-pointer border ${
        adminTab === tab
          ? 'bg-brand-blue text-black border-brand-blue font-bold shadow-md shadow-brand-blue/10'
          : 'bg-brand-surface-card text-gray-400 border-brand-border hover:text-white hover:border-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-brand-bg text-brand-ink font-sans selection:bg-brand-blue selection:text-black antialiased">
      <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-bg/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xs bg-brand-blue text-black shadow-md shadow-brand-blue/10">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <span className="font-sans text-sm font-bold uppercase tracking-wider text-white">
                PLL Academy
              </span>
              <span className="ml-2.5 font-mono text-[10px] text-brand-blue uppercase tracking-widest hidden sm:inline-block border border-brand-blue/30 px-1.5 py-0.5 rounded-xs bg-brand-blue/5">
                Pro Academy Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="font-mono text-[10px] text-brand-blue uppercase tracking-widest">
                {roleBadgeLabel(loggedInUser.role)}
              </span>
              <span className="font-mono text-[10px] text-gray-500 truncate max-w-[200px]">
                {loggedInUser.email}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-xs border border-brand-border hover:border-brand-blue/60 bg-brand-charcoal hover:bg-brand-blue/10 text-gray-400 hover:text-brand-blue transition-all cursor-pointer"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'light'}
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xs border border-brand-border hover:border-brand-cinnabar/60 bg-brand-charcoal hover:bg-brand-cinnabar/10 text-gray-400 hover:text-brand-cinnabar text-xs font-mono transition-all cursor-pointer"
              title="Logout session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <AnimatePresence>
          {selectedSubscription && (isAdmin || canManageStudents) && (
            <StudentProfileView
              subscription={selectedSubscription}
              invoices={invoices.filter(
                (i) => i.studentName.toLowerCase() === selectedSubscription.studentName.toLowerCase()
              )}
              onBack={() => setSelectedSubscription(null)}
              onUpdateSubscriptionStatus={handleUpdateSubscriptionStatus}
              onSelectInvoice={setSelectedInvoice}
              courses={courses}
              batches={batches}
              isAdmin={isAdmin}
              isManager={isManager}
              onUpdateSubscription={handleUpdateSubscription}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {isParent ? (
            <motion.div
              key="parent-perspective"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ParentPortal
                invoices={invoices}
                subscriptions={subscriptions}
                isMobileMode={isMobileMode}
                onPayInvoice={handlePayInvoice}
                onUpdateSubscriptionStatus={handleUpdateSubscriptionStatus}
                onSelectInvoice={setSelectedInvoice}
                courses={courses}
                batches={batches}
                onUpdateSubscription={handleUpdateSubscription}
                onRefreshData={loadAllData}
                sessionUser={loggedInUser}
              />
            </motion.div>
          ) : !selectedSubscription ? (
            <motion.div
              key="staff-perspective"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-start lg:items-center justify-between border-b border-brand-border pb-4 gap-3 flex-col lg:flex-row">
                {/* Tabs scroll sideways on small screens instead of stacking into a tall wall */}
                <div className="flex gap-2 w-full lg:w-auto overflow-x-auto lg:flex-wrap lg:overflow-visible -mx-4 px-4 pb-1 lg:mx-0 lg:px-0 lg:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {canViewLedger && renderTabButton('ledger', 'Main Ledger')}
                  {canViewStudents &&
                    renderTabButton('students', `Student Registry (${subscriptions.length})`)}
                  {canMarkAttendance && renderTabButton('attendance', 'Attendance')}
                  {canManagerCheckIn && renderTabButton('managerCheckIn', 'My Check-In')}
                  {canViewManagerLog && renderTabButton('managerLog', 'Manager Log')}
                  {canAccessReports && renderTabButton('reports', 'Financial Reports')}
                  {canOpenSettings && renderTabButton('settings', 'Settings')}
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleResetLedger}
                    className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono text-gray-400 hover:text-brand-cinnabar hover:bg-brand-cinnabar/10 border border-brand-border hover:border-brand-cinnabar/40 rounded-xs transition-all cursor-pointer"
                    title="Reset to default seed state"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Seed Data</span>
                  </button>
                )}
              </div>

              {loading && (
                <div className="text-xs font-mono text-gray-500 flex items-center gap-2">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Syncing academy data...
                </div>
              )}

              {adminTab === 'ledger' && canViewLedger && (
                <AdminDashboard
                  invoices={invoices}
                  subscriptions={subscriptions}
                  courses={courses}
                  isMobileMode={isMobileMode}
                  isAdmin={isAdmin}
                  onAddInvoice={handleAddInvoice}
                  onDeleteInvoice={handleDeleteInvoice}
                  onSelectInvoice={setSelectedInvoice}
                  onSelectSubscription={setSelectedSubscription}
                  onUpdateSubscriptionStatus={handleUpdateSubscriptionStatus}
                />
              )}

              {adminTab === 'students' && canViewStudents && (
                <StudentRegistry
                  subscriptions={subscriptions}
                  invoices={invoices}
                  courses={courses}
                  batches={batches}
                  isMobileMode={isMobileMode}
                  isManager={isManager}
                  managerBatch={isManager ? loggedInUser?.assignedBatch : undefined}
                  onAddSubscription={canManageStudents ? handleAddSubscription : () => undefined}
                  onUpdateSubscription={canManageStudents ? handleUpdateSubscription : async () => undefined}
                  onSelectSubscription={setSelectedSubscription}
                  onDeleteSubscription={canManageStudents ? handleDeleteSubscription : () => undefined}
                />
              )}

              {adminTab === 'attendance' && canMarkAttendance && loggedInUser && (
                <StudentAttendance
                  subscriptions={subscriptions}
                  batches={batches}
                  markedByEmail={loggedInUser.email}
                  markedByRole={loggedInUser.role === 'manager' ? 'manager' : 'admin'}
                  canEdit={canMarkAttendance}
                />
              )}

              {adminTab === 'managerCheckIn' && canManagerCheckIn && loggedInUser && (
                <ManagerCheckIn
                  managerEmail={loggedInUser.email}
                  academySettings={academySettings}
                  canCheckIn={canManagerCheckIn}
                />
              )}

              {adminTab === 'managerLog' && canViewManagerLog && (
                <ManagerCheckIn
                  managerEmail={loggedInUser.email}
                  academySettings={academySettings}
                  canCheckIn={false}
                  isAdminView
                />
              )}

              {adminTab === 'reports' && canAccessReports && (
                <FinancialReports
                  invoices={invoices}
                  subscriptions={subscriptions}
                  batches={batches}
                  isAdmin={isAdmin}
                  onSelectInvoice={setSelectedInvoice}
                />
              )}

              {adminTab === 'settings' && canOpenSettings && (
                <Settings
                  courses={courses}
                  batches={batches}
                  onAddCourse={handleAddCourse}
                  onDeleteCourse={handleDeleteCourse}
                  onAddBatch={handleAddBatch}
                  onDeleteBatch={handleDeleteBatch}
                  managerPermissions={managerPermissions}
                  onSaveManagerPermissions={handleSaveManagerPermissions}
                  academySettings={academySettings}
                  onSaveAcademySettings={handleSaveAcademySettings}
                  canManageBatches={canManageBatches}
                  currentUserEmail={loggedInUser?.email}
                  isAdmin={isAdmin}
                  onRefreshData={loadAllData}
                />
              )}

              {!canViewLedger &&
                !canViewStudents &&
                !canMarkAttendance &&
                !canManagerCheckIn &&
                !canViewManagerLog &&
                !canAccessReports &&
                !canOpenSettings && (
                  <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-8 text-center space-y-2">
                    <Navigation className="h-6 w-6 text-brand-blue mx-auto" />
                    <p className="font-sans text-sm text-white font-bold">No permissions enabled</p>
                    <p className="font-sans text-xs text-gray-400">
                      Ask an administrator to grant manager access flags in Settings.
                    </p>
                  </div>
                )}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {selectedInvoice && (
            <InvoiceReceiptModal
              invoice={selectedInvoice}
              onClose={() => setSelectedInvoice(null)}
              onPaySuccess={(id) => handlePayInvoice(id)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
