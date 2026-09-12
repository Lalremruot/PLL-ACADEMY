import { NextRequest } from 'next/server';
import { getAllInvoices, createInvoice, updateInvoices, deleteInvoice } from '@/services/invoiceService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'manager', 'parent']);
  if ('response' in auth) return auth.response;
  try {
    let invoices = await getAllInvoices();
    if (auth.user.role === 'manager') {
      // A manager only sees payment status for students in their own batch.
      const { getAllSubscriptions } = await import('@/services/subscriptionService');
      const batchStudents = (await getAllSubscriptions())
        .filter((sub) => auth.user.assignedBatch ? sub.batch === auth.user.assignedBatch : false)
        .map((sub) => sub.studentName.toLowerCase());
      invoices = invoices.filter((inv) => batchStudents.includes(inv.studentName.toLowerCase()));
    } else if (auth.user.role === 'parent') {
      invoices = invoices.filter((inv) => {
        if (auth.user.studentName) {
          return inv.studentName.toLowerCase() === auth.user.studentName!.toLowerCase();
        }
        return inv.parentEmail.toLowerCase() === auth.user.email.toLowerCase();
      });
    }
    return successResponse(invoices, 'Invoices retrieved successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to fetch invoices', 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateInvoices(body);
      return successResponse(updated, 'Invoices updated successfully');
    }
    const newInvoice = await createInvoice(body);
    return successResponse(newInvoice, 'Invoice created successfully', 201);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to process invoice request', 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      const updated = await updateInvoices(body);
      return successResponse(updated, 'Invoices updated successfully');
    }
    return errorResponse('Expected an array of invoices for bulk update', 400);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to update invoices', 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return errorResponse('Invoice id is required', 400);
    }
    const deleted = await deleteInvoice(id);
    if (!deleted) return errorResponse('Invoice not found', 404);
    return successResponse({ id }, 'Invoice deleted successfully');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to delete invoice', 500);
  }
}
