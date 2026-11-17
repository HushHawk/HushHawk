-- Migration 010: Canonical PostgreSQL Deal-Flow Funnel (12 Milestones)
-- Schema: crm.deal_funnel linked to core.properties and core.people

CREATE TABLE IF NOT EXISTS crm.deal_funnel (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    milestone_index INTEGER NOT NULL CHECK (milestone_index BETWEEN 0 AND 11),
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    person_id UUID REFERENCES core.people(person_id) ON DELETE SET NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Jacksonville',
    state TEXT NOT NULL DEFAULT 'FL',
    zip TEXT NOT NULL DEFAULT '32204',
    county TEXT NOT NULL DEFAULT 'Duval',
    seller TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    buyer TEXT DEFAULT '—',
    buy_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    arv NUMERIC(12, 2) NOT NULL DEFAULT 0,
    repairs NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    title_agency TEXT DEFAULT 'First American Title Jax',
    file_number TEXT,
    closing_date DATE,
    days_in_stage INTEGER NOT NULL DEFAULT 0,
    source TEXT DEFAULT 'Direct Mail',
    notes TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_funnel_milestone ON crm.deal_funnel(milestone_index);
CREATE INDEX IF NOT EXISTS idx_deal_funnel_property ON crm.deal_funnel(property_id);
