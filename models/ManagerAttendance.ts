import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IManagerAttendance extends Document {
  id: string;
  managerEmail: string;
  managerName?: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'On Time' | 'Late' | 'Absent';
  latitude: number;
  longitude: number;
  distanceFromAcademyMeters: number;
  verifiedGPS: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ManagerAttendanceSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    managerEmail: { type: String, required: true, lowercase: true, trim: true },
    managerName: { type: String },
    date: { type: String, required: true },
    checkInTime: { type: String, required: true },
    checkOutTime: { type: String },
    status: {
      type: String,
      enum: ['On Time', 'Late', 'Absent'],
      required: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    distanceFromAcademyMeters: { type: Number, required: true },
    verifiedGPS: { type: Boolean, required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

ManagerAttendanceSchema.index({ managerEmail: 1, date: 1 }, { unique: true });

export const ManagerAttendanceModel: Model<IManagerAttendance> =
  mongoose.models.ManagerAttendance ||
  mongoose.model<IManagerAttendance>('ManagerAttendance', ManagerAttendanceSchema);
