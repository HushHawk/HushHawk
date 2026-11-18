import { pool, withTransaction, audit, emitOutbox } from '../store/pgClient.js';

const VERIFICATION = ['CONFIRMED', 'POSSIBLE', 'NEEDS_REVIEW', 'REJECTED'];
const EVENT_STATUS = ['OPEN', 'RESOLVED', 'HISTORICAL', 'UNKNOWN'];

export class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

async function findExisting(client, { propertyId, pillarCode, caseReference, externalEventId }) {
    const { rows: [row] } = await client.query(
        `SELECT * FROM core.pillar_events
         WHERE property_id = $1 AND pillar_code = $2
           AND ( ($3::text IS NOT NULL AND upper(btrim(case_reference)) = upper(btrim($3)))
              OR ($4::text IS NOT NULL AND upper(btrim(external_event_id)) = upper(btrim($4))) )
         LIMIT 1`,
        [propertyId, pillarCode, caseReference || null, externalEventId || null]);
    return row || null;
}

async function attachEvidence(client, { eventId, sourceRecordId, verificationStatus, notes }) {
    if (!sourceRecordId) return;
    await client.query(
        `INSERT INTO rel.event_evidence (event_id, source_record_id, verification_status, notes)
         VALUES ($1, $2, $3, $4) ON CONFLICT (event_id, source_record_id) DO NOTHING`,
        [eventId, sourceRecordId, verificationStatus, notes || null]);
}

export class EventService {
    /**
     * Creates a pillar event or attaches evidence to the matching existing one.
     * The event number is allocated by ops.allocate_event_number inside the same transaction,
     * so concurrent callers can never receive the same number and a failure leaves nothing behind.
     */
    static async recordPillarEvent({
        propertyId, pillarCode, caseReference = null, externalEventId = null,
        eventStatus = 'OPEN', verificationStatus = 'NEEDS_REVIEW', eventDate = null,
        filingAmount = null, sourceRecordId = null, evidenceNotes = null, actor
    }) {
        if (!propertyId || !pillarCode) throw new HttpError(400, 'propertyId and pillarCode are required.');
        if (!EVENT_STATUS.includes(eventStatus)) throw new HttpError(400, `eventStatus must be one of ${EVENT_STATUS.join(', ')}.`);
        if (!VERIFICATION.includes(verificationStatus)) throw new HttpError(400, `verificationStatus must be one of ${VERIFICATION.join(', ')}.`);
        if (verificationStatus === 'CONFIRMED' && !sourceRecordId) {
            throw new HttpError(400, 'A CONFIRMED event requires supporting evidence (sourceRecordId).');
        }
        if (!actor) throw new HttpError(400, 'An actor is required for the audit trail.');

        return withTransaction(async client => {
            const { rows: [pillar] } = await client.query('SELECT * FROM ref.pillars WHERE pillar_code = $1', [pillarCode]);
            if (!pillar) throw new HttpError(400, `Pillar '${pillarCode}' does not exist in the dictionary.`);
            if (!pillar.production_enabled || pillar.review_status !== 'APPROVED') {
                throw new HttpError(400, `Pillar '${pillarCode}' is not approved for production (status: ${pillar.review_status}).`);
            }
            const { rows: [property] } = await client.query('SELECT property_id FROM core.properties WHERE property_id = $1', [propertyId]);
            if (!property) throw new HttpError(404, 'Property not found.');

            const existing = await findExisting(client, { propertyId, pillarCode, caseReference, externalEventId });
            if (existing) {
                await attachEvidence(client, { eventId: existing.event_id, sourceRecordId, verificationStatus, notes: evidenceNotes });
                await audit(client, { actor, action: 'EVENT_EVIDENCE_ATTACHED', entityType: 'PILLAR_EVENT', entityId: existing.event_id, diff: { sourceRecordId } });
                return { event: existing, isNew: false, message: 'Existing event matched; evidence linked without allocating a new number.' };
            }

            const { rows: [{ n }] } = await client.query('SELECT ops.allocate_event_number($1, $2) AS n', [propertyId, pillarCode]);
            const { rows: [event] } = await client.query(
                `INSERT INTO core.pillar_events
                   (property_id, pillar_code, event_number, external_event_id, case_reference, event_status, verification_status, event_date, filing_amount)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
                [propertyId, pillarCode, n, externalEventId, caseReference, eventStatus, verificationStatus, eventDate, filingAmount]);
            await attachEvidence(client, { eventId: event.event_id, sourceRecordId, verificationStatus, notes: evidenceNotes });
            await emitOutbox(client, {
                aggregateType: 'PILLAR_EVENT', aggregateId: event.event_id, eventType: 'EVENT_CREATED',
                payload: { property_id: propertyId, pillar_code: pillarCode, event_number: Number(n), verification_status: verificationStatus }
            });
            await audit(client, { actor, action: 'EVENT_CREATED', entityType: 'PILLAR_EVENT', entityId: event.event_id, diff: { pillarCode, eventNumber: Number(n), caseReference } });
            return { event, isNew: true, message: `New event recorded as ${pillarCode}-${String(n).padStart(3, '0')}.` };
        }).catch(async error => {
            // A concurrent insert of the same case loses the unique index race; return the winner.
            if (error.code === '23505') {
                const existing = await findExisting(pool, { propertyId, pillarCode, caseReference, externalEventId });
                if (existing) return { event: existing, isNew: false, message: 'Existing event matched (concurrent insert).' };
            }
            throw error;
        });
    }

    /** Change operational and/or verification status. History stays: events are never deleted. */
    static async updateStatus({ eventId, eventStatus, verificationStatus, reason, actor }) {
        if (!actor) throw new HttpError(400, 'An actor is required for the audit trail.');
        if (eventStatus !== undefined && !EVENT_STATUS.includes(eventStatus)) throw new HttpError(400, 'Invalid eventStatus.');
        if (verificationStatus !== undefined && !VERIFICATION.includes(verificationStatus)) throw new HttpError(400, 'Invalid verificationStatus.');
        return withTransaction(async client => {
            const { rows: [before] } = await client.query('SELECT * FROM core.pillar_events WHERE event_id = $1 FOR UPDATE', [eventId]);
            if (!before) throw new HttpError(404, 'Event not found.');
            if (verificationStatus === 'CONFIRMED') {
                const { rowCount } = await client.query('SELECT 1 FROM rel.event_evidence WHERE event_id = $1 LIMIT 1', [eventId]);
                if (!rowCount) throw new HttpError(400, 'Cannot confirm an event without supporting evidence.');
            }
            const { rows: [after] } = await client.query(
                `UPDATE core.pillar_events SET event_status = coalesce($2, event_status), verification_status = coalesce($3, verification_status)
                 WHERE event_id = $1 RETURNING *`, [eventId, eventStatus ?? null, verificationStatus ?? null]);
            await emitOutbox(client, { aggregateType: 'PILLAR_EVENT', aggregateId: eventId, eventType: 'EVENT_UPDATED',
                payload: { event_status: after.event_status, verification_status: after.verification_status } });
            await audit(client, { actor, action: 'EVENT_STATUS_UPDATED', entityType: 'PILLAR_EVENT', entityId: eventId,
                diff: { reason, before: { event_status: before.event_status, verification_status: before.verification_status },
                        after: { event_status: after.event_status, verification_status: after.verification_status } } });
            return after;
        });
    }

    static async list({ propertyId = null, pillarCode = null, limit = 200, offset = 0 } = {}) {
        const { rows } = await pool.query(
            `SELECT e.*, p.parcel_raw, p.address_line1, c.county_code,
                    coalesce(ev.cnt, 0)::int AS evidence_count
             FROM core.pillar_events e
             JOIN core.properties p USING (property_id)
             JOIN ref.counties c ON c.county_id = p.county_id
             LEFT JOIN (SELECT event_id, count(*) cnt FROM rel.event_evidence GROUP BY event_id) ev USING (event_id)
             WHERE ($1::uuid IS NULL OR e.property_id = $1) AND ($2::text IS NULL OR e.pillar_code = $2)
             ORDER BY e.created_at DESC LIMIT $3 OFFSET $4`,
            [propertyId, pillarCode, Math.min(Number(limit) || 200, 500), Number(offset) || 0]);
        return rows;
    }

    static async evidence(eventId) {
        const { rows } = await pool.query(
            `SELECT ee.*, sr.source_system, sr.jurisdiction, sr.source_external_id, sr.source_url, sr.observed_at AS source_observed_at
             FROM rel.event_evidence ee JOIN raw.source_records sr USING (source_record_id)
             WHERE ee.event_id = $1 ORDER BY ee.observed_at DESC`, [eventId]);
        return rows;
    }
}
