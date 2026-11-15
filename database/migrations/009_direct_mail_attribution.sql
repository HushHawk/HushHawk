-- A legacy CrownKey may identify more than one mail piece. Link only
-- scans that had exactly one eligible piece when they occurred.
WITH candidates AS (
    SELECT s.scan_id, (array_agg(p.piece_id))[1] AS piece_id
    FROM core.direct_mail_scans s
    JOIN core.direct_mail_pieces p
      ON p.crown_key = s.crown_key AND p.created_at <= s.scanned_at
    WHERE s.piece_id IS NULL
    GROUP BY s.scan_id
    HAVING count(*) = 1
)
UPDATE core.direct_mail_scans s
SET piece_id = candidates.piece_id
FROM candidates
WHERE s.scan_id = candidates.scan_id;

UPDATE core.direct_mail_scans
SET cta_converted = false
WHERE cta_converted IS TRUE AND converted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_direct_mail_scans_piece ON core.direct_mail_scans(piece_id);

CREATE TABLE IF NOT EXISTS core.direct_mail_callback_requests (
    scan_id UUID PRIMARY KEY REFERENCES core.direct_mail_scans(scan_id),
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
