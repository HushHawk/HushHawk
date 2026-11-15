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
INSERT INTO core.conversation_desk_platforms (platform_id, name, color, lead_count, unread_count) VALUES
('facebook', 'Facebook', '#1877f2', 237, 6),
('instagram', 'Instagram', '#e94f90', 124, 3),
('tiktok', 'TikTok', '#69dce5', 86, 2),
('youtube', 'YouTube', '#fa4545', 52, 1),
('linkedin', 'LinkedIn', '#48a9e7', 40, 1),
('x', 'X', '#e9eff9', 41, 0),
('nextdoor', 'Nextdoor', '#91dd69', 32, 2),
('reddit', 'Reddit', '#ff6c42', 26, 0),
('whatsapp', 'WhatsApp', '#32d97b', 22, 1),
('zillow', 'Zillow', '#6ba8ff', 21, 1),
('trulia', 'Trulia', '#68d2a6', 18, 0),
('yelp', 'Yelp', '#ff686b', 16, 0),
('google', 'Google', '#79acff', 18, 1),
('homesdotcom', 'Homes.com', '#ff9d64', 14, 0),
('houzz', 'Houzz', '#83d960', 11, 0),
('messenger', 'Messenger', '#65a1ff', 24, 2)
ON CONFLICT (platform_id) DO UPDATE SET
    lead_count = EXCLUDED.lead_count,
    unread_count = EXCLUDED.unread_count,
    updated_at = now();

-- Seed Real Threads & Messages
INSERT INTO core.conversation_desk_threads (
    id, platform_id, contact_name, contact_phone, contact_email,
    property_address, property_specs, property_image,
    lead_score, priority, status, unread_count, ai_suggestion,
    last_message_preview, last_message_at
) VALUES
(
    'thread-fb-01', 'facebook', 'Tara Johnson', '(904) 555-0142', 'tara.j@gmail.com',
    '11863 Lemon Bluff Rd, Jacksonville, FL 32218',
    'Single-Family • 3 Bed / 2 Bath • Est. Equity: $98,000',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80',
    94, 'High', 'Matched Contact', 3,
    'Great! I can show you as soon as Thursday or Saturday. Which day works best for you?',
    'That price sounds very fair. Is the roof newer? Can you do a showing Thursday afternoon?',
    now() - INTERVAL '5 minutes'
),
(
    'thread-fb-02', 'facebook', 'Marcus Reed', '(904) 555-7319', 'mreed_jax@outlook.com',
    '7420 Commonwealth Ave, Jacksonville, FL 32220',
    'Single-Family • 4 Bed / 2 Bath • Est. Equity: $112,000',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&q=80',
    88, 'High', 'Matched Contact', 2,
    'Inspection PDF sent to your email! We are looking to close on or before the 28th. Does that fit your timeline?',
    'Can you send the inspection report for Commonwealth Ave? Ready to submit proof of funds.',
    now() - INTERVAL '25 minutes'
),
(
    'thread-fb-03', 'facebook', 'Nina Patel', '(904) 555-9184', 'nina.patel99@gmail.com',
    '10451 Normandy Blvd, Jacksonville, FL 32221',
    'Multi-Family (Duplex) • 4 Bed / 3 Bath • Est. Equity: $140,000',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    86, 'High', 'Matched Contact', 1,
    'We can do $145,000 net cash with zero closing costs and zero realtor commissions. Are you available for a 5-minute call today?',
    'What''s the best offer you can do on Normandy Blvd? I am looking for a fast cash deal.',
    now() - INTERVAL '1 hour'
),
(
    'thread-fb-04', 'facebook', 'David Mills', '(904) 555-1298', 'dmills6424@att.net',
    '6424 San Juan Ave, Jacksonville, FL 32210',
    'Single-Family • 3 Bed / 1.5 Bath • Est. Equity: $75,000',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80',
    79, 'Medium', 'Matched Contact', 0,
    'I just texted you the details for 5218 Timuquana Rd. Let me know if you would like drive-by photos!',
    'Are there any other properties available in the 32210 area code?',
    now() - INTERVAL '3 hours'
),
(
    'thread-ig-01', 'instagram', 'Chloe Vance', '(904) 555-4019', 'chloevance@gmail.com',
    '3112 Post St, Jacksonville, FL 32205',
    'Single-Family • 3 Bed / 2 Bath • Est. Equity: $88,000',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80',
    91, 'High', 'Matched Contact', 2,
    'Yes, we can send you the off-market walkthrough video! Are you looking to hold as a rental or flip?',
    'Saw your IG reel on the Riverside fixer-upper! Can I get the video walkthrough?',
    now() - INTERVAL '15 minutes'
),
(
    'thread-tt-01', 'tiktok', 'Jordan Hayes', '(904) 555-8832', 'jordan.hayes@gmail.com',
    '5542 Norwood Ave, Jacksonville, FL 32208',
    'Single-Family • 2 Bed / 1 Bath • Est. Equity: $62,000',
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=400&q=80',
    83, 'Medium', 'New Lead', 1,
    'We purchase properties in any condition with zero repair requests. When would be a good time for a quick 5-minute call?',
    'Do you guys buy properties that need a complete new roof and HVAC in North Jax?',
    now() - INTERVAL '40 minutes'
),
(
    'thread-zw-01', 'zillow', 'Robert Henderson', '(904) 555-8321', 'rhenderson@gmail.com',
    '8236 Merrill Rd, Jacksonville, FL 32277',
    'Single-Family • 3 Bed / 2 Bath • Est. Equity: $105,000',
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80',
    92, 'High', 'Matched Contact', 1,
    'Our cash offer has zero buyer fees and we pay all standard title closing costs. Are you available for a showing tomorrow?',
    'Received your Zillow direct inquiry. Would like to discuss a cash offer on Merrill Rd without realtor fees.',
    now() - INTERVAL '50 minutes'
),
(
    'thread-wa-01', 'whatsapp', 'Elena Rostova', '(904) 555-3819', 'elena.rostova@gmail.com',
    '3819 San Jose Forest Dr, Jacksonville, FL 32217',
    'Single-Family • 4 Bed / 3 Bath • Est. Equity: $160,000',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80',
    95, 'High', 'Matched Contact', 1,
    'Assignment docs and earnest money verification are ready for review. Shall I send via DocuSign?',
    'Hello Alex, title commitment has arrived for San Jose Forest Dr. Ready to verify buyer deposit.',
    now() - INTERVAL '10 minutes'
)
ON CONFLICT (id) DO UPDATE SET
    property_address = EXCLUDED.property_address,
    lead_score = EXCLUDED.lead_score,
    priority = EXCLUDED.priority,
    unread_count = EXCLUDED.unread_count,
    ai_suggestion = EXCLUDED.ai_suggestion,
    last_message_preview = EXCLUDED.last_message_preview,
    updated_at = now();

-- Seed Messages for Tara Johnson (thread-fb-01)
INSERT INTO core.conversation_desk_messages (id, thread_id, sender_type, sender_name, content, sent_at) VALUES
(
    'msg-fb-01-1', 'thread-fb-01', 'lead', 'Tara Johnson',
    'Is this home still available? I saw it on your Facebook page and I''m very interested. Can you share the asking price and next steps?',
    now() - INTERVAL '15 minutes'
),
(
    'msg-fb-01-2', 'thread-fb-01', 'rep', 'Alex Richard (HushHawk)',
    'Yes, it''s still available! The asking price is $298,000. Would you like to schedule a showing this week?',
    now() - INTERVAL '10 minutes'
),
(
    'msg-fb-01-3', 'thread-fb-01', 'lead', 'Tara Johnson',
    'That price sounds very fair. Is the roof newer? Can you do a showing Thursday afternoon?',
    now() - INTERVAL '5 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Messages for Marcus Reed (thread-fb-02)
INSERT INTO core.conversation_desk_messages (id, thread_id, sender_type, sender_name, content, sent_at) VALUES
(
    'msg-fb-02-1', 'thread-fb-02', 'lead', 'Marcus Reed',
    'Can you send the inspection report for Commonwealth Ave? Ready to submit proof of funds.',
    now() - INTERVAL '40 minutes'
),
(
    'msg-fb-02-2', 'thread-fb-02', 'rep', 'Alex Richard (HushHawk)',
    'Sending the full inspection and title commitment now. What is your preferred closing timeline?',
    now() - INTERVAL '25 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Messages for Nina Patel (thread-fb-03)
INSERT INTO core.conversation_desk_messages (id, thread_id, sender_type, sender_name, content, sent_at) VALUES
(
    'msg-fb-03-1', 'thread-fb-03', 'lead', 'Nina Patel',
    'What''s the best offer you can do on Normandy Blvd? I am looking for a fast cash deal.',
    now() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO NOTHING;

