-- 026: what kind of contact a "lead" really is.
-- Podio and the inbox create a lead for every email sender, so wholesalers, title companies, notification robots and the team's own
-- test records were being counted as seller leads. Each lead now carries a kind and the reason for it. Rules set it; a person can
-- override it, and a person's choice is never changed by a rule.
ALTER TABLE core.leads ADD COLUMN IF NOT EXISTS lead_kind TEXT NOT NULL DEFAULT 'NEEDS_REVIEW';
ALTER TABLE core.leads ADD COLUMN IF NOT EXISTS lead_kind_reason TEXT;
ALTER TABLE core.leads ADD COLUMN IF NOT EXISTS lead_kind_set_by TEXT;      -- NULL or 'rule' until a person decides
ALTER TABLE core.leads ADD COLUMN IF NOT EXISTS lead_kind_set_at TIMESTAMPTZ;
ALTER TABLE core.leads DROP CONSTRAINT IF EXISTS leads_lead_kind_check;
ALTER TABLE core.leads ADD CONSTRAINT leads_lead_kind_check CHECK (lead_kind IN ('SELLER','NEEDS_REVIEW','BUSINESS','AUTOMATED','INTERNAL'));
CREATE INDEX IF NOT EXISTS idx_leads_kind ON core.leads (lead_kind);
