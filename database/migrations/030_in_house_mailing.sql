-- In-house mailing: our own letters and envelopes, printed and packed by us (no mail vendor).
-- Each touch (1 first outreach, 2 follow-up, 3 final courtesy) has one letter and one matching envelope.
CREATE TABLE IF NOT EXISTS crm.mail_templates (
    template_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    touch        SMALLINT NOT NULL CHECK (touch BETWEEN 1 AND 3),
    kind         TEXT NOT NULL CHECK (kind IN ('LETTER', 'ENVELOPE')),
    filename     TEXT NOT NULL,
    content_type TEXT NOT NULL,
    object_key   TEXT NOT NULL,
    size_bytes   INTEGER,
    pages        INTEGER NOT NULL DEFAULT 1,
    placement    JSONB NOT NULL DEFAULT '{}'::jsonb,
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_templates_active ON crm.mail_templates (touch, kind) WHERE active;

CREATE TABLE IF NOT EXISTS crm.mail_runs (
    run_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_code             TEXT NOT NULL UNIQUE,
    touch                SMALLINT NOT NULL CHECK (touch BETWEEN 1 AND 3),
    label                TEXT,
    letter_template_id   UUID REFERENCES crm.mail_templates(template_id),
    envelope_template_id UUID REFERENCES crm.mail_templates(template_id),
    piece_count          INTEGER NOT NULL DEFAULT 0,
    options              JSONB NOT NULL DEFAULT '{}'::jsonb,
    status               TEXT NOT NULL DEFAULT 'READY' CHECK (status IN ('READY', 'MAILED')),
    created_by           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    mailed_at            TIMESTAMPTZ
);

CREATE SEQUENCE IF NOT EXISTS crm.mail_piece_seq;

ALTER TABLE core.direct_mail_pieces ADD COLUMN IF NOT EXISTS run_id UUID;
ALTER TABLE core.direct_mail_pieces ADD COLUMN IF NOT EXISTS touch SMALLINT;
ALTER TABLE core.direct_mail_pieces ADD COLUMN IF NOT EXISTS mailpiece_id TEXT;
ALTER TABLE core.direct_mail_pieces ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE core.direct_mail_pieces ADD COLUMN IF NOT EXISTS mailing_address TEXT;
ALTER TABLE core.direct_mail_pieces ADD COLUMN IF NOT EXISTS parcel TEXT;
ALTER TABLE core.direct_mail_pieces ADD COLUMN IF NOT EXISTS mailed_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_piece_id ON core.direct_mail_pieces (mailpiece_id) WHERE mailpiece_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_piece_token ON core.direct_mail_pieces (token) WHERE token IS NOT NULL;
-- one piece per property per touch, so nobody is mailed the same touch twice
CREATE UNIQUE INDEX IF NOT EXISTS uq_mail_piece_property_touch ON core.direct_mail_pieces (property_id, touch) WHERE touch IS NOT NULL AND property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mail_pieces_run ON core.direct_mail_pieces (run_id);
