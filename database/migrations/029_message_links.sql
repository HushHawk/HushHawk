-- Links found in an incoming email (visible wording + address), kept next to the message text so the desk can show them.
ALTER TABLE core.conversation_desk_messages ADD COLUMN IF NOT EXISTS links JSONB;
