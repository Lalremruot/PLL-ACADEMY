import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, Download, User, Mail, BookOpen, IndianRupee, 
  Eye, Edit, Plus, X, Check, ArrowUpRight, GraduationCap, Clock, AlertCircle, Info, Trash2,
  LayoutGrid, List, Calendar, TrendingUp, CheckCircle, Users
} from 'lucide-react';
import { Subscription, Invoice, FilmCourse } from '../types';
import { formatDisplayDate } from '../utils/attendance-dates';
import ProfilePicUpload from './ProfilePicUpload';

interface StudentRegistryProps {
  subscriptions: Subscription[];
  invoices: Invoice[];
  courses: FilmCourse[];
  batches: string[];
  isMobileMode: boolean;
  onSelectSubscription: (sub: Subscription) => void;
  onAddSubscription: (sub: Omit<Subscription, 'id'>) => void;
  onUpdateSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => void;
  onAddInvoice?: (invoice: Omit<Invoice, 'id'>) => void;
  onPayInvoice?: (id: string) => void;
}

export default function StudentRegistry({
  subscriptions,
  invoices,
  courses,
  batches,
  isMobileMode,
  onSelectSubscription,
  onAddSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  onAddInvoice,
  onPayInvoice
}: StudentRegistryProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Canceled'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'payments'>('grid');
  
  // Year and Month filters for payments tracking
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [filterMonth, setFilterMonth] = useState<number>(6); // 0-indexed: 6 is July, 5 is June
  const [paymentBatchFilter, setPaymentBatchFilter] = useState<string>('All');

  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  
  // Form States
  const [formData, setFormData] = useState({
    studentName: '',
    parentName: '',
    parentEmail: '',
    courseIndex: 0,
    status: 'Paused' as 'Active' | 'Paused' | 'Canceled',
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

  // Reset form helper
  const resetForm = () => {
    setFormData({
      studentName: '',
      parentName: '',
      parentEmail: '',
      courseIndex: 0,
      status: 'Paused',
      tier: 'Standard',
      batch: batches[0] || '',
      age: '',
      height: '',
      weight: '',
      aadhaar: '',
      education: '',
      familyDetails: '',
      profilePic: '',
      phoneNumber: '',
    });
    setFormErrors({});
  };

  // Open add modal
  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  // Open edit modal
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
      phoneNumber: sub.phoneNumber || '',
    });
    setFormErrors({});
  };

  // Submit Handler (Add or Edit)
  const handleSubmit = (e: React.FormEvent) => {
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
    const today = new Date().toISOString().split('T')[0];
    const inOneMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const parsedAge = formData.age.trim() ? parseInt(formData.age, 10) : undefined;
    const parsedHeight = formData.height.trim() ? parseFloat(formData.height) : undefined;
    const parsedWeight = formData.weight.trim() ? parseFloat(formData.weight) : undefined;

    if (editingSubscription) {
      // Edit mode
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
        phoneNumber: phone || undefined,
      });
      setEditingSubscription(null);
    } else {
      // Add mode
      onAddSubscription({
        studentName: formData.studentName,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        courseName: selectedCourse.name,
        status: formData.status,
        tier: formData.tier,
        monthlyFee: selectedCourse.monthlyFee,
        nextBillingDate: inOneMonth,
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
      setShowAddModal(false);
    }
    resetForm();
  };

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = 
      sub.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.parentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.parentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate some dynamic stats
  const activeCount = subscriptions.filter(s => s.status === 'Active').length;
  const pausedCount = subscriptions.filter(s => s.status === 'Paused').length;
  const canceledCount = subscriptions.filter(s => s.status === 'Canceled').length;

  // Parse date string into Year and Month (0-indexed)
  const getInvoiceYearMonth = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      return { year, month };
    }
    return { year: 0, month: 0 };
  };

  // List of years and months
  const yearsList = [2025, 2026, 2027];
  const monthsList = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' },
  ];

  // Helper to determine Semester name
  const getSemesterName = (monthIndex: number, yearNum: number) => {
    if (monthIndex >= 0 && monthIndex <= 4) return `Spring ${yearNum}`;
    if (monthIndex >= 5 && monthIndex <= 7) return `Summer ${yearNum}`;
    return `Fall ${yearNum}`;
  };

  // Helper to get latest paid month for a student (Paid Up To)
  const getPaidUpTo = (studentName: string) => {
    const studentInvoices = invoices.filter(inv => 
      inv.studentName.toLowerCase() === studentName.toLowerCase() && 
      inv.status === 'Success'
    );
    if (studentInvoices.length === 0) return { text: 'No Payments Recorded', date: '' };
    
    const sorted = [...studentInvoices].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const { year, month } = getInvoiceYearMonth(latest.date);
    return {
      text: `${monthsList[month]?.label || ''} ${year}`,
      date: latest.date
    };
  };

  // Export to CSV Functionality (Fully functional, client side, supports payments tracking)
  const handleExportCSV = () => {
    if (viewMode === 'payments') {
      const monthLabel = monthsList.find(m => m.value === filterMonth)?.label || '';
      const headers = ['Student Name', 'Course Program', 'Monthly Fee', 'Subscription Status', 'Payment Status for ' + monthLabel + ' ' + filterYear, 'Invoice ID', 'Paid Up To'];
      const rows = filteredSubscriptions.map(sub => {
        const studentInvoices = invoices.filter(inv => inv.studentName.toLowerCase() === sub.studentName.toLowerCase());
        const monthlyInvoice = studentInvoices.find(inv => {
          const { year, month } = getInvoiceYearMonth(inv.date);
          return year === filterYear && month === filterMonth && inv.status === 'Success';
        }) || studentInvoices.find(inv => {
          const { year, month } = getInvoiceYearMonth(inv.date);
          return year === filterYear && month === filterMonth;
        });

        const paidUp = getPaidUpTo(sub.studentName);

        let payStatusText = 'No Invoice';
        if (monthlyInvoice) {
          if (monthlyInvoice.status === 'Success') payStatusText = 'Paid';
          else if (monthlyInvoice.status === 'Pending') payStatusText = 'Pending';
          else payStatusText = 'Failed';
        } else if (sub.status === 'Canceled') {
          payStatusText = 'N/A (Terminated)';
        } else if (sub.status === 'Paused') {
          payStatusText = 'N/A (Paused)';
        }

        return [
          sub.studentName,
          sub.courseName,
          sub.monthlyFee,
          sub.status,
          payStatusText,
          monthlyInvoice?.id || 'N/A',
          paidUp.text
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Academy_Payments_Ledger_${monthLabel}_${filterYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // Default student registry CSV export
    const headers = ['Subscription ID', 'Student Name', 'Course Name', 'Parent Name', 'Parent Email', 'Status', 'Tier', 'Monthly Fee', 'Next Billing Date'];
    const rows = filteredSubscriptions.map(sub => [
      sub.id,
      sub.studentName,
      sub.courseName,
      sub.parentName,
      sub.parentEmail,
      sub.status,
      sub.tier,
      sub.monthlyFee,
      formatDisplayDate(sub.nextBillingDate)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Football_Academy_Student_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Registry Filter/Controls bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        {/* Search */}
        <div className="flex-1 max-w-2xl">
          <label className="block font-mono text-[10px] text-gray-400 mb-2 tracking-wider" htmlFor="student-search">
            STUDENT SEARCH
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input 
              className="w-full bg-brand-charcoal border border-brand-border focus:border-brand-gold focus:ring-0 rounded-xs pl-12 pr-4 py-3 font-sans text-sm text-white placeholder-gray-500 transition-all outline-none" 
              id="student-search" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, parent, or email..." 
              type="text"
            />
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center bg-brand-charcoal border border-brand-border p-1 rounded-xs">
            {(['All', 'Active', 'Paused', 'Canceled'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 font-sans text-[11px] font-semibold rounded-xs transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-brand-gold text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {status === 'Paused' ? 'Pending' : status}
              </button>
            ))}
          </div>

          {/* Grid/List/Payments Toggle Switcher */}
          <div className="flex items-center bg-brand-charcoal border border-brand-border p-1 rounded-xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xs text-xs font-semibold font-sans transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-brand-gold text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline text-[11px]">Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xs text-xs font-semibold font-sans transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-brand-gold text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline text-[11px]">List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('payments')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xs text-xs font-semibold font-sans transition-all cursor-pointer ${
                viewMode === 'payments'
                  ? 'bg-brand-gold text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Monthly Fees Tracker"
            >
              <IndianRupee className="h-3.5 w-3.5 text-brand-gold shrink-0" />
              <span className="text-[11px]">Payment Status</span>
            </button>
          </div>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-charcoal border border-brand-border hover:border-brand-gold text-gray-300 hover:text-white rounded-xs font-sans text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Grid view of Student Registries */}
      {filteredSubscriptions.length === 0 ? (
        <div className="bg-brand-charcoal border border-dashed border-brand-border p-12 text-center rounded-xs">
          <GraduationCap className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="font-sans text-sm text-gray-400">No students match your criteria.</p>
          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('All'); }}
            className="mt-4 text-xs font-bold text-brand-gold hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSubscriptions.map((sub) => {
            const isActive = sub.status === 'Active';
            const isPaused = sub.status === 'Paused';
            const isCanceled = sub.status === 'Canceled';

            // Find matching invoices count
            const subInvoices = invoices.filter(inv => inv.studentName.toLowerCase() === sub.studentName.toLowerCase());
            const totalOutstanding = subInvoices
              .filter(inv => inv.status !== 'Success')
              .reduce((sum, inv) => sum + inv.amount, 0);

            return (
              <div 
                key={sub.id} 
                className="group bg-brand-charcoal border border-brand-border p-4 rounded-xs transition-all duration-300 hover:border-brand-border-bright hover:translate-y-[-2px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)] flex flex-col justify-between h-full"
              >
                <div>
                  {/* Card Header (Picture & Status Badge) */}
                  <div className="flex items-start justify-between gap-2 pb-3 mb-3 border-b border-brand-border/40">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {sub.profilePic ? (
                        <img 
                          src={sub.profilePic} 
                          alt={sub.studentName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-full object-cover border border-brand-border group-hover:border-brand-gold/60 transition-all shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-brand-surface-raised border border-brand-border flex items-center justify-center text-brand-gold font-sans text-xs font-bold shrink-0">
                          {sub.studentName.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-sans font-bold text-white text-xs tracking-tight truncate group-hover:text-brand-gold transition-colors" title={sub.studentName}>
                          {sub.studentName}
                        </h3>
                        <p className="font-sans text-[10px] text-brand-gold font-medium truncate mt-0.5" title={sub.courseName}>
                          {sub.courseName}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isActive ? (
                      <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[8px] font-bold rounded-full uppercase tracking-wider shrink-0">
                        Active
                      </span>
                    ) : isPaused ? (
                      <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-mono text-[8px] font-bold rounded-full uppercase tracking-wider shrink-0">
                        Pending
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-brand-cinnabar/10 border border-brand-cinnabar/20 text-red-400 font-mono text-[8px] font-bold rounded-full uppercase tracking-wider shrink-0">
                        Term
                      </span>
                    )}
                  </div>

                  {/* Physical & Extended Metrics Row if any are specified */}
                  {(sub.age !== undefined || sub.height !== undefined || sub.weight !== undefined) && (
                    <div className="flex items-center gap-2 font-mono text-[8px] text-gray-400 bg-brand-charcoal px-2 py-1 rounded-xs border border-brand-border/30 mb-2 w-fit">
                      {sub.age !== undefined && <span>{sub.age} yrs</span>}
                      {sub.age !== undefined && (sub.height !== undefined || sub.weight !== undefined) && <span className="text-gray-600">•</span>}
                      {sub.height !== undefined && <span>{sub.height} cm</span>}
                      {sub.height !== undefined && sub.weight !== undefined && <span className="text-gray-600">•</span>}
                      {sub.weight !== undefined && <span>{sub.weight} kg</span>}
                    </div>
                  )}

                  {/* Details layout */}
                  <div className="space-y-1 text-[11px] mb-3">
                    <p className="text-gray-400 font-sans truncate" title={sub.parentName}>
                      <span className="text-gray-500">Parent:</span> <span className="text-white font-medium">{sub.parentName}</span>
                    </p>
                    {sub.batch && (
                      <p className="text-gray-400 font-sans truncate" title={sub.batch}>
                        <span className="text-gray-500">Batch:</span> <span className="text-white font-medium">{sub.batch}</span>
                      </p>
                    )}
                    {sub.aadhaar && (
                      <p className="text-gray-400 font-sans truncate" title={sub.aadhaar}>
                        <span className="text-gray-500">Aadhaar:</span> <span className="text-white font-mono text-[10px]">{sub.aadhaar}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  {/* Tuition info block */}
                  <div className="bg-brand-charcoal p-2 rounded-xs border border-brand-border/30 flex items-center justify-between">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-gray-500">Tuition</span>
                    <span className="font-sans text-xs font-extrabold text-brand-gold">₹{sub.monthlyFee.toFixed(2)}/mo</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2.5 mt-2.5 border-t border-brand-border/20">
                    <button 
                      onClick={() => onSelectSubscription(sub)}
                      title="View Profile"
                      className="flex-1 py-1.5 bg-brand-surface-raised hover:bg-brand-surface-hover border border-brand-border hover:border-brand-gold text-white rounded-xs font-sans text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye className="h-3 w-3 text-brand-gold shrink-0" />
                      <span>VIEW PROFILE</span>
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${sub.studentName}'s student profile?`)) {
                          onDeleteSubscription(sub.id);
                        }
                      }}
                      title="Remove Student Profile"
                      className="px-2.5 bg-brand-cinnabar/10 hover:bg-brand-cinnabar/20 border border-brand-cinnabar/20 hover:border-brand-cinnabar rounded-xs text-brand-cinnabar transition-all cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-brand-cinnabar shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-3.5">
          {/* Table Header Row (Hidden on mobile) */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-2.5 font-mono text-[10px] text-gray-500 uppercase tracking-widest border-b border-brand-border/40">
            <div className="col-span-3">Student & Enrollment</div>
            <div className="col-span-3">Parent & Contact</div>
            <div className="col-span-2">Program Course</div>
            <div className="col-span-2">Tuition Rate</div>
            <div className="col-span-2 text-right">Status & Actions</div>
          </div>

          {filteredSubscriptions.map((sub) => {
            const isActive = sub.status === 'Active';
            const isPaused = sub.status === 'Paused';
            const isCanceled = sub.status === 'Canceled';

            const subInvoices = invoices.filter(inv => inv.studentName.toLowerCase() === sub.studentName.toLowerCase());
            const totalOutstanding = subInvoices
              .filter(inv => inv.status !== 'Success')
              .reduce((sum, inv) => sum + inv.amount, 0);

            return (
              <div 
                key={sub.id} 
                className="group bg-brand-surface-raised border border-brand-border p-4 rounded-xs transition-all duration-200 hover:border-brand-border-bright hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  {/* Student Info */}
                  <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xs bg-brand-charcoal border border-brand-border flex items-center justify-center text-brand-gold shrink-0 group-hover:bg-brand-gold group-hover:text-black transition-all">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="truncate">
                      <p className="font-sans font-bold text-white text-sm tracking-tight flex items-center gap-1.5 truncate">
                        {sub.studentName}
                        {sub.tier === 'Premium' && (
                          <span className="font-mono text-[7px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                            PRM
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-[9px] text-gray-500 mt-0.5">
                        ID: {sub.id}
                      </p>
                    </div>
                  </div>

                  {/* Parent Info */}
                  <div className="col-span-1 md:col-span-3 space-y-0.5">
                    <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider md:hidden">Parent / Guarantor</p>
                    <p className="font-sans text-xs font-semibold text-white truncate">{sub.parentName}</p>
                    <p className="font-sans text-[11px] text-gray-400 truncate flex items-center gap-1" title={sub.parentEmail}>
                      <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{sub.parentEmail}</span>
                    </p>
                  </div>

                  {/* Program Course */}
                  <div className="col-span-1 md:col-span-2 space-y-0.5">
                    <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider md:hidden">Course Program</p>
                    <p className="font-sans text-xs font-bold text-brand-gold truncate" title={sub.courseName}>
                      {sub.courseName}
                    </p>
                    {sub.batch && (
                      <p className="font-sans text-[10px] text-gray-400 flex items-center gap-1 truncate" title={sub.batch}>
                        <Users className="h-3 w-3 text-brand-gold/60 shrink-0" />
                        <span>{sub.batch}</span>
                      </p>
                    )}
                  </div>

                  {/* Tuition Rates */}
                  <div className="col-span-1 md:col-span-2 space-y-0.5">
                    <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider md:hidden">Tuition Rate</p>
                    <div className="flex md:flex-col items-baseline md:items-start gap-2">
                      <span className="font-sans text-xs font-extrabold text-white">
                        ₹{sub.monthlyFee.toFixed(2)}/mo
                      </span>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="col-span-1 md:col-span-2 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-brand-border/30">
                    <div className="shrink-0">
                      {isActive ? (
                        <span className="px-2.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider shadow-[0_0_8px_rgba(34,197,94,0.1)]">
                          Active
                        </span>
                      ) : isPaused ? (
                        <span className="px-2.5 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider shadow-[0_0_8px_rgba(234,179,8,0.1)]">
                          Pending
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-brand-cinnabar/10 border border-brand-cinnabar/30 text-red-400 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                          Terminated
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button 
                        type="button"
                        onClick={() => onSelectSubscription(sub)}
                        className="p-1.5 bg-brand-charcoal hover:bg-brand-surface-hover border border-brand-border hover:border-brand-gold text-white rounded-xs transition-all cursor-pointer"
                        title="View Profile"
                      >
                        <Eye className="h-3 w-3 text-brand-gold" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${sub.studentName}'s student profile?`)) {
                            onDeleteSubscription(sub.id);
                          }
                        }}
                        title="Remove Student Profile"
                        className="p-1.5 bg-brand-cinnabar/10 hover:bg-brand-cinnabar/20 border border-brand-cinnabar/20 hover:border-brand-cinnabar rounded-xs text-brand-cinnabar transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (() => {
        // Filter by batch specifically for the Payment Status view
        const paymentViewSubs = filteredSubscriptions.filter(sub => {
          if (paymentBatchFilter === 'All') return true;
          return sub.batch === paymentBatchFilter;
        });

        const billingStudents = paymentViewSubs.filter(s => s.status === 'Active');
        const totalExpected = billingStudents.reduce((sum, s) => sum + s.monthlyFee, 0);

        const collectedInvoices = invoices.filter(inv => {
          const { year, month } = getInvoiceYearMonth(inv.date);
          return year === filterYear && month === filterMonth && inv.status === 'Success' &&
            paymentViewSubs.some(sub => sub.studentName.toLowerCase() === inv.studentName.toLowerCase());
        });
        const totalCollected = collectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        const outstandingInvoices = invoices.filter(inv => {
          const { year, month } = getInvoiceYearMonth(inv.date);
          return year === filterYear && month === filterMonth && inv.status !== 'Success' &&
            paymentViewSubs.some(sub => sub.studentName.toLowerCase() === inv.studentName.toLowerCase());
        });
        const totalOutstandingVal = outstandingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const coveragePct = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 100;

        return (
          <div className="space-y-6">
            {/* Ledger Date Controls & Explanation Banner */}
            <div className="bg-brand-surface-raised border border-brand-border p-5 rounded-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div>
                  <h3 className="font-sans font-bold text-white text-base tracking-tight flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-brand-gold" />
                    Payment Status & Subscription Tracker
                  </h3>
                  <p className="font-sans text-xs text-gray-400 mt-1 max-w-xl">
                    Track recurring monthly membership tuition fees. Use the controls to filter by batch or billing period, see who paid up to which month, or generate/approve active student invoices.
                  </p>
                </div>

                {/* Date and Batch Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="space-y-1">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-gray-500">STUDENT BATCH</span>
                    <select
                      value={paymentBatchFilter}
                      onChange={(e) => setPaymentBatchFilter(e.target.value)}
                      className="bg-brand-charcoal border border-brand-border text-white text-xs font-semibold py-2 px-3 rounded-xs outline-none focus:border-brand-gold cursor-pointer"
                    >
                      <option value="All">All Batches</option>
                      {batches.map((bName, idx) => (
                        <option key={idx} value={bName}>
                          {bName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-gray-500">BILLING MONTH</span>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(parseInt(e.target.value, 10))}
                      className="bg-brand-charcoal border border-brand-border text-white text-xs font-semibold py-2 px-3 rounded-xs outline-none focus:border-brand-gold cursor-pointer"
                    >
                      {monthsList.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="block font-mono text-[9px] uppercase tracking-wider text-gray-500">BILLING YEAR</span>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(parseInt(e.target.value, 10))}
                      className="bg-brand-charcoal border border-brand-border text-white text-xs font-semibold py-2 px-3 rounded-xs outline-none focus:border-brand-gold cursor-pointer"
                    >
                      {yearsList.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Period Stats Card Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-brand-charcoal/40 border border-brand-border p-4 rounded-xs">
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">Expected Revenue</span>
                <span className="font-sans font-extrabold text-lg text-white mt-1 block">
                  ₹{totalExpected.toFixed(2)}
                </span>
                <span className="font-mono text-[9px] text-gray-400 block mt-0.5">
                  From {billingStudents.length} Active accounts
                </span>
              </div>

              <div className="bg-brand-charcoal/40 border border-brand-border p-4 rounded-xs">
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">Collected (Paid)</span>
                <span className="font-sans font-extrabold text-lg text-green-400 mt-1 block">
                  ₹{totalCollected.toFixed(2)}
                </span>
                <span className="font-mono text-[9px] text-green-400/70 block mt-0.5">
                  {collectedInvoices.length} transactions paid
                </span>
              </div>

              <div className="bg-brand-charcoal/40 border border-brand-border p-4 rounded-xs">
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">Outstanding / Due</span>
                <span className="font-sans font-extrabold text-lg text-brand-gold mt-1 block">
                  ₹{totalOutstandingVal.toFixed(2)}
                </span>
                <span className="font-mono text-[9px] text-brand-gold/70 block mt-0.5">
                  {outstandingInvoices.length} invoices unpaid
                </span>
              </div>

              <div className="bg-brand-charcoal/40 border border-brand-border p-4 rounded-xs">
                <span className="font-mono text-[9px] text-gray-500 uppercase tracking-wider block">Collection Rate</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-sans font-extrabold text-lg text-white">
                    {coveragePct}%
                  </span>
                  <div className="flex-1 bg-gray-800 h-1.5 rounded-full overflow-hidden max-w-[80px]">
                    <div 
                      className="bg-brand-gold h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(coveragePct, 100)}%` }} 
                    />
                  </div>
                </div>
                <span className="font-mono text-[9px] text-gray-400 block mt-0.5">
                  Coverage indicator
                </span>
              </div>
            </div>

            {/* Ledger Table Section */}
            <div className="border border-brand-border bg-brand-surface-raised rounded-xs overflow-hidden">
              {/* Table Header */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 font-mono text-[10px] text-gray-500 uppercase tracking-widest border-b border-brand-border/40 bg-brand-charcoal">
                <div className="col-span-3">Student & Account Status</div>
                <div className="col-span-3">Program Enrolled</div>
                <div className="col-span-2">Tuition Fee</div>
                <div className="col-span-2">Paid Up To</div>
                <div className="col-span-2 text-right">Selected Month Status</div>
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-brand-border/30">
                {paymentViewSubs.map(sub => {
                  const subInvoices = invoices.filter(inv => inv.studentName.toLowerCase() === sub.studentName.toLowerCase());
                  
                  // Find monthly invoice
                  const monthlyInvoice = subInvoices.find(inv => {
                    const { year, month } = getInvoiceYearMonth(inv.date);
                    return year === filterYear && month === filterMonth && inv.status === 'Success';
                  }) || subInvoices.find(inv => {
                    const { year, month } = getInvoiceYearMonth(inv.date);
                    return year === filterYear && month === filterMonth;
                  });

                  const paidUp = getPaidUpTo(sub.studentName);

                  // Check status color
                  let statusBadge = null;
                  let actionBtn = null;

                  if (monthlyInvoice) {
                    if (monthlyInvoice.status === 'Success') {
                      statusBadge = (
                        <div className="text-left lg:text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-500/10 border border-green-500/30 text-green-400 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                            <Check className="h-3 w-3 text-green-400" />
                            PAID
                          </span>
                          <p className="font-mono text-[8px] text-gray-500 mt-1">Invoice: {monthlyInvoice.id}</p>
                        </div>
                      );
                      actionBtn = (
                        <span className="font-mono text-[9px] text-gray-500">Paid & Settled</span>
                      );
                    } else if (monthlyInvoice.status === 'Pending') {
                      statusBadge = (
                        <div className="text-left lg:text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                            <Clock className="h-3 w-3 text-yellow-400" />
                            PENDING
                          </span>
                          <p className="font-mono text-[8px] text-brand-cinnabar mt-1 font-bold">Due: {formatDisplayDate(monthlyInvoice.dueDate)}</p>
                        </div>
                      );
                      actionBtn = onPayInvoice ? (
                        <button
                          onClick={() => onPayInvoice(monthlyInvoice.id)}
                          className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold-bright text-black font-sans text-[10px] font-extrabold rounded-xs uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Mark Paid
                        </button>
                      ) : null;
                    } else {
                      statusBadge = (
                        <div className="text-left lg:text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-cinnabar/10 border border-brand-cinnabar/30 text-brand-cinnabar font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                            <AlertCircle className="h-3 w-3 text-brand-cinnabar" />
                            FAILED
                          </span>
                          <p className="font-mono text-[8px] text-brand-cinnabar mt-1">Declined</p>
                        </div>
                      );
                      actionBtn = onPayInvoice ? (
                        <button
                          onClick={() => onPayInvoice(monthlyInvoice.id)}
                          className="px-3 py-1.5 bg-brand-gold hover:bg-brand-gold-bright text-black font-sans text-[10px] font-extrabold rounded-xs uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Retry Payment
                        </button>
                      ) : null;
                    }
                  } else {
                    // No monthly invoice found
                    if (sub.status === 'Canceled') {
                      statusBadge = (
                        <div className="text-left lg:text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-charcoal border border-brand-border text-gray-500 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                            N/A
                          </span>
                          <p className="font-mono text-[8px] text-gray-500 mt-1">Terminated</p>
                        </div>
                      );
                      actionBtn = (
                        <span className="font-mono text-[9px] text-gray-600">Inactive Registry</span>
                      );
                    } else if (sub.status === 'Paused') {
                      statusBadge = (
                        <div className="text-left lg:text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/70 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                            PAUSED
                          </span>
                          <p className="font-mono text-[8px] text-gray-500 mt-1">Account Suspended</p>
                        </div>
                      );
                      actionBtn = onAddInvoice ? (
                        <button
                          onClick={() => {
                            const padZero = (n: number) => n < 10 ? `0${n}` : `${n}`;
                            onAddInvoice({
                              studentName: sub.studentName,
                              parentName: sub.parentName,
                              parentEmail: sub.parentEmail,
                              amount: sub.monthlyFee,
                              courseName: sub.courseName,
                              date: `${filterYear}-${padZero(filterMonth + 1)}-01`,
                              dueDate: `${filterYear}-${padZero(filterMonth + 1)}-15`,
                              status: 'Pending',
                              semester: getSemesterName(filterMonth, filterYear)
                            });
                          }}
                          className="px-3 py-1.5 bg-brand-charcoal hover:bg-brand-surface-card border border-brand-border hover:border-brand-gold text-white font-sans text-[10px] font-semibold rounded-xs uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Bill Anyway
                        </button>
                      ) : null;
                    } else {
                      // Active but unbilled!
                      statusBadge = (
                        <div className="text-left lg:text-right">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-charcoal border border-brand-border text-gray-400 font-mono text-[9px] font-extrabold rounded-full uppercase tracking-wider">
                            UNBILLED
                          </span>
                          <p className="font-mono text-[8px] text-gray-400 mt-1">No Invoice Generated</p>
                        </div>
                      );
                      actionBtn = onAddInvoice ? (
                        <button
                          onClick={() => {
                            const padZero = (n: number) => n < 10 ? `0${n}` : `${n}`;
                            onAddInvoice({
                              studentName: sub.studentName,
                              parentName: sub.parentName,
                              parentEmail: sub.parentEmail,
                              amount: sub.monthlyFee,
                              courseName: sub.courseName,
                              date: `${filterYear}-${padZero(filterMonth + 1)}-01`,
                              dueDate: `${filterYear}-${padZero(filterMonth + 1)}-15`,
                              status: 'Pending',
                              semester: getSemesterName(filterMonth, filterYear)
                            });
                          }}
                          className="px-3 py-1.5 bg-brand-gold/15 hover:bg-brand-gold text-brand-gold hover:text-black border border-brand-gold/20 font-sans text-[10px] font-extrabold rounded-xs uppercase tracking-wider cursor-pointer transition-all"
                        >
                          Generate Invoice
                        </button>
                      ) : null;
                    }
                  }

                  return (
                    <div key={sub.id} className="p-4 lg:p-6 transition-colors hover:bg-brand-charcoal/20">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                        {/* Column 1: Student Profile */}
                        <div className="col-span-1 lg:col-span-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xs bg-brand-charcoal border border-brand-border flex items-center justify-center text-brand-gold shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-sans font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                              {sub.studentName}
                              {sub.tier === 'Premium' && (
                                <span className="font-mono text-[7px] bg-brand-gold/10 text-brand-gold px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                                  PREMIUM
                                </span>
                              )}
                            </p>
                            <span className={`inline-block font-mono text-[8px] uppercase font-bold mt-1 px-1.5 py-0.2 rounded-full ${
                              sub.status === 'Active' 
                                ? 'bg-green-500/15 text-green-400' 
                                : sub.status === 'Paused' 
                                  ? 'bg-yellow-500/15 text-yellow-400' 
                                  : 'bg-red-500/15 text-red-400'
                            }`}>
                              {sub.status === 'Paused' ? 'Pending' : sub.status}
                            </span>
                          </div>
                        </div>

                        {/* Column 2: Program Enrolled */}
                        <div className="col-span-1 lg:col-span-3">
                          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider lg:hidden">Program Enrolled</p>
                          <p className="font-sans text-xs font-semibold text-gray-200">{sub.courseName}</p>
                        </div>

                        {/* Column 3: Tuition Fee */}
                        <div className="col-span-1 lg:col-span-2">
                          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider lg:hidden">Monthly Fee</p>
                          <p className="font-mono text-sm font-extrabold text-brand-gold">₹{sub.monthlyFee.toFixed(2)}</p>
                        </div>

                        {/* Column 4: Paid Up To */}
                        <div className="col-span-1 lg:col-span-2">
                          <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider lg:hidden">Paid Up To</p>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${paidUp.date ? 'text-green-400' : 'text-gray-600'}`} />
                            <span className="font-sans text-xs font-medium text-gray-300 truncate" title={paidUp.text}>
                              {paidUp.text}
                            </span>
                          </div>
                        </div>

                        {/* Column 5: Selected Month Status & Quick Actions */}
                        <div className="col-span-1 lg:col-span-2 flex items-center lg:justify-end gap-4 mt-2 lg:mt-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-brand-border/30">
                          <div className="flex-1 lg:flex-none text-left lg:text-right">
                            <p className="font-mono text-[9px] text-gray-500 uppercase tracking-wider lg:hidden block mb-1">
                              Status ({monthsList.find(m => m.value === filterMonth)?.label} {filterYear})
                            </p>
                            {statusBadge}
                          </div>
                          <div className="shrink-0">
                            {actionBtn}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dynamic Floating Action Button for Adding Student (FAB) */}
      <button 
        onClick={handleOpenAddModal}
        className="fixed right-6 bottom-24 md:bottom-12 flex items-center gap-2 px-6 py-4 bg-brand-gold hover:bg-brand-gold-bright text-black rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 font-sans font-bold text-xs uppercase tracking-wider"
      >
        <Plus className="h-4 w-4 font-extrabold stroke-[3]" />
        <span>Add Student</span>
      </button>

      {/* Add/Edit Modal Portal Overlay */}
      <AnimatePresence>
        {(showAddModal || editingSubscription) && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-charcoal border border-brand-border w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto rounded-xs shadow-2xl"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-brand-surface-raised">
                <h2 className="font-sans font-extrabold text-white text-base tracking-tight flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-brand-gold" />
                  {editingSubscription ? 'Edit Registry Profile' : 'Add New Student Registry'}
                </h2>
                <button 
                  onClick={() => { setShowAddModal(false); setEditingSubscription(null); }}
                  className="p-1 hover:bg-brand-surface-card rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Student Name */}
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

                {/* Parent Name */}
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

                {/* Parent Email */}
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                    Contact Email Address
                  </label>
                  <input 
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                    className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                    placeholder="e.g. m.rossi@academy.com"
                  />
                  {formErrors.parentEmail && (
                    <p className="text-brand-cinnabar text-[10px] mt-1 font-sans">{formErrors.parentEmail}</p>
                  )}
                </div>

                {/* Parent Phone */}
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

                {/* Course Selection */}
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                    Select Course Enrollment
                  </label>
                  <select
                    value={formData.courseIndex}
                    onChange={(e) => setFormData({ ...formData, courseIndex: parseInt(e.target.value) })}
                    className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                  >
                    {courses.map((course, idx) => (
                      <option key={idx} value={idx}>
                        {course.name} (₹{course.monthlyFee}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Selection */}
                <div>
                  <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                    Assign Student Batch / Group
                  </label>
                  <select
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3.5 py-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                  >
                    <option value="">-- No Assigned Batch --</option>
                    {batches.map((batchName, idx) => (
                      <option key={idx} value={batchName}>
                        {batchName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Status selection */}
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Registry Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-brand-charcoal border border-brand-border rounded-xs px-3 px-2.5 text-xs text-white focus:border-brand-gold outline-none transition-colors"
                    >
                      <option value="Active">Active</option>
                      <option value="Paused">Pending / Paused</option>
                      <option value="Canceled">Terminated</option>
                    </select>
                  </div>

                  {/* Tier Selection */}
                  <div>
                    <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-1.5">
                      Service Tier Level
                    </label>
                    <div className="flex bg-brand-charcoal border border-brand-border p-1 rounded-xs h-[38px] items-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tier: 'Standard' })}
                        className={`flex-1 text-[10px] font-bold h-full rounded-xs transition-all ${
                          formData.tier === 'Standard'
                            ? 'bg-brand-gold text-black'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        STANDARD
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, tier: 'Premium' })}
                        className={`flex-1 text-[10px] font-bold h-full rounded-xs transition-all ${
                          formData.tier === 'Premium'
                            ? 'bg-brand-gold text-black'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        PREMIUM
                      </button>
                    </div>
                  </div>
                </div>

                {/* Optional Extended Profile Details */}
                <div className="border-t border-brand-border/40 pt-4 space-y-4">
                  <h4 className="font-sans text-xs font-bold text-brand-gold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-brand-gold/80" />
                    Extended Student Profile Details (Optional)
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {/* Age */}
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

                    {/* Height */}
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

                    {/* Weight */}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Aadhaar */}
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

                    {/* Education */}
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

                  {/* Profile Pic */}
                  <ProfilePicUpload
                    value={formData.profilePic}
                    onChange={(dataUrl) => setFormData({ ...formData, profilePic: dataUrl })}
                  />
                </div>

                {/* Actions Form */}
                <div className="pt-4 flex justify-end gap-3 border-t border-brand-border/40">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingSubscription(null); }}
                    className="px-4 py-2 border border-brand-border hover:border-white text-gray-400 hover:text-white text-xs font-semibold rounded-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-gold hover:bg-brand-gold-bright text-black text-xs font-bold rounded-xs transition-colors cursor-pointer shadow-md shadow-brand-gold/10"
                  >
                    {editingSubscription ? 'Save Profile' : 'Add Student'}
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
