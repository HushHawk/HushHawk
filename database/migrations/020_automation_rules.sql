CREATE TABLE IF NOT EXISTS ops.automation_rules (
    rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    trigger_code text NOT NULL CHECK (trigger_code IN ('manual', 'batchleads_lead', 'podio_lead')),
    action_code text NOT NULL CHECK (action_code IN ('notification', 'task')),
    action_text text NOT NULL,
    enabled boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS automation_rules_trigger_idx
    ON ops.automation_rules (trigger_code) WHERE enabled AND archived_at IS NULL;

CREATE TABLE IF NOT EXISTS ops.automation_runs (
    run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id uuid NOT NULL REFERENCES ops.automation_rules (rule_id),
    rule_name text NOT NULL,
    trigger_code text NOT NULL,
    action_code text NOT NULL,
    event_key text NOT NULL,
    target text,
    actor text NOT NULL,
    status text NOT NULL CHECK (status IN ('succeeded', 'failed')),
    result_id uuid,
    error text,
    duration_ms integer NOT NULL CHECK (duration_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (rule_id, event_key)
);

CREATE INDEX IF NOT EXISTS automation_runs_created_idx ON ops.automation_runs (created_at DESC);
