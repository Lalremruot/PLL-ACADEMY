import { connectToDatabase } from '@/lib/mongodb';
import { InvoiceModel, IInvoice } from '@/models/Invoice';
import { INITIAL_INVOICES } from '@/src/seedData';
import { Invoice } from '@/src/types';

let memoryInvoices: Invoice[] = [...INITIAL_INVOICES];

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await connectToDatabase();
  if (db) {
    const count = await InvoiceModel.countDocuments();
    if (count === 0) {
      await InvoiceModel.insertMany(INITIAL_INVOICES);
    }
    const docs = await InvoiceModel.find({}).sort({ createdAt: -1 }).lean();
    return docs.map(doc => ({
      id: doc.id,
      studentName: doc.studentName,
      parentName: doc.parentName,
      parentEmail: doc.parentEmail,
      amount: doc.amount,
      courseName: doc.courseName,
      date: doc.date,
      dueDate: doc.dueDate,
      status: doc.status as any,
      transactionId: doc.transactionId,
      semester: doc.semester,
    }));
  }

  return memoryInvoices;
}

export async function createInvoice(invoiceData: Partial<Invoice>): Promise<Invoice> {
  const newInvoice: Invoice = {
    id: invoiceData.id || `INV-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    studentName: invoiceData.studentName || 'Student Athlete',
    parentName: invoiceData.parentName || 'Parent Guarantor',
    parentEmail: invoiceData.parentEmail || 'parent@footballmail.com',
    amount: invoiceData.amount || 350,
    courseName: invoiceData.courseName || 'Academy Masterclass',
    date: invoiceData.date || new Date().toISOString().split('T')[0],
    dueDate: invoiceData.dueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    status: invoiceData.status || 'Pending',
    transactionId: invoiceData.transactionId,
    semester: invoiceData.semester || 'Summer 2026',
  };

  const db = await connectToDatabase();
  if (db) {
    await InvoiceModel.create(newInvoice);
  } else {
    memoryInvoices.unshift(newInvoice);
  }

  return newInvoice;
}

export async function payInvoice(invoiceId: string, transactionId?: string): Promise<Invoice | null> {
  const txnId = transactionId || `TXN-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;

  const db = await connectToDatabase();
  if (db) {
    const updated = await InvoiceModel.findOneAndUpdate(
      { id: invoiceId },
      { $set: { status: 'Success', transactionId: txnId } },
      { new: true }
    ).lean();

    if (!updated) return null;
    return {
      id: updated.id,
      studentName: updated.studentName,
      parentName: updated.parentName,
      parentEmail: updated.parentEmail,
      amount: updated.amount,
      courseName: updated.courseName,
      date: updated.date,
      dueDate: updated.dueDate,
      status: updated.status as any,
      transactionId: updated.transactionId,
      semester: updated.semester,
    };
  }

  const index = memoryInvoices.findIndex(inv => inv.id === invoiceId);
  if (index === -1) return null;

  memoryInvoices[index] = {
    ...memoryInvoices[index],
    status: 'Success',
    transactionId: txnId,
  };

  return memoryInvoices[index];
}

export async function updateInvoices(invoices: Invoice[]): Promise<Invoice[]> {
  const db = await connectToDatabase();
  if (db) {
    await InvoiceModel.deleteMany({});
    await InvoiceModel.insertMany(invoices);
    return invoices;
  }

  memoryInvoices = [...invoices];
  return memoryInvoices;
}
