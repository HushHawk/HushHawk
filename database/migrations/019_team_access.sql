CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS core.roles (
    role_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE core.users
    DROP CONSTRAINT IF EXISTS users_role_check,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS custom_role_id UUID,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS password_plain TEXT,
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE core.users ALTER COLUMN password_plain DROP NOT NULL;
ALTER TABLE core.users ALTER COLUMN password_plain DROP DEFAULT;

UPDATE core.users
SET password_hash = crypt(password_plain, gen_salt('bf', 10)), password_plain = NULL
WHERE password_hash IS NULL AND password_plain IS NOT NULL AND octet_length(password_plain) BETWEEN 1 AND 72;

INSERT INTO core.roles (role_key, name, description, permissions, is_system) VALUES
    ('SUPER_ADMIN', 'Administrator', 'Full workspace and team access.', '[]', true),
    ('ACQUISITIONS_REP', 'Acquisitions Representative', 'Seller and acquisition workflows.', '["/home","/seller-leads","/acquisitions","/follow-ups","/contacts","/tasks","/calendar","/communications"]', true),
    ('DISPOSITIONS_REP', 'Dispositions Representative', 'Dispositions and buyer workflows.', '["/home","/dispositions","/cash-buyers","/deal-analyzer","/contacts","/communications"]', true),
    ('MARKETING_LEAD', 'Marketing Lead', 'Campaigns and lead sources.', '["/home","/marketing","/direct-mail","/facebook-leads","/county-data"]', true),
    ('FIELD_OPS', 'Field Operations', 'Property and task workflows.', '["/home","/properties","/vault","/tasks"]', true),
    ('DIRECT_MAIL_SPECIALIST', 'Direct Mail Specialist', 'Direct Mail campaigns.', '["/home","/direct-mail"]', true)
ON CONFLICT (role_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS core.user_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES core.users(user_id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON core.user_sessions(user_id);
