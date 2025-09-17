import { z } from 'zod';
import { StakeholderStatuses, StakeholderTypes } from './constants.js';

export const createStakeholderSchema = z
  .object({
    type: z.enum(StakeholderTypes),
    name: z.string().min(1),
    ownerId: z.string().uuid().optional(),
    orgId: z.string().uuid().optional(),
    meta: z.record(z.any()).optional()
  })
  .strict();

export const updateStakeholderStatusSchema = z
  .object({
    status: z.enum(StakeholderStatuses),
    reason: z.string().min(2).max(280).optional()
  })
  .strict();
