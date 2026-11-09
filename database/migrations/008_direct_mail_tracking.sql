-- Migration 008: Direct Mail Tracking, CrownKey Scanner, and smrtPhone Telephony

CREATE TABLE IF NOT EXISTS core.direct_mail_pieces (
    piece_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code TEXT NOT NULL,
    crown_key TEXT NOT NULL,
    county_code TEXT NOT NULL,
    pillar_code TEXT NOT NULL,
    property_id UUID,
    address TEXT NOT NULL,
    owner_name TEXT,
    tracking_phone TEXT,
    qr_tracking_url TEXT,
    status TEXT NOT NULL DEFAULT 'PRINTED',
    scans_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_scanned_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS core.direct_mail_scans (
    scan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piece_id UUID,
    crown_key TEXT NOT NULL,
    pillar_code TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    city TEXT,
    region TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cta_converted BOOLEAN DEFAULT false,
    converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_direct_mail_pieces_key ON core.direct_mail_pieces(crown_key);
CREATE INDEX IF NOT EXISTS idx_direct_mail_pieces_pillar ON core.direct_mail_pieces(pillar_code);
CREATE INDEX IF NOT EXISTS idx_direct_mail_scans_key ON core.direct_mail_scans(crown_key);

