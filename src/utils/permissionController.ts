import { CompleteUser } from "@/auth/AuthContext";

/**
 * Permission Controller
 * Checks if a user has permission to perform specific actions
 */

export const hasPermission = (
  completeUser: CompleteUser | null,
  permissionName: string
): boolean => {
  // If no user, deny access
  if (!completeUser) {
    return false;
  }

  // Primary admins have all permissions
  if (completeUser.is_primary_admin === true) {
    return true;
  }

  // If user has full access, grant permission
  if (completeUser.hasFullAccess === true) {
    return true;
  }

  // Check if the specific permission exists in user's permissions array
  if (completeUser.permissions && Array.isArray(completeUser.permissions)) {
    return completeUser.permissions.includes(permissionName);
  }

  // Default deny
  return false;
};

/**
 * Check multiple permissions at once
 * Returns true only if user has ALL specified permissions
 */
export const hasAllPermissions = (
  completeUser: CompleteUser | null,
  permissionNames: string[]
): boolean => {
  return permissionNames.every(permission => hasPermission(completeUser, permission));
};

/**
 * Check multiple permissions at once
 * Returns true if user has ANY of the specified permissions
 */
export const hasAnyPermission = (
  completeUser: CompleteUser | null,
  permissionNames: string[]
): boolean => {
  return permissionNames.some(permission => hasPermission(completeUser, permission));
};

/**
 * Check if user is primary admin
 */
export const isPrimaryAdmin = (completeUser: CompleteUser | null): boolean => {
  return completeUser?.is_primary_admin === true;
};

/**
 * Check if user has full access
 */
export const hasFullAccess = (completeUser: CompleteUser | null): boolean => {
  return completeUser?.hasFullAccess === true;
};
