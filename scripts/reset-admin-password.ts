import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
import { connectToDatabase } from '../lib/mongodb';
import { UserModel } from '../models/User';
import { hashPassword } from '../services/authService';

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set (they are read from .env.local).');
    process.exit(1);
  }

  const db = await connectToDatabase();
  if (!db) {
    console.error('Could not connect to MongoDB. Check MONGODB_URI and connectivity.');
    process.exit(1);
  }

  const existing = await UserModel.findOne({ email });
  if (existing) {
    existing.passwordHash = hashPassword(password);
    existing.name = existing.name || process.env.ADMIN_NAME?.trim() || 'Academy Administrator';
    await existing.save();
    console.log(`Reset password for existing admin: ${email}`);
  } else {
    await UserModel.updateOne(
      { email },
      {
        $setOnInsert: {
          email,
          role: 'admin',
          name: process.env.ADMIN_NAME?.trim() || 'Academy Administrator',
          passwordHash: hashPassword(password),
        },
      },
      { upsert: true }
    );
    console.log(`Created admin (upsert): ${email}`);
  }

  console.log('Admin password hash updated successfully. New password takes effect on next login.');
  await mongoose.disconnect();
}

main();