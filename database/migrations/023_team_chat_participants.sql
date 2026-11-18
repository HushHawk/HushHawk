-- Team chat works for every signed-in team member, not two named people.
-- Per-user read tracking replaces the two fixed is_read_* columns. Existing history is marked read for everyone ('*').
ALTER TABLE core.partner_chat_messages ADD COLUMN IF NOT EXISTS read_by TEXT[] NOT NULL DEFAULT '{}';
UPDATE core.partner_chat_messages SET read_by = ARRAY['*'] WHERE read_by = '{}';
ALTER TABLE core.partner_chat_threads ALTER COLUMN created_by DROP DEFAULT;
ALTER TABLE core.partner_presence ALTER COLUMN current_device DROP DEFAULT;
ALTER TABLE core.partner_presence ALTER COLUMN role DROP NOT NULL;
