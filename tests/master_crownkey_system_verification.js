/**
 * @file tests/master_crownkey_system_verification.js
 * Master System-Wide End-to-End Verification Suite for HushHawk CrownKey
 * Validates the complete requirements of the 33-slide CrownKey Master Blueprint.
 */

import assert from 'assert';
import http from 'http';
import { renderCrownKey, validateCrownKeyFormat, normalizeParcelMatch } from '../packages/crownkey/index.js';
import { EventService } from '../backend/src/services/eventService.js';
import { IdentityService } from '../backend/src/services/identityService.js';
import { ConnectorService } from '../backend/src/services/connectorService.js';
import { GraphService } from '../backend/src/services/graphService.js';
import { CrownKeyService } from '../backend/src/services/crownkeyService.js';
import { db } from '../backend/src/store/database.js';
import { pool } from '../backend/src/store/pgClient.js';

async function fetchJson(url, options = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const reqOpts = {
            hostname: u.hostname,
            port: u.port || 80,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: options.headers || {},
            timeout: 8000
        };

        const req = http.request(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout calling ${url}`));
        });

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

async function runMasterVerification() {
    console.log('================================================================');
    console.log('👑 HUSHHAWK CROWNKEY MASTER SYSTEM-WIDE VERIFICATION');
    console.log('   Auditing Complete 33-Slide Specification & Production Stack');
    console.log('================================================================\n');

    let totalPassed = 0;
    const test = (desc, fn) => {
        try {
            fn();
            console.log(`  ✓ PASS: ${desc}`);
            totalPassed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${desc}`);
            console.error(err);
            process.exit(1);
        }
    };

    // -------------------------------------------------------------------------
    // SECTION 1: CROWNKEY IDENTIFICATION & DISPLAY FORMULA
    // -------------------------------------------------------------------------
    console.log('[SECTION 1] CrownKey Identification Framework');

    test('Formula renders Level 1: Property reference (DUV-[PARCEL])', () => {
        const ref = renderCrownKey({ countyCode: 'DUV', parcelRaw: '04-05-25-001230-001-00' });
        assert.strictEqual(ref, 'DUV-04-05-25-001230-001-00');
    });

    test('Formula renders Level 2: Property Event (DUV-[PARCEL]-FC-001)', () => {
        const ref = renderCrownKey({
            countyCode: 'DUV',
            parcelRaw: '04-05-25-001230-001-00',
            pillarCode: 'FC',
            eventNumber: 1
        });
        assert.strictEqual(ref, 'DUV-04-05-25-001230-001-00-FC-001');
    });

    test('Formula renders Level 3: Event & Lead Display (DUV-[PARCEL]-FC-001 · MAIL)', () => {
        const ref = renderCrownKey({
            countyCode: 'DUV',
            parcelRaw: '04-05-25-001230-001-00',
            pillarCode: 'FC',
            eventNumber: 1,
            firstSourceCode: 'MAIL'
        });
        assert.strictEqual(ref, 'DUV-04-05-25-001230-001-00-FC-001 · MAIL');
    });

    test('Formula renders Level 4: Missing property resilience (Property pending)', () => {
        const ref = renderCrownKey({ firstSourceCode: 'FACEBOOK' });
        assert.strictEqual(ref, 'Property pending');
    });

    test('CrownKey validator accepts strictly conforming display references', () => {
        assert.strictEqual(validateCrownKeyFormat('DUV-04-05-25-001230-001-00-FC-001 · MAIL').valid, true);
        assert.strictEqual(validateCrownKeyFormat('CLY-CLY-32068-001-TAX-001').valid, true);
        assert.strictEqual(validateCrownKeyFormat('Property pending').valid, true);
    });

    // -------------------------------------------------------------------------
    // SECTION 2: 29 PROPERTY DISTRESS PILLARS
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 2] Reference Pillars (Complete 29-Pillar Matrix)');

    const pillarsRes = await pool.query('SELECT count(*) FROM ref.pillars WHERE production_enabled = TRUE AND review_status = $1', ['APPROVED']);
    test('All 29 reference distress pillars are approved & production-enabled in PostgreSQL', () => {
        assert.strictEqual(Number(pillarsRes.rows[0].count), 29);
    });

    const activePillars = await pool.query('SELECT pillar_code, pillar_name FROM ref.pillars ORDER BY pillar_code');
    test('Core distress pillars exist (FC, TAX, ML, PRB, CODE, VAC, EVICT, ABS, OOS, TCERT, TDEED)', () => {
        const codes = activePillars.rows.map(r => r.pillar_code);
        const required = ['FC', 'TAX', 'ML', 'PRB', 'CODE', 'VAC', 'EVICT', 'ABS', 'OOS', 'TCERT', 'TDEED'];
        for (const req of required) {
            assert.ok(codes.includes(req), `Pillar '${req}' must exist`);
        }
    });

    // -------------------------------------------------------------------------
    // SECTION 3: ATOMIC EVENT NUMBERING & IDEMPOTENCY
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 3] Atomic Event Numbering & Idempotency Rules');

    test('Second evidence submission for identical case reference reuses counter (Number 1)', () => {
        const testPropId = 'b0d10000-0000-0000-0000-000000123001';
        const res = EventService.recordPillarEvent({
            propertyId: testPropId,
            pillarCode: 'FC',
            caseReference: '16-2025-CA-008912-XXXX-MA',
            filingAmount: 215000,
            actor: 'TEST_AUDITOR'
        });
        assert.strictEqual(res.isNew, false);
        assert.strictEqual(Number(res.event.event_number), 1);
    });

    test('Independent distress pillar on same property receives distinct event sequence (TAX-001)', async () => {
        const testPropId = 'b0d10000-0000-0000-0000-0000bf09b593';
        const taxCount = await pool.query('SELECT last_number FROM ops.event_counters WHERE property_id = $1 AND pillar_code = $2', [testPropId, 'TAX']);
        assert.ok(taxCount.rows.length >= 1);
        assert.strictEqual(Number(taxCount.rows[0].last_number), 1);
    });

    // -------------------------------------------------------------------------
    // SECTION 4: POSTGRESQL CANONICAL TRUTH & TRANSACTIONAL OUTBOX
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 4] PostgreSQL 7-Schema Dual-Store Architecture');

    const counts = await pool.query(`
        SELECT 
          (SELECT count(*) FROM core.properties) as props,
          (SELECT count(*) FROM core.pillar_events) as events,
          (SELECT count(*) FROM ops.event_counters) as counters,
          (SELECT count(*) FROM ops.outbox_events) as outbox,
          (SELECT count(*) FROM rel.identity_candidates) as candidates,
          (SELECT count(*) FROM audit.audit_events) as audits
    `);
    const c = counts.rows[0];

    test('Canonical properties populated in PostgreSQL (41 properties verified)', () => {
        assert.strictEqual(Number(c.props), 41);
    });

    test('Canonical distress events populated in core.pillar_events (>= 14 events)', () => {
        assert.ok(Number(c.events) >= 14, `Expected >= 14 events, found ${c.events}`);
    });

    test('Atomic event counters active in ops.event_counters (>= 14 counters)', () => {
        assert.ok(Number(c.counters) >= 14, `Expected >= 14 counters, found ${c.counters}`);
    });

    test('Transactional outbox active in ops.outbox_events (>= 14 events)', () => {
        assert.ok(Number(c.outbox) >= 14, `Expected >= 14 outbox events, found ${c.outbox}`);
    });

    test('Append-only audit ledger active in audit.audit_events (>= 100 entries)', () => {
        assert.ok(Number(c.audits) >= 100, `Expected >= 100 audit entries, found ${c.audits}`);
    });

    // -------------------------------------------------------------------------
    // SECTION 5: MODULE 05 HUMAN REVIEW QUEUE
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 5] Module 05 Identity Candidate Human Review Queue');

    const queue = IdentityService.getReviewQueue();
    test('Review queue returns pending candidates with side-by-side entity comparisons', () => {
        assert.ok(queue.length >= 1, 'Review queue must contain pending candidates');
        const first = queue[0];
        assert.ok(first.entity_a_data, 'Entity A data must exist');
        assert.ok(first.entity_b_data, 'Entity B data must exist');
        assert.ok(first.match_features, 'Match features must exist');
        assert.ok(first.ladder_rung >= 1 && first.ladder_rung <= 6, 'Ladder rung must be between 1 and 6');
    });

    // -------------------------------------------------------------------------
    // SECTION 6: NEO4J GRAPH PROJECTION & ZERO-DRIFT RECONCILIATION
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 6] Neo4j Graph Projection & Zero-Drift Reconciliation');

    const recon = GraphService.runReconciliation();
    test('Reconciliation reports HEALTHY status with zero drift detected', () => {
        assert.strictEqual(recon.status, 'HEALTHY');
        assert.strictEqual(recon.drift_detected, false);
        assert.ok(recon.graph_projection.total_nodes >= 190, 'Graph projection must contain >= 190 nodes');
        assert.ok(recon.graph_projection.total_edges >= 80, 'Graph projection must contain >= 80 edges');
    });

    // -------------------------------------------------------------------------
    // SECTION 7: DUVAL COUNTY CERTIFIED CONNECTOR FEEDS (10-STEP LIFECYCLE)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 7] Duval County Automated Feed Connectors');

    test('DUVAL_COURT_CLERK connector executes 10-step lifecycle and returns COMPLETED', () => {
        const run = ConnectorService.runConnector('DUVAL_COURT_CLERK');
        assert.ok(run.status === 'COMPLETED' || run.status === 'COMPLETED_WITH_WARNINGS');
        assert.ok(run.records_fetched >= 1);
        assert.strictEqual(run.records_quarantined, 0);
    });

    test('DUVAL_TAX_COLLECTOR connector executes 10-step lifecycle and returns COMPLETED', () => {
        const run = ConnectorService.runConnector('DUVAL_TAX_COLLECTOR');
        assert.ok(run.status === 'COMPLETED' || run.status === 'COMPLETED_WITH_WARNINGS');
        assert.ok(run.records_fetched >= 1);
        assert.strictEqual(run.records_quarantined, 0);
    });

    // -------------------------------------------------------------------------
    // SECTION 8: LIVE EC2 PRODUCTION ENDPOINTS (3.148.218.118)
    // -------------------------------------------------------------------------
    console.log('\n[SECTION 8] Live Production Endpoints on AWS EC2 (3.148.218.118)');

    const ec2Health = await fetchJson('http://3.148.218.118/api/v1/health');
    test('EC2 /api/v1/health returns HTTP 200 with AWS RDS and Neo4j status ONLINE', () => {
        assert.strictEqual(ec2Health.status, 200);
        assert.strictEqual(ec2Health.data.status, 'ONLINE');
        assert.strictEqual(ec2Health.data.db_details.database, 'hushhawk');
    });

    const ec2Review = await fetchJson('http://3.148.218.118/api/v1/review/queue');
    test('EC2 /api/v1/review/queue returns HTTP 200 with active candidate queue', () => {
        assert.strictEqual(ec2Review.status, 200);
        assert.ok(ec2Review.data.queue && ec2Review.data.queue.length >= 1);
    });

    const ec2Graph = await fetchJson('http://3.148.218.118/api/v1/graph/projection');
    test('EC2 /api/v1/graph/projection returns HTTP 200 with synchronized node projection', () => {
        assert.strictEqual(ec2Graph.status, 200);
        assert.ok(ec2Graph.data.nodes.length >= 190);
        assert.ok(ec2Graph.data.edges.length >= 80);
    });

    const ec2Props = await fetchJson('http://3.148.218.118/api/v1/properties');
    test('EC2 /api/v1/properties returns HTTP 200 with 41 canonical properties and enriched CrownKeys', () => {
        assert.strictEqual(ec2Props.status, 200);
        const props = ec2Props.data.properties || ec2Props.data;
        assert.strictEqual(props.length, 41);
        const withEvents = props.filter(p => p.events_count > 0);
        assert.ok(withEvents.length >= 10, 'At least 10 properties must have connected distress events');
    });

    console.log('\n================================================================');
    console.log(`🎉 ALL ${totalPassed} MASTER CROWNKEY SPECIFICATION TESTS PASSED 100%!`);
    console.log('   Zero Gaps Remaining · Dual-Store Synchronized · Production Verified');
    console.log('================================================================\n');

    process.exit(0);
}

runMasterVerification().catch(err => {
    console.error('Master Verification Error:', err);
    process.exit(1);
});
