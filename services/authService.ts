import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import { UserModel } from '@/models/User';
import { getSubscriptionByParentLoginId } from '@/services/subscriptionService';

export const KNOWN_GUARANTORS = [
  { name: 'Marcus Sterling', email: 'm.sterling@footballmail.com', role: 'parent' as const },
  { name: 'Benicio Bellingham', email: 'b.bellingham@pro-striker.com', role: 'parent' as const },
  { name: 'Christopher Kane', email: 'kane@synco-sports.com', role: 'parent' as const },
  { name: 'Greta Grealish', email: 'greta@grealish-sports.com', role: 'parent' as const },
  { name: 'Roman Cruyff', email: 'roman.c@cruyff-academy.com', role: 'parent' as const },
];

/**
 * The primary administrator credentials ship via the environment and are
 * seeded into MongoDB on first login (when reachable). They also serve as the
 * fallback login during a DB outage. Managers and parents are provisioned by
 * the admin / system through the UI — there are no bundled demo accounts.
 *
 * Fail closed: if ADMIN_EMAIL or ADMIN_PASSWORD is not configured, the
 * primary-admin fallback is never honoured and no seed admin is created, so an
 * insecure default can never authenticate.
 */
const envAdminEmail = (process.env.ADMIN_EMAIL ?? '').trim();
const envAdminPassword = process.env.ADMIN_PASSWORD ?? '';
const envAdminName = process.env.ADMIN_NAME?.trim() || 'Academy Administrator';
const adminEnvConfigured = Boolean(envAdminEmail && envAdminPassword);

const matchesPrimaryAdmin = (email: string, role: string, password: string): boolean =>
  adminEnvConfigured &&
  role === 'admin' &&
  email === envAdminEmail.toLowerCase() &&
  password === envAdminPassword;

/** @deprecated Parents now use parentLoginId — kept for legacy references only */
export const PARENT_PASSKEY = 'parent123';

export interface ParentSessionUser {
  email: string;
  role: 'parent';
  name: string;
  subscriptionId: string;
  studentName: string;
  parentLoginId: string;
}

/**
 * Passwordless parent login: match unique parentLoginId (e.g. Liam48291).
 */
export async function loginParentByLoginId(parentLoginId: string): Promise<ParentSessionUser> {
  const normalized = parentLoginId.trim();
  if (!normalized) {
    throw new AuthenticationError('Parent login ID is required.');
  }

  const sub = await getSubscriptionByParentLoginId(normalized);
  if (!sub) {
    throw new AuthenticationError(
      'Invalid parent login ID. Use the unique ID provided when your child was enrolled.'
    );
  }

  return {
    email: sub.parentEmail,
    role: 'parent',
    name: sub.parentName,
    subscriptionId: sub.id,
    studentName: sub.studentName,
    parentLoginId: sub.parentLoginId || normalized,
  };
}

const HASH_KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, HASH_KEY_LENGTH);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [saltHex, hashHex] = storedHash.split(':');
  if (!saltHex || !hashHex) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Thrown when credentials or role are invalid. The login route maps this to a
 * 401; all other errors are treated as server faults (500).
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

const resolveDisplayName = (role: 'admin' | 'manager' | 'parent', matchName?: string): string => {
  if (matchName) {
    return matchName;
  }
  switch (role) {
    case 'admin':
      return 'Academy Administrator';
    case 'manager':
      return 'Academy Manager';
    case 'parent':
      return 'Parent Guarantor';
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
};

/**
 * Registers a new admin/manager account with a hashed password.
 */
export async function createUserAccount(input: {
  email: string;
  role: 'admin' | 'manager';
  name?: string;
  password: string;
}) {
  const db = await connectToDatabase();
  const email = input.email.toLowerCase().trim();
  if (input.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (db) {
    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new Error(`${input.role === 'admin' ? 'An admin' : 'A manager'} with this email already exists.`);
    }
    const created = await UserModel.create({
      email,
      role: input.role,
      name: input.name?.trim() || resolveDisplayName(input.role),
      passwordHash: hashPassword(input.password),
    });
    return { email: created.email, role: created.role, name: created.name };
  }
  return { email, role: input.role, name: input.name?.trim() || resolveDisplayName(input.role) };
}

/**
 * Changes the password for an existing admin/manager account after verifying
 * the current password.
 */
export async function changeUserPassword(input: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  const db = await connectToDatabase();
  const email = input.email.toLowerCase().trim();
  if (input.newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }
  if (db) {
    const user = await UserModel.findOne({ email }).select('+passwordHash');
    if (!user) {
      throw new Error('Account not found.');
    }
    if (!user.passwordHash || !verifyPassword(input.currentPassword, user.passwordHash)) {
      throw new Error('The current password you entered is incorrect.');
    }
    user.passwordHash = hashPassword(input.newPassword);
    await user.save();
    return { email: user.email, role: user.role, name: user.name };
  }
  return { email, role: 'admin' as const, name: undefined };
}

/**
 * Lists admin and manager accounts without password hashes.
 */
export async function listStaffAccounts() {
  const db = await connectToDatabase();
  if (!db) {
    return adminEnvConfigured
      ? [{ email: envAdminEmail, role: 'admin' as const, name: envAdminName }]
      : [];
  }
  if (adminEnvConfigured) {
    await UserModel.updateOne(
      { email: envAdminEmail },
      {
        $setOnInsert: {
          email: envAdminEmail,
          role: 'admin',
          name: envAdminName,
          passwordHash: hashPassword(envAdminPassword),
        },
      },
      { upsert: true }
    );
  }
  const docs = await UserModel.find({ role: { $in: ['admin', 'manager'] } })
    .sort({ role: 1, email: 1 })
    .lean();
  return docs.map((doc) => ({
    email: doc.email,
    role: doc.role as 'admin' | 'manager',
    name: doc.name,
  }));
}

/**
 * Server-side login: validates email + password + role and returns the session
 * user. Admin/manager accounts authenticate against hashed credentials stored
 * in MongoDB when it is reachable. The primary admin (from the environment) is
 * seeded on first login; during a DB outage only that primary admin can sign
 * in. All other accounts fall away — managers and parents must be provisioned
 * through the admin UI before they exist.
 */
export async function loginUser(email: string, role: 'admin' | 'manager' | 'parent', password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const db = await connectToDatabase();

  if (role === 'parent') {
    throw new AuthenticationError('Parents must sign in with their unique Parent Login ID.');
  }

  const isPrimaryAdmin = matchesPrimaryAdmin(normalizedEmail, role, password);

  if (db) {
    const user = await UserModel.findOne({ email: normalizedEmail }).select('+passwordHash');
    if (user) {
      if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        throw new AuthenticationError('Invalid email or password for this role.');
      }
      if (user.role !== role) {
        throw new AuthenticationError('This account does not have access to the selected role.');
      }
      return {
        email: user.email,
        role: user.role as 'admin' | 'manager',
        name: user.name,
      };
    }
    if (isPrimaryAdmin) {
      const created = await UserModel.create({
        email: normalizedEmail,
        role: 'admin',
        name: envAdminName,
        passwordHash: hashPassword(envAdminPassword),
      });
      return {
        email: created.email,
        role: created.role as 'admin',
        name: created.name,
      };
    }
    throw new AuthenticationError('Invalid email or password for this role.');
  }

  if (!isPrimaryAdmin) {
    throw new AuthenticationError('Invalid email or password for this role.');
  }
  return {
    email: normalizedEmail,
    role: 'admin' as const,
    name: envAdminName,
  };
}
