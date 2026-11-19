-- County records pushed to skip tracing are stored as leads with status QUEUED_FOR_SKIP_TRACE,
-- but the status check did not allow that value, so the push failed. Allow it.
ALTER TABLE core.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE core.leads ADD CONSTRAINT leads_status_check CHECK (status = ANY (ARRAY['NEW','CONTACTED','QUALIFIED','OFFER','CONTRACT','CLOSED','FOLLOW_UP','LOST','QUEUED_FOR_SKIP_TRACE']::text[]));
