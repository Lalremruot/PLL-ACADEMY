import { connectToDatabase } from '@/lib/mongodb';
import { SubscriptionModel } from '@/models/Subscription';
import { INITIAL_SUBSCRIPTIONS } from '@/src/seedData';
import { Subscription } from '@/src/types';
import { generateParentLoginId } from '@/src/utils/parent-login-id';

let memorySubscriptions: Subscription[] = [...INITIAL_SUBSCRIPTIONS];

/**
 * Writes any in-memory fallback records into Mongo once it is reachable again.
 * The memory store is only used while Mongo is down, so an upsert-by-id merge
 * can never duplicate or discard existing documents — it simply catches the
 * records that were temporarily stranded in process memory.
 */
async function flushPendingSubscriptions(): Promise<void> {
  if (memorySubscriptions.length === 0) return;
  const pending = memorySubscriptions;
  memorySubscriptions = [];
  for (const sub of pending) {
    await SubscriptionModel.updateOne({ id: sub.id }, { $set: sub }, { upsert: true });
  }
}

function mapDoc(doc: Record<string, unknown>): Subscription {
  return {
    id: doc.id as string,
    studentName: doc.studentName as string,
    parentName: doc.parentName as string,
    parentEmail: doc.parentEmail as string,
    courseName: doc.courseName as string,
    status: doc.status as Subscription['status'],
    tier: doc.tier as Subscription['tier'],
    monthlyFee: doc.monthlyFee as number,
    nextBillingDate: doc.nextBillingDate as string,
    batch: doc.batch as string | undefined,
    age: doc.age as number | undefined,
    height: doc.height as number | undefined,
    weight: doc.weight as number | undefined,
    aadhaar: doc.aadhaar as string | undefined,
    education: doc.education as string | undefined,
    familyDetails: doc.familyDetails as string | undefined,
    profilePic: doc.profilePic as string | undefined,
    parentLoginId: doc.parentLoginId as string | undefined,
    phoneNumber: doc.phoneNumber as string | undefined,
    autoDebit: doc.autoDebit as boolean | undefined,
    razorpayTokenId: doc.razorpayTokenId as string | undefined,
    footballStats: doc.footballStats as Subscription['footballStats'],
  };
}

async function ensureParentLoginIds(subs: Subscription[]): Promise<Subscription[]> {
  const used = new Set(subs.map((s) => s.parentLoginId?.toLowerCase()).filter(Boolean) as string[]);
  let changed = false;
  const next = subs.map((sub) => {
    if (sub.parentLoginId) return sub;
    changed = true;
    const parentLoginId = generateParentLoginId(sub.studentName, used);
    used.add(parentLoginId.toLowerCase());
    return { ...sub, parentLoginId };
  });

  if (changed) {
    const db = await connectToDatabase();
    if (db) {
      for (const sub of next) {
        if (sub.parentLoginId) {
          await SubscriptionModel.updateOne({ id: sub.id }, { $set: { parentLoginId: sub.parentLoginId } });
        }
      }
    } else {
      memorySubscriptions = next;
    }
  }

  return next;
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingSubscriptions();
    const count = await SubscriptionModel.countDocuments();
    if (count === 0) {
      await SubscriptionModel.insertMany(INITIAL_SUBSCRIPTIONS);
    }
    const docs = await SubscriptionModel.find({}).sort({ createdAt: -1 }).lean();
    return ensureParentLoginIds(docs.map((doc) => mapDoc(doc as unknown as Record<string, unknown>)));
  }

  return ensureParentLoginIds(memorySubscriptions);
}

export async function getSubscriptionByParentLoginId(parentLoginId: string): Promise<Subscription | null> {
  const normalized = parentLoginId.trim();
  if (!normalized) return null;

  const db = await connectToDatabase();
  if (db) {
    await flushPendingSubscriptions();
    const doc = await SubscriptionModel.findOne({
      parentLoginId: { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    }).lean();
    return doc ? mapDoc(doc as unknown as Record<string, unknown>) : null;
  }

  const subs = await ensureParentLoginIds(memorySubscriptions);
  return subs.find((s) => s.parentLoginId?.toLowerCase() === normalized.toLowerCase()) ?? null;
}

export async function createSubscription(subData: Partial<Subscription>): Promise<Subscription> {
  const all = await getAllSubscriptions();
  const existingIds = new Set(
    all.map((s) => s.parentLoginId?.toLowerCase()).filter(Boolean) as string[]
  );

  const newSub: Subscription = {
    id: subData.id || `SUB-${Math.floor(1000 + Math.random() * 9000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    studentName: subData.studentName || 'New Athlete',
    parentName: subData.parentName || 'Guardian',
    parentEmail: subData.parentEmail || 'guardian@footballmail.com',
    courseName: subData.courseName || 'Pro Academy Program',
    // New subscriptions start Paused so a coach must explicitly activate the
    // student before the paid program begins; no payment is ever auto-triggered.
    status: subData.status || 'Paused',
    tier: subData.tier || 'Standard',
    monthlyFee: subData.monthlyFee || 300,
    nextBillingDate: subData.nextBillingDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    batch: subData.batch || 'Under-15 Development Group',
    age: subData.age,
    height: subData.height,
    weight: subData.weight,
    aadhaar: subData.aadhaar,
    education: subData.education,
    familyDetails: subData.familyDetails,
    profilePic: subData.profilePic,
    phoneNumber: subData.phoneNumber,
    parentLoginId:
      subData.parentLoginId ||
      generateParentLoginId(subData.studentName || 'New Athlete', existingIds),
  };

  const db = await connectToDatabase();
  if (db) {
    await flushPendingSubscriptions();
    await SubscriptionModel.create(newSub);
  } else {
    memorySubscriptions.unshift(newSub);
  }

  return newSub;
}

export async function updateSubscription(sub: Subscription): Promise<Subscription | null> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingSubscriptions();
    const updated = await SubscriptionModel.findOneAndUpdate(
      { id: sub.id },
      { $set: sub },
      { new: true, upsert: true }
    ).lean();

    return mapDoc(updated as unknown as Record<string, unknown>);
  }

  const index = memorySubscriptions.findIndex(s => s.id === sub.id);
  if (index !== -1) {
    memorySubscriptions[index] = { ...sub };
  } else {
    memorySubscriptions.push(sub);
  }

  return sub;
}

export async function updateSubscriptionStatus(subId: string, status: 'Active' | 'Paused' | 'Canceled'): Promise<Subscription | null> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingSubscriptions();
    const updated = await SubscriptionModel.findOneAndUpdate(
      { id: subId },
      { $set: { status } },
      { new: true }
    ).lean();

    if (!updated) return null;
    return mapDoc(updated as unknown as Record<string, unknown>);
  }

  const index = memorySubscriptions.findIndex(s => s.id === subId);
  if (index === -1) return null;

  memorySubscriptions[index] = {
    ...memorySubscriptions[index],
    status,
  };

  return memorySubscriptions[index];
}

/**
 * Synchronizes a client-supplied list of subscriptions.
 *
 * This deliberately does NOT wipe the collection first. A stale or truncated
 * client list could then silently destroy registry entries the server knows
 * about (e.g. while a second tab holds an older copy). Instead each record is
 * upserted by id, so a full re-sync converges without ever deleting data.
 * Deletions must go through deleteSubscription() explicitly.
 */
export async function updateAllSubscriptions(subscriptions: Subscription[]): Promise<Subscription[]> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingSubscriptions();
    for (const sub of subscriptions) {
      await SubscriptionModel.updateOne({ id: sub.id }, { $set: sub }, { upsert: true });
    }
    return subscriptions;
  }

  // Memory branch: merge, never discard existing records.
  const seen = new Set<string>();
  const merged: Subscription[] = [];
  for (const sub of subscriptions) {
    if (seen.has(sub.id)) continue;
    seen.add(sub.id);
    merged.push(sub);
  }
  for (const sub of memorySubscriptions) {
    if (seen.has(sub.id)) continue;
    seen.add(sub.id);
    merged.push(sub);
  }
  memorySubscriptions = merged;
  return subscriptions;
}

export async function deleteSubscription(subId: string): Promise<boolean> {
  const db = await connectToDatabase();
  if (db) {
    await flushPendingSubscriptions();
    const res = await SubscriptionModel.deleteOne({ id: subId });
    return (res.deletedCount ?? 0) > 0;
  }

  const before = memorySubscriptions.length;
  memorySubscriptions = memorySubscriptions.filter((s) => s.id !== subId);
  return memorySubscriptions.length < before;
}
