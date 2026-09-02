import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Info, Link as LinkIcon, ShieldCheck, 
  PauseCircle, PlayCircle, XCircle, Filter, CheckCircle, FileText,
  Edit, X, GraduationCap, BarChart3, CreditCard, KeyRound
} from 'lucide-react';
import { Subscription, Invoice, FilmCourse } from '../types';
import { formatDisplayDate } from '../utils/attendance-dates';
import PlayerProfileStats from './player/PlayerProfileStats';
import ProfilePicUpload from './ProfilePicUpload';
import AttendanceSummary from './AttendanceSummary';

interface StudentProfileViewProps {
  subscription: Subscription;
  invoices: Invoice[];
  onBack: () => void;
  onUpdateSubscriptionStatus: (subId: string, newStatus: 'Active' | 'Paused' | 'Canceled') => void;
  onSelectInvoice: (invoice: Invoice) => void;
  courses?: FilmCourse[];
  batches?: string[];
  isAdmin?: boolean;
  onUpdateSubscription?: (sub: Subscription) => void;
}

export default function StudentProfileView({
  subscription,
  invoices,
  onBack,
  onUpdateSubscriptionStatus,
  onSelectInvoice,
  courses = [],
  batches = [],
  isAdmin = true,
  onUpdateSubscription
}: StudentProfileViewProps) {
  const [profileTab, setProfileTab] = useState<'stats' | 'billing'>('stats');
  // Generate link state
  const [generateState, setGenerateState] = useState<'idle' | 'generating' | 'copied'>('idle');

  // Edit states
  const [showEditModal, setShowEditModal] = useState(false);
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
    phoneNumber: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleOpenEditModal = () => {
    const matchedCourseIndex = courses.findIndex(c => c.name === subscription.courseName);
    setFormData({
      studentName: subscription.studentName,
      parentName: subscription.parentName,
      parentEmail: subscription.parentEmail,
      courseIndex: matchedCourseIndex !== -1 ? matchedCourseIndex : 0,
      status: subscription.status,
      tier: subscription.tier,
      batch: subscription.batch || (batches[0] || ''),
      age: subscription.age !== undefined ? String(subscription.age) : '',
      height: subscription.height !== undefined ? String(subscription.height) : '',
      weight: subscription.weight !== undefined ? String(subscription.weight) : '',
      aadhaar: subscription.aadhaar || '',
      education: subscription.education || '',
      familyDetails: subscription.familyDetails || '',
      profilePic: subscription.profilePic || '',
      phoneNumber: subscription.phoneNumber || '',
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.studentName.trim()) errors.studentName = 'Student name is required';
    if (!formData.parentName.trim()) errors.parentName = 'Parent name is required';
    if (!formData.parentEmail.trim()) {
      errors.parentEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.parentEmail)) {
      errors.parentEmail = 'Invalid email address';
    }
    const phone = formData.phoneNumber.trim();
    if (phone && !/^[6-9]\d{9}$/.test(phone)) {
      errors.phoneNumber = 'Enter a valid 10-digit Indian mobile number';
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
        ...subscription,
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
        phoneNumber: phone || undefined,
      });
    }
    setShowEditModal(false);
  };

  const handleGenerateLink = () => {
    setGenerateState('generating');
    setTimeout(() => {
      setGenerateState('copied');
      // Copy simulated link
      navigator.clipboard?.writeText(`https://football-academy.edu/pay/auth/${subscription.id}`);
      setTimeout(() => {
        setGenerateState('idle');
      }, 2000);
    }, 1500);
  };

  // Get payments/invoices matching this student
  const studentInvoices = invoices.filter(
    inv => inv.studentName.toLowerCase() === subscription.studentName.toLowerCase()
  );

  // If no invoices exist for this student, simulate the standard ones from the HTML
  const displayInvoices = studentInvoices.length > 0 ? studentInvoices : [
    {
      id: `INV-SEP-${subscription.id.slice(-4)}`,
      studentName: subscription.studentName,
      parentName: subscription.parentName,
      parentEmail: subscription.parentEmail,
      amount: subscription.monthlyFee,
      courseName: subscription.courseName,
      date: '2026-09-15',
      dueDate: '2026-09-25',
      status: 'Success' as const,
      transactionId: 'TXN-9824-A',
      semester: 'Summer 2026'
    },
    {
      id: `INV-AUG-${subscription.id.slice(-4)}`,
      studentName: subscription.studentName,
      parentName: subscription.parentName,
      parentEmail: subscription.parentEmail,
      amount: subscription.monthlyFee,
      courseName: subscription.courseName,
      date: '2026-08-15',
      dueDate: '2026-08-25',
      status: 'Success' as const,
      transactionId: 'TXN-8201-B',
      semester: 'Summer 2026'
    },
    {
      id: `INV-JUL-${subscription.id.slice(-4)}`,
      studentName: subscription.studentName,
      parentName: subscription.parentName,
      parentEmail: subscription.parentEmail,
      amount: subscription.monthlyFee,
      courseName: subscription.courseName,
      date: '2026-07-15',
      dueDate: '2026-07-25',
      status: 'Failed' as const,
      semester: 'Summer 2026'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Compact header with back + actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-charcoal border border-brand-border p-4 md:p-5 rounded-xs">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 group text-gray-400 hover:text-white transition-colors text-xs font-sans uppercase tracking-widest cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="hidden sm:inline">Registry</span>
          </button>
          <div className="h-8 w-px bg-brand-border hidden sm:block" />
          <div className="min-w-0">
            <h2 className="font-sans text-xl font-bold text-white truncate">{subscription.studentName}</h2>
            <p className="font-mono text-[10px] text-gray-500 truncate">{subscription.id} · {subscription.batch}</p>
            {subscription.status === 'Active' && subscription.parentLoginId && (
              <p
                className="inline-flex items-center gap-1 font-mono text-[11px] text-brand-gold/90 cursor-pointer hover:text-brand-gold transition-colors select-all mt-1"
                title="Parent Login ID — share this with the parent so they can log in"
                onClick={() => navigator.clipboard?.writeText(subscription.parentLoginId!)}
              >
                <KeyRound className="h-3 w-3" />
                {subscription.parentLoginId}
                <span className="text-gray-500 font-sans text-[9px] normal-case">(tap to copy)</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {subscription.status === 'Active' ? (
            <button
              onClick={() => {
                if (confirm(`Pause ${subscription.studentName}'s subscription?`)) {
                  onUpdateSubscriptionStatus(subscription.id, 'Paused');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-charcoal hover:bg-brand-surface-hover border border-brand-border text-white rounded-xs text-[10px] font-bold uppercase cursor-pointer"
            >
              <PauseCircle className="h-3.5 w-3.5 text-brand-gold" />
              Pause
            </button>
          ) : (
            <button
              onClick={() => {
                if (confirm(`Activate ${subscription.studentName}'s subscription?`)) {
                  onUpdateSubscriptionStatus(subscription.id, 'Active');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-gold hover:bg-brand-gold-bright text-black rounded-xs text-[10px] font-bold uppercase cursor-pointer"
            >
              <PlayCircle className="h-3.5 w-3.5" />
              Activate
            </button>
          )}
          {subscription.status !== 'Canceled' && (
            <button
              onClick={() => {
                if (confirm(`Cancel ${subscription.studentName}'s subscription?`)) {
                  onUpdateSubscriptionStatus(subscription.id, 'Canceled');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-cinnabar/10 border border-brand-cinnabar/30 text-brand-cinnabar rounded-xs text-[10px] font-bold uppercase cursor-pointer"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}
          <button
            onClick={handleOpenEditModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-charcoal border border-brand-border hover:border-brand-gold text-white rounded-xs text-[10px] font-bold uppercase cursor-pointer"
          >
            <Edit className="h-3.5 w-3.5 text-brand-gold" />
            Edit
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-brand-surface-raised p-1 border border-brand-border rounded-xs w-fit">
        <button
          type="button"
          onClick={() => setProfileTab('stats')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
            profileTab === 'stats'
              ? 'bg-brand-gold text-black shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Player Profile
        </button>
        <button
          type="button"
          onClick={() => setProfileTab('billing')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xs transition-all cursor-pointer ${
            profileTab === 'billing'
              ? 'bg-brand-gold text-black shadow-sm'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Academy & Billing
        </button>
      </div>

      {profileTab === 'stats' ? (
        <div className="space-y-6">
          {/* Billing status + attendance summary at the top of the player profile */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-5 bg-brand-surface-card border border-brand-border rounded-xs p-5 space-y-3">
              <h4 className="flex items-center gap-2 font-sans text-sm font-bold text-white uppercase tracking-wider">
                <CreditCard className="h-4 w-4 text-brand-gold" />
                Billing Status
              </h4>
              {displayInvoices.length === 0 ? (
                <p className="font-sans text-xs text-gray-400">No invoices recorded for this athlete yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-brand-charcoal border border-brand-border/40 rounded-xs p-3">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">Paid</p>
                    <p className="font-mono text-2xl font-extrabold text-brand-emerald">
                      {displayInvoices.filter(i => i.status === 'Success').length}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-gray-600">invoices</p>
                  </div>
                  <div className="bg-brand-charcoal border border-brand-border/40 rounded-xs p-3">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">Due</p>
                    <p className="font-mono text-2xl font-extrabold text-brand-cinnabar">
                      {displayInvoices.filter(i => i.status !== 'Success').length}
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-gray-600">outstanding</p>
                  </div>
                  {displayInvoices.filter(i => i.status !== 'Success').reduce((s, i) => s + i.amount, 0) > 0 && isAdmin && (
                    <div className="col-span-2 bg-brand-cinnabar/5 border border-brand-cinnabar/20 rounded-xs p-3 flex items-center justify-between">
                      <span className="font-sans text-xs text-gray-300">Total due</span>
                      <span className="font-mono text-base font-bold text-brand-cinnabar">
                        ₹{displayInvoices.filter(i => i.status !== 'Success').reduce((s, i) => s + i.amount, 0).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>

            <div className="lg:col-span-7">
              <AttendanceSummary subscription={subscription} months={3} />
            </div>
          </div>

          <PlayerProfileStats subscription={subscription} />
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Fee, Link Generation & Trust */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Monthly Fee Card */}
          <div className="bg-brand-surface-card p-6 rounded-xs border border-brand-border relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <h3 className="font-sans text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">
              Monthly Rate
            </h3>
<div className="flex items-baseline gap-1">
  <span className="font-sans text-3xl font-bold text-brand-gold">{isAdmin ? '₹' : ''}</span>
  <span className="font-mono text-5xl font-extrabold text-white tracking-tight">
    {isAdmin ? subscription.monthlyFee.toFixed(2) : '•••'}
  </span>
</div>
            <p className="font-sans text-xs text-gray-400 mt-4">
              Next automatic draft scheduled for <span className="font-mono text-white">{formatDisplayDate(subscription.nextBillingDate)}</span>
            </p>
          </div>

          {/* Personal & Athletic Metrics Card */}
          <div className="bg-brand-surface-card p-6 rounded-xs border border-brand-border space-y-4">
            <h4 className="font-sans text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Student Metrics & Info
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-brand-charcoal p-2.5 rounded-xs border border-brand-border/40 text-center">
                <p className="font-mono text-[8px] text-gray-500 uppercase tracking-wider">Age</p>
                <p className="font-sans text-sm font-bold text-white mt-1">
                  {subscription.age !== undefined ? `${subscription.age} yrs` : '—'}
                </p>
              </div>
              <div className="bg-brand-charcoal p-2.5 rounded-xs border border-brand-border/40 text-center">
                <p className="font-mono text-[8px] text-gray-500 uppercase tracking-wider">Height</p>
                <p className="font-sans text-sm font-bold text-white mt-1">
                  {subscription.height !== undefined ? `${subscription.height} cm` : '—'}
                </p>
              </div>
              <div className="bg-brand-charcoal p-2.5 rounded-xs border border-brand-border/40 text-center">
                <p className="font-mono text-[8px] text-gray-500 uppercase tracking-wider">Weight</p>
                <p className="font-sans text-sm font-bold text-white mt-1">
                  {subscription.weight !== undefined ? `${subscription.weight} kg` : '—'}
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-brand-border/20">
                <span className="font-sans text-gray-400">National ID / Aadhaar</span>
                <span className="font-mono text-white font-semibold">{subscription.aadhaar || 'Not Listed'}</span>
              </div>
              <div className="flex flex-col gap-0.5 py-1.5 border-b border-brand-border/20">
                <span className="font-sans text-gray-400">Education & School</span>
                <span className="font-sans text-white font-medium">{subscription.education || 'Not Listed'}</span>
              </div>
              <div className="flex flex-col gap-0.5 py-1.5">
                <span className="font-sans text-gray-400">Family & Guardian Info</span>
                <span className="font-sans text-white font-medium">{subscription.familyDetails || 'Not Listed'}</span>
              </div>
            </div>
          </div>

          {/* Dynamic Link Generator Button */}
          <button
            onClick={handleGenerateLink}
            disabled={generateState === 'generating'}
            className={`w-full px-6 py-4 rounded-xs font-sans text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
              generateState === 'copied'
                ? 'bg-brand-emerald text-white shadow-brand-emerald/10'
                : 'bg-brand-gold hover:bg-brand-gold-bright text-black hover:scale-[1.01] active:scale-[0.99] shadow-brand-gold/10'
            }`}
          >
            {generateState === 'idle' && (
              <>
                <LinkIcon className="h-4 w-4 shrink-0" />
                <span>Generate Authorization Link</span>
              </>
            )}
            {generateState === 'generating' && (
              <>
                <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Generating Link...</span>
              </>
            )}
            {generateState === 'copied' && (
              <>
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Link Copied!</span>
              </>
            )}
          </button>

          {/* Security & Trust Card */}
          <div className="bg-brand-charcoal/80 p-6 rounded-xs border border-brand-border space-y-4">
            <div className="flex items-center gap-2 text-brand-gold">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <h4 className="font-sans font-semibold text-sm text-white">Security &amp; Trust</h4>
            </div>
            <p className="font-sans text-xs text-gray-400 leading-relaxed">
              PLL Academy uses bank-grade encryption for all financial transactions. Payment links are unique to the student and expire after 48 hours for maximum security.
            </p>
          </div>
        </section>

        {/* Right Column: Recent Payments Table */}
        <section className="lg:col-span-8 space-y-6">
          <div className="bg-brand-surface-card rounded-xs border border-brand-border flex flex-col h-full">
            <div className="p-5 border-b border-brand-border flex justify-between items-center">
              <h3 className="font-sans text-sm font-bold text-white uppercase tracking-wider">
                Recent Ledger Payments
              </h3>
              <Filter className="h-4 w-4 text-gray-400 cursor-pointer hover:text-white transition-colors" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-brand-charcoal/50 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Amount</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Statement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {displayInvoices.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-brand-charcoal/30 transition-colors text-xs">
                      <td className="px-5 py-4 font-mono text-gray-300">
                        {formatDisplayDate(inv.date)}
                      </td>
<td className="px-5 py-4 font-mono font-bold text-white">
  {isAdmin ? `₹${inv.amount.toFixed(2)}` : '•••'}
</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-xs font-mono text-[9px] font-bold uppercase ${
                          inv.status === 'Success'
                            ? 'bg-brand-emerald text-white'
                            : 'bg-brand-cinnabar text-white'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => onSelectInvoice(inv as Invoice)}
                          className="text-brand-gold hover:text-brand-gold-bright transition-colors inline-flex items-center gap-1 cursor-pointer font-sans text-xs"
                        >
                          <FileText className="h-4 w-4" />
                          <span>View Statement</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-brand-charcoal/50 border-t border-brand-border flex justify-center">
              <button 
                onClick={() => {
                  // Trigger simulated action or filter reset
                }}
                className="font-mono text-xs text-brand-gold uppercase hover:underline cursor-pointer"
              >
                View All Ledger Records
              </button>
            </div>
          </div>

        </section>

      </div>
      )}

      {/* Edit Student Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-charcoal border border-brand-border w-full max-w-xl rounded-xs overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-brand-surface-raised shrink-0">
                <h2 className="font-sans font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-brand-gold" />
                  <span>Edit Student Profile</span>
                </h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-brand-surface-card rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form Content */}
              <form onSubmit={handleSaveProfile} className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Student Full Name
                    </label>
                    <input 
                      type="text"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. Julian Rossi"
                    />
                    {formErrors.studentName && (
                      <p className="text-brand-cinnabar text-[10px] mt-1 font-sans">{formErrors.studentName}</p>
                    )}
                  </div>

                  <div>
                    <ProfilePicUpload
                      value={formData.profilePic}
                      onChange={(dataUrl) => setFormData({ ...formData, profilePic: dataUrl })}
                    />
                  </div>
                </div>

                {/* Parent Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Parent / Guarantor Name
                    </label>
                    <input 
                      type="text"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. Marco Rossi"
                    />
                    {formErrors.parentName && (
                      <p className="text-brand-cinnabar text-[10px] mt-1 font-sans">{formErrors.parentName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Contact Email Address
                    </label>
                    <input 
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. parent@example.com"
                    />
                    {formErrors.parentEmail && (
                      <p className="text-brand-cinnabar text-[10px] mt-1 font-sans">{formErrors.parentEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Parent Mobile Number
                    </label>
                    <input 
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className={`w-full bg-brand-charcoal border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors ${
                        formErrors.phoneNumber ? 'border-brand-cinnabar' : 'border-brand-border'
                      }`}
                      placeholder="e.g. 9876543210"
                    />
                    {formErrors.phoneNumber && (
                      <p className="text-brand-cinnabar text-[10px] mt-1 font-sans">{formErrors.phoneNumber}</p>
                    )}
                  </div>
                </div>

                {/* Course & Batch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Academy Course Program
                    </label>
                    <select
                      value={formData.courseIndex}
                      onChange={(e) => {
                        const index = parseInt(e.target.value, 10);
                        const selected = courses[index];
                        setFormData({ 
                          ...formData, 
                          courseIndex: index,
                          tier: selected ? selected.tier : 'Standard'
                        });
                      }}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors cursor-pointer"
                    >
                      {courses.map((course, idx) => (
                        <option key={idx} value={idx}>
                          {course.name} (₹{course.monthlyFee}/mo - {course.tier})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Training Batch Assignment
                    </label>
                    <select
                      value={formData.batch}
                      onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors cursor-pointer"
                    >
                      {batches.map((bName, idx) => (
                        <option key={idx} value={bName}>
                          {bName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Age (Years)
                    </label>
                    <input 
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. 14"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Height (cm)
                    </label>
                    <input 
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. 165"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Weight (kg)
                    </label>
                    <input 
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. 52"
                      min="1"
                    />
                  </div>
                </div>

                {/* Aadhaar & Education */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      National ID / Aadhaar Number
                    </label>
                    <input 
                      type="text"
                      value={formData.aadhaar}
                      onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. 5544-2233-9900"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Education / School Grade
                    </label>
                    <input 
                      type="text"
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                      placeholder="e.g. Metropolis Academy - 9th Grade"
                    />
                  </div>
                </div>

                {/* Family details */}
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                    Family Background / Guardian Occupations
                  </label>
                  <input 
                    type="text"
                    value={formData.familyDetails}
                    onChange={(e) => setFormData({ ...formData, familyDetails: e.target.value })}
                    className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                    placeholder="e.g. Father: Business Owner, Mother: Software Engineer"
                  />
                </div>

                {/* Tier & Status options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Membership Tier
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input 
                          type="radio"
                          name="tier"
                          checked={formData.tier === 'Standard'}
                          onChange={() => setFormData({ ...formData, tier: 'Standard' })}
                          className="accent-brand-gold"
                        />
                        Standard
                      </label>
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input 
                          type="radio"
                          name="tier"
                          checked={formData.tier === 'Premium'}
                          onChange={() => setFormData({ ...formData, tier: 'Premium' })}
                          className="accent-brand-gold"
                        />
                        Premium
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Access Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3 py-2 text-xs text-white focus:border-brand-gold outline-none cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Paused (Pending Authorization)</option>
                      <option value="Canceled">Canceled (Terminated)</option>
                    </select>
                  </div>
                </div>

                {/* Actions Form */}
                <div className="pt-4 flex justify-end gap-3 border-t border-brand-border/40 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-brand-border hover:border-white text-gray-400 hover:text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-bright text-black text-xs font-bold rounded-xs transition-colors cursor-pointer shadow-md shadow-brand-gold/10"
                  >
                    Save Profile Changes
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
