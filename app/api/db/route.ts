import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
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
