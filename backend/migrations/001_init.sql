CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope_program_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id, scope_program_id)
);

CREATE TABLE IF NOT EXISTS stakeholders (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL,
  owner_id UUID REFERENCES users(id),
  org_id UUID,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_status ON stakeholders(status);
CREATE INDEX IF NOT EXISTS idx_stakeholders_org ON stakeholders(org_id);

CREATE TABLE IF NOT EXISTS stakeholder_members (
  stakeholder_id UUID NOT NULL REFERENCES stakeholders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stakeholder_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);

INSERT INTO roles (key, label)
VALUES
  ('admin', 'Administrator'),
  ('manager', 'Manager'),
  ('contributor', 'Contributor'),
  ('viewer', 'Viewer')
ON CONFLICT (key) DO NOTHING;

INSERT INTO permissions (key, description)
VALUES
  ('user:manage', 'Manage users and roles'),
  ('stakeholder:create', 'Create stakeholders'),
  ('stakeholder:update_status', 'Update stakeholder status'),
  ('stakeholder:view', 'View stakeholder data'),
  ('audit:view', 'View audit log')
ON CONFLICT (key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  (r.key = 'admin' AND TRUE) OR
  (r.key = 'manager' AND p.key IN ('stakeholder:create', 'stakeholder:update_status', 'stakeholder:view', 'audit:view')) OR
  (r.key = 'contributor' AND p.key IN ('stakeholder:create', 'stakeholder:update_status', 'stakeholder:view')) OR
  (r.key = 'viewer' AND p.key = 'stakeholder:view')
)
ON CONFLICT DO NOTHING;
