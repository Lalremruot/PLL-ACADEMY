import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBatch extends Document {
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BatchSchema: Schema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
  },
  {
    timestamps: true,
  }
);

export const BatchModel: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema);
