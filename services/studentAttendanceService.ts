import { connectToDatabase } from '@/lib/mongodb';
import { StudentAttendanceModel } from '@/models/StudentAttendance';
import type { StudentAttendanceRecord } from '@/src/types';

let memoryRecords: StudentAttendanceRecord[] = [];

const createRecordId = (): string => {
  return `ATT-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
};

export interface StudentAttendanceQuery {
  date?: string;
  from?: string;
  to?: string;
  batch?: string;
  studentId?: string;
}

const mapDoc = (doc: {
  id: string;
  studentId: string;
  studentName: string;
  batch: string;
  date: string;
  status: StudentAttendanceRecord['status'];
  markedBy: string;
  markedByRole: StudentAttendanceRecord['markedByRole'];
  timestamp: string;
  notes?: string;
}): StudentAttendanceRecord => ({
  id: doc.id,
  studentId: doc.studentId,
  studentName: doc.studentName,
  batch: doc.batch,
  date: doc.date,
  status: doc.status,
  markedBy: doc.markedBy,
  markedByRole: doc.markedByRole,
  timestamp: doc.timestamp,
  notes: doc.notes,
});

/**
 * Lists student attendance records by single date or inclusive date range.
 */
export async function getStudentAttendance(
  query: StudentAttendanceQuery | string,
  batchArg?: string
): Promise<StudentAttendanceRecord[]> {
  const filters: StudentAttendanceQuery =
    typeof query === 'string' ? { date: query, batch: batchArg } : query;
  const db = await connectToDatabase();
  if (db) {
    const mongoQuery: Record<string, unknown> = {};
    if (filters.date) {
      mongoQuery.date = filters.date;
    } else if (filters.from || filters.to) {
      mongoQuery.date = {};
      if (filters.from) {
        (mongoQuery.date as Record<string, string>).$gte = filters.from;
      }
      if (filters.to) {
        (mongoQuery.date as Record<string, string>).$lte = filters.to;
      }
    }
    if (filters.batch) {
      mongoQuery.batch = filters.batch;
    }
    if (filters.studentId) {
      mongoQuery.studentId = filters.studentId;
    }
    const docs = await StudentAttendanceModel.find(mongoQuery).sort({ date: 1, studentName: 1 }).lean();
    return docs.map(mapDoc);
  }
  return memoryRecords
    .filter((record) => {
      if (filters.date && record.date !== filters.date) {
        return false;
      }
      if (filters.from && record.date < filters.from) {
        return false;
      }
      if (filters.to && record.date > filters.to) {
        return false;
      }
      if (filters.batch && record.batch !== filters.batch) {
        return false;
      }
      if (filters.studentId && record.studentId !== filters.studentId) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.studentName.localeCompare(b.studentName));
}

/**
 * Upserts a single student attendance record for a student/date pair.
 */
export async function upsertStudentAttendance(
  input: Omit<StudentAttendanceRecord, 'id' | 'timestamp'> & {
    id?: string;
    timestamp?: string;
  }
): Promise<StudentAttendanceRecord> {
  if (input.markedByRole !== 'admin' && input.markedByRole !== 'manager') {
    throw new Error('Only admin or manager can mark student attendance');
  }
  const timestamp = input.timestamp || new Date().toISOString();
  const db = await connectToDatabase();
  if (db) {
    const existing = await StudentAttendanceModel.findOne({
      studentId: input.studentId,
      date: input.date,
    });
    if (existing) {
      existing.studentName = input.studentName;
      existing.batch = input.batch;
      existing.status = input.status;
      existing.markedBy = input.markedBy;
      existing.markedByRole = input.markedByRole;
      existing.timestamp = timestamp;
      existing.notes = input.notes;
      await existing.save();
      return mapDoc(existing);
    }
    const id = input.id || createRecordId();
    const created = await StudentAttendanceModel.create({
      ...input,
      id,
      timestamp,
    });
    return mapDoc(created);
  }
  const existingIndex = memoryRecords.findIndex(
    (record) => record.studentId === input.studentId && record.date === input.date
  );
  if (existingIndex >= 0) {
    const updated: StudentAttendanceRecord = {
      ...memoryRecords[existingIndex],
      ...input,
      timestamp,
    };
    memoryRecords[existingIndex] = updated;
    return updated;
  }
  const created: StudentAttendanceRecord = {
    id: input.id || createRecordId(),
    studentId: input.studentId,
    studentName: input.studentName,
    batch: input.batch,
    date: input.date,
    status: input.status,
    markedBy: input.markedBy,
    markedByRole: input.markedByRole,
    timestamp,
    notes: input.notes,
  };
  memoryRecords = [created, ...memoryRecords];
  return created;
}

/**
 * Bulk upserts student attendance records.
 */
export async function bulkUpsertStudentAttendance(
  records: Array<
    Omit<StudentAttendanceRecord, 'id' | 'timestamp'> & {
      id?: string;
      timestamp?: string;
    }
  >
): Promise<StudentAttendanceRecord[]> {
  const results: StudentAttendanceRecord[] = [];
  for (const record of records) {
    results.push(await upsertStudentAttendance(record));
  }
  return results;
}

/**
 * Clears all student attendance (used by seed reset).
 */
export async function clearStudentAttendance(): Promise<void> {
  const db = await connectToDatabase();
  if (db) {
    await StudentAttendanceModel.deleteMany({});
    return;
  }
  memoryRecords = [];
}
