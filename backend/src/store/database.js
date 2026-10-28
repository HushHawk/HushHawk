/**
 * @file backend/src/store/database.js
 * In-memory & Persistent Canonical Data Store for HushHawk
 * Implements 7 PostgreSQL Schemas: ref, raw, core, rel, crm, ops, audit
 * Conforms to HushHawk Blueprint Section 4 & Visual Architecture Page 7.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../data/canonical_store.json');

class CanonicalStore {
    constructor() {
        this.data = {
            // ref: Reference Dictionaries
            ref: {
                counties: [],
                pillars: [],
                lead_sources: [],
                platforms: [],
                contact_methods: [],
                person_roles: [],
                dictionary_versions: [],
            },
            // raw: Immutable Source Records & Runs
            raw: {
                connector_runs: [],
                source_records: [],
                attachments: [],
            },
            // core: Canonical Entities
            core: {
                properties: [],
                property_aliases: [],
                people: [],
                businesses: [],
                leads: [],
                pillar_events: [],
                campaigns: [],
                interactions: [],
                tasks: [],
                users: [],
            },
            // rel: Relationships & Candidates
            rel: {
                entity_relationships: [],
                event_evidence: [],
                identity_candidates: [],
                review_decisions: [],
            },
            // crm: Pipeline & Coexistence
            crm: {
                pipeline_stages: [],
                lead_stage_history: [],
                suppression_records: [],
                external_sync_map: [],
            },
            // ops: Atomic Counters & Outbox
            ops: {
                event_counters: {}, // key: `${property_id}:${pillar_code}` -> last_number
                outbox_events: [],
                job_runs: [],
                job_errors: [],
            },
            // audit: Append-Only Audit Trail
            audit: {
                audit_events: [],
            },
        };

        this.locks = new Map(); // Concurrency locks for atomic counters
        this.init();
    }

    init() {
        // Ensure data dir exists
        const dataDir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        if (fs.existsSync(DATA_FILE)) {
            try {
                const raw = fs.readFileSync(DATA_FILE, 'utf8');
                this.data = JSON.parse(raw);
            } catch (err) {
                console.warn('[DB] Could not parse existing store, initializing seed data.');
                this.seedInitialData();
            }
        } else {
            this.seedInitialData();
        }
    }

    persist() {
        try {
            fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (err) {
            console.error('[DB] Persist error:', err.message);
        }
    }

    // Atomic Event Counter (Pattern from Blueprint Section 5.1 & Page 13)
    allocateEventNumber(propertyId, pillarCode) {
        const key = `${propertyId}:${pillarCode}`;
        // Row lock emulation
        if (!this.data.ops.event_counters) {
            this.data.ops.event_counters = {};
        }

        const current = this.data.ops.event_counters[key] || 0;
        const nextNumber = current + 1;
        this.data.ops.event_counters[key] = nextNumber;
        this.persist();
        return nextNumber;
    }

    // Append-only Audit Log
    logAudit({ actor = 'SYSTEM', action, entityType, entityId, requestId = crypto.randomUUID(), redactedDiff = {} }) {
        const auditEvent = {
            audit_id: crypto.randomUUID(),
            actor,
            action,
            entity_type: entityType,
            entity_id: entityId,
            request_id: requestId,
            redacted_diff: redactedDiff,
            created_at: new Date().toISOString(),
        };
        this.data.audit.audit_events.unshift(auditEvent);
        if (this.data.audit.audit_events.length > 500) {
            this.data.audit.audit_events.pop();
        }
        this.persist();
        return auditEvent;
    }

    // Transactional Outbox Event
    emitOutbox({ aggregateType, aggregateId, eventType, payload }) {
        const outboxEvent = {
            outbox_id: crypto.randomUUID(),
            aggregate_type: aggregateType,
            aggregate_id: aggregateId,
            event_type: eventType,
            payload,
            created_at: new Date().toISOString(),
            published_at: null,
            attempts: 0,
            last_error: null,
        };
        this.data.ops.outbox_events.unshift(outboxEvent);
        this.persist();
        return outboxEvent;
    }

    seedInitialData() {
        console.log('[DB] Seeding canonical HushHawk datasets (Duval County FL & 29 Pillars)...');

        // Counties
        this.data.ref.counties = [
            { county_id: 'c1111111-1111-1111-1111-111111111111', state_code: 'FL', county_name: 'Duval County', county_code: 'DUV', status: 'APPROVED' },
            { county_id: 'c2222222-2222-2222-2222-222222222222', state_code: 'FL', county_name: 'St. Johns County', county_code: 'STJ', status: 'PROPOSED' },
            { county_id: 'c3333333-3333-3333-3333-333333333333', state_code: 'FL', county_name: 'Clay County', county_code: 'CLY', status: 'PROPOSED' },
        ];

        // 29 Pillars
        this.data.ref.pillars = [
            { pillar_code: 'FC', pillar_name: 'Foreclosure', definition: 'Formal judicial mortgage foreclosure proceedings', distinct_event_rule: 'Jurisdiction + full court case number', evidence_required: 'Clerk court docket filing', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { pillar_code: 'TAX', pillar_name: 'Tax Delinquency', definition: 'Ad valorem property tax delinquent for >= 1 year', distinct_event_rule: 'Tax account + tax year', evidence_required: 'Tax collector delinquent certificate', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { pillar_code: 'ML', pillar_name: 'Municipal Lien', definition: 'City code enforcement, weed abatement, or utility lien', distinct_event_rule: 'Recording jurisdiction + lien instrument #', evidence_required: 'Recorded instrument in public records', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { pillar_code: 'PRB', pillar_name: 'Probate / Decedent', definition: 'Owner deceased or property in formal estate administration', distinct_event_rule: 'Jurisdiction + probate case reference', evidence_required: 'Clerk probate filing and deed cross-ref', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { pillar_code: 'VAC', pillar_name: 'Vacancy / Abandonment', definition: 'Structure physically vacant or utility services disconnected', distinct_event_rule: 'Approved episode definition', evidence_required: 'Field observation or utility shutoff notice', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { pillar_code: 'CODE', pillar_name: 'Code Violation', definition: 'Municipal building or zoning citation issued', distinct_event_rule: 'Notice citation # + year', evidence_required: 'Notice of violation document', review_status: 'NEEDS_REVIEW', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'CONDEMN', pillar_name: 'Condemnation Notice', definition: 'Declared unsafe for occupancy by municipal building official', distinct_event_rule: 'Condemnation order #', evidence_required: 'City order to demolish or placarded structure', review_status: 'NEEDS_REVIEW', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'TCERT', pillar_name: 'Tax Certificate', definition: 'Tax lien certificate sold at county auction', distinct_event_rule: 'Certificate # + tax sale year', evidence_required: 'County tax collector auction certificate', review_status: 'NEEDS_REVIEW', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'TDEED', pillar_name: 'Tax Deed Application', definition: 'Application for tax deed public foreclosure sale', distinct_event_rule: 'Tax deed file # + year', evidence_required: 'Notice of public tax deed sale', review_status: 'NEEDS_REVIEW', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'ABS', pillar_name: 'Absentee Owner', definition: 'Owner mailing address differs from site address', distinct_event_rule: 'Mailing ZIP != site ZIP', evidence_required: 'Certified county tax roll', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'OOS', pillar_name: 'Out of State Owner', definition: 'Owner mailing address outside Florida', distinct_event_rule: 'Mailing State != FL', evidence_required: 'Certified county tax roll', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'PFC', pillar_name: 'Pre-Foreclosure', definition: 'Lis pendens or notice of default recorded', distinct_event_rule: 'Lis pendens instrument #', evidence_required: 'Recorded lis pendens filing', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'BANKR', pillar_name: 'Bankruptcy', definition: 'Owner petition in US Bankruptcy Court', distinct_event_rule: 'Federal court + case #', evidence_required: 'PACER bankruptcy filing docket', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'EVICT', pillar_name: 'Eviction Action', definition: 'County civil court removal proceeding', distinct_event_rule: 'County court case #', evidence_required: 'Court docket and summons', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'DIV', pillar_name: 'Divorce / Domestic', definition: 'Dissolution of marriage involving real property', distinct_event_rule: 'Family court case reference', evidence_required: 'Dissolution petition and deed', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'HOA', pillar_name: 'HOA / COA Lien', definition: 'Homeowners association assessment lien', distinct_event_rule: 'Association name + instrument #', evidence_required: 'Recorded claim of lien', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'MECH', pillar_name: 'Mechanic Lien', definition: 'Contractor claim of lien for unpaid improvement', distinct_event_rule: 'Claimant + instrument #', evidence_required: 'Recorded mechanic lien', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'UTIL', pillar_name: 'Utility Shutoff', definition: 'Water/power disconnection for non-payment', distinct_event_rule: 'Work order # + disconnect date', evidence_required: 'Utility disconnect order', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'FIRE', pillar_name: 'Fire Damage', definition: 'Structure casualty from reported fire incident', distinct_event_rule: 'Fire incident report #', evidence_required: 'Fire department run report', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'STR', pillar_name: 'STR Non-Compliance', definition: 'Unregistered or cited short term rental', distinct_event_rule: 'Citation # + year', evidence_required: 'Code enforcement citation', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'INSPECT', pillar_name: 'Failed Inspection', definition: 'Failed building code or safety inspection', distinct_event_rule: 'Inspection ID + date', evidence_required: 'Building inspector report', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'DEMO', pillar_name: 'Demolition Order', definition: 'Scheduled for municipal demolition', distinct_event_rule: 'Demolition order #', evidence_required: 'Official order to demolish', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'ZONING', pillar_name: 'Zoning Violation', definition: 'Unlawful use of residential/commercial zoning', distinct_event_rule: 'Zoning citation #', evidence_required: 'Planning dept citation', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'ESTATE', pillar_name: 'Intestate Estate', definition: 'Deceased owner without will', distinct_event_rule: 'Death cert + deed link', evidence_required: 'Vital statistics death cert', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'PROPDAM', pillar_name: 'Property Damage', definition: 'Major storm casualty or structural collapse', distinct_event_rule: 'FEMA/County assessment #', evidence_required: 'Damage assessment record', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'SQUAT', pillar_name: 'Squatter / Trespass', definition: 'Unlawful occupancy reported to law enforcement', distinct_event_rule: 'Police CAD incident #', evidence_required: 'Police trespass warning log', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'ABAND', pillar_name: 'Abandoned Vehicle/Junk', definition: 'Excessive junk, inoperable vehicles, blight', distinct_event_rule: 'Citation # + officer badge', evidence_required: 'Code violation notice', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'ROOF', pillar_name: 'Dangerous Roof', definition: 'Severely damaged or tarped roof citation', distinct_event_rule: 'Citation #', evidence_required: 'Inspection photo & notice', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
            { pillar_code: 'UNSAFE', pillar_name: 'Unsafe Structure', definition: 'Building condemned as unfit for human habitation', distinct_event_rule: 'Placard notice #', evidence_required: 'Placard notice confirmation', review_status: 'PROPOSED', production_enabled: false, dictionary_version: 'v1.0' },
        ];

        // Lead Sources
        this.data.ref.lead_sources = [
            { source_code: 'MAIL', source_name: 'Direct Mail Campaign', source_group: 'OUTBOUND', definition: 'Physical yellow letter/postcard with Mail ID tracking', assignment_rule: 'Mail ID barcode match', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { source_code: 'CLERK', source_name: 'Court Clerk Feed', source_group: 'PUBLIC_FEED', definition: 'Duval County court foreclosure dockets', assignment_rule: 'Public records intake', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { source_code: 'COUNTY', source_name: 'County Appraiser Feed', source_group: 'PUBLIC_FEED', definition: 'Duval County Property Appraiser (PA) tax rolls', assignment_rule: 'Parcel synchronization', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { source_code: 'INBOUND_WEB', source_name: 'Inbound Web Form', source_group: 'ORGANIC', definition: 'Seller direct inquiry via hushhawk.com portal', assignment_rule: 'Direct lead attribution', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { source_code: 'INBOUND_CALL', source_name: 'Inbound Call', source_group: 'VOICE', definition: 'Tracked phone call to wholesale hotline', assignment_rule: 'Call tracking number attribution', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { source_code: 'SMS_CAMPAIGN', source_name: 'SMS Inbound Response', source_group: 'MESSAGING', definition: 'Seller response to compliant campaign', assignment_rule: '10DLC matched thread', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { source_code: 'FB_AD', source_name: 'Facebook Lead Ad', source_group: 'PAID_SOCIAL', definition: 'Meta lead ad submission', assignment_rule: 'Facebook webhook ID', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
            { source_code: 'OTHER', source_name: 'Other Source', source_group: 'MISC', definition: 'Unclassified source; requires source_detail', assignment_rule: 'Manual attribution', review_status: 'APPROVED', production_enabled: true, dictionary_version: 'v1.0' },
        ];

        // Users & Roles (Page 18)
        this.data.core.users = [
            { user_id: 'u1111111-1111-1111-1111-111111111111', email: 'admin@hushhawk.internal', full_name: 'Sarah Connor', role: 'SUPER_ADMIN', status: 'ACTIVE' },
            { user_id: 'u2222222-2222-2222-2222-222222222222', email: 'manager@hushhawk.internal', full_name: 'Marcus Vance', role: 'MANAGER', status: 'ACTIVE' },
            { user_id: 'u3333333-3333-3333-3333-333333333333', email: 'acquisitions@hushhawk.internal', full_name: 'Elena Rostova', role: 'ACQUISITIONS', status: 'ACTIVE' },
            { user_id: 'u4444444-4444-4444-4444-444444444444', email: 'reviewer@hushhawk.internal', full_name: 'David Sterling', role: 'DATA_REVIEWER', status: 'ACTIVE' },
            { user_id: 'u5555555-5555-5555-5555-555555555555', email: 'marketing@hushhawk.internal', full_name: 'Chloe Bennett', role: 'MARKETING', status: 'ACTIVE' },
            { user_id: 'u6666666-6666-6666-6666-666666666666', email: 'ops@hushhawk.internal', full_name: 'Alex Mercer', role: 'DEVELOPER_OPS', status: 'ACTIVE' },
        ];

        // Pipeline Stages
        this.data.crm.pipeline_stages = [
            { stage_key: 'NEW', stage_name: 'New Lead', display_order: 1, description: 'Fresh lead intake requiring initial contact' },
            { stage_key: 'CONTACTED', stage_name: 'Contacted', display_order: 2, description: 'Direct dialogue opened with owner' },
            { stage_key: 'QUALIFIED', stage_name: 'Qualified', display_order: 3, description: 'Motivation, condition & price expectations verified' },
            { stage_key: 'OFFER', stage_name: 'Offer Made', display_order: 4, description: 'Formal purchase offer presented' },
            { stage_key: 'CONTRACT', stage_name: 'Under Contract', display_order: 5, description: 'Executed purchase agreement secured' },
            { stage_key: 'CLOSED', stage_name: 'Closed & Funded', display_order: 6, description: 'Transaction completed; fee disbursed' },
            { stage_key: 'FOLLOW_UP', stage_name: 'Follow-Up', display_order: 7, description: 'Long-term nurture campaign' },
            { stage_key: 'LOST', stage_name: 'Disqualified / Lost', display_order: 8, description: 'Deal deceased, listed, or refused' },
        ];

        // Seed Canonical Properties (Duval County, FL)
        // Notice parcel_raw is stored as TEXT preserving zeros and hyphens!
        const prop1Id = 'p1000000-0000-0000-0000-000000000001';
        const prop2Id = 'p2000000-0000-0000-0000-000000000002';
        const prop3Id = 'p3000000-0000-0000-0000-000000000003';
        const prop4Id = 'p4000000-0000-0000-0000-000000000004';

        this.data.core.properties = [
            {
                property_id: prop1Id,
                county_id: 'c1111111-1111-1111-1111-111111111111',
                county_code: 'DUV',
                parcel_raw: '091823-0000',
                parcel_match: '0918230000',
                address_line1: '1428 River City Blvd',
                city: 'Jacksonville',
                state_code: 'FL',
                postal_code: '32204',
                property_type: 'Single Family Residential',
                legal_description: 'RIVERSIDE PK BLK 12 LOT 4',
                assessed_value: 285000,
                estimated_equity: 145000,
                created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                property_id: prop2Id,
                county_id: 'c1111111-1111-1111-1111-111111111111',
                county_code: 'DUV',
                parcel_raw: '045912-1080',
                parcel_match: '0459121080',
                address_line1: '3819 San Jose Forest Dr',
                city: 'Jacksonville',
                state_code: 'FL',
                postal_code: '32217',
                property_type: 'Single Family Residential',
                legal_description: 'SAN JOSE SEC 4 LOT 18',
                assessed_value: 410000,
                estimated_equity: 210000,
                created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                property_id: prop3Id,
                county_id: 'c1111111-1111-1111-1111-111111111111',
                county_code: 'DUV',
                parcel_raw: '003419-0020',
                parcel_match: '0034190020',
                address_line1: '714 E 8th St',
                city: 'Jacksonville',
                state_code: 'FL',
                postal_code: '32206',
                property_type: 'Multi-Family (Duplex)',
                legal_description: 'SPRINGFIELD SEC B LOT 7',
                assessed_value: 175000,
                estimated_equity: 95000,
                created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
                updated_at: new Date().toISOString(),
            },
            {
                property_id: prop4Id,
                county_id: 'c1111111-1111-1111-1111-111111111111',
                county_code: 'DUV',
                parcel_raw: '167890-0010',
                parcel_match: '1678900010',
                address_line1: '1102 Ocean View Terrace',
                city: 'Jacksonville Beach',
                state_code: 'FL',
                postal_code: '32250',
                property_type: 'Townhouse',
                legal_description: 'OCEAN BEACH SUB LOT 2',
                assessed_value: 520000,
                estimated_equity: 260000,
                created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
                updated_at: new Date().toISOString(),
            },
        ];

        // Seed People
        const person1Id = 'pe100000-0000-0000-0000-000000000001';
        const person2Id = 'pe200000-0000-0000-0000-000000000002';
        const person3Id = 'pe300000-0000-0000-0000-000000000003';

        this.data.core.people = [
            {
                person_id: person1Id,
                full_name: 'Arthur Pendelton',
                first_name: 'Arthur',
                last_name: 'Pendelton',
                primary_phone: '(904) 555-0182',
                primary_email: 'arthur.p@outlook.com',
                mailing_address: '1428 River City Blvd, Jacksonville, FL 32204',
                is_suppressed: false,
                verification_level: 'VERIFIED_OWNER',
                created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
            },
            {
                person_id: person2Id,
                full_name: 'Beatrice Montgomery',
                first_name: 'Beatrice',
                last_name: 'Montgomery',
                primary_phone: '(904) 555-0391',
                primary_email: 'bmontgomery@gmail.com',
                mailing_address: '1240 Peachtree St NE, Atlanta, GA 30309', // Absentee / Out of State!
                is_suppressed: false,
                verification_level: 'VERIFIED_OWNER',
                created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
            },
            {
                person_id: person3Id,
                full_name: 'James C. Halpert',
                first_name: 'James',
                last_name: 'Halpert',
                primary_phone: '(904) 555-0744',
                primary_email: 'jchalpert@yahoo.com',
                mailing_address: '714 E 8th St, Jacksonville, FL 32206',
                is_suppressed: true, // DNC Suppressed! (Tests compliance gate)
                verification_level: 'VERIFIED_OWNER',
                created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
            },
        ];

        // Seed Businesses
        const biz1Id = 'b1000000-0000-0000-0000-000000000001';
        this.data.core.businesses = [
            {
                business_id: biz1Id,
                legal_name: 'Atlantic Coast Holdings LLC',
                entity_type: 'LLC',
                jurisdiction: 'FL',
                registration_id: 'L21000394812',
                status: 'ACTIVE',
                registered_agent: 'Sunstate Registered Agents Inc.',
                created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
            },
        ];

        // Seed Pillar Events (Using Atomic Counter logic)
        const ev1Id = 'ev100000-0000-0000-0000-000000000001';
        const ev2Id = 'ev200000-0000-0000-0000-000000000002';
        const ev3Id = 'ev300000-0000-0000-0000-000000000003';

        this.data.ops.event_counters[`${prop1Id}:FC`] = 1;
        this.data.ops.event_counters[`${prop2Id}:TAX`] = 1;
        this.data.ops.event_counters[`${prop3Id}:ML`] = 1;

        this.data.core.pillar_events = [
            {
                event_id: ev1Id,
                property_id: prop1Id,
                pillar_code: 'FC',
                event_number: 1,
                external_event_id: '16-2026-CA-004819',
                case_reference: '16-2026-CA-004819-XXXX-MA',
                event_status: 'OPEN',
                verification_status: 'CONFIRMED',
                event_date: '2026-09-14',
                filing_amount: 194500,
                created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
            },
            {
                event_id: ev2Id,
                property_id: prop2Id,
                pillar_code: 'TAX',
                event_number: 1,
                external_event_id: 'TAX-2025-045912',
                case_reference: 'TAX-2025-045912',
                event_status: 'OPEN',
                verification_status: 'CONFIRMED',
                event_date: '2026-08-01',
                filing_amount: 8430,
                created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
            },
            {
                event_id: ev3Id,
                property_id: prop3Id,
                pillar_code: 'ML',
                event_number: 1,
                external_event_id: 'LIEN-2026-019482',
                case_reference: 'BK 20491 PG 112',
                event_status: 'OPEN',
                verification_status: 'CONFIRMED',
                event_date: '2026-09-28',
                filing_amount: 3250,
                created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
            },
        ];

        // Seed Raw Source Records & Evidence
        const src1Id = 'sr100000-0000-0000-0000-000000000001';
        const src2Id = 'sr200000-0000-0000-0000-000000000002';
        this.data.raw.source_records = [
            {
                source_record_id: src1Id,
                source_system: 'DUVAL_COURT_CLERK',
                jurisdiction: 'DUVAL_COUNTY_FL',
                source_external_id: '16-2026-CA-004819',
                observed_at: new Date(Date.now() - 20 * 86400000).toISOString(),
                source_url: 'https://core.duvalclerk.com/cases/16-2026-CA-004819',
                payload: {
                    plaintiff: 'Fidelity Mortgage Trust LLC',
                    defendant: 'Arthur Pendelton',
                    caseType: 'Real Property Mortgage Foreclosure',
                    principalBalance: 194500,
                    parcelNumber: '091823-0000',
                },
                payload_hash: crypto.createHash('sha256').update('16-2026-CA-004819-Fidelity').digest('hex'),
                parser_version: 'clerk-v2.1',
                created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
            },
            {
                source_record_id: src2Id,
                source_system: 'DUVAL_TAX_COLLECTOR',
                jurisdiction: 'DUVAL_COUNTY_FL',
                source_external_id: 'TAX-2025-045912',
                observed_at: new Date(Date.now() - 18 * 86400000).toISOString(),
                source_url: 'https://duvaltaxcollector.gov/account/0459121080',
                payload: {
                    taxAccount: '045912-1080',
                    taxYear: 2025,
                    delinquentAmount: 8430.22,
                    ownerName: 'Montgomery Beatrice',
                },
                payload_hash: crypto.createHash('sha256').update('TAX-2025-045912-8430').digest('hex'),
                parser_version: 'tax-v1.4',
                created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
            },
        ];

        // Seed Event Evidence Links
        this.data.rel.event_evidence = [
            {
                evidence_id: 'ee100000-0000-0000-0000-000000000001',
                event_id: ev1Id,
                source_record_id: src1Id,
                verification_status: 'CONFIRMED',
                observed_at: new Date(Date.now() - 20 * 86400000).toISOString(),
                notes: 'Verified against Duval County Clerk of Court certified docket',
            },
            {
                evidence_id: 'ee200000-0000-0000-0000-000000000002',
                event_id: ev2Id,
                source_record_id: src2Id,
                verification_status: 'CONFIRMED',
                observed_at: new Date(Date.now() - 18 * 86400000).toISOString(),
                notes: 'Delinquent tax roll certificate verified',
            },
        ];

        // Seed Entity Relationships (OWNS, etc.)
        this.data.rel.entity_relationships = [
            {
                relationship_id: 'er100000-0000-0000-0000-000000000001',
                from_entity_type: 'PERSON',
                from_entity_id: person1Id,
                to_entity_type: 'PROPERTY',
                to_entity_id: prop1Id,
                relationship_type: 'OWNS',
                verification_status: 'CONFIRMED',
                confidence_score: 1.0,
                valid_from: '2018-05-12',
            },
            {
                relationship_id: 'er200000-0000-0000-0000-000000000002',
                from_entity_type: 'PERSON',
                from_entity_id: person2Id,
                to_entity_type: 'PROPERTY',
                to_entity_id: prop2Id,
                relationship_type: 'OWNS',
                verification_status: 'CONFIRMED',
                confidence_score: 1.0,
                valid_from: '2015-11-04',
            },
            {
                relationship_id: 'er300000-0000-0000-0000-000000000003',
                from_entity_type: 'PERSON',
                from_entity_id: person3Id,
                to_entity_type: 'PROPERTY',
                to_entity_id: prop3Id,
                relationship_type: 'OWNS',
                verification_status: 'CONFIRMED',
                confidence_score: 1.0,
                valid_from: '2020-03-18',
            },
            {
                relationship_id: 'er400000-0000-0000-0000-000000000004',
                from_entity_type: 'BUSINESS',
                from_entity_id: biz1Id,
                to_entity_type: 'PROPERTY',
                to_entity_id: prop4Id,
                relationship_type: 'OWNS',
                verification_status: 'CONFIRMED',
                confidence_score: 1.0,
                valid_from: '2022-01-20',
            },
        ];

        // Seed Leads (First-Source Code is LOCKED)
        const lead1Id = 'ld100000-0000-0000-0000-000000000001';
        const lead2Id = 'ld200000-0000-0000-0000-000000000002';
        const lead3Id = 'ld300000-0000-0000-0000-000000000003';

        this.data.core.leads = [
            {
                lead_id: lead1Id,
                first_source_code: 'MAIL', // LOCKED
                source_detail: 'October Batch 04 - Foreclosure High Equity Mailer #4912',
                property_id: prop1Id,
                person_id: person1Id,
                pillar_code: 'FC',
                event_number: 1,
                status: 'QUALIFIED',
                priority_score: 92,
                assigned_user_id: 'u3333333-3333-3333-3333-333333333333',
                created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
            },
            {
                lead_id: lead2Id,
                first_source_code: 'COUNTY', // LOCKED
                source_detail: 'Tax Delinquency Feed - OOS Absentee Trigger',
                property_id: prop2Id,
                person_id: person2Id,
                pillar_code: 'TAX',
                event_number: 1,
                status: 'CONTACTED',
                priority_score: 78,
                assigned_user_id: 'u3333333-3333-3333-3333-333333333333',
                created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
            },
            {
                lead_id: lead3Id,
                first_source_code: 'INBOUND_WEB', // LOCKED
                source_detail: 'Web Submission: "Need to sell quickly before city lien foreclosure"',
                property_id: prop3Id,
                person_id: person3Id,
                pillar_code: 'ML',
                event_number: 1,
                status: 'NEW',
                priority_score: 85,
                assigned_user_id: 'u2222222-2222-2222-2222-222222222222',
                created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
        ];

        // Seed Interactions (Calls, texts, emails do NOT create new leads)
        this.data.core.interactions = [
            {
                interaction_id: 'in100000-0000-0000-0000-000000000001',
                lead_id: lead1Id,
                person_id: person1Id,
                property_id: prop1Id,
                method: 'CALL',
                direction: 'INBOUND',
                actor_id: 'Arthur Pendelton',
                result: 'CONNECTED',
                notes: 'Seller called in response to Mailer #4912. Confirmed foreclosure auction date in 45 days. Seeking quick cash offer.',
                occurred_at: new Date(Date.now() - 12 * 86400000).toISOString(),
            },
            {
                interaction_id: 'in200000-0000-0000-0000-000000000002',
                lead_id: lead1Id,
                person_id: person1Id,
                property_id: prop1Id,
                method: 'VISIT',
                direction: 'OUTBOUND',
                actor_id: 'Elena Rostova',
                result: 'COMPLETED',
                notes: 'On-site walkthrough. Roof needs repair (~$12k), interior dated 1990s. Estimated MAO: $210,000.',
                occurred_at: new Date(Date.now() - 8 * 86400000).toISOString(),
            },
            {
                interaction_id: 'in300000-0000-0000-0000-000000000003',
                lead_id: lead2Id,
                person_id: person2Id,
                property_id: prop2Id,
                method: 'CALL',
                direction: 'OUTBOUND',
                actor_id: 'Elena Rostova',
                result: 'LEFT_VOICEMAIL',
                notes: 'Called owner regarding delinquent tax certificate; left callback message.',
                occurred_at: new Date(Date.now() - 3 * 86400000).toISOString(),
            },
        ];

        // Seed Tasks
        this.data.core.tasks = [
            {
                task_id: 'tk100000-0000-0000-0000-000000000001',
                title: 'Draft Purchase Agreement at $205,000 MAO',
                due_date: new Date(Date.now() + 2 * 86400000).toISOString(),
                status: 'PENDING',
                owner_id: 'Elena Rostova',
                linked_entity_type: 'LEAD',
                linked_entity_id: lead1Id,
                created_at: new Date().toISOString(),
            },
            {
                task_id: 'tk200000-0000-0000-0000-000000000002',
                title: 'Review Title Search for Municipal Liens',
                due_date: new Date(Date.now() + 4 * 86400000).toISOString(),
                status: 'PENDING',
                owner_id: 'Marcus Vance',
                linked_entity_type: 'PROPERTY',
                linked_entity_id: prop1Id,
                created_at: new Date().toISOString(),
            },
        ];

        // Seed Human Review Candidates (Page 11)
        this.data.rel.identity_candidates = [
            {
                candidate_id: 'cd100000-0000-0000-0000-000000000001',
                entity_type: 'PERSON',
                entity_id_a: person1Id,
                entity_id_b: 'pe999999-9999-9999-9999-999999999999',
                ladder_rung: 5,
                confidence: 'LOW',
                match_features: {
                    existing_name: 'Arthur Pendelton',
                    incoming_name: 'Art Pendleton Jr.',
                    address_comparison: 'Same ZIP 32204, different street',
                    rule_triggered: 'Rung 5 - Fuzzy name match',
                    hard_rule_warning: 'Non-merge rule active: people sharing similar names require human review.',
                },
                status: 'PENDING',
                created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
            },
            {
                candidate_id: 'cd200000-0000-0000-0000-000000000002',
                entity_type: 'PROPERTY',
                entity_id_a: prop3Id,
                entity_id_b: 'p9999999-9999-9999-9999-999999999999',
                ladder_rung: 6,
                confidence: 'CONTRADICTORY',
                match_features: {
                    existing_parcel: '003419-0020',
                    incoming_parcel: '003419-0020',
                    existing_county: 'DUV (Duval)',
                    incoming_county: 'STJ (St. Johns)',
                    conflict_reason: 'Same parcel number reported in two different county feeds.',
                },
                status: 'PENDING',
                created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
            },
        ];

        // Seed Connector Runs & Logs (Page 8-9)
        this.data.raw.connector_runs = [
            {
                run_id: 'cr100000-0000-0000-0000-000000000001',
                connector_id: 'DUVAL_COURT_CLERK',
                status: 'COMPLETED',
                cursor_watermark: '2026-10-24T06:00:00Z',
                parser_version: 'clerk-v2.1',
                records_fetched: 48,
                records_parsed: 48,
                records_quarantined: 0,
                records_changed: 7,
                error_summary: null,
                started_at: new Date(Date.now() - 10800000).toISOString(),
                completed_at: new Date(Date.now() - 10740000).toISOString(),
            },
            {
                run_id: 'cr200000-0000-0000-0000-000000000002',
                connector_id: 'DUVAL_TAX_COLLECTOR',
                status: 'COMPLETED',
                cursor_watermark: '2026-10-23T23:59:59Z',
                parser_version: 'tax-v1.4',
                records_fetched: 114,
                records_parsed: 112,
                records_quarantined: 2,
                records_changed: 19,
                error_summary: '2 malformed records quarantined due to missing parcel format',
                started_at: new Date(Date.now() - 21600000).toISOString(),
                completed_at: new Date(Date.now() - 21480000).toISOString(),
            },
        ];

        // Seed Podio Coexistence Sync Map (Page 19)
        this.data.crm.external_sync_map = [
            {
                sync_id: 'sm100000-0000-0000-0000-000000000001',
                internal_entity_type: 'LEAD',
                internal_uuid: lead1Id,
                external_system: 'PODIO',
                external_app_id: '29481023',
                external_item_id: '984102941',
                last_sync_at: new Date().toISOString(),
                version_hash: 'h-9418a',
                status: 'SYNCED',
            },
            {
                sync_id: 'sm200000-0000-0000-0000-000000000002',
                internal_entity_type: 'LEAD',
                internal_uuid: lead2Id,
                external_system: 'PODIO',
                external_app_id: '29481023',
                external_item_id: '984103118',
                last_sync_at: new Date().toISOString(),
                version_hash: 'h-3312b',
                status: 'SYNCED',
            },
        ];

        // Seed Suppression Records (DNC / Opt-Out)
        this.data.crm.suppression_records = [
            {
                suppression_id: 'sp100000-0000-0000-0000-000000000001',
                identifier_type: 'PHONE',
                identifier_value: '(904) 555-0744',
                reason: 'Federal DNC Registry and direct owner opt-out request',
                source: 'NATIONAL_DNC_IMPORT',
                created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
            },
        ];

        // Seed Outbox Events (Page 16)
        this.data.ops.outbox_events = [
            {
                outbox_id: 'ob100000-0000-0000-0000-000000000001',
                aggregate_type: 'PILLAR_EVENT',
                aggregate_id: ev1Id,
                event_type: 'EVENT_CREATED',
                payload: { property_id: prop1Id, pillar_code: 'FC', event_number: 1 },
                created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
                published_at: new Date(Date.now() - 20 * 86400000 + 400).toISOString(),
                attempts: 1,
                last_error: null,
            },
        ];

        // Seed Initial Audit Log
        this.data.audit.audit_events = [
            {
                audit_id: 'au100000-0000-0000-0000-000000000001',
                actor: 'SYSTEM_BOOTSTRAP',
                action: 'DICTIONARY_ACTIVATED',
                entity_type: 'DICTIONARY',
                entity_id: 'd1111111-1111-1111-1111-111111111111',
                request_id: 'req-init-001',
                redacted_diff: { version: 'v1.0', pillarsCount: 29, activeCount: 5 },
                created_at: new Date(Date.now() - 100000).toISOString(),
            },
        ];

        this.persist();
    }
}

export const db = new CanonicalStore();
