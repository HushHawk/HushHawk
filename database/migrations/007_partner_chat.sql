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
  is_read_alex BOOLEAN DEFAULT true,
  is_read_waldo BOOLEAN DEFAULT true,
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

-- 6. Seed Initial Multi-Chat Conversations
-- General Channel
INSERT INTO core.partner_chat_threads (id, title, thread_type, property_id, crownkey, created_by, last_message_text, last_message_at, last_message_sender)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'General Partner Channel', 'general', NULL, 'ALL-DUV-GENERAL', 'Alex Richard', 'Going through title clearances now, looking sharp.', now() - interval '18 minutes', 'Waldo Ellis')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.partner_chat_messages (thread_id, sender_name, sender_role, message_text, is_read_alex, is_read_waldo, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alex Richard', 'Acquisitions Lead', 'Hey Waldo, reviewing our Q4 disposition targets today. Let me know when you have reviewed the Clay County probate batch.', true, true, now() - interval '25 minutes'),
  ('00000000-0000-0000-0000-000000000001', 'Waldo Ellis', 'Dispositions Lead', 'Going through title clearances now, looking sharp. We have 3 ready for cash buyers.', true, true, now() - interval '18 minutes')
ON CONFLICT DO NOTHING;

-- 123 Main St Thread
INSERT INTO core.partner_chat_threads (id, title, thread_type, property_id, crownkey, created_by, last_message_text, last_message_at, last_message_sender)
VALUES
  ('00000000-0000-0000-0000-000000000123', '123 Main St, Jacksonville FL', 'property', 'b0d10000-0000-0000-0000-000000123001', 'DUV-04-05-25-001230-001-00 · MAIL', 'Alex Richard', 'Drafting the agreement right now. Will attach once signed.', now() - interval '32 minutes', 'Alex Richard')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.partner_chat_messages (thread_id, sender_name, sender_role, message_text, property_id, tag, is_read_alex, is_read_waldo, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000123', 'Alex Richard', 'Acquisitions Lead', 'Waldo, seller for 123 Main St just called back. They are willing to accept $145k cash with a 14-day close.', 'b0d10000-0000-0000-0000-000000123001', 'Offer', true, true, now() - interval '45 minutes'),
  ('00000000-0000-0000-0000-000000000123', 'Waldo Ellis', 'Dispositions Lead', 'Great work! I ran the comps for 123 Main St. ARV is around $230k with $28k rehab. Let us send the purchase agreement today.', 'b0d10000-0000-0000-0000-000000123001', 'Analysis', true, true, now() - interval '38 minutes'),
  ('00000000-0000-0000-0000-000000000123', 'Alex Richard', 'Acquisitions Lead', 'Drafting the agreement right now. Will attach once signed.', 'b0d10000-0000-0000-0000-000000123001', 'Contract', true, true, now() - interval '32 minutes')
ON CONFLICT DO NOTHING;

-- 881 Main St Thread
INSERT INTO core.partner_chat_threads (id, title, thread_type, property_id, crownkey, created_by, last_message_text, last_message_at, last_message_sender)
VALUES
  ('00000000-0000-0000-0000-000000000881', '881 Main St, Jacksonville FL', 'property', 'b0d10000-0000-0000-0000-000000881002', 'DUV-04-05-25-008810-002-00 · MAIL', 'Waldo Ellis', 'Title search showed a secondary municipal lien of $3,400.', now() - interval '12 minutes', 'Waldo Ellis')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.partner_chat_messages (thread_id, sender_name, sender_role, message_text, property_id, tag, is_read_alex, is_read_waldo, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000881', 'Waldo Ellis', 'Dispositions Lead', 'Alex, quick heads up on 881 Main St. Title search showed a secondary municipal lien of $3,400. We need to factor that into our offer.', 'b0d10000-0000-0000-0000-000000881002', 'Title', false, true, now() - interval '12 minutes')
ON CONFLICT DO NOTHING;

-- 3245 Main St Thread
INSERT INTO core.partner_chat_threads (id, title, thread_type, property_id, crownkey, created_by, last_message_text, last_message_at, last_message_sender)
VALUES
  ('00000000-0000-0000-0000-000000003245', '3245 Main St, Jacksonville FL', 'property', 'b0d10000-0000-0000-0000-000003245003', 'DUV-04-05-25-032450-003-00 · MAIL', 'Waldo Ellis', 'Buyer pool is asking if the roof has an inspection report available.', now() - interval '5 minutes', 'Waldo Ellis')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.partner_chat_messages (thread_id, sender_name, sender_role, message_text, property_id, tag, is_read_alex, is_read_waldo, created_at)
VALUES
  ('00000000-0000-0000-0000-000000003245', 'Waldo Ellis', 'Dispositions Lead', 'Buyer pool on 3245 Main St is asking if the roof has an inspection report available in the vault.', 'b0d10000-0000-0000-0000-000003245003', 'Inspection', false, true, now() - interval '5 minutes')
ON CONFLICT DO NOTHING;
