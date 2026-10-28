import crypto from 'crypto';
import { db } from '../store/database.js';
import { CrownKeyService } from './crownkeyService.js';

export class CrmService {
    /**
     * Get all leads enriched with CrownKey, property, person, and latest interactions.
     */
    static getLeads() {
        return db.data.core.leads.map(lead => {
            const prop = db.data.core.properties.find(p => p.property_id === lead.property_id);
            const person = db.data.core.people.find(p => p.person_id === lead.person_id);
            const events = db.data.core.pillar_events.filter(e => e.property_id === lead.property_id);
            const primaryEvent = events[0] || null;

            const enrichedProp = prop ? CrownKeyService.enrichProperty(prop) : null;
            const interactions = db.data.core.interactions.filter(i => i.lead_id === lead.lead_id);
            const tasks = db.data.core.tasks.filter(t => t.linked_entity_id === lead.lead_id);
            const syncRecord = db.data.crm.external_sync_map.find(s => s.internal_uuid === lead.lead_id);

            return {
                ...lead,
                crownKey: enrichedProp ? enrichedProp.crownKey : 'Property pending',
                property: enrichedProp,
                person,
                events,
                primaryEvent,
                interactions_count: interactions.length,
                latest_interaction: interactions[0] || null,
                tasks_pending_count: tasks.filter(t => t.status === 'PENDING').length,
                podio_sync: syncRecord || { status: 'NOT_MAPPED' },
            };
        });
    }

    /**
     * Create a new Lead opportunity.
     * HARD RULE: first_source_code is locked forever as the original acquisition source.
     */
    static createLead({
        firstSourceCode = 'OTHER',
        sourceDetail = '',
        propertyId = null,
        personId = null,
        pillarCode = null,
        priorityScore = 50,
        assignedUserId = 'u3333333-3333-3333-3333-333333333333',
        actor = 'Marcus Vance',
    }) {
        if (!firstSourceCode) {
            throw new Error('firstSourceCode is required');
        }

        const validSource = db.data.ref.lead_sources.find(s => s.source_code === firstSourceCode);
        if (!validSource) {
            throw new Error(`Invalid source code '${firstSourceCode}'. Must exist in ref.lead_sources`);
        }

        const leadId = crypto.randomUUID();
        const newLead = {
            lead_id: leadId,
            first_source_code: firstSourceCode, // LOCKED
            source_detail: sourceDetail || validSource.definition,
            property_id: propertyId,
            person_id: personId,
            pillar_code: pillarCode,
            status: 'NEW',
            priority_score: Math.min(100, Math.max(0, Number(priorityScore) || 50)),
            assigned_user_id: assignedUserId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        db.data.core.leads.unshift(newLead);

        // Map to Podio Coexistence Sync Map
        db.data.crm.external_sync_map.push({
            sync_id: crypto.randomUUID(),
            internal_entity_type: 'LEAD',
            internal_uuid: leadId,
            external_system: 'PODIO',
            external_app_id: '29481023',
            external_item_id: `podio-${Date.now().toString().slice(-6)}`,
            last_sync_at: new Date().toISOString(),
            version_hash: crypto.createHash('md5').update(leadId).digest('hex').slice(0, 8),
            status: 'SYNCED',
        });

        // Audit Trail
        db.logAudit({
            actor,
            action: 'LEAD_CREATED',
            entityType: 'LEAD',
            entityId: leadId,
            redactedDiff: { first_source_code: firstSourceCode, propertyId, status: 'NEW' },
        });

        db.persist();
        return newLead;
    }

    /**
     * Update Lead Pipeline Stage (NEW -> CONTACTED -> QUALIFIED -> OFFER -> CONTRACT -> CLOSED -> FOLLOW_UP / LOST)
     */
    static updateLeadStage({ leadId, newStage, reason = '', actor = 'Marcus Vance' }) {
        const lead = db.data.core.leads.find(l => l.lead_id === leadId);
        if (!lead) {
            throw new Error(`Lead '${leadId}' not found`);
        }

        const validStage = db.data.crm.pipeline_stages.find(s => s.stage_key === newStage);
        if (!validStage) {
            throw new Error(`Invalid stage key '${newStage}'`);
        }

        const oldStage = lead.status;
        lead.status = newStage;
        lead.updated_at = new Date().toISOString();
        if (newStage === 'LOST') {
            lead.lost_reason = reason;
        }

        // Record Stage History
        db.data.crm.lead_stage_history.unshift({
            history_id: crypto.randomUUID(),
            lead_id: leadId,
            from_stage: oldStage,
            to_stage: newStage,
            changed_by: actor,
            reason: reason || `Advanced stage to ${newStage}`,
            created_at: new Date().toISOString(),
        });

        db.logAudit({
            actor,
            action: 'LEAD_STAGE_UPDATED',
            entityType: 'LEAD',
            entityId: leadId,
            redactedDiff: { from: oldStage, to: newStage, reason },
        });

        db.persist();
        return lead;
    }

    /**
     * Record an interaction (Call, Text, Email, Form, Visit).
     * Rule: Later touches are interactions — they do NOT create new leads!
     */
    static recordInteraction({
        leadId,
        personId = null,
        propertyId = null,
        method = 'CALL',
        direction = 'OUTBOUND',
        actor = 'Elena Rostova',
        result = 'COMPLETED',
        notes = '',
    }) {
        const lead = db.data.core.leads.find(l => l.lead_id === leadId);
        const resolvedPersonId = personId || lead?.person_id || null;
        const resolvedPropId = propertyId || lead?.property_id || null;

        const interaction = {
            interaction_id: crypto.randomUUID(),
            lead_id: leadId || null,
            person_id: resolvedPersonId,
            property_id: resolvedPropId,
            method,
            direction,
            actor_id: actor,
            result,
            notes,
            occurred_at: new Date().toISOString(),
        };

        db.data.core.interactions.unshift(interaction);

        db.logAudit({
            actor,
            action: 'INTERACTION_LOGGED',
            entityType: 'INTERACTION',
            entityId: interaction.interaction_id,
            redactedDiff: { method, direction, leadId, result },
        });

        db.persist();
        return interaction;
    }

    /**
     * Create a task
     */
    static createTask({ title, dueDate, ownerId = 'Elena Rostova', linkedEntityType = 'LEAD', linkedEntityId, actor = 'Marcus Vance' }) {
        const task = {
            task_id: crypto.randomUUID(),
            title,
            due_date: dueDate || new Date(Date.now() + 86400000 * 3).toISOString(),
            status: 'PENDING',
            owner_id: ownerId,
            linked_entity_type: linkedEntityType,
            linked_entity_id: linkedEntityId,
            created_at: new Date().toISOString(),
            completed_at: null,
        };

        db.data.core.tasks.unshift(task);

        db.logAudit({
            actor,
            action: 'TASK_CREATED',
            entityType: 'TASK',
            entityId: task.task_id,
            redactedDiff: { title, ownerId, linkedEntityType },
        });

        db.persist();
        return task;
    }

    /**
     * Update task status
     */
    static updateTaskStatus(taskId, status, actor = 'Elena Rostova') {
        const task = db.data.core.tasks.find(t => t.task_id === taskId);
        if (!task) throw new Error('Task not found');
        task.status = status;
        if (status === 'COMPLETED') {
            task.completed_at = new Date().toISOString();
        }
        db.persist();
        return task;
    }
}
