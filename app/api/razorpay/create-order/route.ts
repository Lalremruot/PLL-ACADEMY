import { NextRequest } from 'next/server';
import { createRazorpayOrder } from '@/services/razorpayService';
import { getAllInvoices } from '@/services/invoiceService';
import { requireAuth } from '@/lib/authGuard';
import { rateLimit } from '@/lib/rateLimit';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin', 'parent']);
  if ('response' in auth) return auth.response;
  const limited = rateLimit(req, 'rzp-create-order', 20, auth.user.email);
  if (limited) return limited;
  try {
    const body = await req.json();
    const { invoiceId } = body;
    if (!invoiceId) {
      return errorResponse('invoiceId is required', 400);
    }

    const invoices = await getAllInvoices();
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) {
      return errorResponse(`Invoice ${invoiceId} not found`, 404);
    }
    if (auth.user.role === 'parent' && invoice.parentEmail.toLowerCase() !== auth.user.email.toLowerCase()) {
      return errorResponse('You do not have permission to pay this invoice.', 403);
    }
    if (invoice.status === 'Success') {
      return errorResponse('Invoice is already settled', 400);
    }

    const order = await createRazorpayOrder({
      amount: invoice.amount,
      receipt: invoiceId,
      notes: { invoiceId },
    });

    return successResponse(order, 'Razorpay order created', 200);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to create Razorpay order', 500);
  }
}
