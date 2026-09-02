'use client';

import React, { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import type { StudentAttendanceRecord, Subscription } from '../types';
import { apiFetchStudentAttendanceRange } from '../services/apiClient';
import { computeAttendanceRate } from '../utils/player-stats';
import { formatDisplayDate } from '../utils/attendance-dates';

interface AttendanceSummaryProps {
  subscription: Subscription;
  months?: number;
}

/**
 * Reusable student attendance summary: fetches the last N months of attendance
 * for a single student and shows the attendance rate plus Present/Late/Absent/
 * Excused breakdown. Used in the Parent Portal and the player profile.
 */
export default function AttendanceSummary({ subscription, months = 3 }: AttendanceSummaryProps) {
  const [records, setRecords] = useState<StudentAttendanceRecord[] | null>(null);

  useEffect(() => {
    let mounted = true;
    const to = new Date().toISOString().split('T')[0];
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - months);
    const from = fromDate.toISOString().split('T')[0];

    apiFetchStudentAttendanceRange({ from, to, studentId: subscription.id })
      .then((data) => {
        if (mounted) setRecords(data);
      })
      .catch(() => {
        if (mounted) setRecords([]);
      });

    return () => {
      mounted = false;
    };
  }, [subscription.id, months]);

  const attendance = computeAttendanceRate(records ?? []);
  const hasRecords = (records?.length ?? 0) > 0;

  return (
    <div className="bg-brand-surface-card border border-brand-border rounded-xs p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-sans text-sm font-bold text-white uppercase tracking-wider">
          <CalendarCheck className="h-4 w-4 text-brand-gold" />
          Training Attendance
        </h4>
        <span className="font-mono text-[9px] text-gray-500">Last {months} months</span>
      </div>

      {!hasRecords ? (
        <p className="font-sans text-xs text-gray-400">
          No attendance records recorded yet for {subscription.studentName}.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="#2D6A4F"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 34}
                  strokeDashoffset={2 * Math.PI * 34 * (1 - attendance.rate / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg font-extrabold text-brand-emerald leading-none">
                  {attendance.rate}%
                </span>
                <span className="font-mono text-[6px] uppercase text-gray-500 tracking-wider">Attend</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div>
                <p className="font-mono font-bold text-brand-emerald">{attendance.present}</p>
                <p className="text-[10px] text-gray-500">Present</p>
              </div>
              <div>
                <p className="font-mono font-bold text-yellow-500">{attendance.late}</p>
                <p className="text-[10px] text-gray-500">Late</p>
              </div>
              <div>
                <p className="font-mono font-bold text-brand-cinnabar">{attendance.absent}</p>
                <p className="text-[10px] text-gray-500">Absent</p>
              </div>
              <div>
                <p className="font-mono font-bold text-gray-400">{attendance.excused}</p>
                <p className="text-[10px] text-gray-500">Excused</p>
              </div>
            </div>
          </div>

          {records!.length <= 8 && (
            <div className="pt-3 border-t border-brand-border/40">
              <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500 mb-2">Recent Sessions</p>
              <ul className="space-y-1.5">
                {[...records!]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 5)
                  .map((r) => (
                    <li key={r.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-gray-400">{formatDisplayDate(r.date)}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase ${
                          r.status === 'Present'
                            ? 'bg-brand-emerald/15 text-brand-emerald'
                            : r.status === 'Late'
                              ? 'bg-yellow-500/15 text-yellow-500'
                              : r.status === 'Absent'
                                ? 'bg-brand-cinnabar/15 text-brand-cinnabar'
                                : 'bg-gray-500/15 text-gray-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}