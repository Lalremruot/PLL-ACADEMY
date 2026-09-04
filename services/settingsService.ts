import { connectToDatabase } from '@/lib/mongodb';
import { SettingsModel } from '@/models/Settings';
import {
  AcademyLocation,
  AcademyLocationAndTiming,
  DEFAULT_ACADEMY_SETTINGS,
  DEFAULT_MANAGER_PERMISSIONS,
  ManagerLocationAssignment,
  ManagerPermissions,
} from '@/src/types';

const PERMISSIONS_KEY = 'manager_permissions';
const ACADEMY_KEY = 'academy';
const LOCATIONS_KEY = 'locations';
const MANAGER_ASSIGNMENT_KEY = 'manager_location_assignments';

let memoryPermissions: ManagerPermissions = { ...DEFAULT_MANAGER_PERMISSIONS };
let memoryAcademy: AcademyLocationAndTiming = { ...DEFAULT_ACADEMY_SETTINGS };
let memoryLocations: AcademyLocation[] = [];
let memoryManagerAssignments: ManagerLocationAssignment = {};

/**
 * Returns manager permission flags, seeding defaults when missing.
 */
export async function getManagerPermissions(): Promise<ManagerPermissions> {
  const db = await connectToDatabase();
  if (db) {
    const doc = await SettingsModel.findOne({ key: PERMISSIONS_KEY }).lean();
    if (!doc) {
      await SettingsModel.create({
        key: PERMISSIONS_KEY,
        value: DEFAULT_MANAGER_PERMISSIONS,
      });
      return { ...DEFAULT_MANAGER_PERMISSIONS };
    }
    return {
      ...DEFAULT_MANAGER_PERMISSIONS,
      ...(doc.value as ManagerPermissions),
    };
  }
  return { ...memoryPermissions };
}

/**
 * Replaces manager permission flags.
 */
export async function updateManagerPermissions(
  permissions: ManagerPermissions
): Promise<ManagerPermissions> {
  const next: ManagerPermissions = {
    ...DEFAULT_MANAGER_PERMISSIONS,
    ...permissions,
  };
  const db = await connectToDatabase();
  if (db) {
    await SettingsModel.findOneAndUpdate(
      { key: PERMISSIONS_KEY },
      { key: PERMISSIONS_KEY, value: next },
      { upsert: true, new: true }
    );
    return next;
  }
  memoryPermissions = next;
  return { ...memoryPermissions };
}

/**
 * Returns academy GPS and shift timing settings.
 */
export async function getAcademySettings(): Promise<AcademyLocationAndTiming> {
  const db = await connectToDatabase();
  if (db) {
    const doc = await SettingsModel.findOne({ key: ACADEMY_KEY }).lean();
    if (!doc) {
      await SettingsModel.create({
        key: ACADEMY_KEY,
        value: DEFAULT_ACADEMY_SETTINGS,
      });
      return { ...DEFAULT_ACADEMY_SETTINGS };
    }
    return {
      ...DEFAULT_ACADEMY_SETTINGS,
      ...(doc.value as AcademyLocationAndTiming),
    };
  }
  return { ...memoryAcademy };
}

/**
 * Replaces academy GPS and shift timing settings.
 */
export async function updateAcademySettings(
  settings: AcademyLocationAndTiming
): Promise<AcademyLocationAndTiming> {
  const next: AcademyLocationAndTiming = {
    ...DEFAULT_ACADEMY_SETTINGS,
    ...settings,
  };
  const db = await connectToDatabase();
  if (db) {
    await SettingsModel.findOneAndUpdate(
      { key: ACADEMY_KEY },
      { key: ACADEMY_KEY, value: next },
      { upsert: true, new: true }
    );
    return next;
  }
  memoryAcademy = next;
  return { ...memoryAcademy };
}

/**
 * Seeds default settings documents when empty.
 */
export async function seedSettingsDefaults(): Promise<void> {
  const db = await connectToDatabase();
  if (!db) {
    memoryPermissions = { ...DEFAULT_MANAGER_PERMISSIONS };
    memoryAcademy = { ...DEFAULT_ACADEMY_SETTINGS };
    memoryLocations = [];
    memoryManagerAssignments = {};
    return;
  }
  await SettingsModel.deleteMany({ key: { $in: [PERMISSIONS_KEY, ACADEMY_KEY, LOCATIONS_KEY, MANAGER_ASSIGNMENT_KEY] } });
  await SettingsModel.insertMany([
    { key: PERMISSIONS_KEY, value: DEFAULT_MANAGER_PERMISSIONS },
    { key: ACADEMY_KEY, value: DEFAULT_ACADEMY_SETTINGS },
    { key: LOCATIONS_KEY, value: [] },
    { key: MANAGER_ASSIGNMENT_KEY, value: {} },
  ]);
}

/**
 * Returns the registry of check-in locations (empty by default).
 */
export async function getLocations(): Promise<AcademyLocation[]> {
  const db = await connectToDatabase();
  if (db) {
    const doc = await SettingsModel.findOne({ key: LOCATIONS_KEY }).lean();
    if (!doc) {
      await SettingsModel.create({ key: LOCATIONS_KEY, value: [] });
      return [];
    }
    return Array.isArray(doc.value) ? (doc.value as AcademyLocation[]) : [];
  }
  return memoryLocations;
}

/**
 * Replaces the whole locations registry.
 */
export async function updateLocations(locations: AcademyLocation[]): Promise<AcademyLocation[]> {
  const next: AcademyLocation[] = Array.isArray(locations) ? locations : [];
  const db = await connectToDatabase();
  if (db) {
    await SettingsModel.findOneAndUpdate(
      { key: LOCATIONS_KEY },
      { key: LOCATIONS_KEY, value: next },
      { upsert: true, new: true }
    );
    return next;
  }
  memoryLocations = next;
  return [...memoryLocations];
}

/**
 * Returns the manager → locationId assignment map (empty by default).
 */
export async function getManagerLocationAssignments(): Promise<ManagerLocationAssignment> {
  const db = await connectToDatabase();
  if (db) {
    const doc = await SettingsModel.findOne({ key: MANAGER_ASSIGNMENT_KEY }).lean();
    if (!doc) {
      await SettingsModel.create({ key: MANAGER_ASSIGNMENT_KEY, value: {} });
      return {};
    }
    return (doc.value as ManagerLocationAssignment) || {};
  }
  return memoryManagerAssignments;
}

/**
 * Replaces the whole manager → locationId assignment map.
 */
export async function updateManagerLocationAssignments(
  assignments: ManagerLocationAssignment
): Promise<ManagerLocationAssignment> {
  const next: ManagerLocationAssignment = assignments || {};
  const db = await connectToDatabase();
  if (db) {
    await SettingsModel.findOneAndUpdate(
      { key: MANAGER_ASSIGNMENT_KEY },
      { key: MANAGER_ASSIGNMENT_KEY, value: next },
      { upsert: true, new: true }
    );
    return next;
  }
  memoryManagerAssignments = next;
  return { ...memoryManagerAssignments };
}
