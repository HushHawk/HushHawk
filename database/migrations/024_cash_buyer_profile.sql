-- Cash buyers keep their buy box as real columns instead of being re-derived (or invented) on every request.
ALTER TABLE crm.cash_buyers
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS zips TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS price_min NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS price_max NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS property_types TEXT,
    ADD COLUMN IF NOT EXISTS pof_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS podio_item_id TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Contacts rolodex: real columns instead of values assembled (or invented) at read time.
ALTER TABLE crm.seller_contacts
    ADD COLUMN IF NOT EXISTS company TEXT,
    ADD COLUMN IF NOT EXISTS contact_type TEXT,
    ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS podio_item_id TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE crm.seller_contacts ALTER COLUMN lead_status DROP DEFAULT;
ALTER TABLE crm.seller_contacts ALTER COLUMN lead_score DROP DEFAULT;
