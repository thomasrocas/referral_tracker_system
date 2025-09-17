import { randomUUID } from 'crypto';
import { AuditService } from '../../audit/service.js';
import type { AppUser } from '../../auth/user.js';
import type { DBClient } from '../../db/types.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { allowedStatusTransitions } from './constants.js';
import type {
  CreateStakeholderInput,
  StakeholderRecord,
  UpdateStakeholderStatusInput
} from './types.js';

type StakeholderStatusRow = Pick<StakeholderRecord, 'id' | 'status' | 'org_id'>;

export class StakeholderService {
  constructor(private readonly db: DBClient, private readonly audit: AuditService) {}

  async createStakeholder(input: CreateStakeholderInput, actor: AppUser): Promise<{ id: string }> {
    const id = randomUUID();
    const orgId = input.orgId ?? actor.orgId ?? null;
    const ownerId = input.ownerId ?? actor.id;
    const meta = input.meta ?? {};

    await this.db.query(
      `INSERT INTO stakeholders (id, type, name, status, owner_id, org_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [id, input.type, input.name, 'created', ownerId ?? null, orgId, JSON.stringify(meta)]
    );

    if (ownerId) {
      await this.db.query(
        `INSERT INTO stakeholder_members (stakeholder_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (stakeholder_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [id, ownerId]
      );
    }

    await this.audit.log({
      actorId: actor.id,
      action: 'stakeholder.created',
      entity: 'stakeholder',
      entityId: id,
      meta: { type: input.type, name: input.name, orgId }
    });

    return { id };
  }

  async updateStatus(input: UpdateStakeholderStatusInput, actor: AppUser): Promise<void> {
    const { stakeholderId, status, reason } = input;
    const result = await this.db.query<StakeholderStatusRow>(
      `SELECT id, status, org_id FROM stakeholders WHERE id = $1`,
      [stakeholderId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Stakeholder not found', { stakeholderId });
    }

    const record = result.rows[0];
    if (record.org_id && actor.orgId && record.org_id !== actor.orgId) {
      throw new ForbiddenError('Cross-organization update rejected', {
        stakeholderOrgId: record.org_id,
        actorOrgId: actor.orgId
      });
    }

    const current = record.status;
    if (current === status) {
      return;
    }

    const allowed = allowedStatusTransitions[current];
    if (!allowed?.includes(status)) {
      throw new ConflictError('Status transition not allowed', {
        from: current,
        to: status
      });
    }

    await this.db.query(
      `UPDATE stakeholders SET status = $2, updated_at = NOW() WHERE id = $1`,
      [stakeholderId, status]
    );

    await this.audit.log({
      actorId: actor.id,
      action: 'stakeholder.status_changed',
      entity: 'stakeholder',
      entityId: stakeholderId,
      meta: { from: current, to: status, reason }
    });
  }
}
