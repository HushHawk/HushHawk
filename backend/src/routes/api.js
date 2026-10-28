import { Router } from 'express';
import { db } from '../store/database.js';
import { pool, checkDatabaseHealth } from '../store/pgClient.js';
import { CrownKeyService } from '../services/crownkeyService.js';
import { EventService } from '../services/eventService.js';
import { IdentityService } from '../services/identityService.js';
import { ConnectorService } from '../services/connectorService.js';
import { GraphService } from '../services/graphService.js';
import { ComplianceService } from '../services/complianceService.js';
import { CrmService } from '../services/crmService.js';
import { renderCrownKey, validateCrownKeyFormat, normalizeParcelMatch } from '../../../packages/crownkey/index.js';

export const apiRouter = Router();

// Middleware: correlation ID
apiRouter.use((req, res, next) => {
    res.setHeader('X-HushHawk-Version', 'v1.0.0');
    res.setHeader('X-Canonical-Truth', 'PostgreSQL-AWS-RDS');
    next();
});

// ============================================================================
// 1. Health & System Overview
// ============================================================================
apiRouter.get('/health', async (req, res) => {
    const pgHealth = await checkDatabaseHealth();
    res.json({
        status: 'ONLINE',
        platform: 'HushHawk A-to-Z Property Intelligence Platform',
        version: '1.0.0',
        canonical_db: `AWS-RDS-PostgreSQL (${pgHealth.status})`,
        db_details: pgHealth,
        graph_projection: 'Neo4j Outbox-Synchronized',
        time: new Date().toISOString(),
    });
});

// ============================================================================
// 2. Universal Search (Omnisearch)
// ============================================================================
apiRouter.get('/search', (req, res) => {
    const q = (req.query.q || '').trim().toLowerCase();
    if (!q) {
        return res.json({ results: [] });
    }

    const results = [];

    // Search Properties
    for (const prop of db.data.core.properties) {
        const enriched = CrownKeyService.enrichProperty(prop);
        const matchCrown = enriched.crownKey.toLowerCase().includes(q);
        const matchParcel = prop.parcel_raw.toLowerCase().includes(q) || prop.parcel_match.toLowerCase().includes(q);
        const matchAddress = (prop.address_line1 || '').toLowerCase().includes(q);

        if (matchCrown || matchParcel || matchAddress) {
            results.push({
                type: 'PROPERTY',
                id: prop.property_id,
                title: enriched.crownKey,
                subtitle: `${prop.address_line1}, ${prop.city}, FL ${prop.postal_code}`,
                badge: 'DUVAL_PARCEL',
                data: enriched,
            });
        }
    }

    // Search People
    for (const person of db.data.core.people) {
        const matchName = person.full_name.toLowerCase().includes(q);
        const matchPhone = (person.primary_phone || '').toLowerCase().includes(q);
        const matchEmail = (person.primary_email || '').toLowerCase().includes(q);

        if (matchName || matchPhone || matchEmail) {
            results.push({
                type: 'PERSON',
                id: person.person_id,
                title: person.full_name,
                subtitle: `${person.primary_phone || 'No phone'} · ${person.primary_email || 'No email'}`,
                badge: person.is_suppressed ? 'DNC_SUPPRESSED' : 'VERIFIED_OWNER',
                data: person,
            });
        }
    }

    // Search Businesses
    for (const biz of db.data.core.businesses) {
        if (biz.legal_name.toLowerCase().includes(q) || (biz.registration_id || '').toLowerCase().includes(q)) {
            results.push({
                type: 'BUSINESS',
                id: biz.business_id,
                title: biz.legal_name,
                subtitle: `Reg: ${biz.registration_id} · ${biz.jurisdiction} · Agent: ${biz.registered_agent}`,
                badge: 'CORPORATE_ENTITY',
                data: biz,
            });
        }
    }

    // Search Pillar Events
    for (const ev of db.data.core.pillar_events) {
        if ((ev.case_reference || '').toLowerCase().includes(q) || (ev.external_event_id || '').toLowerCase().includes(q)) {
            const prop = db.data.core.properties.find(p => p.property_id === ev.property_id);
            results.push({
                type: 'EVENT',
                id: ev.event_id,
                title: `Case Docket: ${ev.case_reference}`,
                subtitle: `Pillar: ${ev.pillar_code} · Status: ${ev.event_status} · Parcel: ${prop?.parcel_raw || 'Unknown'}`,
                badge: `${ev.pillar_code}_EVENT`,
                data: ev,
            });
        }
    }

    res.json({ query: q, total: results.length, results });
});

// ============================================================================
// 3. CrownKey Reference API
// ============================================================================
apiRouter.post('/crownkey/render', (req, res) => {
    const { countyCode, parcelRaw, pillarCode, eventNumber, firstSourceCode } = req.body;
    const crownKey = renderCrownKey({ countyCode, parcelRaw, pillarCode, eventNumber, firstSourceCode });
    const validation = validateCrownKeyFormat(crownKey);
    res.json({ crownKey, validation });
});

apiRouter.post('/crownkey/validate', (req, res) => {
    const { crownKey } = req.body;
    res.json(validateCrownKeyFormat(crownKey));
});

// ============================================================================
// 4. Properties (Property 360)
// ============================================================================
apiRouter.get('/properties', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT p.*, c.county_code
            FROM core.properties p
            LEFT JOIN ref.counties c ON p.county_id = c.county_id
            ORDER BY p.created_at DESC;
        `);
        const enriched = rows.map(p => CrownKeyService.enrichProperty({
            ...p,
            county_code: p.county_code || 'DUV',
        }));
        res.json({ total: enriched.length, properties: enriched });
    } catch (err) {
        console.error('[PostgreSQL Properties Fetch Error]', err.message);
        const enriched = db.data.core.properties.map(p => CrownKeyService.enrichProperty(p));
        res.json({ total: enriched.length, properties: enriched });
    }
});

apiRouter.get('/properties/:id', (req, res) => {
    const prop = db.data.core.properties.find(p => p.property_id === req.params.id);
    if (!prop) return res.status(404).json({ error: 'Property not found' });

    const enriched = CrownKeyService.enrichProperty(prop);
    const ownership = db.data.rel.entity_relationships
        .filter(r => r.to_entity_id === prop.property_id && r.relationship_type === 'OWNS')
        .map(r => {
            const person = db.data.core.people.find(p => p.person_id === r.from_entity_id);
            const biz = db.data.core.businesses.find(b => b.business_id === r.from_entity_id);
            return { relationship: r, owner: person || biz };
        });

    const events = db.data.core.pillar_events.filter(e => e.property_id === prop.property_id);
    const sourceRecords = db.data.raw.source_records.filter(s => {
        return s.payload && (s.payload.parcelNumber === prop.parcel_raw || s.payload.parcel === prop.parcel_raw || s.payload.taxAccount === prop.parcel_raw);
    });
    const tasks = db.data.core.tasks.filter(t => t.linked_entity_id === prop.property_id);

    res.json({
        property: enriched,
        ownership,
        events,
        source_records: sourceRecords,
        tasks,
    });
});

apiRouter.post('/properties', (req, res) => {
    try {
        const { parcel_raw, county_code = 'DUV', address_line1, postal_code, assessed_value } = req.body;
        if (!parcel_raw) return res.status(400).json({ error: 'parcel_raw is required' });

        const parcel_match = normalizeParcelMatch(parcel_raw);
        const existing = db.data.core.properties.find(p => p.parcel_match === parcel_match && p.county_code === county_code);
        if (existing) {
            return res.status(409).json({ error: 'Property already exists with identical county_id and parcel_match', property: existing });
        }

        const newProp = {
            property_id: crypto.randomUUID(),
            county_id: 'c1111111-1111-1111-1111-111111111111',
            county_code,
            parcel_raw,
            parcel_match,
            address_line1: address_line1 || 'Jacksonville, FL',
            city: 'Jacksonville',
            state_code: 'FL',
            postal_code: postal_code || '32204',
            assessed_value: Number(assessed_value) || 200000,
            estimated_equity: Math.round((Number(assessed_value) || 200000) * 0.45),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        db.data.core.properties.unshift(newProp);
        db.logAudit({
            actor: req.body.actor || 'USER_WEB',
            action: 'PROPERTY_CREATED',
            entityType: 'PROPERTY',
            entityId: newProp.property_id,
            redactedDiff: { parcel_raw, county_code },
        });
        db.persist();

        res.status(201).json(CrownKeyService.enrichProperty(newProp));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 5. People & Businesses (Person 360)
// ============================================================================
apiRouter.get('/people', (req, res) => {
    const people = db.data.core.people.map(person => {
        const properties = db.data.rel.entity_relationships
            .filter(r => r.from_entity_id === person.person_id && r.relationship_type === 'OWNS')
            .map(r => db.data.core.properties.find(p => p.property_id === r.to_entity_id))
            .filter(Boolean);
        return { ...person, owned_properties: properties };
    });
    res.json({ total: people.length, people });
});

apiRouter.get('/people/:id', (req, res) => {
    const person = db.data.core.people.find(p => p.person_id === req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found' });

    const properties = db.data.rel.entity_relationships
        .filter(r => r.from_entity_id === person.person_id && r.relationship_type === 'OWNS')
        .map(r => CrownKeyService.enrichProperty(db.data.core.properties.find(p => p.property_id === r.to_entity_id)))
        .filter(Boolean);

    const interactions = db.data.core.interactions.filter(i => i.person_id === person.person_id);

    res.json({ person, properties, interactions });
});

apiRouter.get('/businesses', (req, res) => {
    res.json({ total: db.data.core.businesses.length, businesses: db.data.core.businesses });
});

// ============================================================================
// 6. Pillar Events (Atomic Counter & Evidence)
// ============================================================================
apiRouter.get('/events', (req, res) => {
    const events = db.data.core.pillar_events.map(ev => {
        const prop = db.data.core.properties.find(p => p.property_id === ev.property_id);
        const evidenceLinks = db.data.rel.event_evidence.filter(ee => ee.event_id === ev.event_id);
        return {
            ...ev,
            property: prop ? CrownKeyService.enrichProperty(prop) : null,
            evidence: evidenceLinks,
        };
    });
    res.json({ total: events.length, events });
});

apiRouter.post('/events', (req, res) => {
    try {
        const result = EventService.recordPillarEvent(req.body);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================================
// 7. Leads & CRM Pipeline
// ============================================================================
apiRouter.get('/leads', (req, res) => {
    res.json({ leads: CrmService.getLeads() });
});

apiRouter.post('/leads', (req, res) => {
    try {
        const newLead = CrmService.createLead(req.body);
        res.status(201).json(newLead);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.patch('/leads/:id/stage', (req, res) => {
    try {
        const { stage, reason, actor } = req.body;
        const updated = CrmService.updateLeadStage({
            leadId: req.params.id,
            newStage: stage,
            reason,
            actor,
        });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Interactions
apiRouter.get('/interactions', (req, res) => {
    res.json({ interactions: db.data.core.interactions });
});

apiRouter.post('/interactions', (req, res) => {
    try {
        const interaction = CrmService.recordInteraction(req.body);
        res.status(201).json(interaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Tasks
apiRouter.get('/tasks', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT task_id, title, category, due_time, priority, is_completed, status, created_at
            FROM core.tasks
            ORDER BY created_at DESC;
        `);
        res.json({ total: rows.length, tasks: rows });
    } catch (err) {
        res.json({ tasks: db.data.core.tasks });
    }
});

apiRouter.post('/tasks', (req, res) => {
    try {
        const task = CrmService.createTask(req.body);
        res.status(201).json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.patch('/tasks/:id', (req, res) => {
    try {
        const task = CrmService.updateTaskStatus(req.params.id, req.body.status, req.body.actor);
        res.json(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================================
// 8. Human Review Loop (Identity Candidates)
// ============================================================================
apiRouter.get('/review/queue', (req, res) => {
    res.json({ queue: IdentityService.getReviewQueue() });
});

apiRouter.post('/review/decision', (req, res) => {
    try {
        const result = IdentityService.submitDecision(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/review/reverse', (req, res) => {
    try {
        const result = IdentityService.reverseDecision(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================================
// 9. Connectors & Ingestion Lifecycle
// ============================================================================
apiRouter.get('/connectors', (req, res) => {
    res.json({ connectors: ConnectorService.getRegistry() });
});

apiRouter.post('/connectors/:id/run', (req, res) => {
    try {
        const runRecord = ConnectorService.runConnector(req.params.id, req.body);
        res.json({ success: true, run: runRecord });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.get('/connectors/runs', (req, res) => {
    res.json({ runs: db.data.raw.connector_runs });
});

apiRouter.get('/raw/source-records', (req, res) => {
    res.json({ records: db.data.raw.source_records });
});

// ============================================================================
// 10. Neo4j Graph Projection & Reconciliation
// ============================================================================
apiRouter.get('/graph/projection', (req, res) => {
    const filterId = req.query.entityId || null;
    const projection = GraphService.getGraphProjection({ filterEntityId: filterId });
    res.json(projection);
});

apiRouter.get('/graph/reconciliation', (req, res) => {
    const report = GraphService.runReconciliation();
    res.json(report);
});

// ============================================================================
// 11. Compliance Gate & Suppression (Page 21)
// ============================================================================
apiRouter.post('/compliance/evaluate', (req, res) => {
    const evaluation = ComplianceService.evaluateOutboundRequest(req.body);
    res.json(evaluation);
});

apiRouter.get('/compliance/suppression', (req, res) => {
    res.json({ records: db.data.crm.suppression_records });
});

apiRouter.post('/compliance/suppression', (req, res) => {
    try {
        const record = ComplianceService.addSuppression(req.body);
        res.status(201).json(record);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================================
// 12. Reference Dictionaries & Audit Log (Admin)
// ============================================================================
apiRouter.get('/admin/pillars', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ref.pillars ORDER BY pillar_code ASC;');
        res.json({ total: rows.length, pillars: rows });
    } catch (err) {
        res.json({ pillars: db.data.ref.pillars });
    }
});

apiRouter.get('/admin/counties', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ref.counties ORDER BY county_code ASC;');
        res.json({ total: rows.length, counties: rows });
    } catch (err) {
        res.json({ counties: db.data.ref.counties });
    }
});

apiRouter.get('/admin/lead-sources', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ref.lead_sources ORDER BY source_code ASC;');
        res.json({ total: rows.length, lead_sources: rows });
    } catch (err) {
        res.json({ lead_sources: db.data.ref.lead_sources });
    }
});

apiRouter.get('/admin/audit-log', (req, res) => {
    res.json({ audit_events: db.data.audit.audit_events });
});

apiRouter.get('/admin/outbox', (req, res) => {
    res.json({ outbox_events: db.data.ops.outbox_events });
});

apiRouter.get('/admin/sync-map', (req, res) => {
    res.json({ sync_map: db.data.crm.external_sync_map });
});

// ============================================================================
// 13. Reports & Attribution Observability (Page 20, 23)
// ============================================================================
apiRouter.get('/reports/overview', (req, res) => {
    const totalProperties = db.data.core.properties.length;
    const totalLeads = db.data.core.leads.length;
    const totalEvents = db.data.core.pillar_events.length;
    const totalSourceRecords = db.data.raw.source_records.length;
    const pendingReviews = db.data.rel.identity_candidates.filter(c => c.status === 'PENDING').length;
    const suppressionCount = db.data.crm.suppression_records.length;

    // First Source Attribution breakdown (Rule: Count unique leads, NOT events!)
    const attributionCounts = {};
    for (const lead of db.data.core.leads) {
        const src = lead.first_source_code || 'UNKNOWN';
        attributionCounts[src] = (attributionCounts[src] || 0) + 1;
    }

    // Pillar breakdown
    const pillarCounts = {};
    for (const ev of db.data.core.pillar_events) {
        pillarCounts[ev.pillar_code] = (pillarCounts[ev.pillar_code] || 0) + 1;
    }

    // Pipeline stages breakdown
    const stageCounts = {};
    for (const lead of db.data.core.leads) {
        stageCounts[lead.status] = (stageCounts[lead.status] || 0) + 1;
    }

    res.json({
        kpis: {
            unique_leads: totalLeads,
            total_properties: totalProperties,
            total_pillar_events: totalEvents,
            raw_source_evidence: totalSourceRecords,
            pending_human_reviews: pendingReviews,
            suppressed_contacts: suppressionCount,
            graph_sync_lag_ms: 18,
            outbox_pending: db.data.ops.outbox_events.filter(e => !e.published_at).length,
        },
        attribution_breakdown: attributionCounts,
        pillar_event_breakdown: pillarCounts,
        pipeline_stages_breakdown: stageCounts,
        generated_at: new Date().toISOString(),
    });
});
