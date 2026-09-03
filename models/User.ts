import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  role: 'admin' | 'manager' | 'parent';
  name?: string;
  designation?: string;
  phone?: string;
  address?: string;
  profilePic?: string;
  assignedBatch?: string;
  passwordHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'manager', 'parent'], default: 'parent' },
    name: { type: String, trim: true },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    profilePic: { type: String },
    assignedBatch: { type: String, trim: true },
    passwordHash: { type: String, select: false },
  },
  {
    timestamps: true,
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
