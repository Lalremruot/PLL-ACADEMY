'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import type {
  AttendanceStatus,
  StudentAttendanceRecord,
  Subscription,
  UserRole,
} from '../types';
import {
  apiFetchStudentAttendance,
  apiFetchStudentAttendanceRange,
  apiSaveStudentAttendance,
} from '../services/apiClient';
import {
  formatDateKey,
  formatDisplayDate,
  getMonthCalendarCells,
  getMonthDateKeys,
  getMonthLabel,
  getWeekDateKeys,
  getWeekdayShort,
  shiftDateKey,
  shiftMonthKey,
} from '../utils/attendance-dates';
import { downloadStudentAttendancePdf } from '../utils/attendance-pdf';
import DateField from './DateField';

interface StudentAttendanceProps {
  subscriptions: Subscription[];
  batches: string[];
  markedByEmail: string;
  markedByRole: Extract<UserRole, 'admin' | 'manager'>;
  canEdit: boolean;
}

type AttendanceView = 'day' | 'week' | 'month' | 'calendar';

interface DraftRow {
  studentId: string;
  studentName: string;
  batch: string;
  status: AttendanceStatus;
  notes: string;
  existingId?: string;
}

const STATUS_OPTIONS: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'Excused'];

const STATUS_CELL_CLASS: Record<AttendanceStatus | 'None', string> = {
  Present: 'bg-brand-emerald/20 text-brand-emerald border-brand-emerald/40',
  Late: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  Absent: 'bg-brand-cinnabar/20 text-brand-cinnabar border-brand-cinnabar/40',
  Excused: 'bg-brand-amethyst/20 text-brand-amethyst border-brand-amethyst/40',
  None: 'bg-brand-charcoal text-gray-600 border-brand-border',
};

const STATUS_LETTER: Record<AttendanceStatus, string> = {
  Present: 'P',
  Late: 'L',
  Absent: 'A',
  Excused: 'E',
};

/**
 * Student attendance with day marking, weekly/monthly matrices, personal calendar, and PDF export.
 */
export default function StudentAttendance({
  subscriptions,
  batches,
  markedByEmail,
  markedByRole,
  canEdit,
}: StudentAttendanceProps) {
  const today = formatDateKey(new Date());
  const [view, setView] = useState<AttendanceView>('day');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [calendarStudentId, setCalendarStudentId] = useState<string>('');
  const [monthAnchor, setMonthAnchor] = useState<string>(`${today.slice(0, 7)}-01`);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [rangeRecords, setRangeRecords] = useState<StudentAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [exportFrom, setExportFrom] = useState<string>(shiftDateKey(today, -30));
  const [exportTo, setExportTo] = useState<string>(today);

  const activeSubs = useMemo(() => {
    return subscriptions.filter((sub) => {
      if (sub.status !== 'Active') {
        return false;
      }
      if (selectedBatch !== 'all' && (sub.batch || 'Unassigned') !== selectedBatch) {
        return false;
      }
      return true;
    });
  }, [subscriptions, selectedBatch]);

  useEffect(() => {
    if (!calendarStudentId && activeSubs.length > 0) {
      setCalendarStudentId(activeSubs[0].id);
    }
  }, [activeSubs, calendarStudentId]);

  const weekKeys = useMemo(() => getWeekDateKeys(selectedDate), [selectedDate]);
  const monthKeys = useMemo(() => getMonthDateKeys(monthAnchor), [monthAnchor]);
  const calendarCells = useMemo(() => getMonthCalendarCells(monthAnchor), [monthAnchor]);

  const loadDayRoster = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const batchFilter = selectedBatch === 'all' ? undefined : selectedBatch;
      const records = await apiFetchStudentAttendance(selectedDate, batchFilter);
      const nextRows: DraftRow[] = activeSubs.map((sub) => {
        const existing = records.find((record) => record.studentId === sub.id);
        return {
          studentId: sub.id,
          studentName: sub.studentName,
          batch: sub.batch || 'Unassigned',
          status: existing?.status || 'Present',
          notes: existing?.notes || '',
          existingId: existing?.id,
        };
      });
      setRows(nextRows);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load attendance';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRange = async (from: string, to: string, studentId?: string): Promise<void> => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const records = await apiFetchStudentAttendanceRange({
        from,
        to,
        batch: selectedBatch === 'all' ? undefined : selectedBatch,
        studentId,
      });
      setRangeRecords(records);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load attendance range';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'day') {
      loadDayRoster();
      return;
    }
    if (view === 'week') {
      loadRange(weekKeys[0], weekKeys[6]);
      return;
    }
    if (view === 'month') {
      loadRange(monthKeys[0], monthKeys[monthKeys.length - 1]);
      return;
    }
    if (view === 'calendar' && calendarStudentId) {
      loadRange(monthKeys[0], monthKeys[monthKeys.length - 1], calendarStudentId);
    }
  }, [view, selectedDate, selectedBatch, monthAnchor, calendarStudentId, activeSubs]);

  const findStatus = (studentId: string, date: string): AttendanceStatus | null => {
    const match = rangeRecords.find((r) => r.studentId === studentId && r.date === date);
    return match?.status || null;
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus): void => {
    setRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, status } : row))
    );
  };

  const handleNotesChange = (studentId: string, notes: string): void => {
    setRows((prev) =>
      prev.map((row) => (row.studentId === studentId ? { ...row, notes } : row))
    );
  };

  const handleMarkAllPresent = (): void => {
    setRows((prev) => prev.map((row) => ({ ...row, status: 'Present' })));
  };

  const handleSave = async (): Promise<void> => {
    if (!canEdit) {
      setErrorMsg('You do not have permission to modify attendance.');
      return;
    }
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = rows.map((row) => ({
        id: row.existingId,
        studentId: row.studentId,
        studentName: row.studentName,
        batch: row.batch,
        date: selectedDate,
        status: row.status,
        markedBy: markedByEmail,
        markedByRole,
        notes: row.notes || undefined,
      }));
      const saved = await apiSaveStudentAttendance(payload);
      setRows((prev) =>
        prev.map((row) => {
          const match = saved.find((record) => record.studentId === row.studentId);
          return match
            ? { ...row, existingId: match.id, status: match.status, notes: match.notes || '' }
            : row;
        })
      );
      setSuccessMsg(`Saved attendance for ${saved.length} student(s).`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save attendance';
      setErrorMsg(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async (): Promise<void> => {
    if (exportFrom > exportTo) {
      setErrorMsg('Export "from" date must be on or before "to" date.');
      return;
    }
    setIsExporting(true);
    setErrorMsg('');
    try {
      const records = await apiFetchStudentAttendanceRange({
        from: exportFrom,
        to: exportTo,
        batch: selectedBatch === 'all' ? undefined : selectedBatch,
        studentId: view === 'calendar' ? calendarStudentId || undefined : undefined,
      });
      downloadStudentAttendancePdf({
        title: 'Student Attendance Report — Striker Academy',
        from: exportFrom,
        to: exportTo,
        records,
        batchFilter: selectedBatch === 'all' ? undefined : selectedBatch,
      });
      setSuccessMsg(`PDF downloaded (${records.length} records).`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export PDF';
      setErrorMsg(message);
    } finally {
      setIsExporting(false);
    }
  };

  const monthSummary = useMemo(() => {
    return activeSubs.map((sub) => {
      const studentRecords = rangeRecords.filter((r) => r.studentId === sub.id);
      return {
        studentId: sub.id,
        studentName: sub.studentName,
        batch: sub.batch || 'Unassigned',
        present: studentRecords.filter((r) => r.status === 'Present').length,
        late: studentRecords.filter((r) => r.status === 'Late').length,
        absent: studentRecords.filter((r) => r.status === 'Absent').length,
        excused: studentRecords.filter((r) => r.status === 'Excused').length,
        total: studentRecords.length,
      };
    });
  }, [activeSubs, rangeRecords]);

  const viewTabs: Array<{ id: AttendanceView; label: string }> = [
    { id: 'day', label: 'Day Mark' },
    { id: 'week', label: 'Weekly' },
    { id: 'month', label: 'Monthly' },
    { id: 'calendar', label: 'Calendar' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-brand-border/40 pb-4">
        <div>
          <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-brand-gold" />
            Student Attendance
          </h2>
          <p className="font-sans text-xs text-gray-400 mt-1">
            Mark daily presence, review weekly/monthly matrices, open personal calendars, and export PDF reports.
          </p>
        </div>
        <div className="flex bg-brand-charcoal border border-brand-border p-1 rounded-xs gap-1 self-start max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={`px-3 py-1.5 font-sans text-[10px] font-bold rounded-xs transition-all cursor-pointer ${
                view === tab.id ? 'bg-brand-gold text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        {(view === 'day' || view === 'week') && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">
              {view === 'week' ? 'Week Of' : 'Date'}
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDateKey(selectedDate, view === 'week' ? -7 : -1))}
                className="p-2 border border-brand-border rounded-xs text-gray-400 hover:text-white cursor-pointer"
                aria-label="Previous"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <DateField
                value={selectedDate}
                onChange={setSelectedDate}
                aria-label={view === 'week' ? 'Week of date' : 'Attendance date'}
              />
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDateKey(selectedDate, view === 'week' ? 7 : 1))}
                className="p-2 border border-brand-border rounded-xs text-gray-400 hover:text-white cursor-pointer"
                aria-label="Next"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {(view === 'month' || view === 'calendar') && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Month</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMonthAnchor(shiftMonthKey(monthAnchor, -1))}
                className="p-2 border border-brand-border rounded-xs text-gray-400 hover:text-white cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[140px] text-center font-sans text-xs font-bold text-white px-2">
                {getMonthLabel(monthAnchor)}
              </span>
              <button
                type="button"
                onClick={() => setMonthAnchor(shiftMonthKey(monthAnchor, 1))}
                className="p-2 border border-brand-border rounded-xs text-gray-400 hover:text-white cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Batch</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="bg-brand-charcoal border border-brand-border text-white text-xs p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold min-w-[180px]"
          >
            <option value="all">All Batches</option>
            {batches.map((batch) => (
              <option key={batch} value={batch}>
                {batch}
              </option>
            ))}
          </select>
        </div>

        {view === 'calendar' && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Student</label>
            <select
              value={calendarStudentId}
              onChange={(e) => setCalendarStudentId(e.target.value)}
              className="bg-brand-charcoal border border-brand-border text-white text-xs p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold min-w-[200px]"
            >
              {activeSubs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.studentName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500 pb-2">
          <Users className="h-3.5 w-3.5" />
          {activeSubs.length} active student(s)
        </div>
      </div>

      <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-4 flex flex-col md:flex-row md:items-end gap-3">
        <DateField
          label="PDF From"
          value={exportFrom}
          onChange={setExportFrom}
        />
        <DateField
          label="PDF To"
          value={exportTo}
          onChange={setExportTo}
        />
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting}
          className="px-4 py-2.5 text-xs font-bold bg-brand-gold text-black rounded-xs hover:bg-brand-gold-bright disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
        >
          {isExporting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download Consolidated PDF
        </button>
        {view === 'day' && canEdit && (
          <>
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="px-3 py-2.5 text-xs font-mono border border-brand-border rounded-xs text-gray-300 hover:text-white hover:border-brand-gold/40 cursor-pointer"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || rows.length === 0}
              className="px-4 py-2.5 text-xs font-bold border border-brand-gold/40 text-brand-gold rounded-xs hover:bg-brand-gold/10 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save Day
            </button>
          </>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 text-brand-cinnabar text-xs font-mono bg-brand-cinnabar/10 border border-brand-cinnabar/30 p-3 rounded-xs">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 text-brand-emerald text-xs font-mono bg-brand-emerald/10 border border-brand-emerald/30 p-3 rounded-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="bg-brand-surface-raised border border-brand-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-gray-400 text-xs font-mono">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading attendance...
          </div>
        ) : view === 'day' ? (
          rows.length === 0 ? (
            <div className="p-10 text-center text-gray-500 text-xs font-sans">
              No active students match this filter.
            </div>
          ) : (
            <div className="divide-y divide-brand-border/40 max-h-[520px] overflow-y-auto">
              {rows.map((row) => (
                <div
                  key={row.studentId}
                  className="p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between hover:bg-brand-border/10"
                >
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-bold text-white truncate">{row.studentName}</p>
                    <p className="font-mono text-[10px] text-gray-500">
                      {row.batch} · {row.studentId}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <select
                      value={row.status}
                      disabled={!canEdit}
                      onChange={(e) => handleStatusChange(row.studentId, e.target.value as AttendanceStatus)}
                      className="bg-brand-charcoal border border-brand-border text-white text-xs p-2 rounded-xs focus:outline-hidden focus:border-brand-gold disabled:opacity-50"
                      aria-label={`Attendance status for ${row.studentName}`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={row.notes}
                      disabled={!canEdit}
                      onChange={(e) => handleNotesChange(row.studentId, e.target.value)}
                      placeholder="Notes (optional)"
                      className="bg-brand-charcoal border border-brand-border text-white text-xs p-2 rounded-xs focus:outline-hidden focus:border-brand-gold disabled:opacity-50 min-w-[180px]"
                      aria-label={`Notes for ${row.studentName}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : view === 'week' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-brand-surface-hover border-b border-brand-border">
                <tr>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold">Student</th>
                  {weekKeys.map((key) => (
                    <th key={key} className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center">
                      <div>{getWeekdayShort(key)}</div>
                      <div className="font-mono text-gray-500 normal-case">{formatDisplayDate(key)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {activeSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-brand-border/10">
                    <td className="p-3">
                      <p className="font-sans text-xs font-bold text-white">{sub.studentName}</p>
                      <p className="font-mono text-[9px] text-gray-500">{sub.batch || 'Unassigned'}</p>
                    </td>
                    {weekKeys.map((key) => {
                      const status = findStatus(sub.id, key);
                      return (
                        <td key={key} className="p-2 text-center">
                          <span
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-xs border text-[10px] font-bold ${
                              STATUS_CELL_CLASS[status || 'None']
                            }`}
                            title={status || 'No record'}
                          >
                            {status ? STATUS_LETTER[status] : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {activeSubs.length === 0 && (
              <div className="p-10 text-center text-gray-500 text-xs">No students in this batch.</div>
            )}
          </div>
        ) : view === 'month' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[640px]">
              <thead className="bg-brand-surface-hover border-b border-brand-border">
                <tr>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold">Student</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-brand-emerald font-bold text-center">Present</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-yellow-400 font-bold text-center">Late</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-brand-cinnabar font-bold text-center">Absent</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-brand-amethyst font-bold text-center">Excused</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center">Marked Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {monthSummary.map((row) => (
                  <tr key={row.studentId} className="hover:bg-brand-border/10">
                    <td className="p-3">
                      <p className="font-sans text-xs font-bold text-white">{row.studentName}</p>
                      <p className="font-mono text-[9px] text-gray-500">{row.batch}</p>
                    </td>
                    <td className="p-3 text-center font-mono text-xs text-brand-emerald">{row.present}</td>
                    <td className="p-3 text-center font-mono text-xs text-yellow-400">{row.late}</td>
                    <td className="p-3 text-center font-mono text-xs text-brand-cinnabar">{row.absent}</td>
                    <td className="p-3 text-center font-mono text-xs text-brand-amethyst">{row.excused}</td>
                    <td className="p-3 text-center font-mono text-xs text-gray-300">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {monthSummary.length === 0 && (
              <div className="p-10 text-center text-gray-500 text-xs">No students in this batch.</div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CalendarDays className="h-4 w-4 text-brand-gold" />
              Personal calendar for{' '}
              <span className="text-white font-bold">
                {activeSubs.find((s) => s.id === calendarStudentId)?.studentName || '—'}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                <div key={label} className="text-center text-[10px] uppercase tracking-wider text-gray-500 font-bold py-1">
                  {label}
                </div>
              ))}
              {calendarCells.map((dateKey, index) => {
                if (!dateKey) {
                  return <div key={`empty-${index}`} className="aspect-square rounded-xs bg-transparent" />;
                }
                const status = findStatus(calendarStudentId, dateKey);
                const dayNum = Number(dateKey.slice(8));
                return (
                  <div
                    key={dateKey}
                    className={`aspect-square rounded-xs border p-1 flex flex-col items-center justify-center gap-0.5 ${
                      STATUS_CELL_CLASS[status || 'None']
                    }`}
                    title={status ? `${formatDisplayDate(dateKey)}: ${status}` : `${formatDisplayDate(dateKey)}: No record`}
                  >
                    <span className="font-mono text-[10px] opacity-80">{dayNum}</span>
                    <span className="text-[10px] font-bold">{status ? STATUS_LETTER[status] : '·'}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 text-[10px] font-mono text-gray-400">
              {STATUS_OPTIONS.map((status) => (
                <span key={status} className={`px-2 py-1 rounded-xs border ${STATUS_CELL_CLASS[status]}`}>
                  {STATUS_LETTER[status]} = {status}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
