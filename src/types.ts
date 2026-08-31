/**
 * Types and structures for Football Academy Ledger
 */

export type PaymentStatus = 'Success' | 'Failed' | 'Pending';

export type UserRole = 'admin' | 'manager' | 'parent';

export interface Invoice {
  id: string; // e.g., INV-4921-X
  studentName: string;
  parentName: string;
  parentEmail: string;
  amount: number;
  courseName: string;
  date: string;
  dueDate: string;
  status: PaymentStatus;
  transactionId?: string; // e.g., TXN-9201-B
  semester: string;
}

export type SubscriptionStatus = 'Active' | 'Paused' | 'Canceled';

export interface Subscription {
  id: string; // e.g. SUB-8291-K
  studentName: string;
  parentName: string;
  parentEmail: string;
  courseName: string;
  status: SubscriptionStatus;
  tier: 'Standard' | 'Premium';
  monthlyFee: number;
  nextBillingDate: string;
  batch?: string; // Student group/batch assignment
  age?: number;
  height?: number; // e.g. in cm
  weight?: number; // e.g. in kg
  aadhaar?: string; // e.g. Identity Card
  education?: string; // e.g. School name or Grade level
  familyDetails?: string; // e.g. Parent occupations or notes
  profilePic?: string; // e.g. Avatar image URL
  /** Unique passwordless login id for parents (e.g. Liam48291) */
  parentLoginId?: string;
  autoDebit?: boolean; // Recurring e-mandate authorized with Razorpay
  razorpayTokenId?: string; // Razorpay token backing the auto-debit mandate
  footballStats?: PlayerFootballStats;
}

export type PlayerPosition = 'ST' | 'LW' | 'RW' | 'CM' | 'CDM' | 'CB' | 'LB' | 'RB' | 'GK';

export interface PlayerAttributeRatings {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
}

export interface PlayerSeasonStats {
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
  passAccuracy: number;
  shotAccuracy: number;
  tacklesWon: number;
  interceptions: number;
  cleanSheets?: number;
  saves?: number;
}

export interface PlayerMatchRecord {
  date: string;
  opponent: string;
  competition: string;
  result: string;
  goals: number;
  assists: number;
  rating: number;
  minutes: number;
}

export interface PlayerMonthlyForm {
  month: string;
  rating: number;
  goals: number;
  assists: number;
}

export interface PlayerFootballStats {
  position: PlayerPosition;
  preferredFoot: 'Left' | 'Right' | 'Both';
  jerseyNumber: number;
  overallRating: number;
  attributes: PlayerAttributeRatings;
  season: PlayerSeasonStats;
  form: PlayerMonthlyForm[];
  recentMatches: PlayerMatchRecord[];
}

export interface FilmCourse {
  name: string;
  tier: 'Standard' | 'Premium';
  monthlyFee: number;
  instructor: string;
}

export const FILM_COURSES: FilmCourse[] = [];

export interface ManagerPermissions {
  canViewStudents: boolean;
  canManageStudents: boolean;
  canMarkStudentAttendance: boolean;
  canAccessReports: boolean;
  canManageInvoices: boolean;
  canManageBatches: boolean;
  canCheckInManagerAttendance: boolean;
}

export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermissions = {
  canViewStudents: true,
  canManageStudents: true,
  canMarkStudentAttendance: true,
  canAccessReports: false,
  canManageInvoices: false,
  canManageBatches: true,
  canCheckInManagerAttendance: true,
};

export interface AcademyLocationAndTiming {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  shiftStartTime: string; // HH:mm format e.g. "09:00"
  gracePeriodMinutes: number; // e.g. 15
  shiftEndTime: string; // HH:mm format e.g. "17:00"
  academyAddress: string;
}

export const DEFAULT_ACADEMY_SETTINGS: AcademyLocationAndTiming = {
  latitude: 28.6139,
  longitude: 77.2090,
  radiusMeters: 200,
  shiftStartTime: '09:00',
  gracePeriodMinutes: 15,
  shiftEndTime: '17:00',
  academyAddress: 'Metropolis Sports Arena, Main Ground Gate 1',
};

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'Excused';

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  batch: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string; // Email of marker
  markedByRole: 'admin' | 'manager';
  timestamp: string; // ISO string
  notes?: string;
}

export type ManagerCheckInStatus = 'On Time' | 'Late' | 'Absent';

export interface ManagerAttendanceRecord {
  id: string;
  managerEmail: string;
  managerName?: string;
  date: string; // YYYY-MM-DD
  checkInTime: string; // e.g. 09:12:05 AM
  checkOutTime?: string;
  status: ManagerCheckInStatus;
  latitude: number;
  longitude: number;
  distanceFromAcademyMeters: number;
  verifiedGPS: boolean;
  notes?: string;
}

/**
 * Calculates Haversine distance in meters between two GPS coordinates
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Evaluates whether manager check-in time is On Time or Late based on start time and grace period.
 */
export function evaluateManagerCheckInTime(
  checkInDateObj: Date,
  startTimeStr: string,
  gracePeriodMins: number
): 'On Time' | 'Late' {
  const [targetHour, targetMinute] = startTimeStr.split(':').map(Number);
  
  const targetTime = new Date(checkInDateObj);
  targetTime.setHours(targetHour, targetMinute, 0, 0);

  const graceEndTime = new Date(targetTime.getTime() + gracePeriodMins * 60 * 1000);

  if (checkInDateObj.getTime() <= graceEndTime.getTime()) {
    return 'On Time';
  }
  return 'Late';
}

/**
 * Whether a manager check-in is still allowed: only within shiftStart + grace period.
 */
export function isManagerCheckInWindowOpen(
  checkInDateObj: Date,
  startTimeStr: string,
  gracePeriodMins: number
): boolean {
  const [targetHour, targetMinute] = startTimeStr.split(':').map(Number);

  const targetTime = new Date(checkInDateObj);
  targetTime.setHours(targetHour, targetMinute, 0, 0);

  const graceEndTime = new Date(targetTime.getTime() + gracePeriodMins * 60 * 1000);

  return checkInDateObj.getTime() <= graceEndTime.getTime();
}

/**
 * Renders a local clock time like "3:30:12 PM" to minutes-of-day (0-1439).
 * Returns null when the string cannot be parsed.
 */
export function parseClockTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[4]?.toLowerCase();
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/**
 * Formats minutes-of-day back into an HH:mm clock label.
 */
export function minutesToClockLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

