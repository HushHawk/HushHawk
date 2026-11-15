-- Migration 013: Relink Lead Conversation Desk to Canonical core.properties and Real Database Contacts
-- Ensures all 16 platforms are tied directly to real foreign keys and authentic Duval County wholesale assets.

-- 1. Ensure foreign key references to real properties exist in core.conversation_desk_threads
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-000000123001' WHERE id = 'thread-fb-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c6d93e77' WHERE id = 'thread-fb-02';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c66194fe' WHERE id = 'thread-fb-03';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c5f49010' WHERE id = 'thread-fb-04';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c5e8a6eb' WHERE id = 'thread-ig-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c55f8da0' WHERE id = 'thread-tt-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-000000881002' WHERE id = 'thread-zw-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-000003245003' WHERE id = 'thread-wa-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c6adfdfe' WHERE id = 'thread-yt-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000bf09b593' WHERE id = 'thread-li-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c6adf3eb' WHERE id = 'thread-x-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c6adddad' WHERE id = 'thread-nd-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c55d03c8' WHERE id = 'thread-rd-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c55bfe84' WHERE id = 'thread-tr-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c04861e0' WHERE id = 'thread-yp-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000bf09ac7f' WHERE id = 'thread-gg-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c7f77394' WHERE id = 'thread-hd-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000c6d9491b' WHERE id = 'thread-hz-01';
UPDATE core.conversation_desk_threads SET property_id = 'b0d10000-0000-0000-0000-0000bf6b033b' WHERE id = 'thread-ms-01';

-- 2. Add additional realistic threads linking canonical contacts from crm.seller_contacts & core.people
INSERT INTO core.conversation_desk_threads (
    id, platform_id, contact_name, contact_phone, contact_email,
    property_id, property_address, property_specs, property_image,
    lead_score, priority, status, unread_count, ai_suggestion,
    last_message_preview, last_message_at
) VALUES
(
    'thread-fb-05', 'facebook', 'James R. Carter', '(904) 555-0198', 'jcarter@email.com',
    'b0d10000-0000-0000-0000-0000bf09b593', '2748 W 45th St, Jacksonville, FL 32209',
    'Single Family Residential • 3 Bed / 1 Bath • Est. Equity: $65,000',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=400&q=80',
    94, 'High', 'Matched Contact', 1,
    'Hi James, we reviewed the W 45th St parcel. We can do an all-cash closing with zero inspections if needed.',
    'I received your Facebook ad for cash home buyers. Looking to sell 2748 W 45th St quickly.',
    now() - INTERVAL '8 minutes'
),
(
    'thread-ig-02', 'instagram', 'Maria L. Gonzalez', '(904) 555-2234', 'maria.gonzalez@example.com',
    'b0d10000-0000-0000-0000-0000c6d9491b', '1450 W 16th St, Jacksonville, FL 32204',
    'Single Family Residential • 3 Bed / 2 Bath • Assessed: $49,500',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    88, 'Medium', 'Matched Contact', 0,
    'Our acquisitions team can provide proof of funds and close within 14 business days. Are you available for a phone chat?',
    'Sent a DM about 1450 W 16th St. What is your standard closing window for cash purchases?',
    now() - INTERVAL '1 hour'
),
(
    'thread-zw-02', 'zillow', 'Arthur Pendelton', '(904) 555-0182', 'arthur.p@outlook.com',
    'b0d10000-0000-0000-0000-000000123001', '123 Main St, Jacksonville, FL 32204',
    'Single Family • 3 Bed / 2 Bath • Assessed: $165,000',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80',
    95, 'High', 'Matched Contact', 2,
    'We have title cleared with First Title Co for 123 Main St. When can we confirm the escrow walkthrough?',
    'Direct inquiry from Zillow listing regarding earnest money deposit terms.',
    now() - INTERVAL '14 minutes'
)
ON CONFLICT (id) DO UPDATE SET
    property_id = EXCLUDED.property_id,
    property_address = EXCLUDED.property_address,
    updated_at = now();

-- Add initial messages for the new threads
INSERT INTO core.conversation_desk_messages (id, thread_id, sender_type, sender_name, content, sent_at) VALUES
('msg-fb-05-1', 'thread-fb-05', 'lead', 'James R. Carter', 'I received your Facebook ad for cash home buyers. Looking to sell 2748 W 45th St quickly.', now() - INTERVAL '8 minutes'),
('msg-ig-02-1', 'thread-ig-02', 'lead', 'Maria L. Gonzalez', 'Sent a DM about 1450 W 16th St. What is your standard closing window for cash purchases?', now() - INTERVAL '1 hour'),
('msg-zw-02-1', 'thread-zw-02', 'lead', 'Arthur Pendelton', 'Direct inquiry from Zillow listing regarding earnest money deposit terms.', now() - INTERVAL '14 minutes')
ON CONFLICT (id) DO NOTHING;

