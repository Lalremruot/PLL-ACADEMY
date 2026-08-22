import { connectToDatabase } from '@/lib/mongodb';
import { ManagerAttendanceModel } from '@/models/ManagerAttendance';
import type { ManagerAttendanceRecord } from '@/src/types';

let memoryRecords: ManagerAttendanceRecord[] = [];

const createRecordId = (): string => {
  return `MGR-ATT-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
};

/**
 * Lists manager attendance records, optionally filtered by email and date/range.
 */
export async function getManagerAttendance(filters: {
  managerEmail?: string;
  date?: string;
  from?: string;
  to?: string;
}): Promise<ManagerAttendanceRecord[]> {
  const db = await connectToDatabase();
  if (db) {
    const query: Record<string, unknown> = {};
    if (filters.managerEmail) {
      query.managerEmail = filters.managerEmail.toLowerCase().trim();
    }
    if (filters.date) {
      query.date = filters.date;
    } else if (filters.from || filters.to) {
      query.date = {};
      if (filters.from) {
        (query.date as Record<string, string>).$gte = filters.from;
      }
      if (filters.to) {
        (query.date as Record<string, string>).$lte = filters.to;
      }
    }
    const docs = await ManagerAttendanceModel.find(query).sort({ date: -1 }).lean();
    return docs.map((doc) => ({
      id: doc.id,
      managerEmail: doc.managerEmail,
      managerName: doc.managerName,
      date: doc.date,
      checkInTime: doc.checkInTime,
      checkOutTime: doc.checkOutTime,
      status: doc.status,
      latitude: doc.latitude,
      longitude: doc.longitude,
      distanceFromAcademyMeters: doc.distanceFromAcademyMeters,
      verifiedGPS: doc.verifiedGPS,
      notes: doc.notes,
    }));
  }
  return memoryRecords
    .filter((record) => {
      if (filters.managerEmail && record.managerEmail !== filters.managerEmail.toLowerCase().trim()) {
        return false;
      }
      if (filters.date && record.date !== filters.date) {
        return false;
      }
      if (filters.from && record.date < filters.from) {
        return false;
      }
      if (filters.to && record.date > filters.to) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Creates or updates a manager check-in for a given date.
 */
export async function upsertManagerCheckIn(
  input: Omit<ManagerAttendanceRecord, 'id'> & { id?: string }
): Promise<ManagerAttendanceRecord> {
  const email = input.managerEmail.toLowerCase().trim();
  const db = await connectToDatabase();
  if (db) {
    const existing = await ManagerAttendanceModel.findOne({
      managerEmail: email,
      date: input.date,
    });
    if (existing) {
      existing.checkInTime = input.checkInTime;
      existing.checkOutTime = input.checkOutTime;
      existing.status = input.status;
      existing.latitude = input.latitude;
      existing.longitude = input.longitude;
      existing.distanceFromAcademyMeters = input.distanceFromAcademyMeters;
      existing.verifiedGPS = input.verifiedGPS;
      existing.notes = input.notes;
      existing.managerName = input.managerName;
      await existing.save();
      return {
        id: existing.id,
        managerEmail: existing.managerEmail,
        managerName: existing.managerName,
        date: existing.date,
        checkInTime: existing.checkInTime,
        checkOutTime: existing.checkOutTime,
        status: existing.status,
        latitude: existing.latitude,
        longitude: existing.longitude,
        distanceFromAcademyMeters: existing.distanceFromAcademyMeters,
        verifiedGPS: existing.verifiedGPS,
        notes: existing.notes,
      };
    }
    const id = input.id || createRecordId();
    const created = await ManagerAttendanceModel.create({
      ...input,
      id,
      managerEmail: email,
    });
    return {
      id: created.id,
      managerEmail: created.managerEmail,
      managerName: created.managerName,
      date: created.date,
      checkInTime: created.checkInTime,
      checkOutTime: created.checkOutTime,
      status: created.status,
      latitude: created.latitude,
      longitude: created.longitude,
      distanceFromAcademyMeters: created.distanceFromAcademyMeters,
      verifiedGPS: created.verifiedGPS,
      notes: created.notes,
    };
  }
  const existingIndex = memoryRecords.findIndex(
    (record) => record.managerEmail === email && record.date === input.date
  );
  if (existingIndex >= 0) {
    const updated: ManagerAttendanceRecord = {
      ...memoryRecords[existingIndex],
      ...input,
      managerEmail: email,
    };
    memoryRecords[existingIndex] = updated;
    return updated;
  }
  const created: ManagerAttendanceRecord = {
    id: input.id || createRecordId(),
    managerEmail: email,
    managerName: input.managerName,
    date: input.date,
    checkInTime: input.checkInTime,
    checkOutTime: input.checkOutTime,
    status: input.status,
    latitude: input.latitude,
    longitude: input.longitude,
    distanceFromAcademyMeters: input.distanceFromAcademyMeters,
    verifiedGPS: input.verifiedGPS,
    notes: input.notes,
  };
  memoryRecords = [created, ...memoryRecords];
  return created;
}

/**
 * Updates check-out time on an existing manager attendance record.
 */
export async function updateManagerCheckOut(input: {
  managerEmail: string;
  date: string;
  checkOutTime: string;
  latitude: number;
  longitude: number;
  distanceFromAcademyMeters: number;
  verifiedGPS: boolean;
}): Promise<ManagerAttendanceRecord> {
  const email = input.managerEmail.toLowerCase().trim();
  const db = await connectToDatabase();
  if (db) {
    const existing = await ManagerAttendanceModel.findOne({
      managerEmail: email,
      date: input.date,
    });
    if (!existing) {
      throw new Error('No check-in found for today. Check in first.');
    }
    existing.checkOutTime = input.checkOutTime;
    existing.latitude = input.latitude;
    existing.longitude = input.longitude;
    existing.distanceFromAcademyMeters = input.distanceFromAcademyMeters;
    existing.verifiedGPS = input.verifiedGPS;
    await existing.save();
    return {
      id: existing.id,
      managerEmail: existing.managerEmail,
      managerName: existing.managerName,
      date: existing.date,
      checkInTime: existing.checkInTime,
      checkOutTime: existing.checkOutTime,
      status: existing.status,
      latitude: existing.latitude,
      longitude: existing.longitude,
      distanceFromAcademyMeters: existing.distanceFromAcademyMeters,
      verifiedGPS: existing.verifiedGPS,
      notes: existing.notes,
    };
  }
  const existingIndex = memoryRecords.findIndex(
    (record) => record.managerEmail === email && record.date === input.date
  );
  if (existingIndex < 0) {
    throw new Error('No check-in found for today. Check in first.');
  }
  const updated: ManagerAttendanceRecord = {
    ...memoryRecords[existingIndex],
    checkOutTime: input.checkOutTime,
    latitude: input.latitude,
    longitude: input.longitude,
    distanceFromAcademyMeters: input.distanceFromAcademyMeters,
    verifiedGPS: input.verifiedGPS,
  };
  memoryRecords[existingIndex] = updated;
  return updated;
}

/**
 * Clears all manager attendance (used by seed reset).
 */
export async function clearManagerAttendance(): Promise<void> {
  const db = await connectToDatabase();
  if (db) {
    await ManagerAttendanceModel.deleteMany({});
    return;
  }
  memoryRecords = [];
}
