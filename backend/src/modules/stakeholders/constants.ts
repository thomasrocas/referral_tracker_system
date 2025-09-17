export const StakeholderTypes = [
  'referrer',
  'md',
  'facility',
  'payer',
  'patient_contact',
  'internal'
] as const;

export type StakeholderType = (typeof StakeholderTypes)[number];

export const StakeholderStatuses = [
  'created',
  'engaged',
  'active',
  'dormant',
  'archived'
] as const;

export type StakeholderStatus = (typeof StakeholderStatuses)[number];

export const StakeholderMemberRoles = ['owner', 'collaborator', 'viewer'] as const;
export type StakeholderMemberRole = (typeof StakeholderMemberRoles)[number];

export const allowedStatusTransitions: Record<StakeholderStatus, StakeholderStatus[]> = {
  created: ['engaged', 'archived'],
  engaged: ['active', 'dormant', 'archived'],
  active: ['dormant', 'archived'],
  dormant: ['active', 'archived'],
  archived: []
};
