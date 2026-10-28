-- HUSHHAWK A-TO-Z SYSTEM BLUEPRINT
-- Migration 001: Initial Canonical PostgreSQL Foundation
-- Schemas: ref, raw, core, rel, crm, ops, audit

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Schema Namespaces
CREATE SCHEMA IF NOT EXISTS ref;
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS rel;
CREATE SCHEMA IF NOT EXISTS crm;
CREATE SCHEMA IF NOT EXISTS ops;
CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================================
-- SCHEMA: ref (Reference Data & Versioned Dictionaries)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ref.counties (
    county_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code TEXT NOT NULL,
    county_name TEXT NOT NULL,
    county_code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPROVED', 'RETIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(state_code, county_name)
);

CREATE TABLE IF NOT EXISTS ref.pillars (
    pillar_code TEXT PRIMARY KEY,
    pillar_name TEXT NOT NULL,
    definition TEXT NOT NULL,
    distinct_event_rule TEXT,
    evidence_required TEXT,
    review_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (review_status IN ('APPROVED', 'NEEDS_REVIEW', 'PROPOSED', 'RETIRED')),
    production_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    dictionary_version TEXT NOT NULL DEFAULT 'v1.0'
);

CREATE TABLE IF NOT EXISTS ref.lead_sources (
    source_code TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_group TEXT,
    definition TEXT,
    assignment_rule TEXT,
    review_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (review_status IN ('APPROVED', 'NEEDS_REVIEW', 'PROPOSED', 'RETIRED')),
    production_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    dictionary_version TEXT NOT NULL DEFAULT 'v1.0'
);

CREATE TABLE IF NOT EXISTS ref.platforms (
    platform_code TEXT PRIMARY KEY,
    platform_name TEXT NOT NULL,
    category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ref.contact_methods (
    method_code TEXT PRIMARY KEY,
    method_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ref.person_roles (
    role_code TEXT PRIMARY KEY,
    role_name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS ref.dictionary_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag TEXT NOT NULL UNIQUE,
    approved_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ref.code_aliases (
    alias_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    legacy_code TEXT NOT NULL,
    canonical_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SCHEMA: raw (Original Immutable Evidence & Connector Runs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS raw.connector_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'ALERT')),
    cursor_watermark TEXT,
    parser_version TEXT NOT NULL,
    records_fetched INTEGER NOT NULL DEFAULT 0,
    records_parsed INTEGER NOT NULL DEFAULT 0,
    records_quarantined INTEGER NOT NULL DEFAULT 0,
    records_changed INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS raw.source_records (
    source_record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_run_id UUID REFERENCES raw.connector_runs(run_id),
    source_system TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    source_external_id TEXT,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_url TEXT,
    payload JSONB NOT NULL,
    payload_hash TEXT NOT NULL,
    parser_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS source_record_external_identity_uq
ON raw.source_records(source_system, jurisdiction, source_external_id)
WHERE source_external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS raw.source_record_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_record_id UUID NOT NULL REFERENCES raw.source_records(source_record_id),
    payload JSONB NOT NULL,
    payload_hash TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw.attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_record_id UUID REFERENCES raw.source_records(source_record_id),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_uri TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SCHEMA: core (Canonical Truth Entities)
-- ============================================================================

-- Key Constraint: parcel_raw is TEXT, never numeric!
CREATE TABLE IF NOT EXISTS core.properties (
    property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    county_id UUID NOT NULL REFERENCES ref.counties(county_id),
    parcel_raw TEXT NOT NULL,
    parcel_match TEXT NOT NULL,
    address_line1 TEXT,
    city TEXT,
    state_code TEXT NOT NULL DEFAULT 'FL',
    postal_code TEXT,
    property_type TEXT,
    legal_description TEXT,
    assessed_value NUMERIC(14,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(county_id, parcel_match)
);

CREATE TABLE IF NOT EXISTS core.property_aliases (
    alias_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES core.properties(property_id),
    alias_parcel TEXT NOT NULL,
    alias_type TEXT NOT NULL,
    source TEXT NOT NULL,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    correction_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.people (
    person_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    primary_phone TEXT,
    primary_email TEXT,
    mailing_address TEXT,
    is_suppressed BOOLEAN NOT NULL DEFAULT FALSE,
    verification_level TEXT NOT NULL DEFAULT 'UNVERIFIED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.businesses (
    business_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'LLC',
    jurisdiction TEXT NOT NULL,
    registration_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    registered_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_source_code TEXT REFERENCES ref.lead_sources(source_code),
    source_detail TEXT,
    property_id UUID REFERENCES core.properties(property_id),
    person_id UUID REFERENCES core.people(person_id),
    status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'OFFER', 'CONTRACT', 'CLOSED', 'FOLLOW_UP', 'LOST')),
    priority_score INTEGER NOT NULL DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
    assigned_user_id TEXT,
    lost_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.pillar_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES core.properties(property_id),
    pillar_code TEXT NOT NULL REFERENCES ref.pillars(pillar_code),
    event_number BIGINT NOT NULL CHECK (event_number > 0),
    external_event_id TEXT,
    case_reference TEXT,
    event_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (event_status IN ('OPEN', 'RESOLVED', 'HISTORICAL', 'UNKNOWN')),
    verification_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (verification_status IN ('CONFIRMED', 'POSSIBLE', 'NEEDS_REVIEW', 'REJECTED')),
    event_date DATE,
    filing_amount NUMERIC(14,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(property_id, pillar_code, event_number)
);

CREATE TABLE IF NOT EXISTS core.campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.interactions (
    interaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES core.leads(lead_id),
    person_id UUID REFERENCES core.people(person_id),
    property_id UUID REFERENCES core.properties(property_id),
    method TEXT NOT NULL CHECK (method IN ('CALL', 'TEXT', 'EMAIL', 'FORM', 'VISIT', 'DIRECT_MAIL')),
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    actor_id TEXT NOT NULL,
    result TEXT,
    notes TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    owner_id TEXT NOT NULL,
    linked_entity_type TEXT NOT NULL,
    linked_entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS core.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'MANAGER', 'ACQUISITIONS', 'MARKETING', 'DATA_REVIEWER', 'DEVELOPER_OPS')),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SCHEMA: rel (Relationships, Match Candidates & Evidence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rel.entity_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_entity_type TEXT NOT NULL,
    from_entity_id UUID NOT NULL,
    to_entity_type TEXT NOT NULL,
    to_entity_id UUID NOT NULL,
    relationship_type TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (verification_status IN ('CONFIRMED', 'POSSIBLE', 'NEEDS_REVIEW', 'REJECTED')),
    confidence_score NUMERIC(5,2) DEFAULT 1.0,
    evidence_id UUID,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rel.event_evidence (
    evidence_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES core.pillar_events(event_id),
    source_record_id UUID NOT NULL REFERENCES raw.source_records(source_record_id),
    verification_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK (verification_status IN ('CONFIRMED', 'POSSIBLE', 'NEEDS_REVIEW', 'REJECTED')),
    observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    UNIQUE(event_id, source_record_id)
);

CREATE TABLE IF NOT EXISTS rel.identity_candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id_a UUID NOT NULL,
    entity_id_b UUID NOT NULL,
    ladder_rung INTEGER NOT NULL CHECK (ladder_rung BETWEEN 1 AND 6),
    confidence TEXT NOT NULL CHECK (confidence IN ('VERY_HIGH', 'HIGH', 'MEDIUM_HIGH', 'LOW', 'CONTRADICTORY')),
    match_features JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'DEFERRED', 'LINKED_ONLY', 'ESCALATED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rel.review_decisions (
    decision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES rel.identity_candidates(candidate_id),
    reviewer TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('CONFIRM', 'REJECT', 'DEFER', 'LINK_ONLY', 'ESCALATE')),
    reason TEXT NOT NULL,
    reversal_status TEXT NOT NULL DEFAULT 'NONE' CHECK (reversal_status IN ('NONE', 'REVERSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SCHEMA: crm (Pipeline & Sync Coexistence)
-- ============================================================================

CREATE TABLE IF NOT EXISTS crm.pipeline_stages (
    stage_key TEXT PRIMARY KEY,
    stage_name TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS crm.lead_stage_history (
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES core.leads(lead_id),
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_by TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.suppression_records (
    suppression_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier_type TEXT NOT NULL CHECK (identifier_type IN ('PHONE', 'EMAIL', 'MAILING_ADDRESS')),
    identifier_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.external_sync_map (
    sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_entity_type TEXT NOT NULL,
    internal_uuid UUID NOT NULL,
    external_system TEXT NOT NULL DEFAULT 'PODIO',
    external_app_id TEXT NOT NULL,
    external_item_id TEXT NOT NULL,
    last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_hash TEXT,
    status TEXT NOT NULL DEFAULT 'SYNCED' CHECK (status IN ('SYNCED', 'PENDING', 'CONFLICT', 'ERROR')),
    UNIQUE(internal_entity_type, internal_uuid, external_system)
);

-- ============================================================================
-- SCHEMA: ops (Machinery, Atomic Counters & Transactional Outbox)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ops.event_counters (
    property_id UUID NOT NULL REFERENCES core.properties(property_id),
    pillar_code TEXT NOT NULL REFERENCES ref.pillars(pillar_code),
    last_number BIGINT NOT NULL CHECK (last_number >= 0),
    PRIMARY KEY(property_id, pillar_code)
);

CREATE TABLE IF NOT EXISTS ops.outbox_events (
    outbox_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE TABLE IF NOT EXISTS ops.job_runs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'RUNNING',
    records_processed INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ops.job_errors (
    error_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES ops.job_runs(job_id),
    error_code TEXT NOT NULL,
    message TEXT NOT NULL,
    stack TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.review_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES rel.identity_candidates(candidate_id),
    priority INTEGER NOT NULL DEFAULT 1,
    assigned_reviewer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SCHEMA: audit (Append-Only Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit.audit_events (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    request_id TEXT,
    redacted_diff JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for optimal lookup & query performance
CREATE INDEX IF NOT EXISTS idx_pillar_events_property ON core.pillar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_source_records_observed ON raw.source_records(observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON ops.outbox_events(created_at) WHERE published_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON core.leads(status);
