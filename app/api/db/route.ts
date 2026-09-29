import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { errorResponse } from '@/utils/apiResponse';
import { getSessionUser } from '@/lib/authGuard';

/**
 * MongoDB health/introspection probe. Unauthenticated, so it is deliberately
 * not behind requireAuth — it reports whether the cluster is reachable.
 *
 * It does, however, disclose the cluster host and database name, so a demo
 * session is refused: a showcase visitor should never learn anything about the
 * real deployment, and the demo has no reason to see the connection state.
 */
export async function GET(req: NextRequest) {
  if (getSessionUser(req)?.isDemo) {
    return errorResponse(
      'Demo sessions run on a fictional, browser-local dataset and cannot access academy records.',
      403
    );
  }

  try {
    const conn = await connectToDatabase();
    if (!conn || !conn.connection) {
      return NextResponse.json({
        status: 'disconnected',
        message: 'Could not establish connection to MongoDB',
      }, { status: 500 });
    }

    const { host, name, readyState } = conn.connection;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    return NextResponse.json({
      status: 'success',
      connected: readyState === 1,
      state: states[readyState] || readyState,
      clusterHost: host,
      databaseName: name,
      message: 'Successfully connected to MongoDB Atlas',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Failed to connect to MongoDB',
    }, { status: 500 });
  }
}
