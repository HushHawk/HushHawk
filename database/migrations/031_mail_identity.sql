-- The sender identity printed on the in-house premium letters and envelopes (one row).
CREATE TABLE IF NOT EXISTS crm.mail_settings (
    id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    company_name   TEXT,
    return_address TEXT,
    phone          TEXT,
    website        TEXT,
    sender_name    TEXT,
    updated_by     TEXT,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
