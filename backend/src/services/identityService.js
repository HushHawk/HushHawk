import { pool, withTransaction, audit, emitOutbox } from '../store/pgClient.js';
import { HttpError } from './eventService.js';

const DECISIONS = ['CONFIRM', 'REJECT', 'DEFER', 'LINK_ONLY', 'ESCALATE'];
const STATUS_BY_DECISION = { CONFIRM: 'CONFIRMED', REJECT: 'REJECTED', DEFER: 'DEFERRED', LINK_ONLY: 'LINKED_ONLY', ESCALATE: 'ESCALATED' };

export class IdentityService {
    /** Candidate pairs with both records side by side, and their decision history. */
    static async getReviewQueue({ status = null, limit = 100 } = {}) {
        const { rows } = await pool.query(
            `SELECT c.*,
               CASE c.entity_type
                 WHEN 'PERSON' THEN (SELECT to_jsonb(p) FROM core.people p WHERE p.person_id = c.entity_id_a)
                 WHEN 'PROPERTY' THEN (SELECT to_jsonb(p) || jsonb_build_object('county_code', k.county_code) FROM core.properties p JOIN ref.counties k USING (county_id) WHERE p.property_id = c.entity_id_a)
               END AS entity_a_data,
               CASE c.entity_type
                 WHEN 'PERSON' THEN (SELECT to_jsonb(p) FROM core.people p WHERE p.person_id = c.entity_id_b)
                 WHEN 'PROPERTY' THEN (SELECT to_jsonb(p) || jsonb_build_object('county_code', k.county_code) FROM core.properties p JOIN ref.counties k USING (county_id) WHERE p.property_id = c.entity_id_b)
               END AS entity_b_data,
               coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC) FROM rel.review_decisions d WHERE d.candidate_id = c.candidate_id), '[]'::jsonb) AS history
             FROM rel.identity_candidates c
             WHERE ($1::text IS NULL OR c.status = $1)
             ORDER BY (c.status = 'PENDING') DESC, c.created_at DESC
             LIMIT $2`, [status, Math.min(Number(limit) || 100, 500)]);
        return rows;
    }

    /** Human decision on a candidate. Nothing is merged automatically; LINK_ONLY records a typed relationship. */
    static async submitDecision({ candidateId, decision, reason, actor }) {
        if (!actor) throw new HttpError(400, 'An actor is required.');
        if (!DECISIONS.includes(decision)) throw new HttpError(400, `Decision must be one of ${DECISIONS.join(', ')}.`);
        if (typeof reason !== 'string' || !reason.trim()) throw new HttpError(400, 'A decision reason is required.');

        return withTransaction(async client => {
            const { rows: [candidate] } = await client.query('SELECT * FROM rel.identity_candidates WHERE candidate_id = $1 FOR UPDATE', [candidateId]);
            if (!candidate) throw new HttpError(404, 'Candidate not found.');
            if (candidate.status === 'CONFIRMED' || candidate.status === 'REJECTED') {
                throw new HttpError(409, `Candidate is already ${candidate.status}. Reverse the earlier decision first.`);
            }
            const { rows: [record] } = await client.query(
                `INSERT INTO rel.review_decisions (candidate_id, reviewer, decision, reason) VALUES ($1,$2,$3,$4) RETURNING *`,
                [candidateId, actor, decision, reason.trim()]);
            const { rows: [updated] } = await client.query(
                'UPDATE rel.identity_candidates SET status = $2 WHERE candidate_id = $1 RETURNING *', [candidateId, STATUS_BY_DECISION[decision]]);
            if (decision === 'LINK_ONLY') {
                await client.query(
                    `INSERT INTO rel.entity_relationships (from_entity_type, from_entity_id, to_entity_type, to_entity_id, relationship_type, verification_status, valid_from)
                     VALUES ($1,$2,$1,$3,'ASSOCIATED_WITH','CONFIRMED', now())`,
                    [candidate.entity_type, candidate.entity_id_a, candidate.entity_id_b]);
            }
            await emitOutbox(client, { aggregateType: 'IDENTITY_CANDIDATE', aggregateId: candidateId, eventType: 'REVIEW_DECIDED', payload: { decision } });
            await audit(client, { actor, action: `REVIEW_DECISION_${decision}`, entityType: 'IDENTITY_CANDIDATE', entityId: candidateId, diff: { decision, reason: reason.trim() } });
            return { success: true, decisionRecord: record, candidate: updated };
        });
    }

    /** Audited reversal: the decision stays on record and the candidate returns to PENDING. */
    static async reverseDecision({ decisionId, reversalReason, actor }) {
        if (!actor) throw new HttpError(400, 'An actor is required.');
        if (typeof reversalReason !== 'string' || !reversalReason.trim()) throw new HttpError(400, 'A reversal reason is required.');
        return withTransaction(async client => {
            const { rows: [decision] } = await client.query('SELECT * FROM rel.review_decisions WHERE decision_id = $1 FOR UPDATE', [decisionId]);
            if (!decision) throw new HttpError(404, 'Decision not found.');
            if (decision.reversal_status === 'REVERSED') throw new HttpError(409, 'Decision was already reversed.');
            await client.query(
                `UPDATE rel.review_decisions SET reversal_status = 'REVERSED', reversal_reason = $2, reversed_by = $3, reversed_at = now() WHERE decision_id = $1`,
                [decisionId, reversalReason.trim(), actor]);
            const { rows: [candidate] } = await client.query(
                `UPDATE rel.identity_candidates SET status = 'PENDING' WHERE candidate_id = $1 RETURNING *`, [decision.candidate_id]);
            if (decision.decision === 'LINK_ONLY') {
                await client.query(
                    `UPDATE rel.entity_relationships SET verification_status = 'REJECTED', valid_to = now()
                     WHERE relationship_type = 'ASSOCIATED_WITH' AND from_entity_id = $1 AND to_entity_id = $2`,
                    [candidate.entity_id_a, candidate.entity_id_b]);
            }
            await audit(client, { actor, action: 'REVIEW_DECISION_REVERSED', entityType: 'REVIEW_DECISION', entityId: decisionId, diff: { reversalReason: reversalReason.trim() } });
            return { success: true, candidate };
        });
    }
}
