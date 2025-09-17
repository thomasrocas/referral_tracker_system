import type { NextFunction, Request, Response } from 'express';
import type { RequestScope } from '../auth/user.js';
import { can, type PermissionKey } from '../rbac/policies.js';

export function requirePermission(
  permission: PermissionKey,
  resolveScope?: (req: Request) => RequestScope | undefined
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'auth_required' });
    }

    const scope = resolveScope ? resolveScope(req) : undefined;
    if (!can(req.user, permission, scope)) {
      return res.status(403).json({ error: 'forbidden', permission });
    }

    return next();
  };
}
