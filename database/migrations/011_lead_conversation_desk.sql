-- Migration 011: Canonical PostgreSQL Lead Conversation Desk (v2)
-- Realtime multi-platform lead communication hub with 16 platforms

CREATE TABLE IF NOT EXISTS core.conversation_desk_platforms (
    platform_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    lead_count INTEGER NOT NULL DEFAULT 0,
    unread_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.conversation_desk_threads (
    id TEXT PRIMARY KEY,
    platform_id TEXT NOT NULL REFERENCES core.conversation_desk_platforms(platform_id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    contact_phone TEXT,
    contact_email TEXT,
    avatar_url TEXT,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    property_address TEXT NOT NULL,
    property_city TEXT DEFAULT 'Jacksonville',
    property_state TEXT DEFAULT 'FL',
    property_zip TEXT DEFAULT '32204',
    property_specs TEXT,
    property_image TEXT,
    lead_score INTEGER NOT NULL DEFAULT 75,
    priority TEXT NOT NULL DEFAULT 'Normal', -- 'High', 'Medium', 'Normal'
    status TEXT NOT NULL DEFAULT 'Matched Contact', -- 'Matched Contact', 'New Lead', 'In Escrow'
    unread_count INTEGER NOT NULL DEFAULT 0,
    ai_suggestion TEXT,
    last_message_preview TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.conversation_desk_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES core.conversation_desk_threads(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL, -- 'lead', 'rep', 'ai'
    sender_name TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_desk_threads_platform ON core.conversation_desk_threads(platform_id);
CREATE INDEX IF NOT EXISTS idx_desk_threads_priority ON core.conversation_desk_threads(priority);
CREATE INDEX IF NOT EXISTS idx_desk_messages_thread ON core.conversation_desk_messages(thread_id, sent_at ASC);

-- Seed the 16 Canonical Platforms
INSERT INTO core.conversation_desk_platforms (platform_id, name, color) VALUES
('facebook', 'Facebook', '#1877f2'),
('instagram', 'Instagram', '#e94f90'),
('tiktok', 'TikTok', '#69dce5'),
('youtube', 'YouTube', '#fa4545'),
('linkedin', 'LinkedIn', '#48a9e7'),
('x', 'X', '#e9eff9'),
('nextdoor', 'Nextdoor', '#91dd69'),
('reddit', 'Reddit', '#ff6c42'),
('whatsapp', 'WhatsApp', '#32d97b'),
('zillow', 'Zillow', '#6ba8ff'),
('trulia', 'Trulia', '#68d2a6'),
('yelp', 'Yelp', '#ff686b'),
('google', 'Google', '#79acff'),
('homesdotcom', 'Homes.com', '#ff9d64'),
('houzz', 'Houzz', '#83d960'),
('messenger', 'Messenger', '#65a1ff')
ON CONFLICT (platform_id) DO NOTHING;
