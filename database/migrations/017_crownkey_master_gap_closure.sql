-- Backfill event counters from existing canonical events.
INSERT INTO ops.event_counters (property_id, pillar_code, last_number)
SELECT property_id, pillar_code, MAX(event_number) as last_number
FROM core.pillar_events
GROUP BY property_id, pillar_code
ON CONFLICT (property_id, pillar_code) DO UPDATE
SET last_number = GREATEST(ops.event_counters.last_number, EXCLUDED.last_number);
