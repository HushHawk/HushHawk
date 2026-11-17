-- Migration 014: Canonical PostgreSQL Tables for Executive Outreach Action Boxes
-- Creates queues for physical mail, phone, SMS and email.

-- 1. Outreach Mailer Selected Queue
CREATE TABLE IF NOT EXISTS core.outreach_mailers (
    id TEXT PRIMARY KEY,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    property_address TEXT NOT NULL,
    city TEXT DEFAULT 'Jacksonville',
    state TEXT DEFAULT 'FL',
    zip TEXT NOT NULL,
    equity_estimate NUMERIC DEFAULT 85000,
    distress_category TEXT NOT NULL DEFAULT 'Foreclosure', -- 'Foreclosure', 'Default', 'Cash'
    template_type TEXT NOT NULL DEFAULT 'Yellow Letter Cash Offer',
    status TEXT NOT NULL DEFAULT 'READY', -- 'READY', 'BATCHED', 'DISPATCHED'
    batch_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Outreach Call Queue (Seller Follow-ups)
CREATE TABLE IF NOT EXISTS core.outreach_calls (
    id TEXT PRIMARY KEY,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    property_address TEXT NOT NULL,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'High', -- 'High', 'Overdue', 'Normal'
    cadence_stage TEXT NOT NULL DEFAULT 'Post-Offer Follow-Up',
    notes TEXT,
    last_call_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'RESCHEDULED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Outreach Text Queue (Opted-in SMS Contacts)
CREATE TABLE IF NOT EXISTS core.outreach_texts (
    id TEXT PRIMARY KEY,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    property_address TEXT NOT NULL,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    opt_in_date TIMESTAMPTZ NOT NULL DEFAULT now() - INTERVAL '2 days',
    last_inbound_snippet TEXT,
    recommended_template TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'SENT', 'REPLIED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Outreach Email Queue (Title / Buyer Follow-ups)
CREATE TABLE IF NOT EXISTS core.outreach_emails (
    id TEXT PRIMARY KEY,
    recipient_name TEXT NOT NULL,
    recipient_role TEXT NOT NULL DEFAULT 'Title Officer', -- 'Title Officer', 'Cash Buyer', 'Escrow Agent', 'Acquisitions'
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    property_address TEXT NOT NULL,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    body_snippet TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'SENT'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_mailers_status ON core.outreach_mailers(status);
CREATE INDEX IF NOT EXISTS idx_outreach_calls_status ON core.outreach_calls(status, priority);
CREATE INDEX IF NOT EXISTS idx_outreach_texts_status ON core.outreach_texts(status);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_status ON core.outreach_emails(status);
