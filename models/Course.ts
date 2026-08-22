import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICourse extends Document {
  name: string;
  tier: 'Standard' | 'Premium';
  monthlyFee: number;
  instructor: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const CourseSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    tier: { type: String, enum: ['Standard', 'Premium'], required: true },
    monthlyFee: { type: Number, required: true },
    instructor: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const CourseModel: Model<ICourse> =
  mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);
