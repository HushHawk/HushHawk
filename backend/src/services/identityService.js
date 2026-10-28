import crypto from 'crypto';
import { db } from '../store/database.js';
import { evaluateIdentityLadder } from '../../../packages/identity/index.js';

export class IdentityService {
    /**
     * Get pending review queue items with full side-by-side details
     */
    static getReviewQueue() {
        return db.data.rel.identity_candidates.map(candidate => {
            let entityA = null;
            let entityB = null;

            if (candidate.entity_type === 'PERSON') {
                entityA = db.data.core.people.find(p => p.person_id === candidate.entity_id_a) || { id: candidate.entity_id_a, name: 'Record A' };
                entityB = db.data.core.people.find(p => p.person_id === candidate.entity_id_b) || { id: candidate.entity_id_b, name: 'Record B' };
            } else if (candidate.entity_type === 'PROPERTY') {
                entityA = db.data.core.properties.find(p => p.property_id === candidate.entity_id_a) || { id: candidate.entity_id_a, parcel: 'Parcel A' };
                entityB = db.data.core.properties.find(p => p.property_id === candidate.entity_id_b) || { id: candidate.entity_id_b, parcel: 'Parcel B' };
            }

            const decisions = db.data.rel.review_decisions.filter(d => d.candidate_id === candidate.candidate_id);

            return {
                ...candidate,
                entity_a_data: entityA,
                entity_b_data: entityB,
                history: decisions,
            };
        });
    }

    /**
     * Process a human reviewer action on a candidate.
     * Actions: CONFIRM, REJECT, DEFER, LINK_ONLY, ESCALATE
     */
    static submitDecision({ candidateId, reviewer = 'David Sterling', decision, reason }) {
        const candidate = db.data.rel.identity_candidates.find(c => c.candidate_id === candidateId);
        if (!candidate) {
            throw new Error(`Candidate with ID '${candidateId}' not found`);
        }

        const validDecisions = ['CONFIRM', 'REJECT', 'DEFER', 'LINK_ONLY', 'ESCALATE'];
        if (!validDecisions.includes(decision)) {
            throw new Error(`Invalid decision '${decision}'. Must be one of: ${validDecisions.join(', ')}`);
        }

        const decisionRecord = {
            decision_id: crypto.randomUUID(),
            candidate_id: candidateId,
            reviewer,
            decision,
            reason: reason || 'Reviewer assessment completed',
            reversal_status: 'NONE',
            created_at: new Date().toISOString(),
        };

        db.data.rel.review_decisions.unshift(decisionRecord);

        // Update candidate status
        if (decision === 'CONFIRM') {
            candidate.status = 'CONFIRMED';
        } else if (decision === 'REJECT') {
            candidate.status = 'REJECTED';
        } else if (decision === 'DEFER') {
            candidate.status = 'DEFERRED';
        } else if (decision === 'LINK_ONLY') {
            candidate.status = 'LINKED_ONLY';
            // Create a typed relationship without merging the two entities
            db.data.rel.entity_relationships.push({
                relationship_id: crypto.randomUUID(),
                from_entity_type: candidate.entity_type,
                from_entity_id: candidate.entity_id_a,
                to_entity_type: candidate.entity_type,
                to_entity_id: candidate.entity_id_b,
                relationship_type: 'ASSOCIATED_WITH',
                verification_status: 'CONFIRMED',
                confidence_score: 0.85,
                valid_from: new Date().toISOString(),
            });
        } else if (decision === 'ESCALATE') {
            candidate.status = 'ESCALATED';
        }

        // Audit Trail
        db.logAudit({
            actor: reviewer,
            action: `REVIEW_DECISION_${decision}`,
            entityType: 'IDENTITY_CANDIDATE',
            entityId: candidateId,
            redactedDiff: { decision, reason },
        });

        db.persist();

        return {
            success: true,
            decisionRecord,
            candidate,
        };
    }

    /**
     * Controlled Reversal of a previous review decision.
     */
    static reverseDecision({ decisionId, reviewer = 'David Sterling', reversalReason }) {
        const decision = db.data.rel.review_decisions.find(d => d.decision_id === decisionId);
        if (!decision) {
            throw new Error('Decision record not found');
        }

        decision.reversal_status = 'REVERSED';
        decision.reversal_reason = reversalReason || 'Correction requested by senior reviewer';
        decision.reversed_by = reviewer;
        decision.reversed_at = new Date().toISOString();

        // Reset candidate status back to PENDING for re-evaluation
        const candidate = db.data.rel.identity_candidates.find(c => c.candidate_id === decision.candidate_id);
        if (candidate) {
            candidate.status = 'PENDING';
        }

        db.logAudit({
            actor: reviewer,
            action: 'REVIEW_DECISION_REVERSED',
            entityType: 'REVIEW_DECISION',
            entityId: decisionId,
            redactedDiff: { reversalReason },
        });

        db.persist();
        return { success: true, decision, candidate };
    }
}
