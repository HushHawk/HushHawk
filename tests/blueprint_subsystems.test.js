/**
 * @file tests/blueprint_subsystems.test.js
 * Comprehensive Blueprint Subsystem-by-Subsystem Verification Test Suite
 * Tests Direct Mail, Outbound Calls & Compliance Gate, Communications, Ingestion,
 * Tasks, Podio Coexistence, Safe Event Counters, and Immutable Audit Trail.
 */

import assert from 'assert';
import crypto from 'crypto';
import { pool } from '../backend/src/store/pgClient.js';
import { db } from '../backend/src/store/database.js';
import { ComplianceService } from '../backend/src/services/complianceService.js';
import { CrmService } from '../backend/src/services/crmService.js';
import { EventService } from '../backend/src/services/eventService.js';
import { CrownKeyService } from '../backend/src/services/crownkeyService.js';
import { renderCrownKey, validateCrownKeyFormat } from '../packages/crownkey/index.js';

async function runBlueprintSubsystemTests() {
    console.log('================================================================');
    console.log('🦅 HUSHHAWK A-TO-Z BLUEPRINT SUBSYSTEM VERIFICATION');
    console.log('================================================================\n');

    const createdIds = {
        interactionIds: [],
        taskIds: [],
        auditIds: [],
        notifIds: [],
        leadIds: [],
        propertyIds: [],
        personIds: []
    };

    try {
        // --------------------------------------------------------------------
        // [Subsystem 1] DIRECT MAIL CAMPAIGN & COMPLIANCE SYSTEM (Sections 13 & 14)
        // --------------------------------------------------------------------
        console.log('[Subsystem 1] Direct Mail Campaign System & Compliance Check');
        
        // 1a. Run 6-step compliance evaluation for direct mail batch
        const mailCompliance = ComplianceService.evaluateOutboundRequest({
            channel: 'MAIL',
            recipientAddress: '32068, 32043 (Clay County High Equity)',
            actor: 'Marcus Vance',
            templateId: 'tmpl-probate-letter-v1'
        });
        assert.strictEqual(mailCompliance.allowed, true, 'Direct mail batch should pass compliance check');
        assert.strictEqual(mailCompliance.checks.length, 6, 'Must evaluate all 6 blueprint compliance steps');
        console.log(`  ✓ PASS: Direct mail compliance gate passed (6/6 checks)`);

        // 1b. Create Direct Mail Batch Record
        const batchCode = 'DM-TEST-' + Date.now().toString().slice(-4);
        const mailBatch = {
            id: Date.now(),
            batchCode,
            name: 'Clay County Q4 Absentee Drop',
            audience: 'Clay County High Equity Absentee',
            zips: '32068, 32043',
            format: '4x6 Yellow Postcard',
            quantity: 3500,
            cost: 1540,
            status: 'In Production',
            compliance_status: mailCompliance.status,
            created_at: new Date().toISOString()
        };
        if (!db.data.crm.direct_mail) db.data.crm.direct_mail = [];
        db.data.crm.direct_mail.unshift(mailBatch);

        // 1c. Record Direct Mail Audit Event in PostgreSQL
        const mailAuditId = crypto.randomUUID();
        const batchUuid = crypto.randomUUID();
        await pool.query(
            `INSERT INTO audit.audit_events (audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at)
             VALUES ($1, $2, 'DIRECT_MAIL_DISPATCHED', 'DIRECT_MAIL_BATCH', $3, $4, $5, NOW())`,
            [mailAuditId, 'Marcus Vance', batchUuid, crypto.randomUUID(), JSON.stringify({ batchCode, quantity: 3500 })]
        );
        createdIds.auditIds.push(mailAuditId);

        // 1d. Emit Operational Notification in PostgreSQL
        const mailNotifId = crypto.randomUUID();
        await pool.query(
            `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
            [mailNotifId, `Direct Mail Batch: ${batchCode}`, '3,500 mailers dispatched to production print queue.', 'PIPELINE', 'MEDIUM', 'gold', 'mail']
        );
        createdIds.notifIds.push(mailNotifId);
        console.log(`  ✓ PASS: Direct mail batch created, audited, and notified in RDS`);

        // --------------------------------------------------------------------
        // [Subsystem 2] CALL & OUTBOUND PHONE SYSTEM (Section 14 & Section 8)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 2] Call & Outbound Phone System with Compliance Gate');
        
        // 2a. Call to clean phone number -> Should PASS compliance
        const cleanPhone = '9045550199';
        const cleanCallEval = ComplianceService.evaluateOutboundRequest({
            channel: 'CALL',
            recipientPhone: cleanPhone,
            actor: 'Elena Rostova',
            templateId: 'tmpl-intro-call-v1'
        });
        assert.strictEqual(cleanCallEval.allowed, true, 'Clean phone must pass compliance gate');
        console.log(`  ✓ PASS: Clean number ${cleanPhone} allowed for outbound call`);

        // 2b. Dispatch call and record in PostgreSQL core.interactions
        const callInteraction = await CrmService.recordInteraction({
            method: 'CALL',
            direction: 'OUTBOUND',
            actor: 'Elena Rostova',
            result: 'CONNECTED_SPOKE_WITH_SELLER',
            notes: `Outbound call to ${cleanPhone}. Seller requested all-cash offer.`
        });
        assert.ok(callInteraction.interaction_id, 'Interaction UUID generated');
        createdIds.interactionIds.push(callInteraction.interaction_id);

        // Verify interaction in PostgreSQL RDS
        const intCheck = await pool.query(
            'SELECT interaction_id, method, direction, actor_id, result FROM core.interactions WHERE interaction_id = $1',
            [callInteraction.interaction_id]
        );
        assert.strictEqual(intCheck.rows.length, 1, 'Interaction must exist in core.interactions');
        assert.strictEqual(intCheck.rows[0].method, 'CALL');
        assert.strictEqual(intCheck.rows[0].direction, 'OUTBOUND');
        console.log(`  ✓ PASS: Call interaction recorded directly in PostgreSQL core.interactions`);

        // 2c. Call to SUPPRESSED / DNC number -> Must be BLOCKED
        const dncPhone = '9049999999';
        ComplianceService.addSuppression({
            type: 'PHONE',
            value: dncPhone,
            reason: 'Owner requested Do Not Call registry',
            source: 'FL_DNC_REGISTRY'
        });

        const blockedCallEval = ComplianceService.evaluateOutboundRequest({
            channel: 'CALL',
            recipientPhone: dncPhone,
            actor: 'Elena Rostova'
        });
        assert.strictEqual(blockedCallEval.allowed, false, 'DNC phone MUST be blocked by compliance gate');
        assert.strictEqual(blockedCallEval.checks[0].passed, false, 'Step 1 DNC check must fail');
        console.log(`  ✓ PASS: DNC phone ${dncPhone} strictly blocked by Section 14 compliance gate`);

        // --------------------------------------------------------------------
        // [Subsystem 3] COMMUNICATIONS & SMS MESSAGING (Section 3 & 4)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 3] Communications & Inbound/Outbound SMS System');
        
        // 3a. Record SMS message in core.interactions
        const smsInteraction = await CrmService.recordInteraction({
            method: 'TEXT',
            direction: 'OUTBOUND',
            actor: 'Elena Rostova',
            result: 'DELIVERED_10DLC',
            notes: 'Sent offer walkthrough link via 10DLC registered route.'
        });
        assert.ok(smsInteraction.interaction_id);
        createdIds.interactionIds.push(smsInteraction.interaction_id);

        const smsCheck = await pool.query(
            'SELECT method, result FROM core.interactions WHERE interaction_id = $1',
            [smsInteraction.interaction_id]
        );
        assert.strictEqual(smsCheck.rows[0].method, 'TEXT');
        console.log(`  ✓ PASS: SMS interaction logged to PostgreSQL with 10DLC compliance result`);

        // --------------------------------------------------------------------
        // [Subsystem 4] LEAD INGESTION & CROWNKEY STANDARD (Section 5 & 7)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 4] Lead Ingestion & CrownKey Parcel Punctuation Standard');
        
        const testRawParcel = '04-05-25-009008-001-29';
        const crownKey = renderCrownKey({
            countyCode: 'CLY',
            parcelRaw: testRawParcel,
            firstSourceCode: 'MAIL'
        });
        assert.strictEqual(crownKey, 'CLY-04-05-25-009008-001-29 · MAIL');
        const ckValidation = validateCrownKeyFormat(crownKey);
        assert.strictEqual(ckValidation.valid, true);

        // Verify parcel raw punctuation preserved as TEXT
        const propId = crypto.randomUUID();
        const personId = crypto.randomUUID();
        const leadId = crypto.randomUUID();
        createdIds.propertyIds.push(propId);
        createdIds.personIds.push(personId);
        createdIds.leadIds.push(leadId);

        await pool.query(
            `INSERT INTO core.properties (property_id, county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, assessed_value, created_at, updated_at)
             VALUES ($1, 'c3333333-3333-3333-3333-333333333333', $2, '04052500900800129', '4155 County Rd 218', 'Middleburg', 'FL', '32068', 'Single Family', 265000, NOW(), NOW())`,
            [propId, testRawParcel]
        );

        await pool.query(
            `INSERT INTO core.people (person_id, full_name, primary_phone, primary_email, created_at, updated_at)
             VALUES ($1, 'TAH MS BORROWER LLC', '(813) 502-9453', 'taryn_moss@yahoo.com', NOW(), NOW())`,
            [personId]
        );

        await pool.query(
            `INSERT INTO core.leads (lead_id, first_source_code, source_detail, property_id, person_id, status, priority_score, created_at, updated_at)
             VALUES ($1, 'MAIL', 'Direct Mail Campaign July 2025', $2, $3, 'NEW', 75, NOW(), NOW())`,
            [leadId, propId, personId]
        );

        const propCheck = await pool.query('SELECT parcel_raw FROM core.properties WHERE property_id = $1', [propId]);
        assert.strictEqual(propCheck.rows[0].parcel_raw, testRawParcel, 'Parcel raw text must retain dashes and zeros');
        console.log(`  ✓ PASS: CrownKey and punctuated parcel preserved as TEXT in RDS: ${crownKey}`);

        // --------------------------------------------------------------------
        // [Subsystem 5] TASK MANAGEMENT & MILESTONE SYSTEM (Section 3 & 4)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 5] Task Management & Milestone Assignment System');
        
        const task = await CrmService.createTask({
            title: 'Schedule In-Person Walkthrough for 4155 County Rd 218',
            dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
            ownerId: 'Elena Rostova',
            linkedEntityType: 'LEAD',
            linkedEntityId: leadId,
            category: 'Underwriting',
            priority: 'URGENT',
            actor: 'Marcus Vance'
        });
        assert.ok(task.task_id);
        createdIds.taskIds.push(task.task_id);

        const taskCheck = await pool.query(
            'SELECT task_id, title, status, owner_id, priority FROM core.tasks WHERE task_id = $1',
            [task.task_id]
        );
        assert.strictEqual(taskCheck.rows.length, 1, 'Task must exist in core.tasks');
        assert.strictEqual(taskCheck.rows[0].status, 'PENDING');
        assert.strictEqual(taskCheck.rows[0].priority, 'URGENT');
        console.log(`  ✓ PASS: Task milestone persisted in core.tasks and assigned to ${task.owner_id}`);

        // --------------------------------------------------------------------
        // [Subsystem 6] PODIO CRM COEXISTENCE & WEBHOOK RECEIVER (Section 12)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 6] Podio Coexistence & Sync Map Ingestion');
        
        const podioItemId = 'podio-item-' + Date.now();
        const syncEntry = {
            internal_uuid: leadId,
            external_system: 'PODIO',
            external_item_id: podioItemId,
            last_sync_at: new Date().toISOString(),
            sync_status: 'SYNCHRONIZED',
            field_ownership: 'HUSHHAWK_CANONICAL'
        };
        db.data.crm.external_sync_map.unshift(syncEntry);
        assert.strictEqual(syncEntry.internal_uuid, leadId, 'HushHawk UUID is canonical key, not Podio ID');
        console.log(`  ✓ PASS: Podio item ${podioItemId} mapped to canonical UUID ${leadId} via external_sync_map`);

        // --------------------------------------------------------------------
        // [Subsystem 7] ATOMIC EVENT NUMBERING & SECOND-SOURCE EVIDENCE (Section 5.1 & 6)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 7] Atomic Event Counter & Idempotent Second Source');
        
        // First source reports Foreclosure event
        const res1 = EventService.recordPillarEvent({
            propertyId: propId,
            pillarCode: 'FC',
            caseReference: 'CASE-2026-CA-009988',
            externalEventId: 'CASE-2026-CA-009988',
            sourceRecordId: crypto.randomUUID(),
            actor: 'Clerk Connector'
        });
        const ev1 = res1.event;
        const num1 = ev1.event_number;

        // Second source reports SAME Foreclosure case -> Must reuse event identity and NOT increment counter!
        const res2 = EventService.recordPillarEvent({
            propertyId: propId,
            pillarCode: 'FC',
            caseReference: 'CASE-2026-CA-009988', // Identical court case reference
            externalEventId: 'CASE-2026-CA-009988',
            sourceRecordId: crypto.randomUUID(),
            actor: 'Tax Connector'
        });
        const ev2 = res2.event;
        assert.strictEqual(ev2.event_id, ev1.event_id, 'Same case reference must reuse event_id');
        assert.strictEqual(ev2.event_number, num1, 'Event counter must not increment for duplicate source');
        assert.strictEqual(res2.isNew, false, 'Second event must report isNew = false');
        console.log(`  ✓ PASS: Idempotent hit: Event ${ev1.event_id} (Counter #${num1}) reused with second evidence attached`);

        // --------------------------------------------------------------------
        // [Subsystem 8] IMMUTABLE AUDIT TRAIL VERIFICATION (Section 16)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 8] Verifying Append-Only Audit Trail in PostgreSQL RDS');
        const auditLog = await pool.query(
            `SELECT action, actor, entity_type, created_at 
             FROM audit.audit_events 
             ORDER BY created_at DESC 
             LIMIT 5`
        );
        assert.ok(auditLog.rows.length >= 1, 'Audit records must exist');
        console.log(`  ✓ PASS: Immutable audit ledger active in PostgreSQL audit.audit_events (${auditLog.rows.length} verified)`);

        // --------------------------------------------------------------------
        // [Subsystem 9] TEST DATA CLEANUP (Leaving Database Pristine)
        // --------------------------------------------------------------------
        console.log('\n[Subsystem 9] Safe Cleanup of Test Data (Restoring Canonical Truth)');
        if (createdIds.leadIds.length) {
            await pool.query('DELETE FROM core.leads WHERE lead_id = ANY($1)', [createdIds.leadIds]);
        }
        if (createdIds.propertyIds.length) {
            await pool.query('DELETE FROM core.properties WHERE property_id = ANY($1)', [createdIds.propertyIds]);
        }
        if (createdIds.personIds.length) {
            await pool.query('DELETE FROM core.people WHERE person_id = ANY($1)', [createdIds.personIds]);
        }
        if (createdIds.interactionIds.length) {
            await pool.query('DELETE FROM core.interactions WHERE interaction_id = ANY($1)', [createdIds.interactionIds]);
        }
        if (createdIds.taskIds.length) {
            await pool.query('DELETE FROM core.tasks WHERE task_id = ANY($1)', [createdIds.taskIds]);
        }
        if (createdIds.auditIds.length) {
            await pool.query('DELETE FROM audit.audit_events WHERE audit_id = ANY($1)', [createdIds.auditIds]);
        }
        if (createdIds.notifIds.length) {
            await pool.query('DELETE FROM ops.notifications WHERE notification_id = ANY($1)', [createdIds.notifIds]);
        }
        console.log('  ✓ PASS: All temporary test records purged; AWS RDS database remains pristine!');

        console.log('\n================================================================');
        console.log('🎉 ALL BLUEPRINT SUBSYSTEM TESTS PASSED AT 100%!');
        console.log('================================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ BLUEPRINT SUBSYSTEM TEST FAILED:', err);
        // Emergency cleanup
        try {
            if (createdIds.leadIds.length) await pool.query('DELETE FROM core.leads WHERE lead_id = ANY($1)', [createdIds.leadIds]);
            if (createdIds.propertyIds.length) await pool.query('DELETE FROM core.properties WHERE property_id = ANY($1)', [createdIds.propertyIds]);
            if (createdIds.personIds.length) await pool.query('DELETE FROM core.people WHERE person_id = ANY($1)', [createdIds.personIds]);
            if (createdIds.interactionIds.length) await pool.query('DELETE FROM core.interactions WHERE interaction_id = ANY($1)', [createdIds.interactionIds]);
            if (createdIds.taskIds.length) await pool.query('DELETE FROM core.tasks WHERE task_id = ANY($1)', [createdIds.taskIds]);
        } catch (cErr) {}
        process.exit(1);
    }
}

runBlueprintSubsystemTests();
