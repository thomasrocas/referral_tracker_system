import type { AppUser, RequestScope } from '../auth/user.js';

export const Roles = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CONTRIBUTOR: 'contributor',
  VIEWER: 'viewer'
} as const;

export type RoleKey = (typeof Roles)[keyof typeof Roles];

export const Permissions = {
  MANAGE_USERS: 'user:manage',
  STAKEHOLDER_CREATE: 'stakeholder:create',
  STAKEHOLDER_UPDATE_STATUS: 'stakeholder:update_status',
  STAKEHOLDER_VIEW: 'stakeholder:view',
  AUDIT_VIEW: 'audit:view'
} as const;

export type PermissionKey = (typeof Permissions)[keyof typeof Permissions];

const rolePermissions: Record<RoleKey, PermissionKey[] | ['*']> = {
  [Roles.ADMIN]: ['*'],
  [Roles.MANAGER]: [
    Permissions.STAKEHOLDER_CREATE,
    Permissions.STAKEHOLDER_UPDATE_STATUS,
    Permissions.STAKEHOLDER_VIEW,
    Permissions.AUDIT_VIEW
  ],
  [Roles.CONTRIBUTOR]: [Permissions.STAKEHOLDER_CREATE, Permissions.STAKEHOLDER_UPDATE_STATUS, Permissions.STAKEHOLDER_VIEW],
  [Roles.VIEWER]: [Permissions.STAKEHOLDER_VIEW]
};

export function resolvePermissionsForRole(role: RoleKey): PermissionKey[] | ['*'] {
  return rolePermissions[role] ?? [];
}

function hasOrgScope(user: AppUser, scope?: RequestScope) {
  if (!scope?.orgId) {
    return true;
  }
  if (!user.orgId) {
    return false;
  }
  return user.orgId === scope.orgId;
}

export function can(user: AppUser | undefined, permission: PermissionKey, scope?: RequestScope): boolean {
  if (!user) {
    return false;
  }

  if (!hasOrgScope(user, scope)) {
    return false;
  }

  const explicit = user.permissions?.includes(permission) || user.permissions?.includes('*');
  if (explicit) {
    return true;
  }

  for (const role of user.roles) {
    if (!rolePermissions[role as RoleKey]) {
      continue;
    }
    const permissionsForRole = resolvePermissionsForRole(role as RoleKey);
    if (permissionsForRole[0] === '*') {
      return true;
    }
    if (permissionsForRole.includes(permission)) {
      return true;
    }
  }

  return false;
}
