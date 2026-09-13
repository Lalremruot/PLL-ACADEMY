import React, { useMemo, useState } from 'react';
import { Search, ArrowUpRight, KeyRound, Users, CheckCircle2, Clock, XCircle, IndianRupee, CreditCard } from 'lucide-react';
import { Subscription } from '../types';

interface TuitionRegistryProps {
  subscriptions: Subscription[];
  isMobileMode: boolean;
  onSelectSubscription: (sub: Subscription) => void;
  onUpdateSubscriptionStatus: (subId: string, newStatus: 'Active' | 'Paused' | 'Canceled') => void;
}

const STATUS_CYCLE: Record<Subscription['status'], Subscription['status']> = {
  Active: 'Paused',
  Paused: 'Active',
  Canceled: 'Active',
};

export default function TuitionRegistry({
  subscriptions,
  isMobileMode,
  onSelectSubscription,
  onUpdateSubscriptionStatus
}: TuitionRegistryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'All' | 'Standard' | 'Premium'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | Subscription['status']>('All');

  const stats = useMemo(() => {
    const active = subscriptions.filter(s => s.status === 'Active');
    const premiumActive = active.filter(s => s.tier === 'Premium').length;
    const paused = subscriptions.filter(s => s.status === 'Paused').length;
    const canceled = subscriptions.filter(s => s.status === 'Canceled').length;
    const monthlyBilling = active.reduce((sum, s) => sum + s.monthlyFee, 0);
    return { activeCount: active.length, premiumActive, paused, canceled, monthlyBilling };
  }, [subscriptions]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return subscriptions
      .filter(s => {
        if (tierFilter !== 'All' && s.tier !== tierFilter) return false;
        if (statusFilter !== 'All' && s.status !== statusFilter) return false;
        if (!q) return true;
        return (
          s.studentName.toLowerCase().includes(q) ||
          s.parentName.toLowerCase().includes(q) ||
          s.parentEmail.toLowerCase().includes(q) ||
          s.courseName.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.parentLoginId ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [subscriptions, searchTerm, tierFilter, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setTierFilter('All');
    setStatusFilter('All');
  };

  const tierBadge = (tier: 'Standard' | 'Premium'): string =>
    tier === 'Premium'
      ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30'
      : 'bg-brand-border text-gray-400';

  const statusColors: Record<Subscription['status'], string> = {
    Active: 'text-green-400 font-extrabold shadow-[0_0_8px_rgba(74,222,128,0.1)]',
    Paused: 'text-yellow-400 font-extrabold shadow-[0_0_8px_rgba(250,204,21,0.1)]',
    Canceled: 'text-red-400 font-extrabold',
  };

  const StatusToggle = ({ sub }: { sub: Subscription }) => {
    const isActive = sub.status === 'Active';
    const isPaused = sub.status === 'Paused';
    return (
      <div className="flex justify-end lg:justify-center items-center gap-2">
        <span className={`font-mono text-[10px] uppercase font-bold tracking-wider ${statusColors[sub.status]}`}>
          {sub.status}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onUpdateSubscriptionStatus(sub.id, STATUS_CYCLE[sub.status]); }}
          className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 relative cursor-pointer shrink-0 ${
            isActive ? 'bg-brand-gold glow-gold' : isPaused ? 'bg-brand-amethyst' : 'bg-brand-border'
          }`}
          title="Toggle Active / Paused / Canceled"
        >
          <div
            className={`w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 absolute top-0.5 ${
              isActive ? 'right-0.5 translate-x-0' : 'left-0.5 translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  };

  const ParentLogin = ({ sub }: { sub: Subscription }) => (
    <div className="flex items-center gap-1">
      <KeyRound className="h-3 w-3 text-gray-500 shrink-0" />
      <span
        className="font-mono text-[10px] text-gray-400 cursor-pointer hover:text-brand-gold transition-colors select-all"
        title="Parent Login ID — tap to copy"
        onClick={(e) => {
          e.stopPropagation();
          if (sub.parentLoginId) navigator.clipboard?.writeText(sub.parentLoginId);
        }}
      >
        {sub.parentLoginId || '—'}
      </span>
      {sub.parentLoginId && <span className="text-gray-600 font-sans text-[9px]">(copy)</span>}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="border-b border-brand-border pb-4 flex items-start justify-between gap-3 flex-col sm:flex-row">
        <div>
          <h2 className="font-sans text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-gold" />
            Subscription Registry
          </h2>
          <p className="font-sans text-xs text-gray-400 mt-1">
            Active student tuition tiers and billing contracts.
          </p>
        </div>
        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-wider shrink-0">
          {filtered.length} of {subscriptions.length} contracts
        </p>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-brand-surface-card border border-brand-border rounded-xs p-3.5">
          <div className="flex items-center gap-2 text-gray-400 font-sans text-[10px] uppercase tracking-wider">
            <Users className="h-3.5 w-3.5 text-brand-gold" /> Active
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-white">{stats.activeCount}</p>
        </div>
        <div className="bg-brand-surface-card border border-brand-border rounded-xs p-3.5">
          <div className="flex items-center gap-2 text-gray-400 font-sans text-[10px] uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-gold" /> Premium Active
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-white">{stats.premiumActive}</p>
        </div>
        <div className="bg-brand-surface-card border border-brand-border rounded-xs p-3.5">
          <div className="flex items-center gap-2 text-gray-400 font-sans text-[10px] uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5 text-brand-amethyst" /> Paused
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-white">{stats.paused}</p>
        </div>
        <div className="bg-brand-surface-card border border-brand-border rounded-xs p-3.5">
          <div className="flex items-center gap-2 text-gray-400 font-sans text-[10px] uppercase tracking-wider">
            <XCircle className="h-3.5 w-3.5 text-brand-cinnabar" /> Canceled
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-white">{stats.canceled}</p>
        </div>
        <div className="bg-brand-charcoal/60 border border-brand-border rounded-xs p-3.5 col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 text-gray-400 font-sans text-[10px] uppercase tracking-wider">
            <IndianRupee className="h-3.5 w-3.5 text-brand-gold" /> Monthly Billing
          </div>
          <p className="mt-1 font-mono text-xl font-bold text-brand-gold">
            ₹{stats.monthlyBilling.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filtering & search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search athlete, parent, course, or subscription ID..."
            className="w-full rounded-xs border border-brand-border bg-brand-bg py-2.5 pl-9 pr-3 font-sans text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['All', 'Premium', 'Standard'] as const).map(tier => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-xs border transition-all cursor-pointer ${
                tierFilter === tier
                  ? 'bg-brand-gold text-black border-brand-gold font-bold'
                  : 'bg-brand-surface-card text-gray-400 border-brand-border hover:text-white hover:border-gray-700'
              }`}
            >
              {tier === 'All' ? 'All Tiers' : tier}
            </button>
          ))}
          <span className="w-px h-6 bg-brand-border hidden lg:block" />
          {(['All', 'Active', 'Paused', 'Canceled'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-xs border transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-brand-blue text-black border-brand-blue font-bold'
                  : 'bg-brand-surface-card text-gray-400 border-brand-border hover:text-white hover:border-gray-700'
              }`}
            >
              {st === 'All' ? 'All Status' : st}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-brand-surface-card border border-brand-border rounded-xs p-8 text-center space-y-2">
          <p className="font-sans text-sm text-gray-300">No subscriptions match the active filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="font-mono text-[10px] uppercase tracking-wider text-brand-gold hover:text-brand-gold-bright underline underline-offset-2"
          >
            Clear active filters
          </button>
        </div>
      ) : isMobileMode ? (
        <div className="space-y-2.5">
          {filtered.map(sub => (
            <div
              key={sub.id}
              onClick={() => onSelectSubscription(sub)}
              className="bg-brand-surface-card border border-brand-border rounded-xs p-3.5 space-y-2.5 cursor-pointer hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-sans font-semibold text-white text-sm flex items-center gap-1">
                    <span className="truncate">{sub.studentName}</span>
                    <ArrowUpRight className="h-3 w-3 text-brand-gold shrink-0" />
                  </p>
                  <p className="font-sans text-[11px] text-gray-400 truncate">{sub.courseName}</p>
                  <p className="font-mono text-[10px] text-gray-500 mt-0.5">{sub.id}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wide font-semibold shrink-0 ${tierBadge(sub.tier)}`}>
                  {sub.tier}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-brand-border pt-2.5">
                <div className="space-y-1">
                  {sub.status === 'Active' && (
                    <ParentLogin sub={sub} />
                  )}
                  <p className="font-mono text-[11px] text-brand-gold">₹{sub.monthlyFee}/mo</p>
                </div>
                <StatusToggle sub={sub} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-surface-card border border-brand-border rounded-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-brand-charcoal/60 border-b border-brand-border">
                  <th className="py-2.5 px-4 text-left font-mono text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
                    Student
                  </th>
                  <th className="py-2.5 px-4 text-left font-mono text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
                    Course
                  </th>
                  <th className="py-2.5 px-4 text-center font-mono text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
                    Tier
                  </th>
                  <th className="py-2.5 px-4 text-center font-mono text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
                    Fee
                  </th>
                  <th className="py-2.5 px-4 text-center font-mono text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
                    Parent Login
                  </th>
                  <th className="py-2.5 px-4 text-center font-mono text-[9px] uppercase tracking-widest text-gray-400 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filtered.map(sub => (
                  <tr
                    key={sub.id}
                    onClick={() => onSelectSubscription(sub)}
                    className="hover:bg-brand-charcoal/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="font-sans font-semibold text-white text-sm truncate max-w-[160px]">
                          {sub.studentName}
                        </span>
                        <ArrowUpRight className="h-3 w-3 text-brand-gold opacity-60 group-hover:opacity-100 shrink-0" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-sans text-xs text-gray-400 truncate max-w-[200px]" title={sub.courseName}>
                        {sub.courseName}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wide font-semibold ${tierBadge(sub.tier)}`}>
                        {sub.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs text-brand-gold">
                      ₹{sub.monthlyFee}/mo
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sub.status === 'Active' ? <ParentLogin sub={sub} /> : <span className="font-mono text-[10px] text-gray-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusToggle sub={sub} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}