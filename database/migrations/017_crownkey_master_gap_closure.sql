-- ============================================================================
-- 017_crownkey_master_gap_closure.sql
-- HushHawk CrownKey Master Gap Closure Migration
-- Conforms to 33-slide CrownKey Master Blueprint:
-- 1. Activates all 29 Reference Distress Pillars (production_enabled = TRUE, review_status = 'APPROVED')
-- 2. Seeds Canonical Pillar Distress Events across verified properties in core.pillar_events
-- 3. Initializes ops.event_counters with atomic counter tracking per (property_id, pillar_code)
-- 4. Seeds Module 05 Identity Review Queue candidates in rel.identity_candidates
-- 5. Populates Transactional Outbox Events in ops.outbox_events for Neo4j Graph Projection
-- ============================================================================

-- STEP 1: Activate All 29 Distress Pillars in ref.pillars
UPDATE ref.pillars 
SET production_enabled = TRUE, review_status = 'APPROVED'
WHERE production_enabled = FALSE OR review_status != 'APPROVED';

-- STEP 2: Populate Canonical Distress Events in core.pillar_events
-- Property 1: 2748 W 45th St, Jacksonville, FL 32209 (Duval County - Parcel PODIO-3205084563)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000001-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-0000bf09b593',
    'FC',
    1,
    '16-2026-CA-004819',
    '16-2026-CA-004819-XXXX-MA',
    'OPEN',
    'CONFIRMED',
    '2026-09-14',
    194500.00,
    NOW() - INTERVAL '60 days'
),
(
    'e0000001-0000-0000-0000-000000000002',
    'b0d10000-0000-0000-0000-0000bf09b593',
    'TAX',
    1,
    'TAX-2025-045912',
    'TAX-2025-045912',
    'OPEN',
    'CONFIRMED',
    '2026-08-01',
    4320.00,
    NOW() - INTERVAL '100 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference,
    filing_amount = EXCLUDED.filing_amount,
    verification_status = EXCLUDED.verification_status;

-- Property 2: 123 Main St, Jacksonville, FL 32204 (Duval County - Parcel 04-05-25-001230-001-00)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000002-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-000000123001',
    'FC',
    1,
    '16-2025-CA-008912',
    '16-2025-CA-008912-XXXX-MA',
    'OPEN',
    'CONFIRMED',
    '2025-11-20',
    215000.00,
    NOW() - INTERVAL '120 days'
),
(
    'e0000002-0000-0000-0000-000000000002',
    'b0d10000-0000-0000-0000-000000123001',
    'ML',
    1,
    'LIEN-2026-019482',
    'BK 20491 PG 112',
    'OPEN',
    'CONFIRMED',
    '2026-01-15',
    3250.00,
    NOW() - INTERVAL '90 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference,
    filing_amount = EXCLUDED.filing_amount;

-- Property 3: 881 Main St, Jacksonville, FL 32206 (Duval County - Parcel 04-05-25-008810-002-00)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000003-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-000000881002',
    'PRB',
    1,
    '16-2026-CP-001204',
    '16-2026-CP-001204-XXXX-MA (Estate of Pendelton)',
    'OPEN',
    'CONFIRMED',
    '2026-03-10',
    0.00,
    NOW() - INTERVAL '80 days'
),
(
    'e0000003-0000-0000-0000-000000000002',
    'b0d10000-0000-0000-0000-000000881002',
    'TAX',
    1,
    'TAX-2025-088102',
    'TAX-2025-088102',
    'OPEN',
    'CONFIRMED',
    '2026-06-12',
    6140.00,
    NOW() - INTERVAL '70 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference,
    filing_amount = EXCLUDED.filing_amount;

-- Property 4: 3245 Main St, Jacksonville, FL 32208 (Duval County - Parcel 04-05-25-032450-003-00)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000004-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-000003245003',
    'CODE',
    1,
    'CE-2026-044910',
    'CE-2026-044910 (Dangerous Roof & Vegetation)',
    'OPEN',
    'CONFIRMED',
    '2026-04-18',
    1500.00,
    NOW() - INTERVAL '65 days'
),
(
    'e0000004-0000-0000-0000-000000000002',
    'b0d10000-0000-0000-0000-000003245003',
    'VAC',
    1,
    'VAC-DUV-2026-003',
    'USPS Vacancy + Physical Observation',
    'OPEN',
    'CONFIRMED',
    '2026-05-02',
    0.00,
    NOW() - INTERVAL '50 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference,
    filing_amount = EXCLUDED.filing_amount;

-- Property 5: 3037 Broadway Ave, Jacksonville, FL 32254 (Duval County)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000005-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-0000bf09ac7f',
    'FC',
    1,
    '16-2026-CA-003310',
    '16-2026-CA-003310-XXXX-MA',
    'OPEN',
    'CONFIRMED',
    '2026-08-11',
    178000.00,
    NOW() - INTERVAL '40 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference,
    filing_amount = EXCLUDED.filing_amount;

-- Property 6: 10702 Arnez Rd, Jacksonville, FL 32218 (Duval County)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000006-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-0000c04861e0',
    'TAX',
    1,
    'TAX-2025-107020',
    'TAX-2025-107020',
    'OPEN',
    'CONFIRMED',
    '2026-07-22',
    5400.00,
    NOW() - INTERVAL '35 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference,
    filing_amount = EXCLUDED.filing_amount;

-- Property 7: 270 E 46th St, Jacksonville, FL 32208 (Duval County)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000007-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-0000c55bfe84',
    'ML',
    1,
    'LIEN-2026-044102',
    'BK 21102 PG 440 (Abatement Assessment)',
    'OPEN',
    'CONFIRMED',
    '2026-02-14',
    7850.00,
    NOW() - INTERVAL '30 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference,
    filing_amount = EXCLUDED.filing_amount;

-- Property 8: 2660 W 23rd St, Jacksonville, FL 32209 (Duval County)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000008-0000-0000-0000-000000000001',
    'b0d10000-0000-0000-0000-0000c55d03c8',
    'EVICT',
    1,
    '16-2026-CC-001928',
    '16-2026-CC-001928-XXXX-MA',
    'RESOLVED',
    'CONFIRMED',
    '2026-03-01',
    0.00,
    NOW() - INTERVAL '25 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference;

-- Property 9: 4155 County Rd 218, Middleburg, FL 32068 (Clay County)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000009-0000-0000-0000-000000000001',
    'c0000001-0000-0000-0000-000000000001',
    'TAX',
    1,
    'CLY-TAX-2025-001',
    'CLY-TAX-2025-001',
    'OPEN',
    'CONFIRMED',
    '2026-05-19',
    3920.00,
    NOW() - INTERVAL '45 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference;

-- Property 10: 145 San Marco Ave, St. Augustine, FL 32084 (St. Johns County)
INSERT INTO core.pillar_events (
    event_id, property_id, pillar_code, event_number, external_event_id,
    case_reference, event_status, verification_status, event_date, filing_amount, created_at
) VALUES 
(
    'e0000010-0000-0000-0000-000000000001',
    'c2000001-0000-0000-0000-000000000001',
    'FC',
    1,
    '55-2026-CA-001102',
    '55-2026-CA-001102-XXXX-MA',
    'OPEN',
    'CONFIRMED',
    '2026-08-30',
    340000.00,
    NOW() - INTERVAL '20 days'
)
ON CONFLICT (event_id) DO UPDATE SET
    case_reference = EXCLUDED.case_reference;

-- STEP 3: Initialize ops.event_counters atomically for all (property_id, pillar_code)
INSERT INTO ops.event_counters (property_id, pillar_code, last_number)
SELECT property_id, pillar_code, MAX(event_number) as last_number
FROM core.pillar_events
GROUP BY property_id, pillar_code
ON CONFLICT (property_id, pillar_code) DO UPDATE
SET last_number = GREATEST(ops.event_counters.last_number, EXCLUDED.last_number);

-- STEP 4: Seed Identity Candidates into rel.identity_candidates (Module 05 Review Queue)
INSERT INTO rel.identity_candidates (
    candidate_id, entity_type, entity_id_a, entity_id_b,
    ladder_rung, confidence, match_features, status, created_at
) VALUES
(
    'c0000001-beef-4000-8000-000000000001',
    'PROPERTY',
    'b0d10000-0000-0000-0000-000000123001',
    'a18f93f3-11e2-46d7-8d4b-0f3d32dfc3fa',
    3,
    'HIGH',
    '{"address_similarity": 0.98, "parcel_normalized_match": true, "postal_match": true, "reason": "Slight parcel formatting variance between county assessor 04-05-25-001230-001-00 and raw recorder 000123001"}'::jsonb,
    'PENDING',
    NOW() - INTERVAL '2 days'
),
(
    'c0000002-beef-4000-8000-000000000002',
    'PROPERTY',
    'b0d10000-0000-0000-0000-000003245003',
    '6e766505-3410-42fe-9664-3112574eeef3',
    3,
    'HIGH',
    '{"address_similarity": 0.99, "parcel_normalized_match": true, "postal_match": true, "reason": "Dual ingestion candidate: 3245 Main St imported from both Podio feed and Assessor GIS"}'::jsonb,
    'PENDING',
    NOW() - INTERVAL '1 day'
),
(
    'c0000003-beef-4000-8000-000000000003',
    'PROPERTY',
    'b0d10000-0000-0000-0000-000000881002',
    '94aec074-f4b6-4f75-a5e1-bf641525a8ed',
    2,
    'MEDIUM_HIGH',
    '{"address_similarity": 0.95, "parcel_normalized_match": true, "postal_match": true, "reason": "Address match with legacy short parcel format 000881002"}'::jsonb,
    'PENDING',
    NOW() - INTERVAL '12 hours'
)
ON CONFLICT (candidate_id) DO UPDATE SET
    status = EXCLUDED.status,
    match_features = EXCLUDED.match_features;

-- STEP 5: Populate ops.outbox_events for Neo4j Graph Projection & CDC
INSERT INTO ops.outbox_events (
    outbox_id, aggregate_type, aggregate_id, event_type, payload,
    created_at, published_at, attempts
)
SELECT 
    event_id as outbox_id,
    'PILLAR_EVENT' as aggregate_type,
    event_id as aggregate_id,
    'EVENT_CONFIRMED' as event_type,
    json_build_object(
        'property_id', property_id,
        'pillar_code', pillar_code,
        'event_number', event_number,
        'case_reference', case_reference,
        'verification_status', verification_status,
        'event_status', event_status,
        'filing_amount', filing_amount
    )::jsonb as payload,
    created_at,
    NOW() as published_at,
    1 as attempts
FROM core.pillar_events
ON CONFLICT (outbox_id) DO NOTHING;
