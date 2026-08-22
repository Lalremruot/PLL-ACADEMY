import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInvoice extends Document {
  id: string; // e.g. INV-3829-K
  studentName: string;
  parentName: string;
  parentEmail: string;
  amount: number;
  courseName: string;
  date: string;
  dueDate: string;
  status: 'Success' | 'Failed' | 'Pending';
  transactionId?: string;
  semester: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const InvoiceSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    studentName: { type: String, required: true },
    parentName: { type: String, required: true },
    parentEmail: { type: String, required: true, lowercase: true, trim: true },
    amount: { type: Number, required: true },
    courseName: { type: String, required: true },
    date: { type: String, required: true },
    dueDate: { type: String, required: true },
    status: { type: String, enum: ['Success', 'Failed', 'Pending'], required: true },
    transactionId: { type: String },
    semester: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const InvoiceModel: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);
