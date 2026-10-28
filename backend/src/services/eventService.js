import crypto from 'crypto';
import { db } from '../store/database.js';
import { CrownKeyService } from './crownkeyService.js';

export class EventService {
    /**
     * Creates or updates a pillar event using the atomic counter pattern (Blueprint Section 5.1 & Page 13).
     * 
     * Rule:
     * 1. Idempotent lookup by case_reference / external_event_id.
     *    If found -> reuse existing event, attach evidence, STOP (no new number minted!).
     * 2. If NOT found -> allocate inside transaction lock, insert pillar_event, emit outbox event.
     */
    static recordPillarEvent({
        propertyId,
        pillarCode,
        caseReference,
        externalEventId,
        eventStatus = 'OPEN',
        verificationStatus = 'CONFIRMED',
        eventDate = new Date().toISOString().split('T')[0],
        filingAmount = 0,
        sourceRecordId = null,
        evidenceNotes = 'Source record attached',
        actor = 'SYSTEM_CONNECTOR',
    }) {
        if (!propertyId || !pillarCode) {
            throw new Error('propertyId and pillarCode are required');
        }

        // Validate pillar from dictionary
        const pillar = db.data.ref.pillars.find(p => p.pillar_code === pillarCode);
        if (!pillar) {
            throw new Error(`Pillar code '${pillarCode}' does not exist in reference dictionary`);
        }

        // STEP 1: Idempotent lookup
        let existingEvent = null;
        if (caseReference) {
            existingEvent = db.data.core.pillar_events.find(
                e => e.property_id === propertyId &&
                     e.pillar_code === pillarCode &&
                     e.case_reference &&
                     e.case_reference.trim().toUpperCase() === caseReference.trim().toUpperCase()
            );
        }

        if (!existingEvent && externalEventId) {
            existingEvent = db.data.core.pillar_events.find(
                e => e.property_id === propertyId &&
                     e.pillar_code === pillarCode &&
                     e.external_event_id &&
                     e.external_event_id.trim().toUpperCase() === externalEventId.trim().toUpperCase()
            );
        }

        if (existingEvent) {
            console.log(`[EventService] Idempotent hit: Reusing event ${existingEvent.event_id} (Number: ${existingEvent.event_number})`);
            
            // Attach evidence if source record provided
            if (sourceRecordId) {
                this.attachEvidence({
                    eventId: existingEvent.event_id,
                    sourceRecordId,
                    verificationStatus,
                    notes: evidenceNotes,
                });
            }

            db.logAudit({
                actor,
                action: 'EVENT_EVIDENCE_ATTACHED',
                entityType: 'PILLAR_EVENT',
                entityId: existingEvent.event_id,
                redactedDiff: { sourceRecordId, notes: evidenceNotes },
            });

            return {
                event: existingEvent,
                isNew: false,
                message: 'Existing event matched; evidence linked without incrementing counter.',
            };
        }

        // STEP 2: Allocate atomic counter inside transaction
        const eventNumber = db.allocateEventNumber(propertyId, pillarCode);

        const newEvent = {
            event_id: crypto.randomUUID(),
            property_id: propertyId,
            pillar_code: pillarCode,
            event_number: eventNumber,
            external_event_id: externalEventId || null,
            case_reference: caseReference || null,
            event_status: eventStatus,
            verification_status: verificationStatus,
            event_date: eventDate,
            filing_amount: Number(filingAmount) || 0,
            created_at: new Date().toISOString(),
        };

        db.data.core.pillar_events.push(newEvent);

        // Attach source evidence
        if (sourceRecordId) {
            this.attachEvidence({
                eventId: newEvent.event_id,
                sourceRecordId,
                verificationStatus,
                notes: evidenceNotes,
            });
        }

        // Emit Transactional Outbox Event for Neo4j Projection
        db.emitOutbox({
            aggregateType: 'PILLAR_EVENT',
            aggregateId: newEvent.event_id,
            event_type: 'EVENT_CREATED',
            payload: {
                property_id: propertyId,
                pillar_code: pillarCode,
                event_number: eventNumber,
                case_reference: caseReference,
                verification_status: verificationStatus,
            },
        });

        // Audit Trail
        db.logAudit({
            actor,
            action: 'EVENT_CREATED',
            entityType: 'PILLAR_EVENT',
            entityId: newEvent.event_id,
            redactedDiff: { pillar_code: pillarCode, event_number: eventNumber, caseReference },
        });

        db.persist();

        return {
            event: newEvent,
            isNew: true,
            message: `New event recorded with atomic counter ${eventNumber}`,
        };
    }

    /**
     * Attaches source record evidence to a pillar event.
     */
    static attachEvidence({ eventId, sourceRecordId, verificationStatus = 'CONFIRMED', notes = '' }) {
        const existing = db.data.rel.event_evidence.find(
            ee => ee.event_id === eventId && ee.source_record_id === sourceRecordId
        );
        if (existing) {
            return existing;
        }

        const evidence = {
            evidence_id: crypto.randomUUID(),
            event_id: eventId,
            source_record_id: sourceRecordId,
            verification_status: verificationStatus,
            observed_at: new Date().toISOString(),
            notes,
        };

        db.data.rel.event_evidence.push(evidence);
        db.persist();
        return evidence;
    }
}
