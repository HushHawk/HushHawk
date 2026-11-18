-- ============================================================================
-- 022_production_hardening.sql
-- Closes the gaps between the CrownKey master specification and the schema:
--   * tables the code already queried but no migration created
--   * persistent application settings (replaces the JSON file)
--   * full attribution model (source / method / platform / medium / campaign)
--   * immutable first source on leads
--   * atomic per-property/pillar event numbering inside SQL
--   * relationship tables required by the spec
--   * pillar dictionary governance (only the 29 deck pillars stay live)
--   * append-only audit trail
-- Safe to re-run.
-- ============================================================================

-- 1. Tables referenced by code but never created ----------------------------
CREATE TABLE IF NOT EXISTS crm.cash_buyers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    buy_box TEXT,
    status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.stage_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id TEXT NOT NULL,
    stage_key TEXT NOT NULL,
    stage_state TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (deal_id, stage_key)
);

-- 2. Persistent settings -----------------------------------------------------
CREATE TABLE IF NOT EXISTS ops.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Attribution model --------------------------------------------------------
ALTER TABLE core.leads
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES core.campaigns(campaign_id),
    ADD COLUMN IF NOT EXISTS first_source_recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS attribution_confidence TEXT NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (attribution_confidence IN ('VERIFIED', 'REPORTED', 'UNVERIFIED')),
    ADD COLUMN IF NOT EXISTS first_attribution_evidence TEXT;

-- Interaction methods become the 15 spec contact methods.
ALTER TABLE core.interactions DROP CONSTRAINT IF EXISTS interactions_method_check;
UPDATE core.interactions SET method = 'WEBFORM' WHERE method = 'FORM';
UPDATE core.interactions SET method = 'INPERSON' WHERE method = 'VISIT';
UPDATE core.interactions SET method = 'MAIL' WHERE method = 'DIRECT_MAIL';
ALTER TABLE core.interactions ADD CONSTRAINT interactions_method_check CHECK (method IN (
    'CALL','TEXT','EMAIL','WEBFORM','DM','COMMENT','CHAT','WHATSAPP','INPERSON',
    'MAIL','VOICEMAIL','WEBCHAT','IMPORT','OTHER','UNKNOWN'));

ALTER TABLE core.interactions
    ADD COLUMN IF NOT EXISTS platform_code TEXT,
    ADD COLUMN IF NOT EXISTS medium TEXT CHECK (medium IS NULL OR medium IN ('PAID','ORGANIC','OFFLINE','OUTREACH','REFERRAL','UNKNOWN')),
    ADD COLUMN IF NOT EXISTS placement TEXT,
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES core.campaigns(campaign_id),
    ADD COLUMN IF NOT EXISTS utm JSONB;

-- Touchpoints: later responses are appended here, never overwriting leads.first_source_code.
CREATE TABLE IF NOT EXISTS core.attribution_touchpoints (
    touchpoint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES core.leads(lead_id) ON DELETE CASCADE,
    source_code TEXT REFERENCES ref.lead_sources(source_code),
    contact_method TEXT,
    platform_code TEXT,
    medium TEXT,
    campaign_id UUID REFERENCES core.campaigns(campaign_id),
    utm JSONB,
    evidence TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_touchpoints_lead ON core.attribution_touchpoints(lead_id, occurred_at);

-- 4. first_source_code is immutable unless an audited correction session flag is set
CREATE OR REPLACE FUNCTION core.guard_first_source() RETURNS trigger AS $$
BEGIN
    IF OLD.first_source_code IS NOT NULL
       AND NEW.first_source_code IS DISTINCT FROM OLD.first_source_code
       AND coalesce(current_setting('hushhawk.attribution_correction', true), 'off') <> 'on' THEN
        RAISE EXCEPTION 'first_source_code is immutable. Record a new touchpoint instead, or use an approved correction.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_first_source ON core.leads;
CREATE TRIGGER trg_guard_first_source BEFORE UPDATE ON core.leads
    FOR EACH ROW EXECUTE FUNCTION core.guard_first_source();

-- 5. Atomic event numbering ----------------------------------------------------
-- A single INSERT .. ON CONFLICT DO UPDATE takes the row lock for (property, pillar),
-- so two concurrent callers can never receive the same number.
CREATE OR REPLACE FUNCTION ops.allocate_event_number(p_property UUID, p_pillar TEXT) RETURNS BIGINT AS $$
DECLARE n BIGINT;
BEGIN
    INSERT INTO ops.event_counters (property_id, pillar_code, last_number)
    VALUES (p_property, p_pillar, 1)
    ON CONFLICT (property_id, pillar_code)
    DO UPDATE SET last_number = ops.event_counters.last_number + 1
    RETURNING last_number INTO n;
    RETURN n;
END;
$$ LANGUAGE plpgsql;

-- Same case cannot become two events for one property+pillar.
-- Created defensively: if legacy duplicates exist the index is skipped with a notice and
-- must be resolved through the review queue, rather than blocking the whole migration.
DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_pillar_events_case
        ON core.pillar_events (property_id, pillar_code, upper(btrim(case_reference)))
        WHERE case_reference IS NOT NULL AND btrim(case_reference) <> '';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Duplicate case references exist in core.pillar_events; uq_pillar_events_case not created.';
END $$;

DO $$
BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_pillar_events_external
        ON core.pillar_events (property_id, pillar_code, upper(btrim(external_event_id)))
        WHERE external_event_id IS NOT NULL AND btrim(external_event_id) <> '';
EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'Duplicate external event ids exist in core.pillar_events; uq_pillar_events_external not created.';
END $$;

-- 6. Relationship and operations tables required by the specification ----------
CREATE TABLE IF NOT EXISTS core.contact_roles (
    person_id UUID REFERENCES core.people(person_id) ON DELETE CASCADE,
    business_id UUID REFERENCES core.businesses(business_id) ON DELETE CASCADE,
    role_code TEXT NOT NULL REFERENCES ref.person_roles(role_code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((person_id IS NOT NULL) <> (business_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_roles_person ON core.contact_roles (person_id, role_code) WHERE person_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_contact_roles_business ON core.contact_roles (business_id, role_code) WHERE business_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS core.property_contact_links (
    link_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES core.properties(property_id),
    person_id UUID REFERENCES core.people(person_id),
    business_id UUID REFERENCES core.businesses(business_id),
    relationship TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'POSSIBLE' CHECK (verification_status IN ('CONFIRMED','POSSIBLE','NEEDS_REVIEW','REJECTED')),
    evidence_id UUID,
    approved_by TEXT,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((person_id IS NOT NULL) <> (business_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS core.lead_property_links (
    lead_id UUID NOT NULL REFERENCES core.leads(lead_id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES core.properties(property_id),
    verification_status TEXT NOT NULL DEFAULT 'POSSIBLE' CHECK (verification_status IN ('CONFIRMED','POSSIBLE','NEEDS_REVIEW','REJECTED')),
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (lead_id, property_id)
);

CREATE TABLE IF NOT EXISTS core.lead_event_links (
    lead_id UUID NOT NULL REFERENCES core.leads(lead_id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES core.pillar_events(event_id),
    verification_status TEXT NOT NULL DEFAULT 'POSSIBLE' CHECK (verification_status IN ('CONFIRMED','POSSIBLE','NEEDS_REVIEW','REJECTED')),
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (lead_id, event_id)
);

CREATE TABLE IF NOT EXISTS core.property_lineage (
    lineage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predecessor_id UUID NOT NULL REFERENCES core.properties(property_id),
    successor_id UUID NOT NULL REFERENCES core.properties(property_id),
    change_type TEXT NOT NULL CHECK (change_type IN ('SPLIT','MERGE','CORRECTION','RENUMBER')),
    effective_date DATE,
    evidence_note TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (predecessor_id <> successor_id)
);

CREATE TABLE IF NOT EXISTS raw.source_observations (
    observation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_record_id UUID NOT NULL REFERENCES raw.source_records(source_record_id),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    record_hash TEXT,
    changed_fields JSONB
);

CREATE TABLE IF NOT EXISTS ops.import_jobs (
    import_job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_system TEXT NOT NULL,
    county_id UUID REFERENCES ref.counties(county_id),
    import_type TEXT NOT NULL CHECK (import_type IN ('PROPERTY','EVENT','EVIDENCE','CONTACT','LEAD')),
    schema_version TEXT,
    status TEXT NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('UPLOADING','VALIDATING','PROCESSING','COMPLETED','FAILED')),
    created_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    unchanged_count INTEGER NOT NULL DEFAULT 0,
    rejected_count INTEGER NOT NULL DEFAULT 0,
    review_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ops.import_job_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_job_id UUID NOT NULL REFERENCES ops.import_jobs(import_job_id) ON DELETE CASCADE,
    row_number INTEGER,
    outcome TEXT NOT NULL CHECK (outcome IN ('CREATED','UPDATED','UNCHANGED','REJECTED','REVIEW')),
    entity_id UUID,
    message TEXT
);

-- 7. Pillar dictionary governance ---------------------------------------------
-- Migration 018 force-approved every pillar. Only the 29 pillars defined in the
-- master guide remain live; the rest return to review until an administrator approves them.
UPDATE ref.pillars
SET review_status = 'NEEDS_REVIEW', production_enabled = FALSE
WHERE pillar_code NOT IN (
    'FC','TAX','ML','PRB','VAC','INH','CODE','FIRE','DIV','EVI','PFC','TCERT','TDEED','ABS','OOS',
    'LANDLORD','EQH','EQLOW','REO','SHORT','EXPL','FSBO','DOM','PRICE','REPAIR','CONDEMN','UTIL','HOA','COMLIEN');

-- 8. Append-only audit trail ----------------------------------------------------
CREATE OR REPLACE FUNCTION audit.block_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit.audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_append_only ON audit.audit_events;
CREATE TRIGGER trg_audit_append_only BEFORE UPDATE OR DELETE ON audit.audit_events
    FOR EACH ROW EXECUTE FUNCTION audit.block_mutation();

-- 9. Review decisions record reversal details -------------------------------------
ALTER TABLE rel.review_decisions
    ADD COLUMN IF NOT EXISTS reversal_reason TEXT,
    ADD COLUMN IF NOT EXISTS reversed_by TEXT,
    ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;

-- 10. Connector registry: real county / provider feeds are configured here, never hardcoded -----
CREATE TABLE IF NOT EXISTS ops.connectors (
    connector_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    county_code TEXT NOT NULL,
    pillar_code TEXT REFERENCES ref.pillars(pillar_code),
    connector_type TEXT NOT NULL DEFAULT 'HTTP_JSON' CHECK (connector_type IN ('HTTP_JSON', 'MANUAL_IMPORT')),
    feed_url TEXT,
    auth_env_var TEXT,
    records_path TEXT,
    field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    schedule_minutes INTEGER CHECK (schedule_minutes IS NULL OR schedule_minutes >= 5),
    parser_version TEXT NOT NULL DEFAULT 'v1',
    approval_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (approval_status IN ('APPROVED','NEEDS_REVIEW','RETIRED')),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_run_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Durable document store for CRM workspaces that were previously kept in a local JSON file.
--     Replaces backend/data/canonical_store.json so data survives redeploys.
CREATE TABLE IF NOT EXISTS ops.kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Deal funnel: no invented location, agency or source defaults ----------------------------
ALTER TABLE crm.deal_funnel
    ALTER COLUMN city DROP NOT NULL, ALTER COLUMN city DROP DEFAULT,
    ALTER COLUMN state DROP NOT NULL, ALTER COLUMN state DROP DEFAULT,
    ALTER COLUMN zip DROP NOT NULL, ALTER COLUMN zip DROP DEFAULT,
    ALTER COLUMN county DROP NOT NULL, ALTER COLUMN county DROP DEFAULT,
    ALTER COLUMN title_agency DROP DEFAULT,
    ALTER COLUMN source DROP DEFAULT;

-- 13. Integration lead sources used by webhooks (dictionary extensions beyond the 46 in the master guide)
INSERT INTO ref.lead_sources (source_code, source_name, source_group, definition, assignment_rule, review_status, production_enabled, dictionary_version)
VALUES
    ('BATCHLEADS', 'BatchLeads Push', 'INTEGRATION', 'Lead pushed from a BatchLeads list via webhook', 'Assigned only by the BatchLeads webhook', 'APPROVED', TRUE, 'v1.0'),
    ('PODIO', 'Podio CRM Sync', 'INTEGRATION', 'Imported from the Podio workspace', 'Podio webhook or scheduled sync', 'APPROVED', TRUE, 'v1.0')
ON CONFLICT (source_code) DO NOTHING;
