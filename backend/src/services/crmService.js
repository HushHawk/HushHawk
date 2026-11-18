import { pool, withTransaction, audit, emitOutbox } from '../store/pgClient.js';
import { CrownKeyService } from './crownkeyService.js';
import { HttpError } from './eventService.js';

const METHODS = ['CALL','TEXT','EMAIL','WEBFORM','DM','COMMENT','CHAT','WHATSAPP','INPERSON','MAIL','VOICEMAIL','WEBCHAT','IMPORT','OTHER','UNKNOWN'];
const METHOD_ALIASES = { PHONE: 'CALL', SMS: 'TEXT', FORM: 'WEBFORM', VISIT: 'INPERSON', DIRECT_MAIL: 'MAIL' };
const MEDIUMS = ['PAID','ORGANIC','OFFLINE','OUTREACH','REFERRAL','UNKNOWN'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const digits = v => String(v || '').replace(/\D/g, '');

export function normalizeMethod(method) {
    const m = String(method || 'UNKNOWN').toUpperCase().trim();
    const mapped = METHOD_ALIASES[m] || m;
    if (!METHODS.includes(mapped)) throw new HttpError(400, `Unknown contact method '${method}'. Allowed: ${METHODS.join(', ')}.`);
    return mapped;
}

async function approvedSource(client, code) {
    const { rows: [src] } = await client.query('SELECT * FROM ref.lead_sources WHERE source_code = $1', [code]);
    if (!src) throw new HttpError(400, `Unknown lead source '${code}'.`);
    if (!src.production_enabled || src.review_status !== 'APPROVED') throw new HttpError(400, `Lead source '${code}' is not approved for production.`);
    return src;
}

export class CrmService {
    /** Leads with property, person, per-lead CrownKey, event links and activity counts: batched, no N+1. */
    static async getLeads({ limit = 500, offset = 0 } = {}) {
        const { rows: leads } = await pool.query(
            `SELECT l.*, s.source_name FROM core.leads l LEFT JOIN ref.lead_sources s ON s.source_code = l.first_source_code
             ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`, [Math.min(Number(limit) || 500, 2000), Number(offset) || 0]);
        if (!leads.length) return [];
        const leadIds = leads.map(l => l.lead_id);
        const propIds = [...new Set(leads.map(l => l.property_id).filter(Boolean))];
        const personIds = [...new Set(leads.map(l => l.person_id).filter(Boolean))];
        const [props, { rows: people }, { rows: counts }, { rows: sync }] = await Promise.all([
            propIds.length ? CrownKeyService.loadProperties('WHERE p.property_id = ANY($1::uuid[])', [propIds]).then(r => CrownKeyService.enrichProperties(r)) : [],
            pool.query('SELECT * FROM core.people WHERE person_id = ANY($1::uuid[])', [personIds]),
            pool.query(`SELECT lead_id, count(*)::int AS interactions, max(occurred_at) AS last_at FROM core.interactions WHERE lead_id = ANY($1::uuid[]) GROUP BY lead_id`, [leadIds]),
            pool.query(`SELECT * FROM crm.external_sync_map WHERE internal_entity_type = 'LEAD' AND internal_uuid = ANY($1::uuid[])`, [leadIds])
        ]);
        return leads.map(lead => {
            const property = props.find(p => p.property_id === lead.property_id) || null;
            const own = property?.leads.find(l => l.lead_id === lead.lead_id);
            const c = counts.find(x => x.lead_id === lead.lead_id);
            return {
                ...lead,
                crownKey: own?.crownKey || 'Property pending',
                property,
                person: people.find(p => p.person_id === lead.person_id) || null,
                events: property?.events || [],
                interactions_count: c?.interactions || 0,
                last_interaction_at: c?.last_at || null,
                podio_sync: sync.find(s => s.internal_uuid === lead.lead_id) || { status: 'NOT_MAPPED' }
            };
        });
    }

    /**
     * Creates a lead. The first source is recorded once and never replaced; later responses are touchpoints.
     * A lead may be saved before its property is known.
     */
    static async createLead({
        sourceCode, sourceDetail = null, contactMethod = null, direction = 'INBOUND', platformCode = null, medium = null,
        campaignId = null, attributionConfidence = 'UNVERIFIED', attributionEvidence = null,
        propertyId = null, eventIds = [], personId = null, person = null, priorityScore = null,
        assignedUserId = null, notes = null, metadata = {}, actor, db = null
    }) {
        if (!sourceCode) throw new HttpError(400, 'sourceCode is required.');
        if (!actor) throw new HttpError(400, 'An actor is required.');
        if (medium && !MEDIUMS.includes(medium)) throw new HttpError(400, `medium must be one of ${MEDIUMS.join(', ')}.`);
        if (propertyId && !UUID.test(propertyId)) throw new HttpError(400, 'propertyId must be a UUID.');
        const method = contactMethod ? normalizeMethod(contactMethod) : null;
        const dir = String(direction).toUpperCase();
        if (!['INBOUND', 'OUTBOUND'].includes(dir)) throw new HttpError(400, 'direction must be INBOUND or OUTBOUND.');

        const run = async client => {
            await approvedSource(client, sourceCode);
            if (propertyId) {
                const { rowCount } = await client.query('SELECT 1 FROM core.properties WHERE property_id = $1', [propertyId]);
                if (!rowCount) throw new HttpError(404, 'Property not found.');
            }
            let pid = personId || null;
            if (!pid && person?.name) {
                const phone = digits(person.phone);
                const email = person.email ? String(person.email).trim().toLowerCase() : null;
                const { rows: [created] } = await client.query(
                    `INSERT INTO core.people (full_name, primary_phone, primary_email, mailing_address) VALUES ($1,$2,$3,$4) RETURNING person_id`,
                    [String(person.name).trim(), person.phone || null, email, person.mailingAddress || null]);
                pid = created.person_id;
                // A shared phone or email is never grounds to merge: it queues a review candidate instead.
                const { rows: dupes } = await client.query(
                    `SELECT person_id FROM core.people WHERE person_id <> $1
                       AND (($2 <> '' AND regexp_replace(coalesce(primary_phone,''), '\\D', '', 'g') = $2) OR ($3::text IS NOT NULL AND lower(primary_email) = $3)) LIMIT 5`,
                    [pid, phone, email]);
                for (const d of dupes) {
                    await client.query(
                        `INSERT INTO rel.identity_candidates (entity_type, entity_id_a, entity_id_b, ladder_rung, confidence, match_features)
                         VALUES ('PERSON',$1,$2,5,'LOW',$3)`, [d.person_id, pid, JSON.stringify({ sharedPhone: Boolean(phone), sharedEmail: Boolean(email) })]);
                }
            }
            const { rows: [lead] } = await client.query(
                `INSERT INTO core.leads (first_source_code, source_detail, property_id, person_id, status, priority_score, assigned_user_id,
                                         campaign_id, attribution_confidence, first_attribution_evidence, metadata)
                 VALUES ($1,$2,$3,$4,'NEW',coalesce($5,50),$6,$7,$8,$9,$10) RETURNING *`,
                [sourceCode, sourceDetail, propertyId, pid, priorityScore === null ? null : Math.min(100, Math.max(0, Number(priorityScore) || 0)),
                 assignedUserId, campaignId, attributionConfidence, attributionEvidence, JSON.stringify({ ...metadata, notes })]);
            if (propertyId) await client.query('INSERT INTO core.lead_property_links (lead_id, property_id, created_by) VALUES ($1,$2,$3)', [lead.lead_id, propertyId, actor]);
            for (const eventId of eventIds) {
                await client.query('INSERT INTO core.lead_event_links (lead_id, event_id, created_by) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [lead.lead_id, eventId, actor]);
            }
            await client.query(
                `INSERT INTO core.attribution_touchpoints (lead_id, source_code, contact_method, platform_code, medium, campaign_id, evidence, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [lead.lead_id, sourceCode, method, platformCode, medium, campaignId, attributionEvidence, actor]);
            if (method) {
                await client.query(
                    `INSERT INTO core.interactions (lead_id, person_id, property_id, method, direction, actor_id, result, notes, platform_code, medium, campaign_id)
                     VALUES ($1,$2,$3,$4,$5,$6,'FIRST_CONTACT',$7,$8,$9,$10)`, [lead.lead_id, pid, propertyId, method, dir, actor, notes, platformCode, medium, campaignId]);
            }
            await emitOutbox(client, { aggregateType: 'LEAD', aggregateId: lead.lead_id, eventType: 'LEAD_CREATED', payload: { first_source_code: sourceCode } });
            await audit(client, { actor, action: 'LEAD_CREATED', entityType: 'LEAD', entityId: lead.lead_id, diff: { sourceCode, propertyId, method } });
            return lead;
        };
        return db ? run(db) : withTransaction(run);
    }

    /** Later responses attach to the existing lead as touchpoints + interactions. first_source_code is untouched. */
    static async addTouchpoint({ leadId, sourceCode = null, contactMethod, direction = 'INBOUND', platformCode = null, medium = null, campaignId = null, evidence = null, notes = null, actor }) {
        const method = normalizeMethod(contactMethod);
        return withTransaction(async client => {
            const { rows: [lead] } = await client.query('SELECT * FROM core.leads WHERE lead_id = $1', [leadId]);
            if (!lead) throw new HttpError(404, 'Lead not found.');
            if (sourceCode) await approvedSource(client, sourceCode);
            await client.query(
                `INSERT INTO core.attribution_touchpoints (lead_id, source_code, contact_method, platform_code, medium, campaign_id, evidence, created_by)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [leadId, sourceCode, method, platformCode, medium, campaignId, evidence, actor]);
            const { rows: [interaction] } = await client.query(
                `INSERT INTO core.interactions (lead_id, person_id, property_id, method, direction, actor_id, result, notes, platform_code, medium, campaign_id)
                 VALUES ($1,$2,$3,$4,$5,$6,'COMPLETED',$7,$8,$9,$10) RETURNING *`,
                [leadId, lead.person_id, lead.property_id, method, String(direction).toUpperCase(), actor, notes, platformCode, medium, campaignId]);
            await audit(client, { actor, action: 'TOUCHPOINT_ADDED', entityType: 'LEAD', entityId: leadId, diff: { method, sourceCode } });
            return interaction;
        });
    }

    static async updateLeadStage({ leadId, newStage, reason = '', actor }) {
        if (!actor) throw new HttpError(400, 'An actor is required.');
        return withTransaction(async client => {
            const { rows: [stage] } = await client.query('SELECT 1 FROM crm.pipeline_stages WHERE stage_key = $1', [newStage]);
            if (!stage) throw new HttpError(400, `Invalid stage '${newStage}'.`);
            const { rows: [before] } = await client.query('SELECT status FROM core.leads WHERE lead_id = $1 FOR UPDATE', [leadId]);
            if (!before) throw new HttpError(404, 'Lead not found.');
            if (newStage === 'LOST' && !String(reason).trim()) throw new HttpError(400, 'A lost reason is required.');
            const { rows: [lead] } = await client.query(
                `UPDATE core.leads SET status = $2, lost_reason = CASE WHEN $2 = 'LOST' THEN $3 ELSE lost_reason END, updated_at = now() WHERE lead_id = $1 RETURNING *`,
                [leadId, newStage, reason || null]);
            await client.query(`INSERT INTO crm.lead_stage_history (lead_id, from_stage, to_stage, changed_by, reason) VALUES ($1,$2,$3,$4,$5)`, [leadId, before.status, newStage, actor, reason || null]);
            await emitOutbox(client, { aggregateType: 'LEAD', aggregateId: leadId, eventType: 'LEAD_UPDATED', payload: { status: newStage } });
            await audit(client, { actor, action: 'LEAD_STAGE_UPDATED', entityType: 'LEAD', entityId: leadId, diff: { from: before.status, to: newStage, reason } });
            return lead;
        });
    }

    static async recordInteraction({ leadId = null, personId = null, propertyId = null, method = 'UNKNOWN', direction = 'OUTBOUND', actor, result = 'COMPLETED', notes = '', platformCode = null, medium = null, campaignId = null }) {
        if (!actor) throw new HttpError(400, 'An actor is required.');
        const m = normalizeMethod(method);
        const dir = String(direction || 'OUTBOUND').toUpperCase();
        if (!['INBOUND', 'OUTBOUND'].includes(dir)) throw new HttpError(400, 'direction must be INBOUND or OUTBOUND.');
        for (const [label, value] of [['leadId', leadId], ['personId', personId], ['propertyId', propertyId]]) {
            if (value && !UUID.test(value)) throw new HttpError(400, `${label} must be a UUID.`);
        }
        return withTransaction(async client => {
            let pid = personId; let prid = propertyId;
            if (leadId && (!pid || !prid)) {
                const { rows: [lead] } = await client.query('SELECT person_id, property_id FROM core.leads WHERE lead_id = $1', [leadId]);
                if (!lead) throw new HttpError(404, 'Lead not found.');
                pid = pid || lead.person_id; prid = prid || lead.property_id;
            }
            const { rows: [row] } = await client.query(
                `INSERT INTO core.interactions (lead_id, person_id, property_id, method, direction, actor_id, result, notes, platform_code, medium, campaign_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
                [leadId, pid, prid, m, dir, actor, result, notes, platformCode, medium, campaignId]);
            await audit(client, { actor, action: 'INTERACTION_LOGGED', entityType: 'INTERACTION', entityId: row.interaction_id, diff: { method: m, direction: dir, result } });
            return row;
        });
    }

    static async listInteractions({ leadId = null, limit = 200 } = {}) {
        const { rows } = await pool.query(
            `SELECT * FROM core.interactions WHERE ($1::uuid IS NULL OR lead_id = $1) ORDER BY occurred_at DESC LIMIT $2`, [leadId, Math.min(Number(limit) || 200, 1000)]);
        return rows;
    }

    static async createTask({ title, dueDate = null, ownerId = null, linkedEntityType = null, linkedEntityId = null, category = 'General', priority = 'Medium', actor }) {
        if (!title || !String(title).trim()) throw new HttpError(400, 'title is required.');
        if (linkedEntityId && !UUID.test(linkedEntityId)) throw new HttpError(400, 'linkedEntityId must be a UUID.');
        return withTransaction(async client => {
            const { rows: [task] } = await client.query(
                `INSERT INTO core.tasks (title, due_date, status, owner_id, linked_entity_type, linked_entity_id, category, priority, is_completed)
                 VALUES ($1,$2,'PENDING',$3,$4,$5,$6,$7,false) RETURNING *`,
                [String(title).trim(), dueDate, ownerId || actor, linkedEntityType, linkedEntityId, category, priority]);
            await audit(client, { actor, action: 'TASK_CREATED', entityType: 'TASK', entityId: task.task_id, diff: { title: task.title } });
            return task;
        });
    }

    static async updateTaskStatus(taskId, status, actor) {
        if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) throw new HttpError(400, 'Invalid task status.');
        return withTransaction(async client => {
            const { rows: [task] } = await client.query(
                `UPDATE core.tasks SET status = $2, is_completed = ($2 = 'COMPLETED'), completed_at = CASE WHEN $2 = 'COMPLETED' THEN now() ELSE NULL END WHERE task_id = $1 RETURNING *`,
                [taskId, status]);
            if (!task) throw new HttpError(404, 'Task not found.');
            await audit(client, { actor, action: 'TASK_STATUS_UPDATED', entityType: 'TASK', entityId: taskId, diff: { status } });
            return task;
        });
    }
}
