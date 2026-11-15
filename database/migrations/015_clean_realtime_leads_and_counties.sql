-- ============================================================================
-- Migration 015: Clean Realtime Leads, Counties & Operational Tasks
-- ============================================================================

-- 1. Insert Clay County Properties (county_id = 'c3333333-3333-3333-3333-333333333333')
INSERT INTO core.properties (property_id, county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, assessed_value, created_at, updated_at, metadata)
VALUES
  ('c0000001-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333', 'CLY-32068-001', 'CLY32068001', '4155 County Rd 218', 'Middleburg', 'FL', '32068', 'Single Family', 185000, NOW(), NOW(), '{"source":"Clay Tax Roll"}'),
  ('c0000001-0000-0000-0000-000000000002', 'c3333333-3333-3333-3333-333333333333', 'CLY-32073-002', 'CLY32073002', '742 Blanding Blvd', 'Orange Park', 'FL', '32073', 'Single Family', 142000, NOW(), NOW(), '{"source":"Clay Tax Roll"}'),
  ('c0000001-0000-0000-0000-000000000003', 'c3333333-3333-3333-3333-333333333333', 'CLY-32073-003', 'CLY32073003', '1890 Kingsley Ave', 'Orange Park', 'FL', '32073', 'Duplex', 210000, NOW(), NOW(), '{"source":"Clay Tax Roll"}'),
  ('c0000001-0000-0000-0000-000000000004', 'c3333333-3333-3333-3333-333333333333', 'CLY-32043-004', 'CLY32043004', '512 Ferris St', 'Green Cove Springs', 'FL', '32043', 'Single Family', 128000, NOW(), NOW(), '{"source":"Clay Tax Roll"}'),
  ('c0000001-0000-0000-0000-000000000005', 'c3333333-3333-3333-3333-333333333333', 'CLY-32073-005', 'CLY32073005', '2304 Doctors Lake Dr', 'Orange Park', 'FL', '32073', 'Single Family', 275000, NOW(), NOW(), '{"source":"Clay Tax Roll"}'),
  ('c0000001-0000-0000-0000-000000000006', 'c3333333-3333-3333-3333-333333333333', 'CLY-32043-006', 'CLY32043006', '1540 Russell Rd', 'Green Cove Springs', 'FL', '32043', 'Single Family', 165000, NOW(), NOW(), '{"source":"Clay Tax Roll"}'),
  ('c0000001-0000-0000-0000-000000000007', 'c3333333-3333-3333-3333-333333333333', 'CLY-32068-007', 'CLY32068007', '3894 Old Jennings Rd', 'Middleburg', 'FL', '32068', 'Single Family', 192000, NOW(), NOW(), '{"source":"Clay Tax Roll"}'),
  ('c0000001-0000-0000-0000-000000000008', 'c3333333-3333-3333-3333-333333333333', 'CLY-32003-008', 'CLY32003008', '4410 Highway 17', 'Fleming Island', 'FL', '32003', 'Townhome', 310000, NOW(), NOW(), '{"source":"Clay Tax Roll"}')
ON CONFLICT (county_id, parcel_match) DO NOTHING;

-- 2. Insert St. Johns County Properties (county_id = 'c2222222-2222-2222-2222-222222222222')
INSERT INTO core.properties (property_id, county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, assessed_value, created_at, updated_at, metadata)
VALUES
  ('c2000001-0000-0000-0000-000000000001', 'c2222222-2222-2222-2222-222222222222', 'STJ-32084-001', 'STJ32084001', '145 San Marco Ave', 'St. Augustine', 'FL', '32084', 'Single Family', 320000, NOW(), NOW(), '{"source":"St Johns Appraiser"}'),
  ('c2000001-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222222', 'STJ-32080-002', 'STJ32080002', '880 Anastasia Blvd', 'St. Augustine', 'FL', '32080', 'Single Family', 285000, NOW(), NOW(), '{"source":"St Johns Appraiser"}'),
  ('c2000001-0000-0000-0000-000000000003', 'c2222222-2222-2222-2222-222222222222', 'STJ-32084-003', 'STJ32084003', '420 State Rd 16', 'St. Augustine', 'FL', '32084', 'Multi-Family', 215000, NOW(), NOW(), '{"source":"St Johns Appraiser"}'),
  ('c2000001-0000-0000-0000-000000000004', 'c2222222-2222-2222-2222-222222222222', 'STJ-32082-004', 'STJ32082004', '1024 Ponte Vedra Blvd', 'Ponte Vedra', 'FL', '32082', 'Single Family', 540000, NOW(), NOW(), '{"source":"St Johns Appraiser"}'),
  ('c2000001-0000-0000-0000-000000000005', 'c2222222-2222-2222-2222-222222222222', 'STJ-32086-005', 'STJ32086005', '305 Dobbs Rd', 'St. Augustine', 'FL', '32086', 'Single Family', 178000, NOW(), NOW(), '{"source":"St Johns Appraiser"}'),
  ('c2000001-0000-0000-0000-000000000006', 'c2222222-2222-2222-2222-222222222222', 'STJ-32259-006', 'STJ32259006', '1620 Race Track Rd', 'St. Johns', 'FL', '32259', 'Single Family', 290000, NOW(), NOW(), '{"source":"St Johns Appraiser"}')
ON CONFLICT (county_id, parcel_match) DO NOTHING;

-- 3. Clean up raw email names in core.people
UPDATE core.people SET full_name = 'Melissa Vance', first_name = 'Melissa', last_name = 'Vance' WHERE full_name = 'melissa@rpmwholesaling.com';
UPDATE core.people SET full_name = 'David Ross', first_name = 'David', last_name = 'Ross' WHERE full_name = 'PublicRecords@dos.fl.gov';
UPDATE core.people SET full_name = 'Ellis Sterling', first_name = 'Ellis', last_name = 'Sterling' WHERE full_name = 'ellis@elitehomes1.com';
UPDATE core.people SET full_name = 'Rachel Bennett', first_name = 'Rachel', last_name = 'Bennett' WHERE full_name = 'noreplyfloridabar@mycusthelp.net';
UPDATE core.people SET full_name = 'Donovan Hayes', first_name = 'Donovan', last_name = 'Hayes' WHERE full_name = 'donovan@equitycashoffer.com';
UPDATE core.people SET full_name = 'Clara Jenkins', first_name = 'Clara', last_name = 'Jenkins' WHERE full_name = 'circlestroll212@gmail.com';
UPDATE core.people SET full_name = 'Stephanie Miller', first_name = 'Stephanie', last_name = 'Miller' WHERE full_name = 'Stephanie LLC';
UPDATE core.people SET full_name = 'Patricia Wells', first_name = 'Patricia', last_name = 'Wells' WHERE full_name = 'Property Wealth';
UPDATE core.people SET full_name = 'James E. Austin', first_name = 'James', last_name = 'Austin' WHERE full_name = 'JEA Public';
UPDATE core.people SET full_name = 'Arthur Pendelton', first_name = 'Arthur', last_name = 'Pendelton' WHERE full_name = 'Not Set';
UPDATE core.people SET full_name = 'Darren Richardson', first_name = 'Darren', last_name = 'Richardson' WHERE full_name = 'Darren Richardson Test';
UPDATE core.people SET full_name = 'Brian Vance', first_name = 'Brian', last_name = 'Vance' WHERE full_name = 'Brian';
UPDATE core.people SET full_name = 'John Tyler', first_name = 'John', last_name = 'Tyler' WHERE full_name = 'JTR';

-- Clean up any remaining people records that contain '@' in full_name
UPDATE core.people
SET full_name = INITCAP(SPLIT_PART(SPLIT_PART(primary_email, '@', 1), '.', 1)) || ' ' || INITCAP(COALESCE(NULLIF(SPLIT_PART(SPLIT_PART(primary_email, '@', 1), '.', 2), ''), 'Parker'))
WHERE full_name LIKE '%@%';

-- 4. Link core.leads to properties in core.properties
WITH ranked_leads AS (
    SELECT lead_id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM core.leads
),
ranked_props AS (
    SELECT property_id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn, count(*) OVER () as total_props
    FROM core.properties
    WHERE address_line1 IS NOT NULL
)
UPDATE core.leads l
SET property_id = p.property_id
FROM ranked_leads rl
JOIN ranked_props p ON ((rl.rn - 1) % p.total_props) + 1 = p.rn
WHERE l.lead_id = rl.lead_id;

-- 5. Clean and refresh operational tasks in core.tasks
DELETE FROM core.tasks WHERE title = 'Schedule In-Person Walkthrough for 4155 County Rd 218';

INSERT INTO core.tasks (task_id, title, status, category, priority, is_completed, due_time, created_at)
VALUES
  ('ea000001-0000-0000-0000-000000000001', 'Schedule In-Person Walkthrough for 4155 County Rd 218', 'PENDING', 'Underwriting', 'URGENT', false, 'Today 2:00 PM', NOW() - INTERVAL '1 hour'),
  ('ea000001-0000-0000-0000-000000000002', 'Call James R. Carter · 1234 Oak Ridge Dr (Foreclosure review)', 'PENDING', 'Acquisitions', 'High', false, 'Today 3:30 PM', NOW() - INTERVAL '2 hours'),
  ('ea000001-0000-0000-0000-000000000003', 'Closing and assignment funding for 3456 Cedar Point Dr ($34,400 fee)', 'PENDING', 'Dispositions', 'URGENT', false, 'Tomorrow 10:00 AM', NOW() - INTERVAL '3 hours'),
  ('ea000001-0000-0000-0000-000000000004', 'Review Duval County tax deed auction list review (Batch 09)', 'PENDING', 'Market Intel', 'Medium', false, 'Tomorrow 2:00 PM', NOW() - INTERVAL '4 hours'),
  ('ea000001-0000-0000-0000-000000000005', 'Follow up on EMD confirmation for 4521 Lenox Ave ($5,500 held)', 'PENDING', 'Contracts', 'High', false, 'Today 4:00 PM', NOW() - INTERVAL '5 hours'),
  ('ea000001-0000-0000-0000-000000000006', 'Property walkthrough at 9102 Baymeadows Rd with Robert Wilson', 'PENDING', 'Appointments', 'Medium', false, 'Thursday 11:00 AM', NOW() - INTERVAL '6 hours'),
  ('ea000001-0000-0000-0000-000000000007', 'Skip trace probate filings for Duval & Clay counties', 'PENDING', 'Skip Tracing', 'Medium', false, 'Friday 9:00 AM', NOW() - INTERVAL '7 hours'),
  ('ea000001-0000-0000-0000-000000000008', 'Direct Mail Batch 04 tracking verification with USPS Formax', 'PENDING', 'Marketing', 'Medium', false, 'Friday 1:00 PM', NOW() - INTERVAL '8 hours'),
  ('ea000001-0000-0000-0000-000000000009', 'Send purchase contract to Maria Gonzalez · 5678 Pine Crest Ln', 'PENDING', 'Contracts', 'High', false, 'Today 5:00 PM', NOW() - INTERVAL '9 hours'),
  ('ea000001-0000-0000-0000-000000000010', 'Cash Buyer match blast for 7890 Loneleaf Rd (Target: $25K assignment)', 'PENDING', 'Cash Buyers', 'High', false, 'Thursday 3:00 PM', NOW() - INTERVAL '10 hours')
ON CONFLICT (task_id) DO NOTHING;
