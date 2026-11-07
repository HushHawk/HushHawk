-- database/migrations/007_partner_chat.sql
-- HushHawk Partner Multi-Chat & Property Layer Messenger (Alex Richard & Waldo Ellis)

-- 1. Ensure Partner Users Exist in core.users
INSERT INTO core.users (user_id, email, full_name, role, status, created_at)
VALUES 
  ('00000000-0000-0000-0000-0000000000a1', 'alex.richard@hushhawk.internal', 'Alex Richard', 'SUPER_ADMIN', 'ACTIVE', now()),
  ('00000000-0000-0000-0000-0000000000e1', 'waldo.ellis@hushhawk.internal', 'Waldo Ellis', 'SUPER_ADMIN', 'ACTIVE', now())
ON CONFLICT (user_id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = 'ACTIVE';

-- 2. Ensure Example Properties Exist for Immediate Thread Linking
INSERT INTO core.properties (property_id, county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, assessed_value)
VALUES
  ('b0d10000-0000-0000-0000-000000123001', 'c1111111-1111-1111-1111-111111111111', '04-05-25-001230-001-00', '04052500123000100', '123 Main St', 'Jacksonville', 'FL', '32204', 'Single Family', 165000.00),
  ('b0d10000-0000-0000-0000-000000881002', 'c1111111-1111-1111-1111-111111111111', '04-05-25-008810-002-00', '04052500881000200', '881 Main St', 'Jacksonville', 'FL', '32206', 'Single Family', 198000.00),
  ('b0d10000-0000-0000-0000-000003245003', 'c1111111-1111-1111-1111-111111111111', '04-05-25-032450-003-00', '04052503245000300', '3245 Main St', 'Jacksonville', 'FL', '32208', 'Duplex', 242000.00)
ON CONFLICT (county_id, parcel_match) DO UPDATE SET
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  postal_code = EXCLUDED.postal_code;

-- 3. Create Partner Chat Threads Table
CREATE TABLE IF NOT EXISTS core.partner_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  thread_type TEXT DEFAULT 'property', -- 'general' or 'property'
  property_id UUID REFERENCES core.properties(property_id) ON DELETE CASCADE,
  crownkey TEXT,
  created_by TEXT DEFAULT 'Alex Richard',
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  last_message_sender TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_prop ON core.partner_chat_threads(property_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated ON core.partner_chat_threads(updated_at DESC);

-- 4. Create Partner Chat Messages Table
CREATE TABLE IF NOT EXISTS core.partner_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES core.partner_chat_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES core.users(user_id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT DEFAULT 'Partner',
  message_text TEXT NOT NULL,
  property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
  tag TEXT, -- 'Offer', 'Title', 'Rehab', 'Contract', etc.
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read_alex BOOLEAN DEFAULT false,
  is_read_waldo BOOLEAN DEFAULT false,
  reply_to_id UUID REFERENCES core.partner_chat_messages(id) ON DELETE SET NULL,
  reply_to_sender TEXT,
  reply_to_text TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_msgs_thread ON core.partner_chat_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_msgs_prop ON core.partner_chat_messages(property_id);

-- 5. Create Partner Online Presence Table
CREATE TABLE IF NOT EXISTS core.partner_presence (
  user_name TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'online', -- 'online', 'away', 'offline'
  role TEXT NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  current_device TEXT DEFAULT 'MacBook Pro'
);

INSERT INTO core.partner_presence (user_name, full_name, status, role, last_active_at, current_device)
VALUES
  ('Alex Richard', 'Alex Richard', 'online', 'Acquisitions Lead (Admin)', now(), 'MacBook Pro'),
  ('Waldo Ellis', 'Waldo Ellis', 'online', 'Dispositions Lead (Partner)', now(), 'MacBook Air')
ON CONFLICT (user_name) DO UPDATE SET
  status = 'online',
  last_active_at = now();

-- 6. Seed Clean Multi-Chat Layers (Ready for Real Live Messaging)
INSERT INTO core.partner_chat_threads (id, title, thread_type, property_id, crownkey, created_by, last_message_text, last_message_at, last_message_sender)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'General Partner Channel', 'general', NULL, 'ALL-DUV-GENERAL', 'Alex Richard', NULL, now(), NULL),
  ('00000000-0000-0000-0000-000000000123', '123 Main St, Jacksonville FL', 'property', 'b0d10000-0000-0000-0000-000000123001', 'DUV-04-05-25-001230-001-00 · MAIL', 'Alex Richard', NULL, now(), NULL),
  ('00000000-0000-0000-0000-000000000881', '881 Main St, Jacksonville FL', 'property', 'b0d10000-0000-0000-0000-000000881002', 'DUV-04-05-25-008810-002-00 · MAIL', 'Waldo Ellis', NULL, now(), NULL),
  ('00000000-0000-0000-0000-000000003245', '3245 Main St, Jacksonville FL', 'property', 'b0d10000-0000-0000-0000-0000003245003', 'DUV-04-05-25-032450-003-00 · MAIL', 'Waldo Ellis', NULL, now(), NULL)
ON CONFLICT (id) DO UPDATE SET
  last_message_text = EXCLUDED.last_message_text,
  last_message_sender = EXCLUDED.last_message_sender;
