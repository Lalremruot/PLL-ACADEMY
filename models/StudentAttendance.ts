import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStudentAttendance extends Document {
  id: string;
  studentId: string;
  studentName: string;
  batch: string;
  date: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  markedBy: string;
  markedByRole: 'admin' | 'manager';
  timestamp: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const StudentAttendanceSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    batch: { type: String, required: true },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Absent', 'Excused'],
      required: true,
    },
    markedBy: { type: String, required: true },
    markedByRole: { type: String, enum: ['admin', 'manager'], required: true },
    timestamp: { type: String, required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

StudentAttendanceSchema.index({ date: 1, batch: 1 });
StudentAttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

export const StudentAttendanceModel: Model<IStudentAttendance> =
  mongoose.models.StudentAttendance ||
  mongoose.model<IStudentAttendance>('StudentAttendance', StudentAttendanceSchema);
