-- Partner chat schema. Existing partner accounts, properties, and messages are preserved.

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

CREATE TABLE IF NOT EXISTS core.partner_presence (
  user_name TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  status TEXT DEFAULT 'online', -- 'online', 'away', 'offline'
  role TEXT NOT NULL,
  last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  current_device TEXT DEFAULT 'MacBook Pro'
);
