import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Plus, IndianRupee, Percent, AlertCircle, Sparkles, 
  User, Mail, ArrowUpRight, CheckCircle2, AlertTriangle, BookOpen, Clock, Trash2, X, KeyRound, Info
} from 'lucide-react';
import { Invoice, Subscription, FilmCourse } from '../types';
import { formatDisplayDate } from '../utils/attendance-dates';

interface AdminDashboardProps {
  invoices: Invoice[];
  subscriptions: Subscription[];
  courses: FilmCourse[];
  isMobileMode: boolean;
  /** False for managers, whose ledger access is limited to paid/due status only. */
  isAdmin: boolean;
  onAddInvoice: (newInvoice: Omit<Invoice, 'id'>) => void;
  onDeleteInvoice: (id: string) => void;
  onUpdateSubscriptionStatus: (subId: string, newStatus: 'Active' | 'Paused' | 'Canceled') => void;
  onSelectInvoice: (invoice: Invoice) => void;
  onSelectSubscription: (sub: Subscription) => void;
}

export default function AdminDashboard({
  invoices,
  subscriptions,
  courses,
  isMobileMode,
  isAdmin,
  onAddInvoice,
  onDeleteInvoice,
  onUpdateSubscriptionStatus,
  onSelectInvoice,
  onSelectSubscription
}: AdminDashboardProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Failed' | 'Pending'>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  // Deleting a ledger record is irreversible, so the row's trash button only
  // stages the invoice here; the confirmation modal is what actually deletes.
  const [invoicePendingDelete, setInvoicePendingDelete] = useState<Invoice | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    studentName: '',
    parentName: '',
    parentEmail: '',
    courseIndex: 0,
    semester: 'Summer 2026',
    status: 'Pending' as 'Success' | 'Failed' | 'Pending',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Escape closes the delete confirmation, matching the overlay click.
  useEffect(() => {
    if (!invoicePendingDelete) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setInvoicePendingDelete(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [invoicePendingDelete]);

  // Calculations
  const successfulInvoices = invoices.filter(inv => inv.status === 'Success');
  const totalRevenue = successfulInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const collectionRate = totalBilled > 0 ? (totalRevenue / totalBilled) * 100 : 0;
  
  const outstandingInvoicesCount = invoices.filter(inv => inv.status !== 'Success').length;
  const premiumEnrollmentCount = subscriptions.filter(sub => sub.tier === 'Premium' && sub.status === 'Active').length;

  // Filtered Invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

    const selectedCourse = courses[formData.courseIndex] || courses[0] || { name: 'Academy Training Plan', monthlyFee: 300 };
    const today = new Date().toISOString().split('T')[0];
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    onAddInvoice({
      studentName: formData.studentName,
      parentName: formData.parentName,
      parentEmail: formData.parentEmail,
      amount: selectedCourse.monthlyFee,
      courseName: selectedCourse.name,
      date: today,
      dueDate: inTwoWeeks,
      status: formData.status,
      semester: formData.semester,
      transactionId: formData.status === 'Success' ? `TXN-GEN-${Math.floor(1000 + Math.random() * 9000)}-MF` : undefined
    });

    // Reset Form
    setFormData({
      studentName: '',
      parentName: '',
      parentEmail: '',
      courseIndex: 0,
      semester: 'Summer 2026',
      status: 'Pending'
    });
    setFormErrors({});
    setShowAddForm(false);
  };

  return (
    <div className="space-y-8">
      {/* Metrics Section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        {/* Metric 1 */}
        <div className="border border-brand-border bg-brand-surface-card p-3.5 sm:p-5 rounded-xs relative overflow-hidden">
          <div className="hidden sm:block absolute right-4 top-4 bg-brand-gold/10 rounded-full p-2 text-brand-gold">
            <IndianRupee className="h-5 w-5" />
          </div>
          <span className="font-sans text-xs text-gray-400 font-medium tracking-wide uppercase">Academy Revenue</span>
          <h3 className="font-mono text-2xl font-bold text-white mt-1">
            {isAdmin
              ? `₹${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : '••••••'}
          </h3>
          <p className="font-sans text-xs text-brand-gold mt-2 flex items-center gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Summer Semester Intake
          </p>
        </div>

        {/* Metric 2 */}
        <div className="border border-brand-border bg-brand-surface-card p-3.5 sm:p-5 rounded-xs relative overflow-hidden">
          <div className="hidden sm:block absolute right-4 top-4 bg-brand-emerald/10 rounded-full p-2 text-brand-emerald">
            <Percent className="h-5 w-5" />
          </div>
          <span className="font-sans text-xs text-gray-400 font-medium tracking-wide uppercase">Collection Rate</span>
          <h3 className="font-mono text-2xl font-bold text-white mt-1">
            {isAdmin ? `${collectionRate.toFixed(1)}%` : '••••••'}
          </h3>
          <div className="w-full bg-brand-charcoal h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-brand-emerald h-full transition-all duration-500" 
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="border border-brand-border bg-brand-surface-card p-3.5 sm:p-5 rounded-xs relative overflow-hidden">
          <div className="hidden sm:block absolute right-4 top-4 bg-brand-cinnabar/10 rounded-full p-2 text-brand-cinnabar">
            <AlertCircle className="h-5 w-5" />
          </div>
          <span className="font-sans text-xs text-gray-400 font-medium tracking-wide uppercase">Outstanding Ledger</span>
          <h3 className="font-mono text-2xl font-bold text-white mt-1">
            {outstandingInvoicesCount}
          </h3>
          <p className="font-sans text-xs text-gray-400 mt-2 flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-brand-cinnabar inline-block animate-pulse"></span>
            Requires collection review
          </p>
        </div>

        {/* Metric 4 */}
        <div className="border border-brand-border bg-brand-surface-card p-3.5 sm:p-5 rounded-xs relative overflow-hidden">
          <div className="hidden sm:block absolute right-4 top-4 bg-brand-amethyst/10 rounded-full p-2 text-brand-amethyst">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-sans text-xs text-gray-400 font-medium tracking-wide uppercase">Premium Athletes</span>
          <h3 className="font-mono text-2xl font-bold text-white mt-1">
            {premiumEnrollmentCount}
          </h3>
          <p className="font-sans text-xs text-brand-gold-bright mt-2">
            VIP Football Tiers Active
          </p>
        </div>
      </div>

      {/* Main Grid: Data Section */}
      <div className={`grid grid-cols-1 ${isMobileMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-8`}>
        
        {/* Left Hand: Invoices Lists */}
        <div className={`${isMobileMode ? 'lg:col-span-1' : 'lg:col-span-8'} space-y-6`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
            <div>
              <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
                Football Ledger Registry
                <span className="text-xs bg-brand-border text-gray-400 px-2 py-0.5 rounded-full font-mono font-normal">
                  {filteredInvoices.length} Records
                </span>
              </h2>
              <p className="font-sans text-xs text-gray-400 mt-1">
                Audit trail and status monitors for PLL Academy.
              </p>
            </div>

            {isAdmin && (
              <button
                id="admin-new-invoice-btn"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 rounded-xs bg-brand-blue hover:bg-brand-blue-bright px-4 py-2 font-sans text-xs font-semibold text-black transition-all cursor-pointer shadow-md"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Register Invoice
              </button>
            )}
          </div>

          {/* New Invoice Form (AnimatePresence) */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden border border-brand-blue bg-brand-surface-card p-6 rounded-xs"
              >
                <h3 className="font-sans text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-brand-gold" />
                  New Football Invoice Declaration
                </h3>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-sans">Student Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Aarav Sharma"
                        value={formData.studentName}
                        onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                        className={`w-full bg-brand-charcoal border text-white text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors ${
                          formErrors.studentName ? 'border-brand-cinnabar' : 'border-brand-border focus:border-brand-gold'
                        }`}
                      />
                      {formErrors.studentName && <p className="text-brand-cinnabar text-[10px] mt-1 font-mono">{formErrors.studentName}</p>}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-sans">Parent / Guarantor</label>
                      <input
                        type="text"
                        placeholder="e.g. Rohit Sharma"
                        value={formData.parentName}
                        onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                        className={`w-full bg-brand-charcoal border text-white text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors ${
                          formErrors.parentName ? 'border-brand-cinnabar' : 'border-brand-border focus:border-brand-gold'
                        }`}
                      />
                      {formErrors.parentName && <p className="text-brand-cinnabar text-[10px] mt-1 font-mono">{formErrors.parentName}</p>}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-sans">Guarantor Email</label>
                      <input
                        type="email"
                        placeholder="e.g. m.sterling@footballmail.com"
                        value={formData.parentEmail}
                        onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                        className={`w-full bg-brand-charcoal border text-white text-xs p-2.5 rounded-xs focus:outline-hidden transition-colors ${
                          formErrors.parentEmail ? 'border-brand-cinnabar' : 'border-brand-border focus:border-brand-gold'
                        }`}
                      />
                      {formErrors.parentEmail && <p className="text-brand-cinnabar text-[10px] mt-1 font-mono">{formErrors.parentEmail}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-sans">Training Program</label>
                      <select
                        value={formData.courseIndex}
                        onChange={e => setFormData({ ...formData, courseIndex: parseInt(e.target.value) })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white text-xs p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                      >
                        {courses.map((course, idx) => (
                          <option key={idx} value={idx}>
                            {course.name} (₹{course.monthlyFee}/mo)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-sans">Academic Term</label>
                      <input
                        type="text"
                        value={formData.semester}
                        onChange={e => setFormData({ ...formData, semester: e.target.value })}
                        className="w-full bg-brand-charcoal border border-brand-border text-white text-xs p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1 font-sans">Declaration Status</label>
                      <div className="flex gap-2">
                        {(['Pending', 'Success', 'Failed'] as const).map(st => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: st })}
                            className={`flex-1 py-2 font-mono text-[10px] font-semibold uppercase rounded-xs transition-colors cursor-pointer ${
                              formData.status === st
                                ? st === 'Success' 
                                  ? 'bg-brand-emerald text-white' 
                                  : st === 'Failed' 
                                    ? 'bg-brand-cinnabar text-white' 
                                    : 'bg-brand-amethyst text-white'
                                : 'bg-brand-charcoal text-gray-400 border border-brand-border hover:bg-gray-800'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 font-sans text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xs bg-brand-gold hover:bg-brand-gold-bright px-5 py-2 font-sans text-xs font-bold text-black transition-colors cursor-pointer"
                    >
                      Submit Registration
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filtering & Searching Controls */}
          <div className="flex flex-col sm:flex-row gap-4 bg-brand-surface-card p-4 rounded-xs border border-brand-border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student, course, or Invoice ID..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-brand-charcoal border border-brand-border text-white text-xs pl-10 pr-4 py-2 rounded-xs focus:outline-hidden focus:border-brand-gold transition-colors"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto shrink-0">
              {(['All', 'Success', 'Failed', 'Pending'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 font-sans text-xs font-medium rounded-xs transition-colors cursor-pointer ${
                    statusFilter === filter
                      ? 'bg-brand-gold text-black font-semibold'
                      : 'bg-brand-charcoal text-gray-400 hover:text-white border border-brand-border'
                  }`}
                >
                  {filter === 'All' ? 'All Ledger' : filter}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Table / Stacks */}
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-brand-border bg-brand-surface-card/30 rounded-xs">
              <p className="font-sans text-sm text-gray-400">No matching financial declarations found in the archive.</p>
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}
                className="text-xs text-brand-gold font-medium underline mt-2 hover:text-brand-gold-bright cursor-pointer"
              >
                Clear active filters
              </button>
            </div>
          ) : isMobileMode ? (
            /* 
              COLLAPSED CARD STACKS FOR MOBILE:
              Ensures Status and Amount are highly prominent, meeting the exact design rule.
            */
            <div className="space-y-4">
              {filteredInvoices.map(invoice => (
                <div
                  key={invoice.id}
                  onClick={() => onSelectInvoice(invoice)}
                  className="bg-brand-surface-card border border-brand-border p-4 rounded-xs hover:border-brand-gold transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-brand-border/40">
                    <span className="font-mono text-xs font-bold text-white tracking-wider">
                      {invoice.id}
                    </span>
                    {/* Amount & Status are extremely prominent */}
<div className="flex items-center gap-2">
  {isAdmin ? (
    <span className="font-mono text-sm font-bold text-white">
      ₹{invoice.amount}
    </span>
  ) : (
    <span className="font-mono text-sm font-bold text-gray-400">•••</span>
  )}
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

                  <div className="space-y-1">
                    <p className="font-sans text-xs text-white font-medium">
                      Student:{' '}
                      {(() => {
                        const matchingSub = subscriptions.find(s => s.studentName.toLowerCase() === invoice.studentName.toLowerCase());
                        if (matchingSub) {
                          return (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSubscription(matchingSub);
                              }}
                              className="text-brand-gold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                              title="View student profile"
                            >
                              {invoice.studentName}
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          );
                        }
                        return invoice.studentName;
                      })()}
                    </p>
                    <p className="font-sans text-[11px] text-gray-400 truncate">
                      {invoice.courseName}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-brand-border/40 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                    <span>Due: {formatDisplayDate(invoice.dueDate)}</span>
                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvoicePendingDelete(invoice);
                        }}
                        className="text-gray-500 hover:text-brand-cinnabar transition-colors"
                        title="Delete invoice record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 
              FLUID TABLE FOR DESKTOP:
              Data-heavy, high contrast table layout
            */
            <div className="overflow-x-auto border border-brand-border bg-brand-surface-card rounded-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-charcoal/80 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Training Program</th>
                    <th className="py-3 px-4 font-right">Amount</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {filteredInvoices.map((invoice, idx) => (
                    <tr
                      key={invoice.id}
                      onClick={() => onSelectInvoice(invoice)}
                      className="hover:bg-brand-charcoal/40 transition-colors cursor-pointer text-xs"
                    >
                      {/* Selection visual indicator (sharp vertical bar on active hover / border left) */}
                      <td className="py-4 px-4 font-mono font-semibold text-white relative">
                        {invoice.id}
                      </td>
                      <td className="py-4 px-4">
                        {(() => {
                          const matchingSub = subscriptions.find(s => s.studentName.toLowerCase() === invoice.studentName.toLowerCase());
                          if (matchingSub) {
                            return (
                              <p 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectSubscription(matchingSub);
                                }}
                                className="font-sans font-medium text-brand-gold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                title="View student profile"
                              >
                                {invoice.studentName}
                                <ArrowUpRight className="h-3 w-3" />
                              </p>
                            );
                          }
                          return <p className="font-sans font-medium text-white">{invoice.studentName}</p>;
                        })()}
                        <p className="font-sans text-[10px] text-gray-400">{invoice.parentName}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-sans text-gray-200 block truncate max-w-[180px]" title={invoice.courseName}>
                          {invoice.courseName}
                        </span>
                        <span className="font-sans text-[9px] text-gray-400 uppercase tracking-wide">
                          {invoice.semester}
                        </span>
                      </td>
<td className="py-4 px-4 font-mono font-bold text-white">
  {isAdmin ? `₹${invoice.amount}` : '•••'}
</td>
                      <td className="py-4 px-4 font-mono text-gray-400">
                        {formatDisplayDate(invoice.dueDate)}
                      </td>
                      <td className="py-4 px-4 text-center">
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
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => onSelectInvoice(invoice)}
                            className="text-brand-gold hover:text-brand-gold-bright transition-colors text-[10px] font-mono uppercase font-semibold"
                          >
                            View Receipt
                          </button>
                          {isAdmin && <>
                            <span className="text-brand-border">|</span>
                            <button
                              onClick={() => setInvoicePendingDelete(invoice)}
                              className="text-gray-500 hover:text-brand-cinnabar transition-colors"
                              title="Delete invoice record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Hand Side: Active Subscriptions & Admin Controls */}
        <div className={`${isMobileMode ? 'lg:col-span-1' : 'lg:col-span-4'} space-y-6`}>
          <div className="border-b border-brand-border pb-4">
            <h2 className="font-sans text-lg font-bold text-white flex items-center gap-2">
              Subscription Registry
            </h2>
            <p className="font-sans text-xs text-gray-400 mt-1">
              Active student tuition tiers and billing contracts.
            </p>
          </div>

          <div className="bg-brand-surface-card border border-brand-border p-5 rounded-xs space-y-4">
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-brand-gold">
              Tuition Tier Monitors
            </h3>

            <div className="divide-y divide-brand-border">
              {subscriptions.map(sub => {
                const isActive = sub.status === 'Active';
                const isPaused = sub.status === 'Paused';
                
                return (
                  <div key={sub.id} className="py-3.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p 
                          onClick={() => onSelectSubscription(sub)}
                          className="font-sans font-semibold text-white text-sm hover:text-brand-gold cursor-pointer transition-colors flex items-center gap-1 group/subname"
                          title="View student profile"
                        >
                          {sub.studentName}
                          <ArrowUpRight className="h-3 w-3 opacity-60 group-hover/subname:opacity-100 group-hover/subname:translate-x-0.5 group-hover/subname:-translate-y-0.5 transition-all text-brand-gold shrink-0" />
                        </p>
                        <p className="font-sans text-xs text-gray-400 truncate max-w-[170px]" title={sub.courseName}>
                          {sub.courseName}
                        </p>
                        {sub.status === 'Active' && sub.parentLoginId && (
                          <p
                            className="font-mono text-[10px] text-brand-gold/90 cursor-pointer hover:text-brand-gold transition-colors select-all flex items-center gap-1 mt-0.5"
                            title="Parent Login ID — share this with the parent so they can log in"
                            onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(sub.parentLoginId!); }}
                          >
                            <KeyRound className="h-3 w-3 shrink-0" />
                            {sub.parentLoginId}
                            <span className="text-gray-500 font-sans text-[9px] normal-case">(tap to copy)</span>
                          </p>
                        )}
                      </div>
                      
                      {/* Premium indicator */}
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wide font-semibold ${
                        sub.tier === 'Premium' 
                          ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30' 
                          : 'bg-brand-border text-gray-400'
                      }`}>
                        {sub.tier}
                      </span>
                    </div>

<div className="flex items-center justify-between mt-1 text-xs">
  <span className="font-mono text-gray-400">
    {isAdmin ? `₹${sub.monthlyFee}/mo` : 'Fee & status'}
  </span>

                      {/* Custom Switch Toggle which glows gold when active */}
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[10px] uppercase font-bold tracking-wider ${
                          isActive 
                            ? 'text-green-400 font-extrabold shadow-[0_0_8px_rgba(74,222,128,0.1)]' 
                            : isPaused 
                              ? 'text-yellow-400 font-extrabold shadow-[0_0_8px_rgba(250,204,21,0.1)]' 
                              : 'text-red-400 font-extrabold'
                        }`}>
                          {sub.status}
                        </span>

                        <button
                          onClick={() => {
                            const nextStateMap: Record<'Active' | 'Paused' | 'Canceled', 'Active' | 'Paused' | 'Canceled'> = {
                              'Active': 'Paused',
                              'Paused': 'Active',
                              'Canceled': 'Active'
                            };
                            onUpdateSubscriptionStatus(sub.id, nextStateMap[sub.status]);
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="bg-brand-charcoal/60 border border-brand-border p-5 rounded-xs space-y-4">
            <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-gold animate-pulse"></span>
              PLL Academy Ledger Feed
            </h4>

            <div className="space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-gray-400">
                <Info className="h-4 w-4 text-brand-gold shrink-0 mt-0.5" />
                <p>
                  No ledger activity yet. Billing events (auto-debit charges and failures) will appear here once
                  payments are processed.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Delete confirmation — a deleted ledger record cannot be recovered. */}
      <AnimatePresence>
        {invoicePendingDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-invoice-title"
            onClick={() => setInvoicePendingDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-md border border-brand-border bg-brand-surface-modal rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-brand-border bg-brand-charcoal px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5 text-brand-cinnabar" />
                  <h3
                    id="delete-invoice-title"
                    className="font-sans text-sm font-bold text-white tracking-tight"
                  >
                    Delete Invoice Record
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoicePendingDelete(null)}
                  className="rounded-full p-1 text-gray-400 hover:bg-brand-border hover:text-white transition-colors cursor-pointer"
                  aria-label="Cancel deletion"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <p className="font-sans text-xs text-gray-300 leading-relaxed">
                  This permanently removes the invoice from the ledger. It cannot be undone, and
                  the amount will no longer count towards revenue or collection rate.
                </p>

                <div className="bg-brand-charcoal border border-brand-border rounded-xs p-3 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Invoice ID</span>
                    <span className="text-brand-gold font-bold">{invoicePendingDelete.id}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Student</span>
                    <span className="text-white truncate">{invoicePendingDelete.studentName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Amount</span>
                    <span className="text-white font-bold">
                      ₹{invoicePendingDelete.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Status</span>
                    <span className="text-white">{invoicePendingDelete.status}</span>
                  </div>
                </div>

                {invoicePendingDelete.status === 'Success' && (
                  <div className="flex items-start gap-2 bg-brand-cinnabar/10 border border-brand-cinnabar/40 p-2.5 rounded-xs">
                    <AlertTriangle className="h-3.5 w-3.5 text-brand-cinnabar shrink-0 mt-px" />
                    <p className="font-sans text-[11px] text-brand-cinnabar">
                      This invoice is already <span className="font-bold">paid</span>. Deleting it
                      removes the payment from the audit trail — it does not refund the parent.
                    </p>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setInvoicePendingDelete(null)}
                    className="px-4 py-2 rounded-xs border border-brand-border bg-brand-charcoal hover:bg-brand-surface-hover text-gray-300 hover:text-white font-sans text-xs font-bold transition-colors cursor-pointer"
                  >
                    Keep Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteInvoice(invoicePendingDelete.id);
                      setInvoicePendingDelete(null);
                    }}
                    className="px-4 py-2 rounded-xs bg-brand-cinnabar hover:brightness-110 text-white font-sans text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Permanently
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
