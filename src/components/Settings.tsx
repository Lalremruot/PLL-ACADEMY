import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, Shield, Settings as SettingsIcon, Plus, Trash2, Check, RefreshCw, 
  CreditCard, CheckCircle2, AlertTriangle, Sparkles, AlertCircle, 
  UserPlus, Lock, KeyRound, Eye, EyeOff, Users, MapPin, SlidersHorizontal, Code2, FlaskConical
} from 'lucide-react';
import {
  AcademyLocationAndTiming,
  DEFAULT_ACADEMY_SETTINGS,
  DEFAULT_MANAGER_PERMISSIONS,
  FilmCourse,
  ManagerPermissions,
} from '../types';
import {
  apiChangeUserPassword,
  apiCreateUserAccount,
  apiFetchRazorpayCredentials,
  apiFetchStaffAccounts,
  apiSaveRazorpayCredentials,
  apiProcessDueAutoDebits,
  apiFetchAutoDebitTestState,
  apiRunAutoDebitTestAction,
  type AutoDebitTestState,
} from '../services/apiClient';

interface UserAccount {
  email: string;
  role: 'admin' | 'manager';
}

interface SettingsProps {
  courses: FilmCourse[];
  onAddCourse: (newCourse: FilmCourse) => void;
  onDeleteCourse: (courseName: string) => void;
  batches: string[];
  onAddBatch: (batchName: string) => void;
  onDeleteBatch: (batchName: string) => void;
  managerPermissions: ManagerPermissions;
  onSaveManagerPermissions: (permissions: ManagerPermissions) => Promise<void>;
  academySettings: AcademyLocationAndTiming;
  onSaveAcademySettings: (settings: AcademyLocationAndTiming) => Promise<void>;
  canManageBatches?: boolean;
  isMobileMode?: boolean;
  currentUserEmail?: string;
  /** Lets the auto-debit test harness pull fresh ledger data after a simulated charge. */
  onRefreshData?: () => void;
}

const PERMISSION_LABELS: Record<keyof ManagerPermissions, string> = {
  canViewStudents: 'View students',
  canManageStudents: 'Manage students',
  canMarkStudentAttendance: 'Mark student attendance',
  canAccessReports: 'Access financial reports',
  canManageInvoices: 'Manage invoices / ledger',
  canManageBatches: 'Manage batches',
  canCheckInManagerAttendance: 'Manager GPS check-in',
};

export default function Settings({
  courses,
  onAddCourse,
  onDeleteCourse,
  batches,
  onAddBatch,
  onDeleteBatch,
  managerPermissions,
  onSaveManagerPermissions,
  academySettings,
  onSaveAcademySettings,
  canManageBatches = true,
  isMobileMode = false,
  currentUserEmail = '',
  onRefreshData,
}: SettingsProps) {
  // Sub-tabs in Settings: 'operational' or 'account'
  const [settingsTab, setSettingsTab] = useState<'operational' | 'account'>('operational');

  // --- Operational Settings States ---
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpaySecret, setRazorpaySecret] = useState('');
  const [razorpayMode, setRazorpayMode] = useState<'Live' | 'Test'>('Test');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  // Credentials from the server environment win over anything stored here, so
  // the form is rendered read-only rather than accepting edits it would ignore.
  const [razorpayEnvManaged, setRazorpayEnvManaged] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessingRecurring, setIsProcessingRecurring] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiFetchRazorpayCredentials()
      .then((creds) => {
        if (cancelled) return;
        setRazorpayConfigured(creds.configured);
        setRazorpayEnvManaged(creds.managedByEnv);
        setRazorpayKeyId(creds.keyId);
        setRazorpayMode(creds.mode);
        if (creds.managedByEnv) {
          setSyncStatus('success');
          setSyncMessage(
            'Razorpay gateway is configured from the server environment. The key secret is never stored in the database.'
          );
        } else if (creds.configured) {
          setSyncStatus('success');
          setSyncMessage('Razorpay gateway is configured. Credentials are encrypted at rest in the server vault.');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSyncStatus('error');
        setSyncMessage('Razorpay is not configured yet.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- Auto-debit simulation harness (admin, non-Live gateways only) ---
  const [testState, setTestState] = useState<AutoDebitTestState | null>(null);
  const [testBusyId, setTestBusyId] = useState<string | null>(null);
  const [testLog, setTestLog] = useState<Array<{ ok: boolean; text: string }>>([]);
  const [showTestPanel, setShowTestPanel] = useState(false);

  const refreshTestState = async (): Promise<void> => {
    try {
      setTestState(await apiFetchAutoDebitTestState());
    } catch (err: unknown) {
      setTestLog((log) => [
        { ok: false, text: err instanceof Error ? err.message : 'Failed to load test state' },
        ...log,
      ]);
    }
  };

  useEffect(() => {
    if (showTestPanel && !testState) {
      refreshTestState();
    }
  }, [showTestPanel]);

  const handleTestAction = async (
    action: 'attach' | 'charge' | 'detach',
    subscriptionId: string
  ): Promise<void> => {
    setTestBusyId(`${action}:${subscriptionId}`);
    try {
      const message = await apiRunAutoDebitTestAction(action, subscriptionId);
      setTestLog((log) => [{ ok: true, text: message }, ...log].slice(0, 8));
    } catch (err: unknown) {
      setTestLog((log) =>
        [
          { ok: false, text: err instanceof Error ? err.message : 'Simulation failed' },
          ...log,
        ].slice(0, 8)
      );
    } finally {
      setTestBusyId(null);
      await refreshTestState();
      onRefreshData?.();
    }
  };

  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanTier, setNewPlanTier] = useState<'Standard' | 'Premium'>('Standard');
  const [newPlanFee, setNewPlanFee] = useState<number>(300);
  const [newPlanCoach, setNewPlanCoach] = useState('');
  const [planError, setPlanError] = useState('');
  const [planSuccess, setPlanSuccess] = useState('');

  // --- Student Batches States ---
  const [newBatchName, setNewBatchName] = useState('');
  const [batchError, setBatchError] = useState('');
  const [batchSuccess, setBatchSuccess] = useState('');

  // --- Account Settings States ---
  const [adminUsers, setAdminUsers] = useState<UserAccount[]>([]);
  const [managerUsers, setManagerUsers] = useState<UserAccount[]>([]);

  // Add Admin State
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [showNewAdminPass, setShowNewAdminPass] = useState(false);
  const [addAdminError, setAddAdminError] = useState('');
  const [addAdminSuccess, setAddAdminSuccess] = useState('');

  // Add Manager State
  const [newManagerEmail, setNewManagerEmail] = useState('');
  const [newManagerPassword, setNewManagerPassword] = useState('');
  const [showNewManagerPass, setShowNewManagerPass] = useState(false);
  const [addManagerError, setAddManagerError] = useState('');
  const [addManagerSuccess, setAddManagerSuccess] = useState('');

  // Manager permissions draft
  const [permDraft, setPermDraft] = useState<ManagerPermissions>(managerPermissions);
  const [permJson, setPermJson] = useState(JSON.stringify({ manager: managerPermissions }, null, 2));
  const [showPermJson, setShowPermJson] = useState(false);
  const [permError, setPermError] = useState('');
  const [permSuccess, setPermSuccess] = useState('');
  const [isSavingPerms, setIsSavingPerms] = useState(false);

  // Academy location/timing draft
  const [academyDraft, setAcademyDraft] = useState<AcademyLocationAndTiming>(academySettings);
  const [academyError, setAcademyError] = useState('');
  const [academySuccess, setAcademySuccess] = useState('');
  const [isSavingAcademy, setIsSavingAcademy] = useState(false);
  const [isReadingGps, setIsReadingGps] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  // Load Admin / Manager Accounts from the server
  useEffect(() => {
    apiFetchStaffAccounts()
      .then((accounts) => {
        setAdminUsers(accounts.filter((a) => a.role === 'admin'));
        setManagerUsers(accounts.filter((a) => a.role === 'manager'));
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load staff accounts';
        setAddAdminError(message);
      });
  }, []);

  useEffect(() => {
    setPermDraft(managerPermissions);
    setPermJson(JSON.stringify({ manager: managerPermissions }, null, 2));
  }, [managerPermissions]);

  useEffect(() => {
    setAcademyDraft(academySettings);
  }, [academySettings]);

  const handleTogglePermission = (key: keyof ManagerPermissions): void => {
    setPermDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSavePermissions = async (): Promise<void> => {
    setPermError('');
    setPermSuccess('');
    setIsSavingPerms(true);
    try {
      let next = permDraft;
      if (showPermJson) {
        const parsed = JSON.parse(permJson) as { manager?: ManagerPermissions } | ManagerPermissions;
        next = 'manager' in parsed && parsed.manager
          ? { ...DEFAULT_MANAGER_PERMISSIONS, ...parsed.manager }
          : { ...DEFAULT_MANAGER_PERMISSIONS, ...(parsed as ManagerPermissions) };
      }
      await onSaveManagerPermissions(next);
      setPermDraft(next);
      setPermJson(JSON.stringify({ manager: next }, null, 2));
      setPermSuccess('Manager permissions saved.');
      setTimeout(() => setPermSuccess(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save permissions';
      setPermError(message);
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleUseCurrentLocation = (): void => {
    setAcademyError('');
    if (!navigator.geolocation) {
      setAcademyError('Geolocation is not available in this browser.');
      return;
    }
    setIsReadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAcademyDraft((prev) => ({
          ...prev,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }));
        setIsReadingGps(false);
      },
      () => {
        setAcademyError('Unable to read GPS. Allow location access and retry.');
        setIsReadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleSaveAcademy = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAcademyError('');
    setAcademySuccess('');
    setIsSavingAcademy(true);
    try {
      const next: AcademyLocationAndTiming = {
        ...DEFAULT_ACADEMY_SETTINGS,
        ...academyDraft,
        latitude: Number(academyDraft.latitude),
        longitude: Number(academyDraft.longitude),
        radiusMeters: Number(academyDraft.radiusMeters),
        gracePeriodMinutes: Number(academyDraft.gracePeriodMinutes),
      };
      if (Number.isNaN(next.latitude) || Number.isNaN(next.longitude)) {
        throw new Error('Latitude and longitude must be valid numbers.');
      }
      if (next.radiusMeters <= 0) {
        throw new Error('Radius must be greater than zero meters.');
      }
      await onSaveAcademySettings(next);
      setAcademyDraft(next);
      setAcademySuccess('Academy location and timing saved.');
      setTimeout(() => setAcademySuccess(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save academy settings';
      setAcademyError(message);
    } finally {
      setIsSavingAcademy(false);
    }
  };

  const handleAddManager = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAddManagerError('');
    setAddManagerSuccess('');
    if (!newManagerEmail.trim() || !newManagerPassword) {
      setAddManagerError('Both email and password are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newManagerEmail)) {
      setAddManagerError('Please enter a valid email address.');
      return;
    }
    if (newManagerPassword.length < 6) {
      setAddManagerError('Password must be at least 6 characters.');
      return;
    }
    const exists = managerUsers.some((u) => u.email.toLowerCase() === newManagerEmail.trim().toLowerCase());
    if (exists) {
      setAddManagerError('A manager with this email already exists.');
      return;
    }
    try {
      await apiCreateUserAccount({
        email: newManagerEmail.trim().toLowerCase(),
        role: 'manager',
        password: newManagerPassword,
      });
      const accounts = await apiFetchStaffAccounts();
      setManagerUsers(accounts.filter((a) => a.role === 'manager'));
      setAddManagerSuccess(`Manager account created for: ${newManagerEmail}`);
      setNewManagerEmail('');
      setNewManagerPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create manager account';
      setAddManagerError(message);
    }
  };

  // Save Razorpay Credentials (encrypted at rest on the server)
  const handleSaveRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (razorpayEnvManaged) {
      setSyncStatus('error');
      setSyncMessage(
        'Credentials come from the server environment. Update RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and redeploy.'
      );
      return;
    }
    if (!razorpayKeyId.trim()) {
      setSyncStatus('error');
      setSyncMessage('Razorpay Key ID is required.');
      return;
    }
    if (!razorpayConfigured && !razorpaySecret) {
      setSyncStatus('error');
      setSyncMessage('Razorpay Key Secret is required to initialize the gateway.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncMessage('');

    try {
      const creds = await apiSaveRazorpayCredentials({
        keyId: razorpayKeyId,
        keySecret: razorpaySecret || undefined,
        webhookSecret: webhookSecret || undefined,
        mode: razorpayMode,
      });
      setRazorpayConfigured(creds.configured);
      setRazorpaySecret('');
      setWebhookSecret('');
      setIsSyncing(false);
      setSyncStatus('success');
      setSyncMessage('Razorpay credentials encrypted with AES-256-GCM and stored in the server vault.');
    } catch (err: any) {
      setIsSyncing(false);
      setSyncStatus('error');
      setSyncMessage(err.message || 'Failed to save Razorpay credentials.');
    }
  };

  const handleProcessDueAutoDebits = async () => {
    setIsProcessingRecurring(true);
    setSyncStatus('idle');
    setSyncMessage('');
    try {
      const result = await apiProcessDueAutoDebits();
      setSyncStatus('success');
      setSyncMessage(
        result.processed === 0
          ? 'No subscriptions are due for auto-debit today.'
          : `Auto-debit run complete: ${result.succeeded} charged, ${result.failed} failed (${result.processed} total).`
      );
    } catch (err: unknown) {
      setSyncStatus('error');
      setSyncMessage(err instanceof Error ? err.message : 'Failed to process auto-debit charges.');
    } finally {
      setIsProcessingRecurring(false);
    }
  };

  // Add Dynamic Subscription Plan
  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setPlanError('');
    setPlanSuccess('');

    if (!newPlanName.trim()) {
      setPlanError('Plan name is required.');
      return;
    }
    if (courses.some(c => c.name.toLowerCase() === newPlanName.trim().toLowerCase())) {
      setPlanError('A plan with this name already exists.');
      return;
    }
    if (newPlanFee <= 0) {
      setPlanError('Monthly fee must be a positive number.');
      return;
    }
    if (!newPlanCoach.trim()) {
      setPlanError('Coach / Instructor name is required.');
      return;
    }

    onAddCourse({
      name: newPlanName.trim(),
      tier: newPlanTier,
      monthlyFee: newPlanFee,
      instructor: newPlanCoach.trim()
    });

    setPlanSuccess(`Successfully created dynamic plan: ${newPlanName}`);
    setNewPlanName('');
    setNewPlanCoach('');
    setNewPlanFee(300);

    setTimeout(() => {
      setPlanSuccess('');
    }, 3000);
  };

  // Add Dynamic Student Batch
  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError('');
    setBatchSuccess('');

    if (!newBatchName.trim()) {
      setBatchError('Batch name is required.');
      return;
    }
    if (batches.some(b => b.toLowerCase() === newBatchName.trim().toLowerCase())) {
      setBatchError('A batch with this name already exists.');
      return;
    }

    onAddBatch(newBatchName.trim());
    setBatchSuccess(`Successfully created batch: ${newBatchName}`);
    setNewBatchName('');

    setTimeout(() => {
      setBatchSuccess('');
    }, 3000);
  };

  // Create new Admin User Account
  const handleAddAdmin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setAddAdminError('');
    setAddAdminSuccess('');

    if (!newAdminEmail.trim() || !newAdminPassword) {
      setAddAdminError('Both email and password are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdminEmail)) {
      setAddAdminError('Please enter a valid email address.');
      return;
    }

    if (newAdminPassword.length < 6) {
      setAddAdminError('Password must be at least 6 characters.');
      return;
    }

    const exists = adminUsers.some(u => u.email.toLowerCase() === newAdminEmail.trim().toLowerCase());
    if (exists) {
      setAddAdminError('An admin with this email address already exists.');
      return;
    }

    try {
      await apiCreateUserAccount({
        email: newAdminEmail.trim().toLowerCase(),
        role: 'admin',
        password: newAdminPassword,
      });
      const accounts = await apiFetchStaffAccounts();
      setAdminUsers(accounts.filter((a) => a.role === 'admin'));
      setAddAdminSuccess(`Admin account created successfully for: ${newAdminEmail}`);
      setNewAdminEmail('');
      setNewAdminPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create admin account';
      setAddAdminError(message);
    }
  };

  // Change Admin password (verified server-side)
  const handleChangePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePassError('All password fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setChangePassError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePassError('New passwords do not match.');
      return;
    }

    if (!currentUserEmail) {
      setChangePassError('Current admin profile context was not found.');
      return;
    }

    try {
      await apiChangeUserPassword({
        email: currentUserEmail,
        currentPassword,
        newPassword,
      });
      setChangePassSuccess('Your password has been reset successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      setChangePassError(message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in duration-500">
      
      {/* Settings Navigation and Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border/40 pb-4 gap-4">
        <div>
          <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-brand-gold animate-spin-slow" />
            Control Settings Panel
          </h2>
          <p className="font-sans text-xs text-gray-400 mt-1">
            Configure secure payment portals, manage custom plans, and control administrator accounts.
          </p>
        </div>

        {/* Settings View Sub-Tab Selector */}
        <div className="flex bg-brand-charcoal border border-brand-border p-1 rounded-xs gap-1 self-start sm:self-auto">
          <button
            onClick={() => setSettingsTab('operational')}
            className={`px-4 py-2 font-sans text-xs font-bold rounded-xs transition-all cursor-pointer ${
              settingsTab === 'operational'
                ? 'bg-brand-gold text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Operational Settings
          </button>
          <button
            onClick={() => setSettingsTab('account')}
            className={`px-4 py-2 font-sans text-xs font-bold rounded-xs transition-all cursor-pointer ${
              settingsTab === 'account'
                ? 'bg-brand-gold text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Account Settings
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {settingsTab === 'operational' ? (
          <motion.div
            key="operational-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Side: Plans Creator & active programs */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-brand-gold" />
                <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider">
                  Academy Subscription Plans
                </h3>
              </div>

              {/* Plan Creator Card */}
              <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 hover:border-brand-gold/30 transition-all">
                <h4 className="font-sans text-xs font-bold text-brand-gold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Declare New Subscription Plan
                </h4>

                <form onSubmit={handleCreatePlan} className="space-y-4 text-xs font-sans">
                  <div>
                    <label className="block text-gray-400 mb-1">Plan / Training Program Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Under-16 Striker Masterclass"
                      value={newPlanName}
                      onChange={e => setNewPlanName(e.target.value)}
                      className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1">Tier Category</label>
                      <select
                        value={newPlanTier}
                        onChange={e => setNewPlanTier(e.target.value as 'Standard' | 'Premium')}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                      >
                        <option value="Standard">Standard Tier</option>
                        <option value="Premium">Premium Tier</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1">Monthly Tuition (₹)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 320"
                        value={newPlanFee}
                        onChange={e => setNewPlanFee(Number(e.target.value))}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1">Lead Coach / Instructor</label>
                    <input
                      type="text"
                      placeholder="e.g. Coach Rajesh Kumar"
                      value={newPlanCoach}
                      onChange={e => setNewPlanCoach(e.target.value)}
                      className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                    />
                  </div>

                  {planError && (
                    <div className="flex items-center gap-1.5 text-brand-cinnabar font-mono text-[10px] mt-2">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{planError}</span>
                    </div>
                  )}

                  {planSuccess && (
                    <div className="flex items-center gap-1.5 text-brand-emerald font-mono text-[10px] mt-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{planSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Plan to Curriculum
                  </button>
                </form>
              </div>

              {/* Active Plans List */}
              <div className="bg-brand-surface-raised border border-brand-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-brand-border bg-brand-surface-hover flex justify-between items-center">
                  <span className="font-sans text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Active Program Catalog ({courses.length})
                  </span>
                  <span className="font-mono text-[9px] text-gray-400">Dynamic Registry</span>
                </div>

                <div className="divide-y divide-brand-border/40 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {courses.map((course, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-brand-border/10 transition-colors">
                      <div>
                        <h5 className="font-sans text-xs font-bold text-white">{course.name}</h5>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 font-mono">
                          <span className={`px-1.5 py-0.2 rounded-xs font-bold ${
                            course.tier === 'Premium' ? 'bg-brand-gold/15 text-brand-gold' : 'bg-gray-800 text-gray-300'
                          }`}>
                            {course.tier}
                          </span>
                          <span>Coach: {course.instructor}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-xs font-bold text-white">₹{course.monthlyFee}/mo</span>
                        {courses.length > 3 ? (
                          <button
                            onClick={() => onDeleteCourse(course.name)}
                            className="text-gray-500 hover:text-brand-cinnabar transition-colors p-1 rounded-xs hover:bg-brand-cinnabar/5 cursor-pointer"
                            title="Delete Course Plan"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="w-5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academy Student Batches */}
              {canManageBatches && (
              <div className="pt-4 border-t border-brand-border/40 space-y-6">
                <div className="flex items-center gap-2">
                  <Users className="h-4.5 w-4.5 text-brand-gold" />
                  <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider">
                    Academy Student Batches
                  </h3>
                </div>

                {/* Batch Creator Card */}
                <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 hover:border-brand-gold/30 transition-all">
                  <h4 className="font-sans text-xs font-bold text-brand-gold uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Declare New Student Batch
                  </h4>

                  <form onSubmit={handleCreateBatch} className="space-y-4 text-xs font-sans text-gray-400">
                    <div>
                      <label className="block text-gray-400 mb-1">Batch / Group Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Under-10 Elite Squad"
                        value={newBatchName}
                        onChange={e => setNewBatchName(e.target.value)}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                      />
                    </div>

                    {batchError && (
                      <div className="flex items-center gap-1.5 text-brand-cinnabar font-mono text-[10px] mt-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{batchError}</span>
                      </div>
                    )}

                    {batchSuccess && (
                      <div className="flex items-center gap-1.5 text-brand-emerald font-mono text-[10px] mt-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{batchSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Batch Group
                    </button>
                  </form>
                </div>

                {/* Active Batches List */}
                <div className="bg-brand-surface-raised border border-brand-border rounded-lg overflow-hidden">
                  <div className="p-4 border-b border-brand-border bg-brand-surface-hover flex justify-between items-center">
                    <span className="font-sans text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Active Academy Batches ({batches.length})
                    </span>
                    <span className="font-mono text-[9px] text-gray-400">Dynamic Batches</span>
                  </div>

                  <div className="divide-y divide-brand-border/40 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {batches.map((batch, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-brand-border/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 bg-brand-gold/10 text-brand-gold flex items-center justify-center rounded-full font-mono text-xs font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <h5 className="font-sans text-xs font-bold text-white">{batch}</h5>
                            <span className="font-mono text-[9px] text-gray-400">PLL Academy</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {batches.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => onDeleteBatch(batch)}
                              className="text-gray-500 hover:text-brand-cinnabar transition-colors p-1 rounded-xs hover:bg-brand-cinnabar/5 cursor-pointer"
                              title="Delete Student Batch"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="w-5" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Right Side: Razorpay Settings */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2">
                <Shield className="h-4.5 w-4.5 text-brand-gold" />
                <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider">
                  Secure Razorpay Integration Gateway
                </h3>
              </div>

              <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 space-y-6">
                <div className="bg-brand-gold/5 border border-brand-gold/20 p-4 rounded-xs text-xs font-sans text-gray-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-brand-gold font-bold">
                    <Shield className="h-4 w-4" />
                    <span>Server-Side Encrypted Vault Protocol</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    Credentials are encrypted with AES-256-GCM using a server-only key and stored at rest. Your Key Secret
                    never reaches the browser, checkout, or client bundle. Decryption happens exclusively inside server functions.
                  </p>
                </div>

                <form onSubmit={handleSaveRazorpay} className="space-y-4 text-xs font-sans">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 mb-1 uppercase tracking-wider font-bold text-[9px]">Provider Name</label>
                      <div className="bg-brand-charcoal border border-brand-border p-2.5 rounded-xs flex items-center justify-between text-white font-bold text-xs">
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-brand-gold animate-pulse" />
                          Razorpay Gateway
                        </span>
                        <span className={`h-2 w-2 rounded-full ${razorpayConfigured ? 'bg-brand-emerald' : 'bg-brand-cinnabar'}`}></span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 uppercase tracking-wider font-bold text-[9px]">Gateway Mode</label>
                      <div className="flex bg-brand-charcoal p-1 rounded-xs border border-brand-border">
                        <button
                          type="button"
                          disabled={razorpayEnvManaged}
                          onClick={() => setRazorpayMode('Live')}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-xs transition-all cursor-pointer disabled:cursor-not-allowed ${
                            razorpayMode === 'Live'
                              ? 'bg-brand-gold text-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          LIVE MODE
                        </button>
                        <button
                          type="button"
                          disabled={razorpayEnvManaged}
                          onClick={() => setRazorpayMode('Test')}
                          className={`flex-1 py-1 text-[10px] font-bold rounded-xs transition-all cursor-pointer disabled:cursor-not-allowed ${
                            razorpayMode === 'Test'
                              ? 'bg-brand-gold text-black'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          TEST MODE
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 uppercase tracking-wider font-bold text-[9px]">Razorpay Key ID</label>
                    <input
                      type="text"
                      placeholder="rzp_test_..."
                      value={razorpayKeyId}
                      readOnly={razorpayEnvManaged}
                      onChange={e => setRazorpayKeyId(e.target.value)}
                      className={`w-full bg-brand-charcoal border border-brand-border text-white font-mono p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors${
                        razorpayEnvManaged ? ' opacity-60 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 uppercase tracking-wider font-bold text-[9px]">Razorpay Key Secret</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder={
                          razorpayEnvManaged
                            ? 'Supplied by RAZORPAY_KEY_SECRET'
                            : razorpayConfigured
                              ? 'Stored securely — enter only to rotate'
                              : 'Enter your confidential Key Secret...'
                        }
                        value={razorpaySecret}
                        readOnly={razorpayEnvManaged}
                        onChange={e => setRazorpaySecret(e.target.value)}
                        className={`w-full bg-brand-charcoal border border-brand-border text-white font-mono p-2.5 rounded-xs pr-10 focus:outline-hidden focus:border-brand-gold transition-colors${
                          razorpayEnvManaged ? ' opacity-60 cursor-not-allowed' : ''
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                        <Key className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 uppercase tracking-wider font-bold text-[9px]">Webhook Secret Token (Optional)</label>
                    <input
                      type="password"
                      placeholder={razorpayEnvManaged ? 'Supplied by RAZORPAY_WEBHOOK_SECRET' : 'whsec_...'}
                      value={webhookSecret}
                      readOnly={razorpayEnvManaged}
                      onChange={e => setWebhookSecret(e.target.value)}
                      className={`w-full bg-brand-charcoal border border-brand-border text-white font-mono p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors${
                        razorpayEnvManaged ? ' opacity-60 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>

                  <div className="pt-3 border-t border-brand-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h5 className="font-sans text-xs font-bold text-white">Run Due Auto-Debits</h5>
                      <p className="font-sans text-[10px] text-gray-400">
                        Charge all active mandates whose billing date is today or earlier. Schedule daily in production (cron).
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!razorpayConfigured || isProcessingRecurring}
                      onClick={handleProcessDueAutoDebits}
                      className="shrink-0 w-full sm:w-auto px-3 py-2 bg-brand-emerald/20 hover:bg-brand-emerald/30 border border-brand-emerald/40 text-brand-emerald text-[10px] font-bold uppercase rounded-xs cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingRecurring ? 'Processing...' : 'Charge Now'}
                    </button>
                  </div>

                  {/* ---- Auto-debit simulation harness ---- */}
                  <div className="pt-3 border-t border-brand-border/40">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h5 className="font-sans text-xs font-bold text-white flex items-center gap-1.5">
                          <FlaskConical className="h-3.5 w-3.5 text-brand-amethyst" />
                          Auto-Debit Test Harness
                        </h5>
                        <p className="font-sans text-[10px] text-gray-400">
                          Attach a fake mandate and settle a cycle without touching the bank — proves due
                          detection, invoicing and billing-date advance work. Test mode only.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTestPanel((v) => !v)}
                        className="shrink-0 w-full sm:w-auto px-3 py-2 bg-brand-amethyst/20 hover:bg-brand-amethyst/30 border border-brand-amethyst/40 text-brand-amethyst text-[10px] font-bold uppercase rounded-xs cursor-pointer"
                      >
                        {showTestPanel ? 'Hide' : 'Open Harness'}
                      </button>
                    </div>

                    {showTestPanel && (
                      <div className="mt-3 space-y-3">
                        {testState && !testState.simulationAllowed && (
                          <div className="flex items-start gap-2 bg-brand-cinnabar/10 border border-brand-cinnabar/40 p-3 rounded-xs">
                            <AlertTriangle className="h-4 w-4 text-brand-cinnabar shrink-0 mt-px" />
                            <p className="font-sans text-[11px] text-brand-cinnabar">
                              Gateway is in <span className="font-bold">Live</span> mode. Simulation is
                              disabled so no fake payment can ever land in a real ledger.
                            </p>
                          </div>
                        )}

                        {testState && testState.simulationAllowed && (
                          <p className="font-mono text-[10px] text-gray-500">
                            Gateway: {testState.configured ? testState.mode : 'not configured'} — simulated
                            charges write a Success invoice with a{' '}
                            <span className="text-brand-amethyst">pay_sim_</span> reference. No money moves.
                          </p>
                        )}

                        {!testState && (
                          <p className="font-mono text-[10px] text-gray-500">Loading subscriptions…</p>
                        )}

                        <div className="space-y-2">
                          {testState?.subscriptions.map((row) => {
                            const busy = testBusyId?.endsWith(`:${row.id}`);
                            const canSimulate = testState.simulationAllowed && row.status === 'Active';
                            return (
                              <div
                                key={row.id}
                                className="bg-brand-charcoal border border-brand-border rounded-xs p-3 flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-sans text-xs font-bold text-white truncate">
                                      {row.studentName}
                                    </span>
                                    {row.simulated && (
                                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-brand-amethyst/15 text-brand-amethyst border border-brand-amethyst/40">
                                        Simulated
                                      </span>
                                    )}
                                    {row.autoDebit && !row.simulated && (
                                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/40">
                                        Live mandate
                                      </span>
                                    )}
                                    {row.due && (
                                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-xs bg-brand-gold/15 text-brand-gold border border-brand-gold/40">
                                        Due
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-mono text-[10px] text-gray-500 mt-1 truncate">
                                    {row.id} · ₹{row.monthlyFee}/mo · next {row.nextBillingDate} · {row.status}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2 shrink-0">
                                  {!row.autoDebit && (
                                    <button
                                      type="button"
                                      disabled={!canSimulate || busy}
                                      onClick={() => handleTestAction('attach', row.id)}
                                      className="flex-1 lg:flex-none px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-xs border border-brand-border text-gray-300 hover:text-white hover:border-gray-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                      {busy ? '…' : 'Attach test mandate'}
                                    </button>
                                  )}
                                  {row.simulated && (
                                    <>
                                      <button
                                        type="button"
                                        disabled={!canSimulate || busy}
                                        onClick={() => handleTestAction('charge', row.id)}
                                        className="flex-1 lg:flex-none px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-xs bg-brand-amethyst/20 border border-brand-amethyst/40 text-brand-amethyst hover:bg-brand-amethyst/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        {busy ? '…' : 'Simulate charge'}
                                      </button>
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleTestAction('detach', row.id)}
                                        className="flex-1 lg:flex-none px-2.5 py-1.5 text-[10px] font-bold uppercase rounded-xs border border-brand-border text-gray-400 hover:text-brand-cinnabar hover:border-brand-cinnabar/40 cursor-pointer disabled:opacity-40"
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {testLog.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {testLog.map((entry, i) => (
                              <div
                                key={`${entry.text}-${i}`}
                                className={`flex items-start gap-2 font-mono text-[10px] leading-relaxed ${
                                  entry.ok ? 'text-brand-emerald' : 'text-brand-cinnabar'
                                }`}
                              >
                                {entry.ok ? (
                                  <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                                )}
                                <span className="break-words">{entry.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-brand-border/40 flex items-center justify-between">
                    <div>
                      <h5 className="font-sans text-xs font-bold text-white">Auto-Sync Ledger Balance</h5>
                      <p className="font-sans text-[10px] text-gray-400">Reconcile Razorpay transactions with our ledger database automatically.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSync(!autoSync)}
                      className={`w-11 h-6 rounded-full transition-colors relative focus:outline-hidden cursor-pointer ${
                        autoSync ? 'bg-brand-gold' : 'bg-brand-border'
                      }`}
                    >
                      <span className={`absolute top-1 left-1 bg-brand-charcoal w-4 h-4 rounded-full transition-transform ${
                        autoSync ? 'translate-x-5' : 'translate-x-0'
                      }`}></span>
                    </button>
                  </div>

                  {/* Operational sync status feedback */}
                  {isSyncing && (
                    <div className="bg-brand-gold/10 border border-brand-gold/30 p-3 rounded-xs text-[11px] font-mono text-brand-gold flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                      <span>Encrypting credentials server-side with AES-256-GCM and writing to the vault...</span>
                    </div>
                  )}

                  {syncStatus === 'success' && (
                    <div className="bg-brand-emerald/10 border border-brand-emerald/30 p-3 rounded-xs text-[11px] font-mono text-white flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-brand-emerald shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-brand-emerald">Synchronization Perfect</p>
                        <p className="text-gray-300 mt-0.5 text-[10px]">{syncMessage}</p>
                      </div>
                    </div>
                  )}

                  {syncStatus === 'error' && (
                    <div className="bg-brand-cinnabar/10 border border-brand-cinnabar/30 p-3 rounded-xs text-[11px] font-mono text-brand-cinnabar flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{syncMessage}</span>
                    </div>
                  )}

                  {razorpayEnvManaged && (
                    <div className="flex items-start gap-2 bg-brand-emerald/10 border border-brand-emerald/40 p-3 rounded-xs">
                      <Shield className="h-4 w-4 text-brand-emerald shrink-0 mt-px" />
                      <p className="font-sans text-[11px] text-brand-emerald leading-relaxed">
                        <span className="font-bold">Managed by the server environment.</span> These
                        credentials come from <span className="font-mono">RAZORPAY_KEY_ID</span> /
                        <span className="font-mono"> RAZORPAY_KEY_SECRET</span>, so the key secret is
                        never written to the database and cannot be changed from this panel. To
                        rotate keys, update the environment variables and redeploy.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSyncing || razorpayEnvManaged}
                    className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Shield className="h-4 w-4" />
                    {razorpayEnvManaged ? 'Credentials Managed by Environment' : 'Encrypt & Save Credentials'}
                  </button>
                </form>
              </div>
            </div>

            {/* Full-width: Manager Permissions + Academy GPS/Timing */}
            <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-brand-border/40">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4.5 w-4.5 text-brand-gold" />
                    <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider">
                      Manager Access Permissions
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPermJson(!showPermJson)}
                    className="text-[10px] font-mono text-gray-400 hover:text-brand-gold flex items-center gap-1 cursor-pointer"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    {showPermJson ? 'Toggle Matrix' : 'Edit JSON'}
                  </button>
                </div>
                <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 space-y-4">
                  <p className="text-xs text-gray-400">
                    Dynamically control what managers can access. Stored as JSON via the settings API.
                  </p>
                  {showPermJson ? (
                    <textarea
                      value={permJson}
                      onChange={(e) => setPermJson(e.target.value)}
                      rows={14}
                      className="w-full bg-brand-charcoal border border-brand-border text-white font-mono text-[11px] p-3 rounded-xs focus:outline-hidden focus:border-brand-gold"
                      aria-label="Manager permissions JSON"
                    />
                  ) : (
                    <div className="space-y-2">
                      {(Object.keys(PERMISSION_LABELS) as Array<keyof ManagerPermissions>).map((key) => (
                        <div key={key} className="flex items-center justify-between py-2 border-b border-brand-border/30 last:border-0">
                          <span className="text-xs text-gray-300 font-sans">{PERMISSION_LABELS[key]}</span>
                          <button
                            type="button"
                            onClick={() => handleTogglePermission(key)}
                            className={`w-11 h-6 rounded-full transition-colors relative focus:outline-hidden cursor-pointer ${
                              permDraft[key] ? 'bg-brand-gold' : 'bg-brand-border'
                            }`}
                            aria-label={`Toggle ${PERMISSION_LABELS[key]}`}
                            aria-pressed={permDraft[key]}
                          >
                            <span
                              className={`absolute top-1 left-1 bg-brand-charcoal w-4 h-4 rounded-full transition-transform ${
                                permDraft[key] ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {permError && (
                    <div className="flex items-center gap-1.5 text-brand-cinnabar font-mono text-[10px]">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{permError}</span>
                    </div>
                  )}
                  {permSuccess && (
                    <div className="flex items-center gap-1.5 text-brand-emerald font-mono text-[10px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{permSuccess}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={isSavingPerms}
                    className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPerms ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save Manager Permissions
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4.5 w-4.5 text-brand-gold" />
                  <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider">
                    Academy Location & Timing
                  </h3>
                </div>
                <form onSubmit={handleSaveAcademy} className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 space-y-4 text-xs font-sans">
                  <p className="text-gray-400">
                    GPS pin and shift rules used for manager check-in validation.
                  </p>
                  <div>
                    <label className="block text-gray-400 mb-1">Academy Address</label>
                    <input
                      type="text"
                      value={academyDraft.academyAddress}
                      onChange={(e) => setAcademyDraft({ ...academyDraft, academyAddress: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={academyDraft.latitude}
                        onChange={(e) => setAcademyDraft({ ...academyDraft, latitude: Number(e.target.value) })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={academyDraft.longitude}
                        onChange={(e) => setAcademyDraft({ ...academyDraft, longitude: Number(e.target.value) })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isReadingGps}
                    className="w-full border border-brand-border hover:border-brand-gold/40 text-gray-300 py-2 rounded-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isReadingGps ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                    Use My Current Location
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1">Radius (meters)</label>
                      <input
                        type="number"
                        min="1"
                        value={academyDraft.radiusMeters}
                        onChange={(e) => setAcademyDraft({ ...academyDraft, radiusMeters: Number(e.target.value) })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Grace Period (min)</label>
                      <input
                        type="number"
                        min="0"
                        value={academyDraft.gracePeriodMinutes}
                        onChange={(e) => setAcademyDraft({ ...academyDraft, gracePeriodMinutes: Number(e.target.value) })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1">Shift Start (HH:mm)</label>
                      <input
                        type="time"
                        value={academyDraft.shiftStartTime}
                        onChange={(e) => setAcademyDraft({ ...academyDraft, shiftStartTime: e.target.value })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1">Shift End (HH:mm)</label>
                      <input
                        type="time"
                        value={academyDraft.shiftEndTime}
                        onChange={(e) => setAcademyDraft({ ...academyDraft, shiftEndTime: e.target.value })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold"
                      />
                    </div>
                  </div>
                  {academyError && (
                    <div className="flex items-center gap-1.5 text-brand-cinnabar font-mono text-[10px]">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{academyError}</span>
                    </div>
                  )}
                  {academySuccess && (
                    <div className="flex items-center gap-1.5 text-brand-emerald font-mono text-[10px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{academySuccess}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingAcademy}
                    className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingAcademy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    Save Location & Timing
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="account-tab"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
          >
            {/* Create New Admin */}
            <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 space-y-4 hover:border-brand-gold/30 transition-all">
              <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <UserPlus className="h-4.5 w-4.5 text-brand-gold" />
                Add New Administrator Account
              </h3>
              <p className="text-xs text-gray-400">
                Register a new colleague. All user accounts in this category possess full system administrator rights to process ledgers.
              </p>

              <form onSubmit={handleAddAdmin} className="space-y-4 text-xs font-sans pt-2">
                <div>
                  <label className="block text-gray-400 mb-1">Colleague Email Address</label>
                  <input
                    type="email"
                    placeholder="name@strikeracademy.edu"
                    value={newAdminEmail}
                    onChange={e => setNewAdminEmail(e.target.value)}
                    className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Temporary Account Password</label>
                  <div className="relative">
                    <input
                      type={showNewAdminPass ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={newAdminPassword}
                      onChange={e => setNewAdminPassword(e.target.value)}
                      className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs pr-10 focus:outline-hidden focus:border-brand-gold transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewAdminPass(!showNewAdminPass)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
                    >
                      {showNewAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {addAdminError && (
                  <div className="flex items-center gap-1.5 text-brand-cinnabar font-mono text-[10px]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{addAdminError}</span>
                  </div>
                )}

                {addAdminSuccess && (
                  <div className="flex items-center gap-1.5 text-brand-emerald font-mono text-[10px]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{addAdminSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create Admin Account
                </button>
              </form>

              {/* Quick display of other administrators in database */}
              <div className="pt-4 border-t border-brand-border/40 space-y-2">
                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Registered Administrators ({adminUsers.length})</span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {adminUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-brand-charcoal border border-brand-border/50 rounded-xs">
                      <span className="text-gray-300 font-mono text-[11px] truncate mr-2">{user.email}</span>
                      <span className="text-[9px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded-xs font-bold shrink-0">ADMIN</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Create New Manager */}
            <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 space-y-4 hover:border-brand-gold/30 transition-all">
              <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-brand-gold" />
                Add Manager Account
              </h3>
              <p className="text-xs text-gray-400">
                Managers receive permission-gated console access configured under Operational Settings.
              </p>
              <form onSubmit={handleAddManager} className="space-y-4 text-xs font-sans pt-2">
                <div>
                  <label className="block text-gray-400 mb-1">Manager Email Address</label>
                  <input
                    type="email"
                    placeholder="manager@pllacademy.com"
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                    className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Temporary Account Password</label>
                  <div className="relative">
                    <input
                      type={showNewManagerPass ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={newManagerPassword}
                      onChange={(e) => setNewManagerPassword(e.target.value)}
                      className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs pr-10 focus:outline-hidden focus:border-brand-gold transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewManagerPass(!showNewManagerPass)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
                      aria-label={showNewManagerPass ? 'Hide password' : 'Show password'}
                    >
                      {showNewManagerPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {addManagerError && (
                  <div className="flex items-center gap-1.5 text-brand-cinnabar font-mono text-[10px]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{addManagerError}</span>
                  </div>
                )}
                {addManagerSuccess && (
                  <div className="flex items-center gap-1.5 text-brand-emerald font-mono text-[10px]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{addManagerSuccess}</span>
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Create Manager Account
                </button>
              </form>
              <div className="pt-4 border-t border-brand-border/40 space-y-2">
                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">
                  Registered Managers ({managerUsers.length})
                </span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {managerUsers.map((user, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-brand-charcoal border border-brand-border/50 rounded-xs">
                      <span className="text-gray-300 font-mono text-[11px] truncate mr-2">{user.email}</span>
                      <span className="text-[9px] bg-brand-amethyst/20 text-brand-amethyst px-1.5 py-0.5 rounded-xs font-bold shrink-0">
                        MANAGER
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Change Account Password */}
            <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-5 space-y-4 hover:border-brand-gold/30 transition-all">
              <h3 className="font-sans text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-brand-gold" />
                Change Your Password
              </h3>
              <p className="text-xs text-gray-400">
                Keep your dashboard authorization credentials secure. It is recommended to perform regular key rotation cycles.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-sans pt-2">
                <div>
                  <label className="block text-gray-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">New Secure Password</label>
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Retype your new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-brand-charcoal border border-brand-border text-white p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                  />
                </div>

                {changePassError && (
                  <div className="flex items-center gap-1.5 text-brand-cinnabar font-mono text-[10px]">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{changePassError}</span>
                  </div>
                )}

                {changePassSuccess && (
                  <div className="flex items-center gap-1.5 text-brand-emerald font-mono text-[10px]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{changePassSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-brand-gold hover:bg-brand-gold-bright text-black font-bold py-2.5 rounded-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="h-4 w-4" />
                  Reset Secure Password
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
