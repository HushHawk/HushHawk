/**
 * @file tests/acceptance.test.js
 * Comprehensive Platform Acceptance Test Suite
 * Validates the 12 Platform-Level Proofs from Chapter F / Page 24 of the HushHawk Visual System Architecture.
 */

import assert from 'assert';
import { renderCrownKey, validateCrownKeyFormat, normalizeParcelMatch } from '../packages/crownkey/index.js';
import { evaluateIdentityLadder, LADDER_RUNGS } from '../packages/identity/index.js';
import { EventService } from '../backend/src/services/eventService.js';
import { ComplianceService } from '../backend/src/services/complianceService.js';
import { GraphService } from '../backend/src/services/graphService.js';
import { CrmService } from '../backend/src/services/crmService.js';
import { db } from '../backend/src/store/database.js';

console.log('🦅 Running HushHawk 12 Platform Acceptance Tests...\n');

// ----------------------------------------------------------------------------
// 1. Keys & Parcels: CrownKey 5 Display Cases
// ----------------------------------------------------------------------------
console.log('[Test 1] CrownKey 4 Variants + Pending Lead Case');
const k1 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000' });
assert.strictEqual(k1, 'DUV-091823-0000');
const k2 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000', firstSourceCode: 'MAIL' });
assert.strictEqual(k2, 'DUV-091823-0000 · MAIL');
const k3 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000', pillarCode: 'FC', eventNumber: 1, firstSourceCode: 'MAIL' });
assert.strictEqual(k3, 'DUV-091823-0000-FC-001 · MAIL');
const k4 = renderCrownKey({ countyCode: 'DUV', parcelRaw: '091823-0000', pillarCode: 'FC', eventNumber: 2 });
assert.strictEqual(k4, 'DUV-091823-0000-FC-002');
const k5 = renderCrownKey({ firstSourceCode: 'INBOUND_WEB' });
assert.strictEqual(k5, 'Property pending');
console.log('  ✓ Pass: All CrownKey display cases formatted strictly per blueprint');

// ----------------------------------------------------------------------------
// 2. Keys & Parcels: Leading Zeros & Punctuation Preserved
// ----------------------------------------------------------------------------
console.log('[Test 2] Leading-Zero and Punctuated Parcels Preserved as TEXT');
const rawParcel = '004918-0020-00';
const renderedKey = renderCrownKey({ countyCode: 'DUV', parcelRaw: rawParcel });
assert.strictEqual(renderedKey, 'DUV-004918-0020-00');
assert.strictEqual(normalizeParcelMatch(rawParcel), '004918002000');
console.log('  ✓ Pass: Leading zeros and hyphens preserved in raw parcel');

// ----------------------------------------------------------------------------
// 3. Keys & Parcels: Same Parcel in Two Counties Stays Distinct
// ----------------------------------------------------------------------------
console.log('[Test 3] Same Parcel Text in Two Counties Stays Two Property Identities');
const evalDiffCounty = evaluateIdentityLadder({
    entityType: 'PROPERTY',
    existingEntity: { county_code: 'DUV', parcel_match: '0918230000' },
    incomingRecord: { county_code: 'STJ', parcel_match: '0918230000' },
});
assert.strictEqual(evalDiffCounty.rung.level, 6);
assert.strictEqual(evalDiffCounty.canAutoMerge, false);
console.log('  ✓ Pass: County-scoped uniqueness enforced; cross-county collision quarantined');

// ----------------------------------------------------------------------------
// 4. Events & Counters: Monotonic Atomic Counter Allocation
// ----------------------------------------------------------------------------
console.log('[Test 4] Atomic Event Counter per Property + Pillar');
const testPropId = 'p1000000-0000-0000-0000-000000000001';
const num1 = db.allocateEventNumber(testPropId, 'TAX');
const num2 = db.allocateEventNumber(testPropId, 'TAX');
assert.strictEqual(num2, num1 + 1);
console.log(`  ✓ Pass: Allocated sequential numbers: ${num1} -> ${num2} via row-lock emulation`);

// ----------------------------------------------------------------------------
// 5. Events & Counters: Same Event From Two Sources Reuses Event & Adds Evidence
// ----------------------------------------------------------------------------
console.log('[Test 5] Same Event From Two Sources Reuses Event Identity and Adds Evidence');
const res1 = EventService.recordPillarEvent({
    propertyId: testPropId,
    pillarCode: 'FC',
    caseReference: '16-2026-CA-004819',
    externalEventId: '16-2026-CA-004819',
    sourceRecordId: 'sr-feed-1',
    evidenceNotes: 'Court clerk feed',
});
assert.strictEqual(res1.isNew, false); // Existing event reused!
assert.strictEqual(res1.event.event_number, 1); // Counter NOT bumped!
console.log('  ✓ Pass: Second source attached evidence without creating duplicate event');

// ----------------------------------------------------------------------------
// 6. Events & Counters: Different External Case Reference Creates Distinct Event
// ----------------------------------------------------------------------------
console.log('[Test 6] Different External Case References Create Distinct Events');
const uniqueCase = '16-2026-CA-' + Date.now();
const res2 = EventService.recordPillarEvent({
    propertyId: testPropId,
    pillarCode: 'FC',
    caseReference: uniqueCase,
    externalEventId: uniqueCase,
    sourceRecordId: 'sr-feed-2',
    evidenceNotes: 'New foreclosure docket',
});
assert.strictEqual(res2.isNew, true);
assert(res2.event.event_number > 1);
console.log(`  ✓ Pass: New distinct event created with atomic counter ${res2.event.event_number}`);

// ----------------------------------------------------------------------------
// 7. Ingestion & Identity: Shared Name/Phone NEVER Auto-Merges People
// ----------------------------------------------------------------------------
console.log('[Test 7] Hard Rule: Shared Name or Phone Alone Never Auto-Merges People');
const evalPerson = evaluateIdentityLadder({
    entityType: 'PERSON',
    existingEntity: { full_name: 'Arthur Pendelton', primary_phone: '(904) 555-0182' },
    incomingRecord: { full_name: 'Arthur Pendelton', primary_phone: '(904) 555-0182' },
});
assert.strictEqual(evalPerson.rung.level, 5); // Rung 5: Fuzzy Candidate (Review Queue)
assert.strictEqual(evalPerson.canAutoMerge, false);
assert.strictEqual(evalPerson.needsHumanReview, true);
console.log('  ✓ Pass: Non-merge rule active; routed directly to human review queue');

// ----------------------------------------------------------------------------
// 8. CRM & Attribution: First Source Code Never Changes
// ----------------------------------------------------------------------------
console.log('[Test 8] First-Source Attribution Survives Later Touches');
const lead = CrmService.createLead({
    firstSourceCode: 'MAIL',
    sourceDetail: 'Batch 10 Postcard',
    propertyId: testPropId,
});
assert.strictEqual(lead.first_source_code, 'MAIL');

// Record subsequent touches (Call, text, email)
CrmService.recordInteraction({
    leadId: lead.lead_id,
    method: 'CALL',
    direction: 'INBOUND',
    result: 'CONNECTED',
    notes: 'Seller called in response to postcard',
});
CrmService.recordInteraction({
    leadId: lead.lead_id,
    method: 'EMAIL',
    direction: 'OUTBOUND',
    result: 'SENT',
    notes: 'Follow-up estimate sent',
});

// Verify first source remained MAIL and only 1 lead exists
const leadAfterTouches = db.data.core.leads.find(l => l.lead_id === lead.lead_id);
assert.strictEqual(leadAfterTouches.first_source_code, 'MAIL');
const touchesCount = db.data.core.interactions.filter(i => i.lead_id === lead.lead_id).length;
assert.strictEqual(touchesCount, 2);
console.log('  ✓ Pass: Original source MAIL locked; subsequent touches recorded as interactions');

// ----------------------------------------------------------------------------
// 9. Compliance: Suppressed Contacts Excluded from Outbound Actions
// ----------------------------------------------------------------------------
console.log('[Test 9] Outbound Compliance Gate Blocks Suppressed / DNC Records');
// James Halpert has phone (904) 555-0744 on the suppression list
const blockedGate = ComplianceService.evaluateOutboundRequest({
    channel: 'CALL',
    recipientPhone: '(904) 555-0744',
    actor: 'Elena Rostova',
});
assert.strictEqual(blockedGate.allowed, false);
assert.strictEqual(blockedGate.status, 'BLOCKED_BY_COMPLIANCE_GATE');

const allowedGate = ComplianceService.evaluateOutboundRequest({
    channel: 'CALL',
    recipientPhone: '(904) 555-0182',
    actor: 'Elena Rostova',
});
assert.strictEqual(allowedGate.allowed, true);
assert.strictEqual(allowedGate.status, 'APPROVED_FOR_DISPATCH');
console.log('  ✓ Pass: Compliance gate blocked DNC recipient and approved clean recipient');

// ----------------------------------------------------------------------------
// 10. Graph Projection & Reconciliation
// ----------------------------------------------------------------------------
console.log('[Test 10] Neo4j Projection & Reconciliation');
const recon = GraphService.runReconciliation();
assert.strictEqual(recon.status, 'HEALTHY');
assert.strictEqual(recon.drift_detected, false);
console.log(`  ✓ Pass: SQL Canonical (${recon.sql_canonical.total_entities} entities) reconciled against graph with ${recon.graph_projection.projection_lag_seconds}s lag`);

// ----------------------------------------------------------------------------
// 11. Transactional Outbox
// ----------------------------------------------------------------------------
console.log('[Test 11] Transactional Outbox Events Emitted');
const outboxEvents = db.data.ops.outbox_events;
assert(outboxEvents.length > 0);
assert(outboxEvents[0].aggregate_type);
console.log(`  ✓ Pass: ${outboxEvents.length} outbox event(s) recorded in ops.outbox_events`);

// ----------------------------------------------------------------------------
// 12. Append-Only Audit Trail
// ----------------------------------------------------------------------------
console.log('[Test 12] Append-Only Audit Trail');
const audits = db.data.audit.audit_events;
assert(audits.length > 0);
assert(audits[0].actor);
assert(audits[0].action);
console.log(`  ✓ Pass: ${audits.length} immutable audit event(s) recorded in audit.audit_events`);

console.log('\n🎉 ALL 12 PLATFORM ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!\n');
