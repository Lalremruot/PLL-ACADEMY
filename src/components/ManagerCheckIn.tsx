'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import type {
  AcademyLocationAndTiming,
  AcademyLocation,
  ManagerAttendanceRecord,
  ManagerCheckInStatus,
} from '../types';
import {
  calculateHaversineDistance,
  evaluateManagerCheckInTime,
  isManagerCheckInWindowOpen,
  minutesToClockLabel,
  parseClockTimeToMinutes,
} from '../types';
import {
  apiFetchManagerAttendance,
  apiManagerCheckIn,
  apiManagerCheckOut,
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
import { downloadManagerAttendancePdf } from '../utils/attendance-pdf';
import DateField from './DateField';

interface ManagerCheckInProps {
  managerEmail: string;
  academySettings: AcademyLocationAndTiming;
  canCheckIn: boolean;
  isAdminView?: boolean;
  /** Registry of named check-in locations the admin manages. */
  locations?: AcademyLocation[];
  /** The id of the location this manager is assigned to check in at. */
  assignedLocationId?: string;
}

interface GeoPosition {
  latitude: number;
  longitude: number;
}

type ManagerView = 'today' | 'week' | 'month' | 'calendar';

const STATUS_CELL_CLASS: Record<ManagerCheckInStatus | 'None', string> = {
  'On Time': 'bg-brand-emerald/25 border-brand-emerald/50 text-emerald-300',
  Late: 'bg-yellow-500/25 border-yellow-400/50 text-yellow-200',
  Absent: 'bg-brand-cinnabar/25 border-brand-cinnabar/50 text-red-300',
  None: 'bg-brand-surface-raised border-brand-border text-gray-500',
};

const STATUS_BADGE_CLASS: Record<ManagerCheckInStatus, string> = {
  'On Time': 'text-emerald-200',
  Late: 'text-yellow-100',
  Absent: 'text-red-200',
};

const STATUS_LETTER: Record<ManagerCheckInStatus, string> = {
  'On Time': 'OT',
  Late: 'L',
  Absent: 'A',
};

/**
 * GPS-aware manager check-in plus weekly/monthly/calendar history and PDF export.
 */
export default function ManagerCheckIn({
  managerEmail,
  academySettings,
  canCheckIn,
  isAdminView = false,
  locations = [],
  assignedLocationId,
}: ManagerCheckInProps) {
  const today = formatDateKey(new Date());
  const assignedLocation = useMemo(
    () => locations.find((loc) => loc.id === assignedLocationId) || null,
    [locations, assignedLocationId]
  );

  // Geofence + shift for the manager's own check-in: the assigned location wins,
  // falling back to the single global academy settings when unassigned.
  const geofence = useMemo(
    () =>
      assignedLocation
        ? {
            latitude: assignedLocation.latitude,
            longitude: assignedLocation.longitude,
            radiusMeters: assignedLocation.radiusMeters,
            address: assignedLocation.address,
            shiftStartTime: assignedLocation.shiftStartTime,
            shiftEndTime: assignedLocation.shiftEndTime,
            gracePeriodMinutes: assignedLocation.gracePeriodMinutes,
          }
        : {
            latitude: academySettings.latitude,
            longitude: academySettings.longitude,
            radiusMeters: academySettings.radiusMeters,
            address: academySettings.academyAddress,
            shiftStartTime: academySettings.shiftStartTime,
            shiftEndTime: academySettings.shiftEndTime,
            gracePeriodMinutes: academySettings.gracePeriodMinutes,
          },
    [assignedLocation, academySettings]
  );

  const checkInWindowOpen = isManagerCheckInWindowOpen(
    new Date(),
    geofence.shiftStartTime,
    geofence.gracePeriodMinutes
  );
  const [view, setView] = useState<ManagerView>(isAdminView ? 'month' : 'today');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [monthAnchor, setMonthAnchor] = useState<string>(`${today.slice(0, 7)}-01`);
  const [calendarManager, setCalendarManager] = useState<string>(managerEmail);
  const [todayRecord, setTodayRecord] = useState<ManagerAttendanceRecord | null>(null);
  const [rangeRecords, setRangeRecords] = useState<ManagerAttendanceRecord[]>([]);
  const [managerEmails, setManagerEmails] = useState<string[]>([managerEmail]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [lastDistance, setLastDistance] = useState<number | null>(null);
  const [exportFrom, setExportFrom] = useState<string>(shiftDateKey(today, -30));
  const [exportTo, setExportTo] = useState<string>(today);

  const weekKeys = useMemo(() => getWeekDateKeys(selectedDate), [selectedDate]);
  const monthKeys = useMemo(() => getMonthDateKeys(monthAnchor), [monthAnchor]);
  const calendarCells = useMemo(() => getMonthCalendarCells(monthAnchor), [monthAnchor]);

  const loadData = async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      if (view === 'today' && !isAdminView) {
        const [todayRows, recent] = await Promise.all([
          apiFetchManagerAttendance({ managerEmail, date: today }),
          apiFetchManagerAttendance({
            managerEmail,
            from: shiftDateKey(today, -14),
            to: today,
          }),
        ]);
        setTodayRecord(todayRows[0] || null);
        setRangeRecords(recent);
        return;
      }
      if (view === 'week') {
        const records = await apiFetchManagerAttendance({
          managerEmail: isAdminView ? undefined : managerEmail,
          from: weekKeys[0],
          to: weekKeys[6],
        });
        setRangeRecords(records);
        const emails = Array.from(new Set(records.map((r) => r.managerEmail)));
        if (emails.length > 0) {
          setManagerEmails(emails);
        } else if (!isAdminView) {
          setManagerEmails([managerEmail]);
        }
        return;
      }
      if (view === 'month' || view === 'calendar') {
        const records = await apiFetchManagerAttendance({
          managerEmail:
            view === 'calendar'
              ? calendarManager
              : isAdminView
                ? undefined
                : managerEmail,
          from: monthKeys[0],
          to: monthKeys[monthKeys.length - 1],
        });
        setRangeRecords(records);
        if (isAdminView && view === 'month') {
          const emails = Array.from(new Set(records.map((r) => r.managerEmail)));
          setManagerEmails(emails.length > 0 ? emails : [managerEmail]);
        }
        if (isAdminView) {
          const all = await apiFetchManagerAttendance({
            from: monthKeys[0],
            to: monthKeys[monthKeys.length - 1],
          });
          const emails = Array.from(new Set(all.map((r) => r.managerEmail)));
          if (emails.length > 0) {
            setManagerEmails(emails);
            if (!emails.includes(calendarManager)) {
              setCalendarManager(emails[0]);
            }
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load manager attendance';
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [view, selectedDate, monthAnchor, calendarManager, managerEmail, isAdminView, today]);

  const findRecord = (email: string, date: string): ManagerAttendanceRecord | undefined => {
    return rangeRecords.find((r) => r.managerEmail === email && r.date === date);
  };

  const readDevicePosition = (): Promise<GeoPosition> => {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation is not available in this browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('Location permission denied. Enable GPS access and try again.'));
            return;
          }
          reject(new Error('Unable to read device location. Ensure GPS is enabled (HTTPS required).'));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const validateProximity = async (): Promise<{
    position: GeoPosition;
    distance: number;
    verifiedGPS: boolean;
  }> => {
    const position = await readDevicePosition();
    const distance = calculateHaversineDistance(
      position.latitude,
      position.longitude,
      geofence.latitude,
      geofence.longitude
    );
    setLastDistance(distance);
    const verifiedGPS = distance <= geofence.radiusMeters;
    if (!verifiedGPS) {
      throw new Error(
        `You are ${distance}m from the check-in location (allowed radius: ${geofence.radiusMeters}m). Move closer to check in.`
      );
    }
    return { position, distance, verifiedGPS };
  };

  const formatClockTime = (dateObj: Date): string => {
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const handleCheckIn = async (): Promise<void> => {
    if (!canCheckIn) {
      setErrorMsg('You do not have permission to check in.');
      return;
    }
    setIsWorking(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { position, distance, verifiedGPS } = await validateProximity();
      const now = new Date();
      const status = evaluateManagerCheckInTime(
        now,
        geofence.shiftStartTime,
        geofence.gracePeriodMinutes
      );
      if (status === 'Late') {
        const cutoffMinutes =
          (parseClockTimeToMinutes(geofence.shiftStartTime) ?? 0) +
          geofence.gracePeriodMinutes;
        throw new Error(
          `Check-in window closed. Check-ins are allowed until ${minutesToClockLabel(cutoffMinutes)} (${geofence.gracePeriodMinutes} min past ${geofence.shiftStartTime}). Late attendance cannot be saved.`
        );
      }
      const record = await apiManagerCheckIn({
        managerEmail,
        date: today,
        checkInTime: formatClockTime(now),
        status,
        latitude: position.latitude,
        longitude: position.longitude,
        distanceFromAcademyMeters: distance,
        verifiedGPS,
      });
      setTodayRecord(record);
      setSuccessMsg(`Checked in ${status.toLowerCase()} at ${record.checkInTime}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Check-in failed';
      setErrorMsg(message);
    } finally {
      setIsWorking(false);
    }
  };

  const handleCheckOut = async (): Promise<void> => {
    if (!canCheckIn || !todayRecord) {
      return;
    }
    setIsWorking(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { position, distance, verifiedGPS } = await validateProximity();
      const now = new Date();
      const record = await apiManagerCheckOut({
        managerEmail,
        date: today,
        checkOutTime: formatClockTime(now),
        latitude: position.latitude,
        longitude: position.longitude,
        distanceFromAcademyMeters: distance,
        verifiedGPS,
      });
      setTodayRecord(record);
      setSuccessMsg(`Checked out at ${record.checkOutTime}.`);
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Check-out failed';
      setErrorMsg(message);
    } finally {
      setIsWorking(false);
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
      const records = await apiFetchManagerAttendance({
        managerEmail: isAdminView
          ? view === 'calendar'
            ? calendarManager
            : undefined
          : managerEmail,
        from: exportFrom,
        to: exportTo,
      });
      downloadManagerAttendancePdf({
        title: isAdminView
          ? 'Manager Attendance Report — Striker Academy'
          : `Manager Attendance — ${managerEmail}`,
        from: exportFrom,
        to: exportTo,
        records,
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
    const emails = isAdminView ? managerEmails : [managerEmail];
    return emails.map((email) => {
      const rows = rangeRecords.filter((r) => r.managerEmail === email);
      return {
        email,
        onTime: rows.filter((r) => r.status === 'On Time').length,
        late: rows.filter((r) => r.status === 'Late').length,
        total: rows.length,
      };
    });
  }, [rangeRecords, managerEmails, managerEmail, isAdminView]);

  const viewTabs: Array<{ id: ManagerView; label: string }> = isAdminView
    ? [
        { id: 'week', label: 'Weekly' },
        { id: 'month', label: 'Monthly' },
        { id: 'calendar', label: 'Calendar' },
      ]
    : [
        { id: 'today', label: 'Check-In' },
        { id: 'week', label: 'Weekly' },
        { id: 'month', label: 'Monthly' },
        { id: 'calendar', label: 'Calendar' },
      ];

  const matrixEmails = isAdminView ? managerEmails : [managerEmail];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-brand-border/40 pb-4">
        <div>
          <h2 className="font-sans text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="h-5 w-5 text-brand-gold" />
            {isAdminView ? 'Manager Attendance Log' : 'Manager GPS Check-In'}
          </h2>
          <p className="font-sans text-xs text-gray-400 mt-1">
            {isAdminView
              ? 'Weekly and monthly manager attendance with personal calendars and PDF export.'
              : `Check in within ${geofence.radiusMeters}m of ${geofence.address}. Review history and export reports.`}
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
        {view === 'week' && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Week Of</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDateKey(selectedDate, -7))}
                className="p-2 border border-brand-border rounded-xs text-gray-400 hover:text-white cursor-pointer"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <DateField
                value={selectedDate}
                onChange={setSelectedDate}
                aria-label="Week of date"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDateKey(selectedDate, 7))}
                className="p-2 border border-brand-border rounded-xs text-gray-400 hover:text-white cursor-pointer"
                aria-label="Next week"
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

        {view === 'calendar' && isAdminView && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Manager</label>
            <select
              value={calendarManager}
              onChange={(e) => setCalendarManager(e.target.value)}
              className="bg-brand-charcoal border border-brand-border text-white text-xs p-2.5 rounded-xs focus:outline-hidden focus:border-brand-gold min-w-[220px]"
            >
              {managerEmails.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </div>
        )}
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

      {view === 'today' && !isAdminView && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-wider mb-2">
                <MapPin className="h-3.5 w-3.5" />
                Academy Pin
              </div>
              <p className="font-mono text-[11px] text-gray-300">
                {geofence.latitude.toFixed(5)}, {geofence.longitude.toFixed(5)}
              </p>
              <p className="font-sans text-[10px] text-gray-500 mt-1">{geofence.address}</p>
            </div>
            <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-wider mb-2">
                <Clock className="h-3.5 w-3.5" />
                Shift Window
              </div>
              <p className="font-mono text-[11px] text-gray-300">
                {geofence.shiftStartTime} – {geofence.shiftEndTime}
              </p>
              <p className="font-sans text-[10px] text-gray-500 mt-1">
                Grace period: {geofence.gracePeriodMinutes} minutes
              </p>
            </div>
            <div className="bg-brand-surface-raised border border-brand-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-wider mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Today
              </div>
              {isLoading ? (
                <p className="text-xs text-gray-500 font-mono">Loading...</p>
              ) : todayRecord ? (
                <div className="space-y-1">
                  <p className="font-sans text-sm font-bold text-white">{todayRecord.status}</p>
                  <p className="font-mono text-[10px] text-gray-400">
                    In {todayRecord.checkInTime}
                    {todayRecord.checkOutTime ? ` · Out ${todayRecord.checkOutTime}` : ''}
                  </p>
                  <p className="font-mono text-[10px] text-gray-500">
                    Distance {todayRecord.distanceFromAcademyMeters}m · GPS verified
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 font-sans">No check-in yet today.</p>
              )}
            </div>
          </div>

          {lastDistance !== null && (
            <p className="font-mono text-[10px] text-gray-500">
              Last measured distance from academy: {lastDistance}m
            </p>
          )}

          {canCheckIn && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={isWorking || Boolean(todayRecord) || !checkInWindowOpen}
                className="px-4 py-2.5 text-xs font-bold bg-brand-gold text-black rounded-xs hover:bg-brand-gold-bright disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isWorking ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
                {todayRecord ? 'Already Checked In' : 'GPS Check In'}
              </button>
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={isWorking || !todayRecord || Boolean(todayRecord?.checkOutTime)}
                className="px-4 py-2.5 text-xs font-bold border border-brand-border text-gray-200 rounded-xs hover:border-brand-gold/40 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                {todayRecord?.checkOutTime ? 'Already Checked Out' : 'GPS Check Out'}
              </button>
            </div>
          )}

          {canCheckIn && !todayRecord && !checkInWindowOpen && (
            <div className="flex items-center gap-2 text-brand-cinnabar text-xs font-mono bg-brand-cinnabar/10 border border-brand-cinnabar/30 p-3 rounded-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              The check-in window has closed (grace period ended at{' '}
              {minutesToClockLabel(
                (parseClockTimeToMinutes(geofence.shiftStartTime) ?? 0) +
                  geofence.gracePeriodMinutes
              )}
              ). Late attendance cannot be saved.
            </div>
          )}
        </>
      )}

      <div className="bg-brand-surface-raised border border-brand-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-400 text-xs font-mono">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : view === 'today' ? (
          <div className="divide-y divide-brand-border/40 max-h-[360px] overflow-y-auto">
            <div className="p-4 border-b border-brand-border bg-brand-surface-hover">
              <span className="font-sans text-xs font-bold text-gray-300 uppercase tracking-wider">
                Recent Check-Ins (14 days)
              </span>
            </div>
            {rangeRecords.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-xs">No attendance records yet.</div>
            ) : (
              rangeRecords.map((record) => (
                <div key={record.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="font-sans text-xs font-bold text-white">{formatDisplayDate(record.date)}</p>
                    <p className="font-mono text-[10px] text-gray-500">
                      In {record.checkInTime}
                      {record.checkOutTime ? ` · Out ${record.checkOutTime}` : ''}
                      {' · '}
                      {record.distanceFromAcademyMeters}m
                    </p>
                  </div>
                  <span className={`self-start text-[10px] font-bold px-2 py-1 rounded-xs border ${STATUS_CELL_CLASS[record.status]}`}>
                    {record.status}
                  </span>
                </div>
              ))
            )}
          </div>
        ) : view === 'week' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-brand-surface-hover border-b border-brand-border">
                <tr>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold">Manager</th>
                  {weekKeys.map((key) => (
                    <th key={key} className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center">
                      <div>{getWeekdayShort(key)}</div>
                      <div className="font-mono text-gray-500 normal-case">{formatDisplayDate(key)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {matrixEmails.map((email) => (
                  <tr key={email} className="hover:bg-brand-border/10">
                    <td className="p-3 font-mono text-[11px] text-white">{email}</td>
                    {weekKeys.map((key) => {
                      const record = findRecord(email, key);
                      return (
                        <td key={key} className="p-2 text-center">
                          <span
                            className={`inline-flex h-8 min-w-8 px-1 items-center justify-center rounded-xs border text-[9px] font-bold ${
                              STATUS_CELL_CLASS[record?.status || 'None']
                            }`}
                            title={
                              record
                                ? `${record.status} · In ${record.checkInTime}`
                                : 'No record'
                            }
                          >
                            {record ? STATUS_LETTER[record.status] : '—'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {matrixEmails.length === 0 && (
              <div className="p-10 text-center text-gray-500 text-xs">No manager records this week.</div>
            )}
          </div>
        ) : view === 'month' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[560px]">
              <thead className="bg-brand-surface-hover border-b border-brand-border">
                <tr>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold">Manager</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-brand-emerald font-bold text-center">On Time</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-yellow-400 font-bold text-center">Late</th>
                  <th className="p-3 text-[10px] uppercase tracking-wider text-gray-400 font-bold text-center">Check-Ins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {monthSummary.map((row) => (
                  <tr key={row.email} className="hover:bg-brand-border/10">
                    <td className="p-3 font-mono text-[11px] text-white">{row.email}</td>
                    <td className="p-3 text-center font-mono text-xs text-brand-emerald">{row.onTime}</td>
                    <td className="p-3 text-center font-mono text-xs text-yellow-400">{row.late}</td>
                    <td className="p-3 text-center font-mono text-xs text-gray-300">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {monthSummary.length === 0 && (
              <div className="p-10 text-center text-gray-500 text-xs">No manager records this month.</div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CalendarDays className="h-4 w-4 text-brand-gold" />
              Personal calendar for{' '}
              <span className="text-white font-bold">
                {isAdminView ? calendarManager : managerEmail}
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
                  return <div key={`empty-${index}`} className="min-h-[88px] rounded-xs bg-transparent" />;
                }
                const email = isAdminView ? calendarManager : managerEmail;
                const record = findRecord(email, dateKey);
                const dayNum = Number(dateKey.slice(8));
                return (
                  <div
                    key={dateKey}
                    className={`min-h-[88px] rounded-xs border p-1.5 flex flex-col items-center justify-start gap-1 ${
                      STATUS_CELL_CLASS[record?.status || 'None']
                    }`}
                    title={
                      record
                        ? `${formatDisplayDate(dateKey)}: ${record.status} · In ${record.checkInTime}${
                            record.checkOutTime ? ` · Out ${record.checkOutTime}` : ''
                          }`
                        : `${formatDisplayDate(dateKey)}: No record`
                    }
                  >
                    <span className="font-mono text-[10px] text-white/80 self-start">{dayNum}</span>
                    {record ? (
                      <>
                        <span
                          className={`text-[10px] font-bold leading-tight ${STATUS_BADGE_CLASS[record.status]}`}
                        >
                          {STATUS_LETTER[record.status]}
                        </span>
                        <span className="font-mono text-[9px] leading-tight text-center text-white px-0.5 font-medium">
                          In {record.checkInTime}
                        </span>
                        {record.checkOutTime && (
                          <span className="font-mono text-[9px] leading-tight text-center text-white/85 px-0.5">
                            Out {record.checkOutTime}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] font-bold mt-2 text-gray-500">·</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
