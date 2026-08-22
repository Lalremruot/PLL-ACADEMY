import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { KNOWN_GUARANTORS } from './authService';

export async function getAllUsers() {
  const db = await connectToDatabase();
  if (db) {
    const docs = await UserModel.find({}).lean();
    return docs.map(doc => ({
      email: doc.email,
      role: doc.role,
      name: doc.name,
    }));
  }

  return KNOWN_GUARANTORS;
}
