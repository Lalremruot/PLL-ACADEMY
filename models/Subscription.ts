import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscription extends Document {
  id: string; // e.g. SUB-1002-V
  studentName: string;
  parentName: string;
  parentEmail: string;
  courseName: string;
  status: 'Active' | 'Paused' | 'Canceled';
  tier: 'Standard' | 'Premium';
  monthlyFee: number;
  nextBillingDate: string;
  batch?: string;
  age?: number;
  height?: number;
  weight?: number;
  aadhaar?: string;
  education?: string;
  familyDetails?: string;
  profilePic?: string;
  parentLoginId?: string;
  autoDebit?: boolean;
  razorpayTokenId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SubscriptionSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    studentName: { type: String, required: true },
    parentName: { type: String, required: true },
    parentEmail: { type: String, required: true, lowercase: true, trim: true },
    courseName: { type: String, required: true },
    status: { type: String, enum: ['Active', 'Paused', 'Canceled'], required: true },
    tier: { type: String, enum: ['Standard', 'Premium'], required: true },
    monthlyFee: { type: Number, required: true },
    nextBillingDate: { type: String, required: true },
    batch: { type: String },
    age: { type: Number },
    height: { type: Number },
    weight: { type: Number },
    aadhaar: { type: String },
    education: { type: String },
    familyDetails: { type: String },
    profilePic: { type: String },
    parentLoginId: { type: String, unique: true, sparse: true, trim: true },
    autoDebit: { type: Boolean },
    razorpayTokenId: { type: String },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionModel: Model<ISubscription> =
  mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
