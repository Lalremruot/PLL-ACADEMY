import { NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { InvoiceModel } from '@/models/Invoice';
import { SubscriptionModel } from '@/models/Subscription';
import { CourseModel } from '@/models/Course';
import { BatchModel } from '@/models/Batch';
import { requireAuth } from '@/lib/authGuard';
import { INITIAL_INVOICES, INITIAL_SUBSCRIPTIONS } from '@/src/seedData';
import { FILM_COURSES } from '@/src/types';
import { seedSettingsDefaults } from '@/services/settingsService';
import { clearStudentAttendance } from '@/services/studentAttendanceService';
import { clearManagerAttendance } from '@/services/managerAttendanceService';
import { successResponse, errorResponse } from '@/utils/apiResponse';

const INITIAL_BATCHES: string[] = [];

export async function POST(req: NextRequest) {
  const auth = requireAuth(req, ['admin']);
  if ('response' in auth) return auth.response;
  try {
    const db = await connectToDatabase();
    if (!db) {
      await seedSettingsDefaults();
      await clearStudentAttendance();
      await clearManagerAttendance();
      return successResponse({ seeded: true, mode: 'in-memory' }, 'In-memory seed active');
    }

    await InvoiceModel.deleteMany({});
    await SubscriptionModel.deleteMany({});
    await CourseModel.deleteMany({});
    await BatchModel.deleteMany({});

    await InvoiceModel.insertMany(INITIAL_INVOICES);
    await SubscriptionModel.insertMany(INITIAL_SUBSCRIPTIONS);
    await CourseModel.insertMany(FILM_COURSES);
    await BatchModel.insertMany(INITIAL_BATCHES.map(name => ({ name })));
    await seedSettingsDefaults();
    await clearStudentAttendance();
    await clearManagerAttendance();

    return successResponse({ seeded: true, mode: 'mongodb' }, 'Database seeded successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to seed database';
    return errorResponse(message, 500);
  }
}
