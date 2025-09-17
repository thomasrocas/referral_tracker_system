import type { DBClient } from '../db/types.js';

export interface AuditLogInput {
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Record<string, unknown>;
}

export class AuditService {
  constructor(private readonly db: DBClient) {}

  async log(entry: AuditLogInput): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_log (actor_id, action, entity, entity_id, meta)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [entry.actorId, entry.action, entry.entity, entry.entityId, JSON.stringify(entry.meta ?? {})]
    );
  }
}
