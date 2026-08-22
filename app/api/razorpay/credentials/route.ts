import { NextRequest } from 'next/server';
import {
  getRazorpayPublicCredentials,
  isRazorpayEnvManaged,
  saveRazorpayCredentials,
} from '@/services/razorpayService';
import { requireAuth } from '@/lib/authGuard';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;
  try {
    const creds = await getRazorpayPublicCredentials();
    return successResponse(creds, 'Razorpay configuration retrieved');
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to load Razorpay configuration', 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  if (isRazorpayEnvManaged()) {
    return errorResponse(
      'Razorpay credentials are supplied by the server environment and cannot be changed here. ' +
        'Update RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET and redeploy.',
      409
    );
  }
  try {
    const body = await req.json();
    const { keyId, keySecret, webhookSecret, mode } = body;
    if (!keyId && !keySecret) {
      return errorResponse('Key ID and Key Secret are required to configure Razorpay.', 400);
    }
    const creds = await saveRazorpayCredentials({ keyId, keySecret, webhookSecret, mode });
    return successResponse(creds, 'Razorpay credentials encrypted and stored securely.', 200);
  } catch (err: any) {
    return errorResponse(err.message || 'Failed to save Razorpay configuration', 500);
  }
}
