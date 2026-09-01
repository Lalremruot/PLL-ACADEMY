import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, ShieldCheck, Mail, User, Trophy, HelpCircle, 
  ArrowRight, Landmark, Calendar, Eye, AlertTriangle, Sparkles,
  ChevronDown, ChevronUp, Edit, GraduationCap, X
} from 'lucide-react';
import { Invoice, Subscription, PaymentStatus, FilmCourse } from '../types';
import { formatDisplayDate } from '../utils/attendance-dates';
import PlayerProfileStats from './player/PlayerProfileStats';
import {
  apiCreateRazorpayOrder,
  apiCreateRazorpaySubscriptionOrder,
  apiVerifyRazorpaySubscriptionPayment,
  apiCancelAutoDebit,
} from '../services/apiClient';

interface ParentPortalProps {
  invoices: Invoice[];
  subscriptions: Subscription[];
  isMobileMode: boolean;
  onPayInvoice: (
    invoiceId: string,
    paymentDetails?: { paymentId: string; orderId: string; signature: string }
  ) => Promise<void> | void;
  onUpdateSubscriptionStatus: (subId: string, newStatus: 'Active' | 'Paused' | 'Canceled') => void;
  onSelectInvoice: (invoice: Invoice) => void;
  courses?: FilmCourse[];
  batches?: string[];
  onUpdateSubscription?: (sub: Subscription) => void;
  onRefreshData?: () => Promise<void> | void;
  /** The logged-in parent's session — scopes the portal to their own child(ren). */
  sessionUser?: {
    email?: string;
    name?: string;
    studentName?: string;
    subscriptionId?: string;
    parentLoginId?: string;
  } | null;
}

// Guarantors are derived from the logged-in parent's own subscriptions only —
// no bundled sample parents. A parent never sees another family's data.
interface ParentGuarantor {
  name: string;
  email: string;
  avatar: string;
  studioName: string;
}

export default function ParentPortal({
  invoices,
  subscriptions,
  isMobileMode,
  onPayInvoice,
  onUpdateSubscriptionStatus,
  onSelectInvoice,
  courses = [],
  batches = [],
  onUpdateSubscription,
  onRefreshData,
  sessionUser = null
}: ParentPortalProps) {
  // Scope the portal to the logged-in parent so they only see their own child(ren).
  const sessionEmail = sessionUser?.email?.trim().toLowerCase();

  // Guarantors derived from live subscriptions, filtered to this parent's email.
  const scopedGuarantors = useMemo<ParentGuarantor[]>(() => {
    const map = new Map<string, ParentGuarantor>();
    for (const sub of subscriptions) {
      const email = sub.parentEmail.trim();
      const key = email.toLowerCase();
      if (!email) continue;
      if (sessionEmail && key !== sessionEmail) continue;
      if (map.has(key)) continue;
      const name = sub.parentName.trim() || email;
      const initials = name.split(/\s+/).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'PG';
      map.set(key, { name, email, avatar: initials, studioName: '' });
    }
    return Array.from(map.values());
  }, [subscriptions, sessionEmail]);

  const availableGuarantors = scopedGuarantors;

  const [selectedParentEmail, setSelectedParentEmail] = useState<string>(
    () => sessionEmail ?? ''
  );
  const activeParent =
    availableGuarantors.find((p) => p.email.toLowerCase() === selectedParentEmail.toLowerCase()) ||
    availableGuarantors[0] ||
    (sessionEmail
      ? { name: sessionUser?.name || 'Parent Guarantor', email: sessionEmail, avatar: 'PG', studioName: '' }
      : null);

  // Selected invoices/subscriptions for this parent
  const parentEmail = activeParent?.email ?? '';
  const parentInvoices = invoices.filter(inv => inv.parentEmail === parentEmail);
  const parentSubscriptions = subscriptions.filter(sub => sub.parentEmail === parentEmail);

  // Totals for this parent
  const outstandingAmount = parentInvoices
    .filter(inv => inv.status !== 'Success')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const activeBillingAmount = parentSubscriptions
    .filter(sub => sub.status === 'Active')
    .reduce((sum, sub) => sum + sub.monthlyFee, 0);

  // Expanded student details state
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Edit Student Profile Modal State
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    studentName: '',
    parentName: '',
    parentEmail: '',
    courseIndex: 0,
    status: 'Active' as 'Active' | 'Paused' | 'Canceled',
    tier: 'Standard' as 'Standard' | 'Premium',
    batch: '',
    age: '',
    height: '',
    weight: '',
    aadhaar: '',
    education: '',
    familyDetails: '',
    profilePic: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenEditModal = (sub: Subscription) => {
    const matchedCourseIndex = courses.findIndex(c => c.name === sub.courseName);
    setEditingSubscription(sub);
    setFormData({
      studentName: sub.studentName,
      parentName: sub.parentName,
      parentEmail: sub.parentEmail,
      courseIndex: matchedCourseIndex !== -1 ? matchedCourseIndex : 0,
      status: sub.status,
      tier: sub.tier,
      batch: sub.batch || (batches[0] || ''),
      age: sub.age !== undefined ? String(sub.age) : '',
      height: sub.height !== undefined ? String(sub.height) : '',
      weight: sub.weight !== undefined ? String(sub.weight) : '',
      aadhaar: sub.aadhaar || '',
      education: sub.education || '',
      familyDetails: sub.familyDetails || '',
      profilePic: sub.profilePic || '',
    });
    setFormErrors({});
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscription) return;

    const errors: Record<string, string> = {};
    if (!formData.studentName.trim()) errors.studentName = 'Student name is required';
    if (!formData.parentName.trim()) errors.parentName = 'Parent name is required';
    if (!formData.parentEmail.trim()) {
      errors.parentEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.parentEmail)) {
      errors.parentEmail = 'Invalid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const selectedCourse = courses[formData.courseIndex] || courses[0] || { name: 'Academy Training Plan', monthlyFee: 300, tier: 'Standard' };
    const parsedAge = formData.age.trim() ? parseInt(formData.age, 10) : undefined;
    const parsedHeight = formData.height.trim() ? parseFloat(formData.height) : undefined;
    const parsedWeight = formData.weight.trim() ? parseFloat(formData.weight) : undefined;

    if (onUpdateSubscription) {
      onUpdateSubscription({
        ...editingSubscription,
        studentName: formData.studentName,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        courseName: selectedCourse.name,
        status: formData.status,
        tier: formData.tier,
        monthlyFee: selectedCourse.monthlyFee,
        batch: formData.batch,
        age: isNaN(parsedAge as any) ? undefined : parsedAge,
        height: isNaN(parsedHeight as any) ? undefined : parsedHeight,
        weight: isNaN(parsedWeight as any) ? undefined : parsedWeight,
        aadhaar: formData.aadhaar.trim() || undefined,
        education: formData.education.trim() || undefined,
        familyDetails: formData.familyDetails.trim() || undefined,
        profilePic: formData.profilePic.trim() || undefined,
      });
    }
    setEditingSubscription(null);
  };

  // Checkout modal state
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');

  // Open checkout modal
  const handleOpenCheckout = (invoice: Invoice) => {
    setCheckoutInvoice(invoice);
    setCheckoutError('');
    setIsProcessing(false);
    setPaymentComplete(false);
    setTransactionRef('');
  };

  const loadRazorpayScript = () =>
    new Promise<void>((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout.'));
      document.body.appendChild(script);
    });

  const handlePaymentSuccess = async (response: any, invoiceId: string) => {
    setIsProcessing(true);
    try {
      await onPayInvoice(invoiceId, {
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });
      setTransactionRef(response.razorpay_payment_id);
      setPaymentComplete(true);
    } catch (err: any) {
      setCheckoutError(err.message || 'Payment verification failed. Contact the academy.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Opens Razorpay checkout to pay a single invoice. Returns a promise that
  // resolves once the payment is verified with the server, or rejects if the
  // checkout errors. `onDismiss` is called if the parent closes the modal.
  const openInvoiceCheckout = (invoice: Invoice, onDismiss?: () => void) =>
    new Promise<void>(async (resolve, reject) => {
      setCheckoutError('');
      setIsProcessing(true);
      try {
        const order = await apiCreateRazorpayOrder(invoice.id);
        await loadRazorpayScript();

        const RazorpayCtor = (window as any).Razorpay;
        if (!RazorpayCtor) throw new Error('Razorpay checkout is unavailable.');

        const options = {
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: 'Academy Ledger',
          description: invoice.courseName,
          handler: async (response: any) => {
            try {
              await handlePaymentSuccess(response, invoice.id);
              resolve();
            } catch (err: any) {
              setCheckoutError(err.message || 'Payment verification failed. Contact the academy.');
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              onDismiss?.();
              reject(new Error('PAYMENT_DISMISSED'));
            },
          },
          prefill: {
            name: activeParent.name,
            email: activeParent.email,
          },
          theme: {
            color: '#d4af37',
          },
        };

        const rzp = new RazorpayCtor(options);
        rzp.open();
      } catch (err: any) {
        setCheckoutError(err.message || 'Unable to start payment.');
        setIsProcessing(false);
        reject(err);
      }
    });

  // Initiate Razorpay checkout for the selected invoice
  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutInvoice) return;
    try {
      await openInvoiceCheckout(checkoutInvoice);
    } catch {
      // handled / dismissed; keep the modal open on the returned error
    }
  };

  // Auto-debit (Standing Instruction) mandate state
  const [mandateSubId, setMandateSubId] = useState<string | null>(null);
  const [cancelingSubId, setCancelingSubId] = useState<string | null>(null);

  const handleCancelAutoDebit = async (sub: Subscription) => {
    if (!confirm(`Cancel auto-debit for ${sub.studentName}? You will need to pay invoices manually.`)) {
      return;
    }
    setCancelingSubId(sub.id);
    setCheckoutError('');
    try {
      const updated = await apiCancelAutoDebit(sub.id);
      onUpdateSubscription?.(updated);
      onRefreshData?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel auto-debit';
      setCheckoutError(message);
    } finally {
      setCancelingSubId(null);
    }
  };

  // Opens the Razorpay recurring / e-mandate checkout for a subscription. The
  // parent authorizes the standing instruction; the saved token backs future
  // auto-debits. Returns a promise resolving on mandate success.
  const openMandateCheckout = (sub: Subscription) =>
    new Promise<void>(async (resolve, reject) => {
      setMandateSubId(sub.id);
      setCheckoutError('');
      try {
        const order = await apiCreateRazorpaySubscriptionOrder(sub.id);
        await loadRazorpayScript();

        const RazorpayCtor = (window as any).Razorpay;
        if (!RazorpayCtor) throw new Error('Razorpay checkout is unavailable.');

        const options = {
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          // Registration payment: Checkout only collects an e-mandate when it is
          // opened in recurring mode against the order's customer.
          customer_id: order.customerId,
          recurring: 1,
          name: 'Academy Ledger',
          description: `Monthly auto-debit mandate — ${sub.courseName}`,
          handler: async (response: any) => {
            try {
              await handleMandateSuccess(response, sub);
              resolve();
            } catch (err: any) {
              setCheckoutError(err.message || 'Auto-debit activation failed. Contact the academy.');
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              setMandateSubId(null);
              reject(new Error('MANDATE_DISMISSED'));
            },
          },
          prefill: {
            name: activeParent.name,
            email: activeParent.email,
          },
          theme: {
            color: '#d4af37',
          },
        };

        const rzp = new RazorpayCtor(options);
        rzp.open();
      } catch (err: any) {
        setCheckoutError(err.message || 'Unable to set up auto-debit.');
        setMandateSubId(null);
        reject(err);
      }
    });

  const handleEnableAutoDebit = async (sub: Subscription) => {
    setMandateSubId(sub.id);
    setCheckoutError('');

    // Auto-debit needs the parent's UPI/bank details via Razorpay. Those are
    // always collected by the mandate checkout itself, but to make the flow
    // coherent the parent must first settle an outstanding invoice upfront:
    // pay the first bill, then authorize the standing instruction for the rest.
    const hasPaidForCourse = parentInvoices.some(
      (inv) => inv.status === 'Success' && inv.courseName === sub.courseName
    );

    try {
      if (!hasPaidForCourse) {
        const pendingInvoice = parentInvoices.find(
          (inv) => inv.status !== 'Success' && inv.courseName === sub.courseName
        );
        if (pendingInvoice) {
          // Pay the first invoice, then auto-continue into the mandate setup.
          await openInvoiceCheckout(pendingInvoice, () => setMandateSubId(null));
          await openMandateCheckout(sub);
        } else {
          // No outstanding invoice for this course — nothing to pay first, so
          // go straight to the mandate registration.
          await openMandateCheckout(sub);
        }
      } else {
        // Already has a successful payment for this course — mandate only.
        await openMandateCheckout(sub);
      }
    } catch (err: any) {
      // Dismissals (PAYMENT_DISMISSED / MANDATE_DISMISSED) are intentional and
      // already cleared the busy state; don't surface them as an error.
      if (!err?.message?.includes('DISMISSED')) {
        setCheckoutError(err.message || 'Unable to set up auto-debit.');
      }
      setMandateSubId(null);
    }
  };

  const handleMandateSuccess = async (response: any, sub: Subscription) => {
    try {
      const updatedSub = await apiVerifyRazorpaySubscriptionPayment({
        subscriptionId: sub.id,
        paymentId: response.razorpay_payment_id,
        orderId: response.razorpay_order_id,
        signature: response.razorpay_signature,
      });
      onUpdateSubscription?.(updatedSub);
      onRefreshData?.();
      setMandateSubId(null);
    } catch (err: any) {
      setCheckoutError(err.message || 'Auto-debit activation failed. Contact the academy.');
      setMandateSubId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Parent Selector Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-brand-border pb-6">
        <div>
          <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
            Parent & Guarantor Portal
          </h2>
          <p className="font-sans text-xs text-gray-400 mt-1">
            View your child&apos;s academy stats, subscriptions, and digital ledger statements.
          </p>
        </div>

        {/* Custom Dropdown Selector */}
        <div className="flex items-center gap-3 bg-brand-surface-card p-2 border border-brand-border rounded-xs w-full sm:w-auto">
          <User className="h-4 w-4 text-brand-gold shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="block text-[9px] font-sans text-gray-500 uppercase tracking-wider">Guarantor Identity</span>
            <select
              value={selectedParentEmail}
              onChange={e => setSelectedParentEmail(e.target.value)}
              className="w-full max-w-full truncate bg-transparent text-xs text-white font-medium focus:outline-hidden pr-8 cursor-pointer font-sans"
            >
              {availableGuarantors.map(parent => (
                <option key={parent.email} value={parent.email} className="bg-brand-surface-modal">
                  {parent.name} ({parent.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {checkoutError && (
        <div className="bg-brand-cinnabar/10 border border-brand-cinnabar/30 p-3 rounded-xs text-[11px] font-mono text-brand-cinnabar flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Payment modes explainer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-brand-border bg-brand-surface-card p-4 rounded-xs">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="h-4 w-4 text-brand-gold" />
            <h3 className="font-sans text-sm font-bold text-white">One-Time Pay</h3>
          </div>
          <p className="font-sans text-xs text-gray-400 leading-relaxed">
            Open any pending invoice and pay via Razorpay checkout (UPI, card, netbanking). Best for single bills.
          </p>
        </div>
        <div className="border border-brand-emerald/30 bg-brand-emerald/5 p-4 rounded-xs">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4 text-brand-emerald" />
            <h3 className="font-sans text-sm font-bold text-white">Auto-Debit (E-Mandate)</h3>
          </div>
          <p className="font-sans text-xs text-gray-400 leading-relaxed">
            Authorize a monthly standing instruction once. The academy charges your saved mandate on each billing date — no manual checkout needed.
          </p>
        </div>
      </div>

      {/* Parent Overview Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="border border-brand-border bg-brand-surface-card p-5 rounded-xs flex gap-4 items-center">
          <div className="h-12 w-12 rounded-full bg-brand-gold/15 text-brand-gold flex items-center justify-center font-sans font-bold text-lg border border-brand-gold/25">
            {activeParent.avatar}
          </div>
          <div>
            <span className="font-sans text-xs text-gray-400">Guarantor Profile</span>
            <h4 className="font-sans font-bold text-white text-base">{activeParent.name}</h4>
            <p className="font-mono text-[10px] text-gray-500">{activeParent.email}</p>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="border border-brand-border bg-brand-surface-card p-5 rounded-xs">
          <span className="font-sans text-xs text-gray-400 uppercase tracking-wide">Outstanding Balance</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`font-mono text-2xl font-bold ${outstandingAmount > 0 ? 'text-brand-cinnabar' : 'text-brand-emerald'}`}>
              ₹{outstandingAmount.toFixed(2)}
            </h3>
            {outstandingAmount > 0 && (
              <span className="text-[10px] bg-brand-cinnabar/10 text-brand-cinnabar px-1.5 py-0.5 rounded-full font-mono font-semibold uppercase animate-pulse">
                Overdue
              </span>
            )}
          </div>
          <p className="font-sans text-xs text-gray-500 mt-1">
            {outstandingAmount > 0 ? 'Immediate settlement required' : 'All billing contracts cleared'}
          </p>
        </div>

        {/* Subscriptions count */}
        <div className="border border-brand-border bg-brand-surface-card p-5 rounded-xs">
          <span className="font-sans text-xs text-gray-400 uppercase tracking-wide">Active Tuition Plan</span>
          <h3 className="font-mono text-2xl font-bold text-white mt-1">
            ₹{activeBillingAmount.toFixed(2)}<span className="text-xs text-gray-400 font-sans font-normal"> /mo</span>
          </h3>
          <p className="font-sans text-xs text-brand-gold mt-1">
            Covering {parentSubscriptions.filter(s => s.status === 'Active').length} training program(s)
          </p>
        </div>
      </div>

      {/* Grid: Workshop Subscriptions and Invoices */}
      <div className={`grid grid-cols-1 ${isMobileMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-8`}>
        
        {/* Left Side: Subscriptions Management */}
        <div className={`${isMobileMode ? 'lg:col-span-1' : 'lg:col-span-5'} space-y-6`}>
          <div className="border-b border-brand-border pb-3">
            <h3 className="font-sans text-base font-bold text-white">My Academy Subscriptions</h3>
            <p className="font-sans text-xs text-gray-400 mt-0.5">Toggle active status. Changes automatically update next invoice cycle.</p>
          </div>

          <div className="space-y-4">
            {parentSubscriptions.length === 0 ? (
              <div className="p-8 border border-dashed border-brand-border text-center bg-brand-surface-card/10 rounded-xs">
                <p className="font-sans text-xs text-gray-400">No subscriptions listed for this guarantor.</p>
              </div>
            ) : (
              parentSubscriptions.map(sub => {
                const isActive = sub.status === 'Active';
                const isPaused = sub.status === 'Paused';
                const isExpanded = expandedSubId === sub.id;

  // A logged-in parent with no subscription under their email gets a clean
  // empty state instead of falling back to any sample data.
  if (!activeParent) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-brand-border pb-6">
          <div>
            <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
              Parent & Guarantor Portal
            </h2>
            <p className="font-sans text-xs text-gray-400 mt-1">
              View your child&apos;s academy stats, subscriptions, and digital ledger statements.
            </p>
          </div>
        </div>

        <div className="bg-brand-surface-card border border-brand-border rounded-lg p-8 text-center space-y-3">
          <User className="h-8 w-8 text-brand-gold mx-auto" />
          <p className="font-sans text-sm font-bold text-white">No enrolment found for this portal ID</p>
          <p className="font-sans text-xs text-gray-400">
            We couldn&apos;t find a subscription linked to your Parent Login ID. If you believe this is an error,
            please contact the academy office with your Portal ID.
          </p>
        </div>
      </div>
    );
  }

  return (
                  <div 
                    key={sub.id} 
                    className="border border-brand-border bg-brand-surface-card p-5 rounded-xs space-y-4 hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        {sub.profilePic ? (
                          <img 
                            src={sub.profilePic} 
                            alt={sub.studentName} 
                            referrerPolicy="no-referrer"
                            className="h-11 w-11 rounded-full object-cover border border-brand-border/60 shrink-0 mt-0.5" 
                          />
                        ) : (
                          <div className="mt-1 rounded-sm bg-brand-gold/10 p-2 text-brand-gold shrink-0">
                            <Trophy className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-sans text-[11px] text-brand-gold uppercase tracking-wider font-semibold">
                            {sub.tier} Football Curriculum
                          </p>
                          <h4 className="font-sans text-sm font-bold text-white mt-0.5">
                            {sub.courseName}
                          </h4>
                          <p className="font-sans text-xs text-gray-400 mt-1">
                            Athlete: <strong className="text-white">{sub.studentName}</strong>
                          </p>
                          <p className="font-sans text-xs text-gray-400 mt-0.5">
                            Batch: <strong className="text-brand-gold font-mono text-[10px]">{sub.batch || 'Unassigned'}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Expand Toggle */}
                      <button
                        type="button"
                        onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                        className="px-2.5 py-1 bg-brand-charcoal hover:bg-brand-surface-raised text-gray-400 hover:text-white rounded-xs border border-brand-border transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-mono"
                      >
                        <span>Profile</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-brand-gold" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Collapsible Profile Section */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-brand-border/40 pt-4 space-y-4 overflow-hidden"
                        >
                          <div className="grid grid-cols-3 gap-3 bg-brand-bg p-3 rounded-xs border border-brand-border/30">
                            <div>
                              <span className="block text-[8px] font-mono uppercase text-gray-500 tracking-wider">Age</span>
                              <span className="text-xs font-bold text-white">{sub.age ? `${sub.age} Yrs` : '—'}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] font-mono uppercase text-gray-500 tracking-wider">Height</span>
                              <span className="text-xs font-bold text-white">{sub.height ? `${sub.height} cm` : '—'}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] font-mono uppercase text-gray-500 tracking-wider">Weight</span>
                              <span className="text-xs font-bold text-white">{sub.weight ? `${sub.weight} kg` : '—'}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                            <div>
                              <span className="block text-[9px] font-mono uppercase text-gray-400 mb-0.5">National ID / Aadhaar</span>
                              <span className="text-white font-mono text-xs">{sub.aadhaar || 'Not set'}</span>
                            </div>
                            <div>
                              <span className="block text-[9px] font-mono uppercase text-gray-400 mb-0.5">Education / Grade</span>
                              <span className="text-white text-xs">{sub.education || 'Not set'}</span>
                            </div>
                          </div>

                          <div>
                            <span className="block text-[9px] font-mono uppercase text-gray-400 mb-0.5">Family Background / Guardians</span>
                            <span className="text-gray-300 text-xs block bg-brand-bg/40 p-2.5 rounded-xs border border-brand-border/20">
                              {sub.familyDetails || 'Not set'}
                            </span>
                          </div>

                          <div className="pt-1">
                            <h5 className="font-mono text-[9px] uppercase tracking-wider text-brand-gold border-b border-brand-border pb-1 mb-3">
                              Child Performance Stats
                            </h5>
                            <PlayerProfileStats subscription={sub} />
                          </div>

                          {/* Edit Profile Action */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(sub)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-charcoal hover:bg-brand-surface-raised border border-brand-border hover:border-brand-gold text-white hover:text-brand-gold text-[10px] font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer shadow-sm"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span>Edit Athlete Profile</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="border-t border-brand-border/60 pt-4 flex items-center justify-between">
                      <div className="font-mono text-xs">
                        <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-sans">Monthly Rate</span>
                        <span className="text-white font-bold">₹{sub.monthlyFee}.00</span>
                      </div>

                      {/* Custom Toggle Switch - glows gold when Active */}
                      <div className="flex items-center gap-3 bg-brand-charcoal px-3 py-1.5 rounded-sm border border-brand-border">
                        <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                          isActive 
                            ? 'text-brand-gold' 
                            : isPaused 
                              ? 'text-brand-amethyst' 
                              : 'text-gray-500'
                        }`}>
                          {sub.status}
                        </span>

                        <button
                          onClick={() => {
                            const targetState = isActive ? 'Paused' : 'Active';
                            onUpdateSubscriptionStatus(sub.id, targetState);
                          }}
                          className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 relative cursor-pointer ${
                            isActive 
                              ? 'bg-brand-gold glow-gold' 
                              : isPaused 
                                ? 'bg-brand-amethyst' 
                                : 'bg-brand-border'
                          }`}
                        >
                          <div 
                            className={`w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 absolute top-0.5 ${
                              isActive 
                                ? 'right-0.5 translate-x-0' 
                                : 'left-0.5 translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {isActive && (
                      <div className="space-y-2.5">
                        <div className={`text-[10px] text-gray-400 flex items-center gap-1.5 p-2.5 rounded-xs border ${
                          sub.autoDebit
                            ? 'bg-brand-emerald/5 border-brand-emerald/25'
                            : 'bg-brand-charcoal/50 border-brand-border/30'
                        }`}>
                          {sub.autoDebit ? (
                            <ShieldCheck className="h-3 w-3 text-brand-emerald shrink-0" />
                          ) : (
                            <Sparkles className="h-3 w-3 text-brand-gold shrink-0" />
                          )}
                          <span>
                            {sub.autoDebit
                              ? <>Auto-debit active — next charge <strong className="text-white font-mono">{formatDisplayDate(sub.nextBillingDate)}</strong></>
                              : <>Next billing dispatch scheduled for <strong className="text-white font-mono">{formatDisplayDate(sub.nextBillingDate)}</strong></>}
                          </span>
                        </div>

                        {!sub.autoDebit && (
                          <button
                            type="button"
                            disabled={mandateSubId === sub.id}
                            onClick={() => handleEnableAutoDebit(sub)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xs bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 text-brand-gold font-sans text-[11px] font-bold py-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                          >
                            {mandateSubId === sub.id ? (
                              <>
                                <div className="h-3 w-3 border-2 border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                                Authorizing Mandate...
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Enable Auto-Debit
                              </>
                            )}
                          </button>
                        )}

                        {sub.autoDebit && (
                          <button
                            type="button"
                            disabled={cancelingSubId === sub.id}
                            onClick={() => handleCancelAutoDebit(sub)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xs bg-brand-cinnabar/10 hover:bg-brand-cinnabar/15 border border-brand-cinnabar/30 text-brand-cinnabar font-sans text-[11px] font-bold py-2 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {cancelingSubId === sub.id ? (
                              <>
                                <div className="h-3 w-3 border-2 border-brand-cinnabar border-t-transparent rounded-full animate-spin"></div>
                                Cancelling...
                              </>
                            ) : (
                              <>Cancel Auto-Debit</>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Ledger history & direct settlements */}
        <div className={`${isMobileMode ? 'lg:col-span-1' : 'lg:col-span-7'} space-y-6`}>
          <div className="border-b border-brand-border pb-3">
            <h3 className="font-sans text-base font-bold text-white">Direct Ledger Statements</h3>
            <p className="font-sans text-xs text-gray-400 mt-0.5">Clear outstanding balances and view itemized digital receipts.</p>
          </div>

          {/* Table or Stack representation based on viewport simulation */}
          {parentInvoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-brand-border bg-brand-surface-card/30 rounded-xs">
              <p className="font-sans text-xs text-gray-400">No historic billing declarations available.</p>
            </div>
          ) : isMobileMode ? (
            /* COLLAPSED STACK FOR MOBILE VIEWPORT SIMULATION */
            <div className="space-y-4">
              {parentInvoices.map(invoice => (
                <div 
                  key={invoice.id}
                  className="bg-brand-surface-card border border-brand-border p-4 rounded-xs hover:border-gray-700 transition-colors"
                >
                  <div className="flex justify-between items-center border-b border-brand-border/40 pb-2 mb-3">
                    <span className="font-mono text-xs font-bold text-white">{invoice.id}</span>
                    <span className="font-mono text-xs font-bold text-white">₹{invoice.amount}</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Program:</span>
                      <span className="text-white text-right max-w-[200px] truncate">{invoice.courseName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Due Date:</span>
                      <span className="text-gray-300 font-mono">{formatDisplayDate(invoice.dueDate)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-gray-400">Status:</span>
                      {/* Geist Mono format */}
                      <span className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase ${
                        invoice.status === 'Success' 
                          ? 'bg-brand-emerald text-white' 
                          : invoice.status === 'Failed' 
                            ? 'bg-brand-cinnabar text-white' 
                            : 'bg-brand-amethyst text-white'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-brand-border/40 flex justify-end gap-2">
                    <button
                      onClick={() => onSelectInvoice(invoice)}
                      className="flex items-center gap-1 hover:text-white text-gray-400 font-sans text-[11px] font-semibold tracking-wide py-1.5 px-3 border border-brand-border hover:bg-brand-charcoal transition-colors cursor-pointer"
                    >
                      <Eye className="h-3 w-3 text-brand-gold" />
                      Receipt
                    </button>
                    {invoice.status !== 'Success' && (
                      <button
                        onClick={() => handleOpenCheckout(invoice)}
                        className="rounded-xs bg-brand-gold hover:bg-brand-gold-bright text-black font-sans text-[11px] font-bold tracking-wide py-1.5 px-4 transition-all cursor-pointer shadow-md"
                      >
                        Settle Balance
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* DATA-HEAVY FLUID TABLE FOR DESKTOP */
            <div className="overflow-x-auto border border-brand-border bg-brand-surface-card rounded-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-charcoal/80 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-4">Curriculum Target</th>
                    <th className="py-3 px-4 font-mono">Amount</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Ledger Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {parentInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-brand-charcoal/30 transition-colors text-xs">
                      <td className="py-4.5 px-4 font-mono font-semibold text-white">
                        {invoice.id}
                      </td>
                      <td className="py-4.5 px-4">
                        <p className="font-sans font-semibold text-white max-w-[150px] truncate" title={invoice.courseName}>
                          {invoice.courseName}
                        </p>
                        <p className="font-sans text-[10px] text-gray-400">Artisan: {invoice.studentName}</p>
                      </td>
                      <td className="py-4.5 px-4 font-mono text-white font-bold">
                        ₹{invoice.amount}.00
                      </td>
                      <td className="py-4.5 px-4 font-mono text-gray-400">
                        {formatDisplayDate(invoice.dueDate)}
                      </td>
                      <td className="py-4.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-xs font-mono text-[9px] font-bold uppercase ${
                          invoice.status === 'Success' 
                            ? 'bg-brand-emerald text-white' 
                            : invoice.status === 'Failed' 
                              ? 'bg-brand-cinnabar text-white' 
                              : 'bg-brand-amethyst text-white'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-4.5 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => onSelectInvoice(invoice)}
                            className="flex items-center gap-1.5 hover:text-white text-gray-400 font-sans text-[10px] font-semibold py-1 px-2 border border-brand-border hover:bg-brand-charcoal transition-colors cursor-pointer"
                          >
                            <Eye className="h-3 w-3 text-brand-gold" />
                            Receipt
                          </button>
                          {invoice.status !== 'Success' && (
                            <button
                              onClick={() => handleOpenCheckout(invoice)}
                              className="rounded-xs bg-brand-gold hover:bg-brand-gold-bright text-black font-sans text-[10px] font-bold py-1 px-3.5 transition-all cursor-pointer shadow-md"
                            >
                              Settle Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sleek Credit Card Settle Balance Modal (AnimatePresence) */}
      <AnimatePresence>
        {checkoutInvoice && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md my-auto max-h-[90vh] overflow-y-auto border border-brand-border bg-brand-surface-modal rounded-lg shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-brand-border bg-brand-charcoal px-6 py-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-brand-gold" />
                  <h3 className="font-sans text-sm font-semibold text-white uppercase tracking-wider">
                    Direct Settle Gateway
                  </h3>
                </div>
                <button
                  onClick={() => setCheckoutInvoice(null)}
                  className="rounded-full p-1 text-gray-400 hover:bg-brand-border hover:text-white transition-colors cursor-pointer"
                >
                  <Eye className="h-4 w-4 rotate-45" /> {/* Close cross indicator */}
                </button>
              </div>

              {paymentComplete ? (
                /* SUCCESS STATE */
                <div className="p-8 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30">
                    <ShieldCheck className="h-8 w-8" />
                  </div>
                  <h4 className="font-sans text-lg font-bold text-white">Payment Authorized Successfully</h4>
                  <p className="font-sans text-xs text-gray-300">
                    Your financial statement has been updated. Invoice <strong className="font-mono text-white">{checkoutInvoice.id}</strong> is now cleared.
                  </p>
                  
                  <div className="p-4 bg-brand-charcoal rounded-xs border border-brand-border font-mono text-xs text-gray-400 space-y-1">
                    <p className="flex justify-between"><span className="font-sans">Guarantor:</span><span className="text-white">{activeParent.name}</span></p>
                    <p className="flex justify-between"><span className="font-sans">Amount Drafted:</span><span className="text-white font-bold">₹{checkoutInvoice.amount.toFixed(2)}</span></p>
                    <p className="flex justify-between"><span className="font-sans">Transaction Ref:</span><span className="text-brand-gold">{transactionRef}</span></p>
                  </div>

                  <button
                    onClick={() => setCheckoutInvoice(null)}
                    className="w-full rounded-xs bg-brand-gold hover:bg-brand-gold-bright py-2.5 font-sans text-xs font-bold text-black transition-all cursor-pointer"
                  >
                    Return to Portal
                  </button>
                </div>
              ) : (
                /* CHECKOUT FORM */
                <form onSubmit={handleSettlePayment} className="p-6 space-y-5">
                  {/* Ledger Invoice Summary */}
                  <div className="bg-brand-charcoal/80 p-4 border border-brand-border rounded-xs">
                    <span className="text-[9px] font-sans text-gray-500 uppercase tracking-wider block">Statement Ledger Item</span>
                    <p className="font-sans text-xs text-white font-semibold mt-1 truncate">
                      {checkoutInvoice.courseName}
                    </p>
                    <div className="flex justify-between items-baseline mt-3 pt-2.5 border-t border-brand-border/40">
                      <span className="font-mono text-xs text-brand-gold font-bold">{checkoutInvoice.id}</span>
                      <span className="font-mono text-base font-bold text-white">₹{checkoutInvoice.amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Secure gateway notice */}
                  <div className="bg-brand-gold/5 border border-brand-gold/20 p-3 rounded-xs flex gap-2.5 items-start">
                    <ShieldCheck className="h-4 w-4 text-brand-gold shrink-0 mt-0.5" />
                    <p className="font-sans text-[10px] leading-relaxed text-gray-300">
                      You will be redirected to Razorpay's PCI-DSS secure checkout. Your card details are handled only by
                      Razorpay — the academy never sees or stores them.
                    </p>
                  </div>

                  {checkoutError && (
                    <div className="bg-brand-cinnabar/10 border border-brand-cinnabar/30 p-3 rounded-xs text-[11px] font-mono text-brand-cinnabar flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setCheckoutInvoice(null)}
                      className="flex-1 py-2.5 border border-brand-border text-gray-400 hover:text-white hover:bg-brand-charcoal font-sans text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex-1 rounded-xs bg-brand-gold hover:bg-brand-gold-bright text-black font-sans text-xs font-bold py-2.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <div className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                          Starting Secure Checkout...
                        </>
                      ) : (
                        <>
                          Pay with Razorpay
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* Sleek Edit Athlete Profile Modal (AnimatePresence) */}
        <AnimatePresence>
          {editingSubscription && (
            <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 p-4 backdrop-blur-xs overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto border border-brand-border bg-brand-surface-modal rounded-lg shadow-2xl"
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-brand-border bg-brand-charcoal px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-brand-gold" />
                    <h3 className="font-sans text-sm font-semibold text-white uppercase tracking-wider">
                      Edit Athlete & Program Details
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSubscription(null)}
                    className="rounded-full p-1 text-gray-400 hover:bg-brand-border hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveProfile} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  
                  {/* Section 1: Core Identification */}
                  <div className="space-y-4">
                    <h4 className="font-mono text-[9px] uppercase tracking-wider text-brand-gold border-b border-brand-border pb-1">
                      1. Core Identity & Media
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Athlete Full Name</label>
                        <input
                          type="text"
                          required
                          value={formData.studentName}
                          onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                          className={`w-full bg-brand-charcoal border text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors ${
                            formErrors.studentName ? 'border-brand-cinnabar' : 'border-brand-border focus:border-brand-gold'
                          }`}
                          placeholder="Athlete Name"
                        />
                        {formErrors.studentName && (
                          <p className="text-brand-cinnabar text-[10px] mt-1 font-mono">{formErrors.studentName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Profile Image URL</label>
                        <input
                          type="url"
                          value={formData.profilePic}
                          onChange={e => setFormData({ ...formData, profilePic: e.target.value })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Registration & Training Assignment */}
                  <div className="space-y-4">
                    <h4 className="font-mono text-[9px] uppercase tracking-wider text-brand-gold border-b border-brand-border pb-1">
                      2. Academy Placement
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Active Training Program</label>
                        <select
                          value={formData.courseIndex}
                          onChange={e => {
                            const idx = parseInt(e.target.value, 10);
                            const course = courses[idx];
                            setFormData({ 
                              ...formData, 
                              courseIndex: idx,
                              tier: course ? (course.tier as 'Standard' | 'Premium') : 'Standard'
                            });
                          }}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors cursor-pointer"
                        >
                          {courses.map((course, idx) => (
                            <option key={course.name} value={idx}>
                              {course.name} (₹{course.monthlyFee}/mo)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Training Batch Assignment</label>
                        <select
                          value={formData.batch}
                          onChange={e => setFormData({ ...formData, batch: e.target.value })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors cursor-pointer"
                        >
                          {batches.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="Unassigned">Unassigned / Others</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Physical Metrics & Age */}
                  <div className="space-y-4">
                    <h4 className="font-mono text-[9px] uppercase tracking-wider text-brand-gold border-b border-brand-border pb-1">
                      3. Athlete Metrics & Age
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Age (years)</label>
                        <input
                          type="number"
                          min="4"
                          max="30"
                          value={formData.age}
                          onChange={e => setFormData({ ...formData, age: e.target.value })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors font-mono"
                          placeholder="14"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Height (cm)</label>
                        <input
                          type="number"
                          min="50"
                          max="250"
                          value={formData.height}
                          onChange={e => setFormData({ ...formData, height: e.target.value })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors font-mono"
                          placeholder="165"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Weight (kg)</label>
                        <input
                          type="number"
                          min="10"
                          max="150"
                          value={formData.weight}
                          onChange={e => setFormData({ ...formData, weight: e.target.value })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors font-mono"
                          placeholder="52"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Academic & Background Credentials */}
                  <div className="space-y-4">
                    <h4 className="font-mono text-[9px] uppercase tracking-wider text-brand-gold border-b border-brand-border pb-1">
                      4. Personal & School Background
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">National ID (Aadhaar / Passport)</label>
                        <input
                          type="text"
                          value={formData.aadhaar}
                          onChange={e => setFormData({ ...formData, aadhaar: e.target.value })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors font-mono"
                          placeholder="e.g. 1234-5678-9012"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">School / Education Grade</label>
                        <input
                          type="text"
                          value={formData.education}
                          onChange={e => setFormData({ ...formData, education: e.target.value })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors"
                          placeholder="St. Mary's Academy, Grade 9"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-sans">Family Background & Guardian Notes</label>
                      <textarea
                        rows={2}
                        value={formData.familyDetails}
                        onChange={e => setFormData({ ...formData, familyDetails: e.target.value })}
                        className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors"
                        placeholder="Father is a high school football coach, family has athletic pedigree..."
                      />
                    </div>
                  </div>

                  {/* Section 5: Status Control */}
                  <div className="space-y-4">
                    <h4 className="font-mono text-[9px] uppercase tracking-wider text-brand-gold border-b border-brand-border pb-1">
                      5. Contract Terms & Status
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Contract Class</label>
                        <select
                          value={formData.tier}
                          onChange={e => setFormData({ ...formData, tier: e.target.value as 'Standard' | 'Premium' })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors cursor-pointer"
                        >
                          <option value="Standard">Standard Class</option>
                          <option value="Premium">Premium Class</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1 font-sans">Subscription Status</label>
                        <select
                          value={formData.status}
                          onChange={e => setFormData({ ...formData, status: e.target.value as 'Active' | 'Paused' | 'Canceled' })}
                          className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors cursor-pointer"
                        >
                          <option value="Active">Active</option>
                          <option value="Paused">Paused</option>
                          <option value="Canceled">Canceled</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Submit Action Block */}
                  <div className="flex gap-2 pt-4 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setEditingSubscription(null)}
                      className="flex-1 py-2.5 border border-brand-border text-gray-400 hover:text-white hover:bg-brand-surface-raised font-sans text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                    >
                      Discard Changes
                    </button>
                    
                    <button
                      type="submit"
                      className="flex-1 rounded-xs bg-brand-gold hover:bg-brand-gold-bright text-black font-sans text-xs font-bold py-2.5 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Save Updates</span>
                    </button>
                  </div>

                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </div>
  );
}
