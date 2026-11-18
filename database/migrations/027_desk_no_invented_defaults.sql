-- 027: the Lead Conversation Desk invented a score and a place for every thread.
-- Podio-fed threads were saved with lead_score 75, city Jacksonville, ZIP 32204 and status "Matched Contact" (a claim nobody made) because the table supplied
-- those as defaults. Nobody scored those leads. They are now empty until a real value exists.
ALTER TABLE core.conversation_desk_threads ALTER COLUMN lead_score DROP NOT NULL;
ALTER TABLE core.conversation_desk_threads ALTER COLUMN lead_score DROP DEFAULT;
ALTER TABLE core.conversation_desk_threads ALTER COLUMN property_city DROP DEFAULT;
ALTER TABLE core.conversation_desk_threads ALTER COLUMN property_state DROP DEFAULT;
ALTER TABLE core.conversation_desk_threads ALTER COLUMN property_zip DROP DEFAULT;
ALTER TABLE core.conversation_desk_threads ALTER COLUMN status SET DEFAULT 'Open';
UPDATE core.conversation_desk_threads SET status = 'Open' WHERE status = 'Matched Contact';
UPDATE core.conversation_desk_threads SET lead_score = NULL WHERE lead_score IN (0, 75);
UPDATE core.conversation_desk_threads SET property_city = NULL WHERE property_city IN ('Jacksonville', '');
UPDATE core.conversation_desk_threads SET property_zip = NULL WHERE property_zip IN ('32204', '');
UPDATE core.conversation_desk_threads SET property_state = NULL WHERE property_state = '';
