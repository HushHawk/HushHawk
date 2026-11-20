-- Files that came with a message (email attachments and inline images), as Podio stores them: id, name, type, size.
ALTER TABLE core.conversation_desk_messages ADD COLUMN IF NOT EXISTS attachments JSONB;
