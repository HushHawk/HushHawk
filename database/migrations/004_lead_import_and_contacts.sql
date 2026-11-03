-- Migration 004: Enhanced Contact Ladder and Metadata for Bulk Ingestion
-- HushHawk Milestone 1: Multi-phone ladder, secondary emails, and structured metadata

ALTER TABLE core.people ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]'::jsonb;
ALTER TABLE core.people ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;
ALTER TABLE core.people ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE core.leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE core.properties ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_people_primary_phone ON core.people (primary_phone);
CREATE INDEX IF NOT EXISTS idx_people_primary_email ON core.people (primary_email);
CREATE INDEX IF NOT EXISTS idx_properties_parcel_match ON core.properties (parcel_match);
CREATE INDEX IF NOT EXISTS idx_leads_source ON core.leads (first_source_code);
