import type { StakeholderStatus, StakeholderType } from './constants.js';

export interface StakeholderRecord {
  id: string;
  type: StakeholderType;
  name: string;
  status: StakeholderStatus;
  owner_id: string | null;
  org_id: string | null;
  meta: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStakeholderInput {
  type: StakeholderType;
  name: string;
  ownerId?: string;
  orgId?: string | null;
  meta?: Record<string, unknown>;
}

export interface UpdateStakeholderStatusInput {
  stakeholderId: string;
  status: StakeholderStatus;
  reason?: string;
}
