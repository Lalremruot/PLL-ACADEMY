'use client';

import React from 'react';

interface PlayerStatBarProps {
  label: string;
  value: number;
  max?: number;
  suffix?: string;
  highlight?: boolean;
}

export default function PlayerStatBar({
  label,
  value,
  max = 99,
  suffix = '',
  highlight = false,
}: PlayerStatBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">{label}</span>
        <span className={`font-mono text-xs font-bold ${highlight ? 'text-brand-gold' : 'text-white'}`}>
          {value}
          {suffix}
        </span>
      </div>
      <div className="h-1.5 bg-brand-charcoal rounded-full overflow-hidden border border-brand-border/30">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            highlight ? 'bg-brand-gold' : 'bg-brand-emerald'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
