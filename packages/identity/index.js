/**
 * @file packages/identity/index.js
 * Identity Resolution Ladder & Candidate Matcher
 * Conforms to HushHawk Blueprint Section 8 and Visual Architecture Page 10.
 * 
 * HARD RULE: Never merge people solely on shared name, phone or mailing address.
 * Always preserve raw records and route uncertainty to the human review loop.
 */

export const LADDER_RUNGS = {
    RUNG_1_EXACT_EXTERNAL_ID: {
        level: 1,
        name: 'Exact external ID',
        rule: 'Same source + jurisdiction + stable source ID',
        confidence: 'VERY_HIGH',
        outcome: 'UPDATE_SOURCE_RECORD',
        autoAction: true,
    },
    RUNG_2_EXACT_PARCEL: {
        level: 2,
        name: 'Exact parcel',
        rule: 'Approved county + full normalized parcel',
        confidence: 'HIGH',
        outcome: 'CANDIDATE_PROPERTY_MATCH',
        autoAction: true,
    },
    RUNG_3_EXACT_EVENT: {
        level: 3,
        name: 'Exact event',
        rule: 'Jurisdiction-scoped case / instrument / account / year',
        confidence: 'HIGH',
        outcome: 'UPDATE_SAME_EVENT_ADD_EVIDENCE',
        autoAction: true,
    },
    RUNG_4_STRONG_MULTI_FIELD: {
        level: 4,
        name: 'Strong multi-field',
        rule: 'Several independent identifiers agree (e.g. legal entity ID + state)',
        confidence: 'MEDIUM_HIGH',
        outcome: 'AUTO_LINK_WITH_EVIDENCE',
        autoAction: true,
    },
    RUNG_5_FUZZY_CANDIDATE: {
        level: 5,
        name: 'Fuzzy candidate',
        rule: 'Name/address similarity or incomplete identifiers',
        confidence: 'LOW',
        outcome: 'ROUTE_TO_HUMAN_REVIEW',
        autoAction: false,
    },
    RUNG_6_CONFLICT: {
        level: 6,
        name: 'Conflict',
        rule: 'Strong identifiers disagree (e.g. conflicting ownership claims)',
        confidence: 'CONTRADICTORY',
        outcome: 'QUARANTINE_AND_ESCALATE',
        autoAction: false,
    },
};

/**
 * Assesses an incoming candidate pair through the 6-rung ladder.
 * 
 * @param {Object} params
 * @param {string} params.entityType - 'PROPERTY' | 'PERSON' | 'BUSINESS' | 'EVENT'
 * @param {Object} params.existingEntity
 * @param {Object} params.incomingRecord
 * @returns {Object} Resolution determination with rung, confidence, recommendation, and reason
 */
export function evaluateIdentityLadder({ entityType, existingEntity, incomingRecord }) {
    if (!existingEntity || !incomingRecord) {
        return {
            rung: LADDER_RUNGS.RUNG_5_FUZZY_CANDIDATE,
            canAutoMerge: false,
            needsHumanReview: true,
            reason: 'Missing comparison pair',
        };
    }

    // PROPERTY MATCHING
    if (entityType === 'PROPERTY') {
        const sameCounty = (Boolean(existingEntity.county_id) && existingEntity.county_id === incomingRecord.county_id) ||
                           (Boolean(existingEntity.county_code) && existingEntity.county_code === incomingRecord.county_code);
        const sameParcel = existingEntity.parcel_match && incomingRecord.parcel_match &&
                           existingEntity.parcel_match === incomingRecord.parcel_match;

        if (sameCounty && sameParcel) {
            return {
                rung: LADDER_RUNGS.RUNG_2_EXACT_PARCEL,
                canAutoMerge: true,
                needsHumanReview: false,
                reason: 'Exact county + parcel_match hit',
            };
        }

        // Conflicting parcel or county mismatch
        if (!sameCounty && sameParcel) {
            return {
                rung: LADDER_RUNGS.RUNG_6_CONFLICT,
                canAutoMerge: false,
                needsHumanReview: true,
                quarantine: true,
                reason: 'Same parcel text in different counties represents distinct properties',
            };
        }
    }

    // PILLAR EVENT MATCHING
    if (entityType === 'EVENT') {
        const sameJurisdiction = existingEntity.jurisdiction === incomingRecord.jurisdiction;
        const sameCase = existingEntity.case_reference && incomingRecord.case_reference &&
                         existingEntity.case_reference.trim().toUpperCase() === incomingRecord.case_reference.trim().toUpperCase();

        if (sameJurisdiction && sameCase) {
            return {
                rung: LADDER_RUNGS.RUNG_3_EXACT_EVENT,
                canAutoMerge: true,
                needsHumanReview: false,
                action: 'ATTACH_EVIDENCE_TO_EXISTING_EVENT',
                reason: 'Same jurisdiction + court case reference. Reuse event, do NOT increment counter.',
            };
        }
    }

    // PERSON MATCHING (CRITICAL GUARDRAIL)
    if (entityType === 'PERSON') {
        // HARD RULE: Shared name, phone or address alone NEVER causes auto-merge!
        const samePhone = existingEntity.primary_phone && incomingRecord.primary_phone &&
                          existingEntity.primary_phone === incomingRecord.primary_phone;
        const sameName = existingEntity.full_name && incomingRecord.full_name &&
                         existingEntity.full_name.trim().toLowerCase() === incomingRecord.full_name.trim().toLowerCase();

        if (sameName || samePhone) {
            return {
                rung: LADDER_RUNGS.RUNG_5_FUZZY_CANDIDATE,
                canAutoMerge: false,
                needsHumanReview: true,
                reason: 'Hard Rule: People sharing name, phone or address require human review; never auto-merge.',
            };
        }
    }

    // BUSINESS MATCHING
    if (entityType === 'BUSINESS') {
        if (existingEntity.registration_id && incomingRecord.registration_id &&
            existingEntity.registration_id === incomingRecord.registration_id &&
            existingEntity.jurisdiction === incomingRecord.jurisdiction) {
            return {
                rung: LADDER_RUNGS.RUNG_4_STRONG_MULTI_FIELD,
                canAutoMerge: true,
                needsHumanReview: false,
                reason: 'Corporate registration ID match in same jurisdiction',
            };
        }
    }

    // Default fallback: low-confidence candidate for review queue
    return {
        rung: LADDER_RUNGS.RUNG_5_FUZZY_CANDIDATE,
        canAutoMerge: false,
        needsHumanReview: true,
        reason: 'Incomplete or fuzzy identifiers require reviewer evaluation',
    };
}
