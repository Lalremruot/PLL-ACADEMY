import type { ManagerPermissions } from '../types';

/**
 * Returns whether a manager permission flag is enabled.
 */
export const hasPermission = (
  permissions: ManagerPermissions,
  key: keyof ManagerPermissions
): boolean => {
  return Boolean(permissions[key]);
};
