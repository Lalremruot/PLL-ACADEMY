import { connectToDatabase } from '@/lib/mongodb';
import { InvoiceModel, IInvoice } from '@/models/Invoice';
import { INITIAL_INVOICES } from '@/src/seedData';
import { Invoice } from '@/src/types';

let memoryInvoices: Invoice[] = [...INITIAL_INVOICES];

/**
 * Writes any in-memory fallback records into Mongo once it is reachable again.
 * The memory store is only used while Mongo is down, so an upsert-by-id merge
 * can never duplicate or discard existing documents.
 */
async function flushPendingInvoices(): Promise<void> {
  if (memoryInvoices.length === 0) return;
  const pending = memoryInvoices;
  memoryInvoices = [];
  for (const inv of pending) {
    await InvoiceModel.updateOne({ id: inv.id }, { $set: inv }, { upsert: true });
  }
}

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingInvoices();
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
    await flushPendingInvoices();
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
    await flushPendingInvoices();
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

/**
 * Synchronizes a client-supplied list of invoices.
 *
 * This deliberately does NOT wipe the collection first — a stale or truncated
 * client list must never silently destroy invoices the server knows about.
 * Each record is upserted by id instead; deletions go through deleteInvoice().
 */
export async function updateInvoices(invoices: Invoice[]): Promise<Invoice[]> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingInvoices();
    for (const inv of invoices) {
      await InvoiceModel.updateOne({ id: inv.id }, { $set: inv }, { upsert: true });
    }
    return invoices;
  }

  // Memory branch: merge, never discard existing records.
  const seen = new Set<string>();
  const merged: Invoice[] = [];
  for (const inv of invoices) {
    if (seen.has(inv.id)) continue;
    seen.add(inv.id);
    merged.push(inv);
  }
  for (const inv of memoryInvoices) {
    if (seen.has(inv.id)) continue;
    seen.add(inv.id);
    merged.push(inv);
  }
  memoryInvoices = merged;
  return invoices;
}

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingInvoices();
    const res = await InvoiceModel.deleteOne({ id: invoiceId });
    return (res.deletedCount ?? 0) > 0;
  }

  const before = memoryInvoices.length;
  memoryInvoices = memoryInvoices.filter((inv) => inv.id !== invoiceId);
  return memoryInvoices.length < before;
}
