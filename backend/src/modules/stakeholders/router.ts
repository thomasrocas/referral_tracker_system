import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/require-auth.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { Permissions } from '../../rbac/policies.js';
import { validateBody } from '../../utils/validate.js';
import type { StakeholderService } from './service.js';
import {
  createStakeholderSchema,
  updateStakeholderStatusSchema
} from './validation.js';

export function createStakeholderRouter(deps: { stakeholderService: StakeholderService }) {
  const router = Router();

  router.post(
    '/',
    requireAuth,
    validateBody(createStakeholderSchema),
    requirePermission(Permissions.STAKEHOLDER_CREATE, (req) => ({
      orgId: (req.body as { orgId?: string }).orgId ?? req.user?.orgId ?? null
    })),
    async (req, res, next) => {
      try {
        const payload = req.body as z.infer<typeof createStakeholderSchema>;
        const result = await deps.stakeholderService.createStakeholder(payload, req.user!);
        res.status(201).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/:id/status',
    requireAuth,
    validateBody(updateStakeholderStatusSchema),
    requirePermission(Permissions.STAKEHOLDER_UPDATE_STATUS, (req) => ({
      orgId: req.user?.orgId ?? null
    })),
    async (req, res, next) => {
      try {
        const payload = req.body as z.infer<typeof updateStakeholderStatusSchema>;
        await deps.stakeholderService.updateStatus(
          {
            stakeholderId: req.params.id,
            status: payload.status,
            reason: payload.reason
          },
          req.user!
        );
        res.status(204).send();
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
