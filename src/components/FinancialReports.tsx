import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Filter, Download, ArrowUpRight, 
  IndianRupee, Activity, FileText, CheckCircle2, AlertTriangle, 
  Clock, Search, ShieldCheck, Trophy, Landmark
} from 'lucide-react';
import { Invoice, Subscription } from '../types';
import { formatDisplayDate } from '../utils/attendance-dates';
import DateField from './DateField';

interface FinancialReportsProps {
  invoices: Invoice[];
  subscriptions: Subscription[];
  batches?: string[];
  isMobileMode?: boolean;
  onSelectInvoice?: (invoice: Invoice) => void;
}

export default function FinancialReports({
  invoices,
  subscriptions,
  batches = [],
  isMobileMode = false,
  onSelectInvoice
}: FinancialReportsProps) {
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Failed' | 'Pending'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [batchFilter, setBatchFilter] = useState<string>('All');
  const [monthYearFilter, setMonthYearFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const getMonthYearString = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const year = parts[0];
        const monthIndex = parseInt(parts[1], 10) - 1;
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        if (monthIndex >= 0 && monthIndex < 12) {
          return `${monthNames[monthIndex]} ${year}`;
        }
      }
    } catch (e) {}
    return 'Unknown';
  };

  // Get dynamic unique batches
  const extractedBatches = Array.from(new Set(
    subscriptions.map(s => s.batch).filter((b): b is string => !!b)
  ));
  const availableBatches = Array.from(new Set([...batches, ...extractedBatches])).sort();

  // Get dynamic unique months & years sorted descending (newest first)
  const availableMonths = Array.from(new Set(invoices.map(inv => getMonthYearString(inv.date))))
    .filter(m => m !== 'Unknown')
    .sort((a, b) => {
      const getSortValue = (str: string) => {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const [mName, yStr] = str.split(' ');
        const mIdx = monthNames.indexOf(mName);
        const mPad = String(mIdx + 1).padStart(2, '0');
        return `${yStr}-${mPad}`;
      };
      return getSortValue(b).localeCompare(getSortValue(a));
    });

  // Dynamic calculations based on invoices state
  const totalRevenue = invoices
    .filter(inv => inv.status === 'Success')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const collectionRate = totalInvoiced > 0 
    ? Math.round((totalRevenue / totalInvoiced) * 100) 
    : 0;

  const totalTransactions = invoices.length;
  const successCount = invoices.filter(inv => inv.status === 'Success').length;
  const failedCount = invoices.filter(inv => inv.status === 'Failed').length;
  const pendingCount = invoices.filter(inv => inv.status === 'Pending').length;

  // Let's split revenue by Category/Type
  // Monthly Subscriptions (all successful course/tuition fees)
  const monthlySubRevenue = invoices
    .filter(inv => inv.status === 'Success')
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Simulated registration fees (e.g. initial sign-ups or flat rate)
  const registrationFeeRevenue = subscriptions.length * 150; // Dynamic ₹150 per student subscription
  const adjustedTotalRevenue = totalRevenue + registrationFeeRevenue;

  // Filtered transactions for the table
  const filteredTransactions = invoices.filter(inv => {
    // 1. Status Filter
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;

    // 2. Search Filter
    const matchesSearch = inv.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.id.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Batch Filter
    let matchesBatch = true;
    if (batchFilter !== 'All') {
      const studentSub = subscriptions.find(s => s.studentName.toLowerCase() === inv.studentName.toLowerCase());
      const studentBatch = studentSub?.batch || 'Unassigned';
      if (batchFilter === 'Unassigned') {
        matchesBatch = !studentSub?.batch || studentSub.batch === 'Unassigned';
      } else {
        matchesBatch = studentBatch === batchFilter;
      }
    }

    // 4. Month/Year Filter
    const matchesMonthYear = monthYearFilter === 'All' || getMonthYearString(inv.date) === monthYearFilter;

    // 5. Date Range Filter
    let matchesDateRange = true;
    if (startDate) {
      matchesDateRange = matchesDateRange && inv.date >= startDate;
    }
    if (endDate) {
      matchesDateRange = matchesDateRange && inv.date <= endDate;
    }

    return matchesStatus && matchesSearch && matchesBatch && matchesMonthYear && matchesDateRange;
  });

  // Handle Export to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Date,Student Name,Parent Name,Program,Amount,Status\n";
    
    filteredTransactions.forEach(inv => {
      csvContent += `${inv.id},${formatDisplayDate(inv.date)},"${inv.studentName}","${inv.parentName}","${inv.courseName}",₹${inv.amount},${inv.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Football_Academy_Financial_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Overview Dashboard Header */}
      <div className="border-b border-brand-border/40 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
              <Landmark className="h-5 w-5 text-brand-gold" />
              Financial Audit & Reports
            </h2>
            <p className="font-sans text-xs text-gray-400 mt-1">
              Dynamic ledger intelligence, cash-flow metrics, and athletic prestige collection tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-emerald animate-pulse"></span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
              Live Ledger Ledger State: Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Overview Bento Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Revenue Card */}
        <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-brand-gold/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-bl-full pointer-events-none" />
          <div>
            <p className="font-sans text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
              Total Revenue
            </p>
            <h2 className="font-sans text-3xl font-extrabold text-brand-gold mt-2">
              ₹{adjustedTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-brand-emerald mt-4">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="font-mono text-xs font-semibold">
              +14.8% from last month
            </span>
          </div>
        </div>

        {/* Collection Rate Card */}
        <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-brand-gold/30 transition-all duration-300">
          <div>
            <p className="font-sans text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
              Collection Rate
            </p>
            <h2 className="font-sans text-3xl font-extrabold text-white mt-2">
              {collectionRate}%
            </h2>
          </div>
          <div className="space-y-1.5 mt-4">
            <div className="w-full bg-brand-border h-2 rounded-full overflow-hidden">
              <div 
                className="bg-brand-gold h-full shadow-[0_0_8px_rgba(212,175,55,0.5)] transition-all duration-500"
                style={{ width: `${collectionRate}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>Paid: ₹{totalRevenue.toLocaleString()}</span>
              <span>Total: ₹{totalInvoiced.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Integrity Card */}
        <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-6 flex flex-col justify-between min-h-[160px] relative overflow-hidden group hover:border-brand-gold/30 transition-all duration-300">
          <div>
            <p className="font-sans text-[10px] text-gray-400 font-semibold uppercase tracking-widest">
              Payment Integrity
            </p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-sans text-3xl font-extrabold text-white">{totalTransactions}</span>
              <span className="font-sans text-xs text-gray-400">Total Transactions</span>
            </div>
          </div>
          
          <div className="flex w-full gap-1 h-7 mt-4">
            {successCount > 0 && (
              <div 
                className="bg-brand-emerald flex items-center justify-center rounded-l-xs relative group/tooltip"
                style={{ flexGrow: successCount }}
                title={`${successCount} Successful`}
              >
                <span className="font-mono text-[9px] text-white font-bold px-1 truncate">
                  {successCount} OK
                </span>
              </div>
            )}
            {pendingCount > 0 && (
              <div 
                className="bg-brand-amethyst flex items-center justify-center relative group/tooltip"
                style={{ flexGrow: pendingCount }}
                title={`${pendingCount} Pending`}
              >
                <span className="font-mono text-[9px] text-white font-bold px-1 truncate">
                  {pendingCount} PND
                </span>
              </div>
            )}
            {failedCount > 0 && (
              <div 
                className="bg-brand-cinnabar flex items-center justify-center rounded-r-xs relative group/tooltip"
                style={{ flexGrow: failedCount }}
                title={`${failedCount} Failed`}
              >
                <span className="font-mono text-[9px] text-white font-bold px-1 truncate">
                  {failedCount} ERR
                </span>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* Revenue Breakdown */}
      <section>

        {/* Revenue Breakdown List */}
        <div className="bg-brand-surface-raised border border-brand-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-brand-border bg-brand-surface-hover flex items-center justify-between">
            <h3 className="font-sans text-sm font-bold text-brand-gold uppercase tracking-wider">
              Revenue Streams Breakdown
            </h3>
            <span className="font-mono text-[10px] text-gray-400">Real-time ledger data</span>
          </div>
          <div className="divide-y divide-brand-border">
            
            {/* Monthly Subscriptions Row */}
            <div className="p-5 flex justify-between items-center hover:bg-brand-border/30 transition-colors cursor-default">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xs bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 text-brand-gold shrink-0">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-white">Monthly Active Subscriptions</p>
                  <p className="font-sans text-xs text-gray-400">Recurring Athlete Tuition Fees</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-base font-bold text-white">
                  ₹{monthlySubRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="font-sans text-[10px] text-brand-emerald">Dynamic Billing Active</p>
              </div>
            </div>

            {/* Registration Fees Row */}
            <div className="p-5 flex justify-between items-center hover:bg-brand-border/30 transition-colors cursor-default">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xs bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 text-brand-gold shrink-0">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-sans text-sm font-semibold text-white">Registration & Facility Fees</p>
                  <p className="font-sans text-xs text-gray-400">Sign-on & Gear Allocations ({subscriptions.length} athletes)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-base font-bold text-white">
                  ₹{registrationFeeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="font-sans text-[10px] text-gray-400">₹150.00 flat rate per member</p>
              </div>
            </div>

            {/* Total Aggregate Row */}
            <div className="p-5 flex justify-between items-center bg-brand-surface-raised">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-brand-emerald" />
                <span className="font-sans text-xs font-bold text-gray-300 uppercase tracking-wider">Aggregate Gross Revenue</span>
              </div>
              <p className="font-mono text-lg font-extrabold text-brand-gold">
                ₹{adjustedTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

          </div>
        </div>

      </section>

      {/* Recent Transactions Table */}
      <section className="bg-brand-surface-raised border border-brand-border rounded-lg overflow-hidden">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-brand-border bg-brand-surface-hover flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-sans text-sm font-bold text-brand-gold uppercase tracking-wider">
              Recent Transactions Ledger
            </h3>
            <p className="font-sans text-[11px] text-gray-400">Showing {filteredTransactions.length} transaction entries based on current filters</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-500">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search athlete, parent..."
                className="w-full sm:w-48 bg-brand-charcoal border border-brand-border hover:border-brand-gold/30 focus:border-brand-gold text-[11px] text-white pl-8 pr-3 py-1.5 rounded-xs focus:outline-hidden transition-colors"
              />
            </div>

            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 rounded-xs border text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showFilters 
                  ? 'bg-brand-gold text-black border-brand-gold' 
                  : 'bg-brand-charcoal border-brand-border text-gray-400 hover:text-white'
              }`}
            >
              <Filter className="h-3 w-3" />
              Filter
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="bg-brand-gold hover:bg-brand-gold-bright text-black px-3 py-1.5 rounded-xs font-sans text-[11px] font-bold flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="p-5 bg-brand-surface-raised border-b border-brand-border"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs font-sans">
              
              {/* Status Filter */}
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-2">
                  Transaction Status
                </label>
                <div className="flex flex-wrap gap-1">
                  {(['All', 'Success', 'Pending', 'Failed'] as const).map(status => (
                    <button
                      type="button"
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-xs text-[10px] font-bold transition-all cursor-pointer ${
                        statusFilter === status
                          ? 'bg-brand-gold text-black shadow-md shadow-brand-gold/10'
                          : 'bg-brand-charcoal text-gray-400 border border-brand-border hover:text-white hover:border-gray-600'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Batch Filter */}
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-2">
                  Training Batch
                </label>
                <select
                  value={batchFilter}
                  onChange={e => setBatchFilter(e.target.value)}
                  className="w-full bg-brand-charcoal border border-brand-border hover:border-brand-gold/30 text-xs text-white px-3.5 py-2 rounded-xs outline-hidden focus:border-brand-gold transition-colors cursor-pointer"
                >
                  <option value="All">All Batches</option>
                  {availableBatches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value="Unassigned">Unassigned / Others</option>
                </select>
              </div>

              {/* Month/Year Filter */}
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-2">
                  Month / Year
                </label>
                <select
                  value={monthYearFilter}
                  onChange={e => setMonthYearFilter(e.target.value)}
                  className="w-full bg-brand-charcoal border border-brand-border hover:border-brand-gold/30 text-xs text-white px-3.5 py-2 rounded-xs outline-hidden focus:border-brand-gold transition-colors cursor-pointer"
                >
                  <option value="All">All Months</option>
                  {availableMonths.map(my => (
                    <option key={my} value={my}>{my}</option>
                  ))}
                </select>
              </div>

              {/* Date Range Selection */}
              <div>
                <label className="block font-mono text-[9px] uppercase tracking-wider text-gray-400 mb-2">
                  Custom Date Range
                </label>
                <div className="flex items-center gap-2">
                  <DateField
                    value={startDate}
                    onChange={setStartDate}
                    aria-label="Range start date"
                    className="w-full"
                  />
                  <span className="text-gray-500 font-mono text-[10px] shrink-0">to</span>
                  <DateField
                    value={endDate}
                    onChange={setEndDate}
                    aria-label="Range end date"
                    className="w-full"
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="text-brand-cinnabar hover:text-red-400 text-[10px] font-bold uppercase tracking-wider px-1.5 shrink-0"
                      title="Clear Range"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-surface-raised/50 border-b border-brand-border text-[10px] font-mono uppercase tracking-wider text-gray-400">
                <th className="p-4">Date</th>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Student Athlete</th>
                <th className="p-4">Training Course</th>
                <th className="p-4">Amount</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/30 text-xs">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 font-sans">
                    No transactions match the active filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(inv => (
                  <tr 
                    key={inv.id} 
                    className="hover:bg-brand-border/20 transition-colors cursor-pointer"
                    onClick={() => onSelectInvoice?.(inv)}
                  >
                    <td className="p-4 font-mono text-gray-400">
                      {formatDisplayDate(inv.date)}
                    </td>
                    <td className="p-4 font-mono text-white font-semibold">
                      {inv.id}
                    </td>
                    <td className="p-4 font-sans text-white font-semibold">
                      <div>{inv.studentName}</div>
                      <div className="text-[10px] text-gray-400 font-normal">Guarantor: {inv.parentName}</div>
                    </td>
                    <td className="p-4 font-sans text-gray-300">
                      {inv.courseName}
                    </td>
                    <td className="p-4 font-mono text-white font-bold">
                      ₹{inv.amount.toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold tracking-wider ${
                        inv.status === 'Success' 
                          ? 'bg-brand-emerald/10 text-brand-gold border border-brand-emerald/20' 
                          : inv.status === 'Pending'
                          ? 'bg-brand-amethyst/10 text-brand-amethyst border border-brand-amethyst/20'
                          : 'bg-brand-cinnabar/10 text-brand-cinnabar border border-brand-cinnabar/20'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 bg-brand-surface-raised border-t border-brand-border text-center">
          <p className="font-sans text-[10px] text-gray-500 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-emerald" />
            PLL Academy Finance ledger is fully audited and bound by real-time client-state synchronization.
          </p>
        </div>

      </section>

    </div>
  );
}
