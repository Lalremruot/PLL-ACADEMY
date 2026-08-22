'use client';

import React, { useId } from 'react';
import { Calendar } from 'lucide-react';
import { formatDisplayDate } from '../utils/attendance-dates';

interface DateFieldProps {
  value: string;
  onChange: (nextValue: string) => void;
  label?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

/**
 * Date picker that displays DD/MM/YYYY while keeping YYYY-MM-DD as the stored value.
 */
export default function DateField({
  value,
  onChange,
  label,
  id,
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}: DateFieldProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const displayValue = formatDisplayDate(value);

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative inline-flex w-full min-w-[148px]">
        <span
          className={`pointer-events-none absolute inset-y-0 left-0 right-8 z-10 flex items-center px-2.5 font-mono text-xs ${
            disabled ? 'text-gray-500' : 'text-white'
          }`}
          aria-hidden="true"
        >
          {displayValue}
        </span>
        <input
          id={inputId}
          type="date"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel || label || 'Select date'}
          className="date-field-input w-full bg-brand-charcoal border border-brand-border text-xs p-2.5 pr-8 rounded-xs focus:outline-hidden focus:border-brand-gold disabled:opacity-50 cursor-pointer [color-scheme:dark]"
        />
        <Calendar className="pointer-events-none absolute right-2.5 top-1/2 z-10 -translate-y-1/2 h-3.5 w-3.5 text-brand-gold" />
      </div>
    </div>
  );
}
