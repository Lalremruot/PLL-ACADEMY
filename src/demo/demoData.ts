import {
  AcademyLocation,
  AcademyLocationAndTiming,
  FilmCourse,
  Invoice,
  ManagerAttendanceRecord,
  ManagerPermissions,
  PlayerFootballStats,
  PlayerMonthlyForm,
  PlayerPosition,
  StudentAttendanceRecord,
  Subscription,
} from '../types';

/**
 * A fictional academy used by the production demo login.
 *
 * Every name, number and location here is invented. Nothing in this file is
 * derived from, or ever sent to, the real database — the demo session is
 * rejected by every API (lib/authGuard.ts) and this dataset is served straight
 * from the visitor's browser.
 *
 * The roster is written by hand; the bulky per-player statistics are generated
 * from a hash of the player's name so the data looks plausible, stays stable
 * across reloads, and does not need 8 hand-written stat blocks to maintain.
 */

export const DEMO_BATCHES = ['U12 Foundation', 'U15 Development', 'U18 Elite'] as const;

export const DEMO_COURSES: FilmCourse[] = [
  { name: 'U12 Foundation', tier: 'Standard', monthlyFee: 2200, instructor: 'Arjun Mehta' },
  { name: 'U15 Development', tier: 'Standard', monthlyFee: 2800, instructor: 'Nikhil Bose' },
  { name: 'U18 Elite', tier: 'Premium', monthlyFee: 4200, instructor: 'Vikram Rathore' },
  { name: 'Goalkeeping Lab', tier: 'Standard', monthlyFee: 2600, instructor: 'Arjun Mehta' },
  { name: 'Summer Performance Camp', tier: 'Premium', monthlyFee: 5400, instructor: 'Vikram Rathore' },
];

export const DEMO_ACADEMY_SETTINGS: AcademyLocationAndTiming = {
  latitude: 28.6139,
  longitude: 77.209,
  radiusMeters: 250,
  shiftStartTime: '08:45',
  gracePeriodMinutes: 15,
  shiftEndTime: '17:30',
  academyAddress: 'Demo Sports Arena, Plot 14, Riverside Ground, Sector 42',
};

export const DEMO_LOCATIONS: AcademyLocation[] = [
  {
    id: 'LOC-DEMO-1',
    name: 'Main Ground',
    address: 'Demo Sports Arena, Plot 14, Riverside Ground, Sector 42',
    latitude: 28.6139,
    longitude: 77.209,
    radiusMeters: 250,
    shiftStartTime: '08:45',
    shiftEndTime: '17:30',
    gracePeriodMinutes: 15,
  },
  {
    id: 'LOC-DEMO-2',
    name: 'Indoor Futsal Court',
    address: 'Demo Sports Arena, Plot 14, Block C, Sector 42',
    latitude: 28.6148,
    longitude: 77.2102,
    radiusMeters: 120,
    shiftStartTime: '09:00',
    shiftEndTime: '18:00',
    gracePeriodMinutes: 10,
  },
];

export const DEMO_MANAGER_PERMISSIONS: ManagerPermissions = {
  canViewStudents: true,
  canManageStudents: true,
  canMarkStudentAttendance: true,
  canAccessReports: true,
  canManageInvoices: false,
  canManageBatches: true,
  canCheckInManagerAttendance: true,
};

/** Maps the demo managers to the location they check in at. */
export const DEMO_MANAGER_ASSIGNMENTS: Record<string, string> = {
  'demo.manager@pll-demo.invalid': 'LOC-DEMO-1',
  'coaches.lead@pll-demo.invalid': 'LOC-DEMO-2',
};

/** Staff shown in the Settings > accounts table. Passwords are never returned. */
export const DEMO_STAFF_ACCOUNTS = [
  {
    email: 'demo.admin@pll-demo.invalid',
    role: 'admin' as const,
    name: 'Priya Raghavan (Demo Admin)',
    designation: 'Academy Director',
  },
  {
    email: 'demo.manager@pll-demo.invalid',
    role: 'manager' as const,
    name: 'Arjun Mehta (Demo Coach)',
    designation: 'Head Coach, U15 Development',
    assignedBatch: 'U15 Development',
    assignedLocationId: 'LOC-DEMO-1',
  },
  {
    email: 'coaches.lead@pll-demo.invalid',
    role: 'manager' as const,
    name: 'Nikhil Bose (Demo Coach)',
    designation: 'Goalkeeping Coach',
    assignedBatch: 'U12 Foundation',
    assignedLocationId: 'LOC-DEMO-2',
  },
];

interface DemoStudentSeed {
  id: string;
  studentName: string;
  parentName: string;
  parentEmail: string;
  phoneNumber: string;
  parentLoginId: string;
  courseName: string;
  tier: 'Standard' | 'Premium';
  batch: string;
  monthlyFee: number;
  status: Subscription['status'];
  position: PlayerPosition;
  jerseyNumber: number;
  preferredFoot: 'Left' | 'Right' | 'Both';
  age: number;
  height: number;
  weight: number;
  aadhaar: string;
  education: string;
  familyDetails: string;
  autoDebit: boolean;
}

const STUDENT_SEEDS: DemoStudentSeed[] = [
  {
    id: 'SUB-DEMO-1001',
    studentName: 'Aarav Sharma',
    parentName: 'Deepa Iyer',
    parentEmail: 'deepa.iyer@example.invalid',
    phoneNumber: '9810000101',
    // The published demo parent login id (app/api/auth/demo). Both sides read
    // this from their own defaults, so changing one means changing both.
    parentLoginId: 'child98765',
    courseName: 'U15 Development',
    tier: 'Standard',
    batch: 'U15 Development',
    monthlyFee: 2800,
    status: 'Active',
    position: 'CM',
    jerseyNumber: 8,
    preferredFoot: 'Right',
    age: 13,
    height: 158,
    weight: 52,
    aadhaar: 'XXXX-XXXX-1101',
    education: 'Grade 8, Riverside Public School',
    familyDetails: 'Mother works in banking; father travels for work.',
    autoDebit: true,
  },
  {
    id: 'SUB-DEMO-1002',
    studentName: 'Ishita Nair',
    parentName: 'Suresh Nair',
    parentEmail: 'suresh.nair@example.invalid',
    phoneNumber: '9810000102',
    parentLoginId: 'IshitaDemo02',
    courseName: 'U12 Foundation',
    tier: 'Standard',
    batch: 'U12 Foundation',
    monthlyFee: 2200,
    status: 'Active',
    position: 'GK',
    jerseyNumber: 1,
    preferredFoot: 'Right',
    age: 10,
    height: 142,
    weight: 34,
    aadhaar: 'XXXX-XXXX-1102',
    education: 'Grade 5, Sunrise Convent',
    familyDetails: 'Only child; parents both full-time.',
    autoDebit: false,
  },
  {
    id: 'SUB-DEMO-1003',
    studentName: 'Kabir Malhotra',
    parentName: 'Rohit Malhotra',
    parentEmail: 'rohit.malhotra@example.invalid',
    phoneNumber: '9810000103',
    parentLoginId: 'KabirDemo03',
    courseName: 'U18 Elite',
    tier: 'Premium',
    batch: 'U18 Elite',
    monthlyFee: 4200,
    status: 'Active',
    position: 'ST',
    jerseyNumber: 9,
    preferredFoot: 'Left',
    age: 17,
    height: 178,
    weight: 70,
    aadhaar: 'XXXX-XXXX-1103',
    education: 'Grade 12, Cathedral Senior School',
    familyDetails: 'Representing the state at U17; also trains with the school side.',
    autoDebit: true,
  },
  {
    id: 'SUB-DEMO-1004',
    studentName: 'Ananya Deshmukh',
    parentName: 'Meera Deshmukh',
    parentEmail: 'meera.deshmukh@example.invalid',
    phoneNumber: '9810000104',
    parentLoginId: 'AnanyaDemo04',
    courseName: 'U18 Elite',
    tier: 'Premium',
    batch: 'U18 Elite',
    monthlyFee: 4200,
    status: 'Active',
    position: 'CDM',
    jerseyNumber: 4,
    preferredFoot: 'Both',
    age: 16,
    height: 166,
    weight: 60,
    aadhaar: 'XXXX-XXXX-1104',
    education: 'Grade 11, Cathedral Senior School',
    familyDetails: 'Sister plays for the U15 side; family of five.',
    autoDebit: true,
  },
  {
    id: 'SUB-DEMO-1005',
    studentName: 'Vihaan Chawla',
    parentName: 'Pooja Chawla',
    parentEmail: 'pooja.chawla@example.invalid',
    phoneNumber: '9810000105',
    parentLoginId: 'VihaanDemo05',
    courseName: 'U15 Development',
    tier: 'Standard',
    batch: 'U15 Development',
    monthlyFee: 2800,
    status: 'Active',
    position: 'RW',
    jerseyNumber: 7,
    preferredFoot: 'Left',
    age: 14,
    height: 161,
    weight: 55,
    aadhaar: 'XXXX-XXXX-1105',
    education: 'Grade 9, Riverside Public School',
    familyDetails: 'Second of three brothers.',
    autoDebit: false,
  },
  {
    id: 'SUB-DEMO-1006',
    studentName: 'Saanvi Kapoor',
    parentName: 'Anil Kapoor',
    parentEmail: 'anil.kapoor@example.invalid',
    phoneNumber: '9810000106',
    parentLoginId: 'SaanviDemo06',
    courseName: 'Goalkeeping Lab',
    tier: 'Standard',
    batch: 'U15 Development',
    monthlyFee: 2600,
    status: 'Paused',
    position: 'GK',
    jerseyNumber: 12,
    preferredFoot: 'Right',
    age: 14,
    height: 168,
    weight: 58,
    aadhaar: 'XXXX-XXXX-1106',
    education: 'Grade 9, Hillcrest Academy',
    familyDetails: 'Paused for a term due to a knee injury; resuming next month.',
    autoDebit: false,
  },
  {
    id: 'SUB-DEMO-1007',
    studentName: 'Reyansh Gupta',
    parentName: 'Kavita Gupta',
    parentEmail: 'kavita.gupta@example.invalid',
    phoneNumber: '9810000107',
    parentLoginId: 'ReyanshDemo07',
    courseName: 'U12 Foundation',
    tier: 'Standard',
    batch: 'U12 Foundation',
    monthlyFee: 2200,
    status: 'Active',
    position: 'CB',
    jerseyNumber: 3,
    preferredFoot: 'Right',
    age: 11,
    height: 148,
    weight: 38,
    aadhaar: 'XXXX-XXXX-1107',
    education: 'Grade 6, Sunrise Convent',
    familyDetails: 'Youngest of two; older brother is a volunteer coach.',
    autoDebit: false,
  },
  {
    id: 'SUB-DEMO-1008',
    studentName: 'Zoya Rahman',
    parentName: 'Faisal Rahman',
    parentEmail: 'faisal.rahman@example.invalid',
    phoneNumber: '9810000108',
    parentLoginId: 'ZoyaDemo08',
    courseName: 'Summer Performance Camp',
    tier: 'Premium',
    batch: 'U18 Elite',
    monthlyFee: 5400,
    status: 'Active',
    position: 'LW',
    jerseyNumber: 11,
    preferredFoot: 'Both',
    age: 15,
    height: 164,
    weight: 54,
    aadhaar: 'XXXX-XXXX-1108',
    education: 'Grade 10, Hillcrest Academy',
    familyDetails: 'Enrolled in the summer camp only; joined mid-season.',
    autoDebit: true,
  },
];

/* ------------------------------------------------------------------ *
 * Deterministic pseudo-randomness
 * ------------------------------------------------------------------ */

/** FNV-1a, so a given name always yields the same "random" numbers. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A small deterministic generator seeded from a string. */
function seededRandom(seed: string): () => number {
  let state = hashString(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

const between = (rand: () => number, min: number, max: number): number =>
  Math.round(min + rand() * (max - min));

const COMPETITIONS = ['U15 District League', 'U18 State Cup', 'U12 Inter-Clinic', 'Regional Select Trials'];
const OPPONENTS = [
  'Riverside United',
  'Northside Athletic',
  'Lakeview Rangers',
  'Kingsway Juniors',
  'Greenfield FC',
  'Hillcrest Wanderers',
  'Sunrise United',
  'Eastgate Town',
];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildStats(seed: DemoStudentSeed): PlayerFootballStats {
  const rand = seededRandom(seed.studentName);
  const base = 58 + rand() * 26; // 58–84

  const attributes = {
    pace: between(rand, 52, 92),
    shooting: between(rand, 48, 90),
    passing: between(rand, 55, 94),
    dribbling: between(rand, 50, 93),
    defending: between(rand, 45, 88),
    physical: between(rand, 50, 89),
  };

  const form: PlayerMonthlyForm[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    form.push({
      month: MONTH_LABELS[d.getMonth()],
      rating: Number((base + (rand() - 0.5) * 12).toFixed(1)),
      goals: between(rand, 0, 9),
      assists: between(rand, 0, 7),
    });
  }

  const recentMatches = [];
  for (let i = 0; i < 5; i += 1) {
    const scored = between(rand, 0, 4);
    const conceded = between(rand, 0, 3);
    const goals = seed.position === 'GK' ? 0 : scored;
    const d = new Date();
    d.setDate(d.getDate() - (7 * (i + 1)));
    recentMatches.push({
      date: d.toISOString().slice(0, 10),
      opponent: OPPONENTS[Math.floor(rand() * OPPONENTS.length)],
      competition: COMPETITIONS[Math.floor(rand() * COMPETITIONS.length)],
      result: scored > conceded ? 'W' : scored === conceded ? 'D' : 'L',
      goals,
      assists: between(rand, 0, 3),
      rating: Number((base + (rand() - 0.5) * 8).toFixed(1)),
      minutes: between(rand, 45, 90),
    });
  }

  return {
    position: seed.position,
    preferredFoot: seed.preferredFoot,
    jerseyNumber: seed.jerseyNumber,
    overallRating: Math.round(base),
    attributes,
    season: {
      appearances: between(rand, 12, 26),
      goals: seed.position === 'GK' ? 0 : between(rand, 3, 24),
      assists: between(rand, 1, 15),
      minutesPlayed: between(rand, 900, 2200),
      yellowCards: between(rand, 0, 5),
      redCards: rand() > 0.85 ? 1 : 0,
      passAccuracy: between(rand, 68, 92),
      shotAccuracy: between(rand, 28, 58),
      tacklesWon: between(rand, 20, 140),
      interceptions: between(rand, 15, 110),
      cleanSheets: seed.position === 'GK' ? between(rand, 4, 12) : undefined,
      saves: seed.position === 'GK' ? between(rand, 30, 95) : undefined,
    },
    form,
    recentMatches,
  };
}

/* ------------------------------------------------------------------ *
 * Dates
 * ------------------------------------------------------------------ */

const pad = (n: number): string => String(n).padStart(2, '0');

const dateKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const monthKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const monthLabel = (d: Date): string =>
  d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

/** Last day of the month `d` falls in. */
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/* ------------------------------------------------------------------ *
 * Subscriptions
 * ------------------------------------------------------------------ */

export const DEMO_SUBSCRIPTIONS: Subscription[] = STUDENT_SEEDS.map((seed) => {
  const nextBilling = new Date();
  nextBilling.setDate(Math.min(nextBilling.getDate(), endOfMonth(nextBilling).getDate()));

  return {
    id: seed.id,
    studentName: seed.studentName,
    parentName: seed.parentName,
    parentEmail: seed.parentEmail,
    courseName: seed.courseName,
    status: seed.status,
    tier: seed.tier,
    monthlyFee: seed.monthlyFee,
    nextBillingDate: dateKey(nextBilling),
    batch: seed.batch,
    age: seed.age,
    height: seed.height,
    weight: seed.weight,
    aadhaar: seed.aadhaar,
    education: seed.education,
    familyDetails: seed.familyDetails,
    parentLoginId: seed.parentLoginId,
    phoneNumber: seed.phoneNumber,
    autoDebit: seed.autoDebit,
    // A stable, obviously-fake avatar path — the real uploader is not reachable
    // from a demo session, so a real file URL would 404.
    profilePic: undefined,
    footballStats: buildStats(seed),
  };
});

/* ------------------------------------------------------------------ *
 * Invoices — six closed months plus the current one
 * ------------------------------------------------------------------ */

const MONTHS_OF_HISTORY = 6;

function buildInvoices(): Invoice[] {
  const invoices: Invoice[] = [];
  const today = new Date();

  STUDENT_SEEDS.forEach((seed, studentIndex) => {
    for (let back = MONTHS_OF_HISTORY; back >= 0; back -= 1) {
      const period = new Date(today.getFullYear(), today.getMonth() - back, 1);
      const cycleEnd = endOfMonth(period);
      const isCurrent = back === 0;

      // Billed on the 1st, payable within the month (auto-debit) or by the 15th.
      const issued = new Date(period);
      const due = seed.autoDebit ? cycleEnd : new Date(period.getFullYear(), period.getMonth(), 15);

      let status: Invoice['status'] = 'Success';
      if (isCurrent) {
        // The current cycle is still open, so it reads Pending (or Failed for
        // the one subscription whose mandate bounced, so the admin console has
        // an overdue case to show).
        status = studentIndex === 5 ? 'Failed' : 'Pending';
      }

      // Mandated payments clear on the due date; others are paid a few days early.
      const paidOn = seed.autoDebit ? due : addDays(due, -between(seededRandom(seed.id + back), 1, 6));
      const isPaid = status === 'Success';

      const semester = monthLabel(period);
      const invoice: Invoice = {
        id: `INV-${seed.id.replace('SUB-DEMO-', '')}-${period.getFullYear()}${pad(period.getMonth() + 1)}`,
        studentName: seed.studentName,
        parentName: seed.parentName,
        parentEmail: seed.parentEmail,
        amount: seed.monthlyFee,
        courseName: seed.courseName,
        date: dateKey(issued),
        dueDate: dateKey(due),
        status,
        transactionId: isPaid ? `pay_demo_${seed.id.replace('SUB-DEMO-', '')}_${monthKey(period)}` : undefined,
        semester,
      };
      if (isPaid) {
        invoice.paidAt = dateKey(paidOn);
      }
      if (status === 'Failed') {
        invoice.semester = `${semester} (auto-debit: mandate expired — re-authorisation required)`;
      }
      invoices.push(invoice);
    }
  });

  return invoices.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const DEMO_INVOICES: Invoice[] = buildInvoices();

/* ------------------------------------------------------------------ *
 * Attendance
 * ------------------------------------------------------------------ */

/** The last `count` weekdays, oldest first. */
function recentWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      days.unshift(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

function buildStudentAttendance(): StudentAttendanceRecord[] {
  const records: StudentAttendanceRecord[] = [];

  recentWeekdays(15).forEach((day) => {
    const dayKey = dateKey(day);
    STUDENT_SEEDS.forEach((seed) => {
      const rand = seededRandom(`${seed.id}-${dayKey}`);
      const roll = rand();
      const status =
        roll > 0.88 ? 'Excused' : roll > 0.76 ? 'Absent' : roll > 0.68 ? 'Late' : 'Present';
      records.push({
        id: `ATT-${seed.id.replace('SUB-DEMO-', '')}-${dayKey}`,
        studentId: seed.id,
        studentName: seed.studentName,
        batch: seed.batch,
        date: dayKey,
        status,
        markedBy: 'demo.admin@pll-demo.invalid',
        markedByRole: 'admin',
        timestamp: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 17, 45).toISOString(),
        notes: status === 'Excused' ? 'Medical appointment (parent notified)' : undefined,
      });
    });
  });

  return records;
}

export const DEMO_STUDENT_ATTENDANCE: StudentAttendanceRecord[] = buildStudentAttendance();

function clockLabel(hours: number, minutes: number, seconds: number): string {
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${pad(minutes)}:${pad(seconds)} ${suffix}`;
}

function buildManagerAttendance(): ManagerAttendanceRecord[] {
  const records: ManagerAttendanceRecord[] = [];
  const managers = [
    { email: 'demo.manager@pll-demo.invalid', name: 'Arjun Mehta (Demo Coach)', location: DEMO_LOCATIONS[0] },
    { email: 'coaches.lead@pll-demo.invalid', name: 'Nikhil Bose (Demo Coach)', location: DEMO_LOCATIONS[1] },
  ];

  recentWeekdays(12).forEach((day) => {
    const dayKey = dateKey(day);
    managers.forEach((manager, i) => {
      const rand = seededRandom(`${manager.email}-${dayKey}`);
      const absent = rand() > 0.93;
      const lateMinutes = rand() > 0.7 ? between(rand, 1, 26) : 0;
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const [startHour, startMinute] = manager.location.shiftStartTime.split(':').map(Number);
      start.setHours(startHour, startMinute + lateMinutes, between(rand, 0, 59), 0);

      records.push({
        id: `MATT-${i}-${dayKey}`,
        managerEmail: manager.email,
        managerName: manager.name,
        date: dayKey,
        checkInTime: clockLabel(start.getHours(), start.getMinutes(), start.getSeconds()),
        checkOutTime: absent ? undefined : clockLabel(17, between(rand, 10, 55), 0),
        status: absent ? 'Absent' : lateMinutes > manager.location.gracePeriodMinutes ? 'Late' : 'On Time',
        latitude: manager.location.latitude + (rand() - 0.5) * 0.0004,
        longitude: manager.location.longitude + (rand() - 0.5) * 0.0004,
        distanceFromAcademyMeters: between(rand, 3, 96),
        verifiedGPS: !absent,
        notes: absent ? 'No check-in recorded' : undefined,
      });
    });
  });

  return records;
}

export const DEMO_MANAGER_ATTENDANCE: ManagerAttendanceRecord[] = buildManagerAttendance();

/** Everything the demo sandbox serves, in the shape App.tsx holds state in. */
export interface DemoDataset {
  invoices: Invoice[];
  subscriptions: Subscription[];
  courses: FilmCourse[];
  batches: string[];
  managerPermissions: ManagerPermissions;
  academySettings: AcademyLocationAndTiming;
  locations: AcademyLocation[];
  managerAssignments: Record<string, string>;
  studentAttendance: StudentAttendanceRecord[];
  managerAttendance: ManagerAttendanceRecord[];
  staffAccounts: typeof DEMO_STAFF_ACCOUNTS;
}

export const buildDemoDataset = (): DemoDataset => ({
  invoices: DEMO_INVOICES.map((inv) => ({ ...inv })),
  subscriptions: DEMO_SUBSCRIPTIONS.map((sub) => ({ ...sub })),
  courses: DEMO_COURSES.map((course) => ({ ...course })),
  batches: [...DEMO_BATCHES],
  managerPermissions: { ...DEMO_MANAGER_PERMISSIONS },
  academySettings: { ...DEMO_ACADEMY_SETTINGS },
  locations: DEMO_LOCATIONS.map((loc) => ({ ...loc })),
  managerAssignments: { ...DEMO_MANAGER_ASSIGNMENTS },
  studentAttendance: DEMO_STUDENT_ATTENDANCE.map((rec) => ({ ...rec })),
  managerAttendance: DEMO_MANAGER_ATTENDANCE.map((rec) => ({ ...rec })),
  staffAccounts: DEMO_STAFF_ACCOUNTS.map((acc) => ({ ...acc })),
});
