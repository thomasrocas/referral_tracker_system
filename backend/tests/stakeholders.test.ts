import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import { newDb } from 'pg-mem';
import { createApp } from '../src/app.js';
import type { AppUser } from '../src/auth/user.js';
import type { DBClient } from '../src/db/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function encodeUser(user: AppUser): string {
  return Buffer.from(JSON.stringify(user), 'utf8').toString('base64');
}

describe('Stakeholder API', () => {
  let app: ReturnType<typeof createApp>;
  let dbClient: DBClient & { end?: () => Promise<void> };

  beforeAll(async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const migrationSql = fs.readFileSync(path.resolve(__dirname, '../migrations/001_init.sql'), 'utf8');
    db.public.none(migrationSql);

    const pg = db.adapters.createPg();
    const pool = new pg.Pool();
    dbClient = pool as unknown as DBClient & { end?: () => Promise<void> };
    app = createApp({ db: dbClient });

    await pool.query(
      `INSERT INTO users (id, email, name, org_id)
       VALUES
         ('11111111-1111-1111-1111-111111111111', 'manager@example.com', 'Manager', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
         ('22222222-2222-2222-2222-222222222222', 'viewer@example.com', 'Viewer', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')`
    );
  });

  afterAll(async () => {
    if (dbClient && 'end' in dbClient && typeof dbClient.end === 'function') {
      await dbClient.end();
    }
  });

  it('rejects unauthenticated stakeholder creation', async () => {
    await request(app)
      .post('/api/stakeholders')
      .send({})
      .expect(401);
  });

  it('blocks viewer role from creating stakeholders', async () => {
    const viewer: AppUser = {
      id: '22222222-2222-2222-2222-222222222222',
      roles: ['viewer'],
      orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };

    await request(app)
      .post('/api/stakeholders')
      .set('x-user', encodeUser(viewer))
      .send({
        type: 'facility',
        name: 'Viewer Facility'
      })
      .expect(403);
  });

  it('creates stakeholder and records audit trail', async () => {
    const manager: AppUser = {
      id: '11111111-1111-1111-1111-111111111111',
      roles: ['manager'],
      orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };

    const response = await request(app)
      .post('/api/stakeholders')
      .set('x-user', encodeUser(manager))
      .send({
        type: 'facility',
        name: 'Acme Health',
        meta: { notes: 'Priority lead' }
      })
      .expect(201);

    expect(response.body.id).toBeDefined();

    const { rows } = await (dbClient as any).query('SELECT status, meta FROM stakeholders WHERE id = $1', [
      response.body.id
    ]);
    expect(rows[0].status).toBe('created');
    expect(rows[0].meta.notes).toBe('Priority lead');

    const audit = await (dbClient as any).query(
      'SELECT action FROM audit_log WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 1',
      [response.body.id]
    );
    expect(audit.rows[0].action).toBe('stakeholder.created');
  });

  it('allows valid status transitions and audits them', async () => {
    const manager: AppUser = {
      id: '11111111-1111-1111-1111-111111111111',
      roles: ['manager'],
      orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };

    const createResponse = await request(app)
      .post('/api/stakeholders')
      .set('x-user', encodeUser(manager))
      .send({
        type: 'referrer',
        name: 'Cardio Partners'
      })
      .expect(201);

    const stakeholderId = createResponse.body.id;

    await request(app)
      .patch(`/api/stakeholders/${stakeholderId}/status`)
      .set('x-user', encodeUser(manager))
      .send({ status: 'engaged', reason: 'Kickoff call scheduled' })
      .expect(204);

    const { rows } = await (dbClient as any).query('SELECT status FROM stakeholders WHERE id = $1', [
      stakeholderId
    ]);
    expect(rows[0].status).toBe('engaged');

    const audit = await (dbClient as any).query(
      `SELECT action, meta FROM audit_log WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [stakeholderId]
    );
    expect(audit.rows[0].action).toBe('stakeholder.status_changed');
    expect(audit.rows[0].meta.to).toBe('engaged');
  });

  it('rejects invalid status transitions', async () => {
    const manager: AppUser = {
      id: '11111111-1111-1111-1111-111111111111',
      roles: ['manager'],
      orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };

    const createResponse = await request(app)
      .post('/api/stakeholders')
      .set('x-user', encodeUser(manager))
      .send({
        type: 'internal',
        name: 'Field Team'
      })
      .expect(201);

    const stakeholderId = createResponse.body.id;

    await request(app)
      .patch(`/api/stakeholders/${stakeholderId}/status`)
      .set('x-user', encodeUser(manager))
      .send({ status: 'active' })
      .expect(409);
  });

  it('prevents cross-organization updates', async () => {
    const otherStakeholderId = '33333333-3333-3333-3333-333333333333';
    await (dbClient as any).query(
      `INSERT INTO stakeholders (id, type, name, status, owner_id, org_id, meta)
       VALUES ($1, 'facility', 'Out of Org', 'engaged', NULL, $2, '{}'::jsonb)`,
      [otherStakeholderId, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']
    );

    const manager: AppUser = {
      id: '11111111-1111-1111-1111-111111111111',
      roles: ['manager'],
      orgId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    };

    await request(app)
      .patch(`/api/stakeholders/${otherStakeholderId}/status`)
      .set('x-user', encodeUser(manager))
      .send({ status: 'active' })
      .expect(403);
  });
});
