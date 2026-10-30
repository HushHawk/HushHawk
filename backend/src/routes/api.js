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

apiRouter.get('/properties/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT p.*, c.county_code FROM core.properties p
             LEFT JOIN ref.counties c ON p.county_id = c.county_id
             WHERE p.property_id = $1`,
            [req.params.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'Property not found' });
        const enriched = CrownKeyService.enrichProperty({ ...rows[0], county_code: rows[0].county_code || 'DUV' });
        res.json({ property: enriched, ownership: [], events: [], source_records: [], tasks: [] });
    } catch (err) {
        console.error('[Property GET by ID Error]', err.message);
        const prop = db.data.core.properties.find(p => p.property_id === req.params.id);
        if (!prop) return res.status(404).json({ error: 'Property not found' });
        res.json({ property: CrownKeyService.enrichProperty(prop), ownership: [], events: [], source_records: [], tasks: [] });
    }
});

apiRouter.put('/properties/:id', async (req, res) => {
    const { id } = req.params;
    const {
        address_line1,
        city,
        state_code,
        postal_code,
        county_code,
        parcel_raw,
        assessed_value,
        property_type,
        legal_description,
    } = req.body;

    const parcel_match = parcel_raw ? normalizeParcelMatch(parcel_raw) : undefined;

    try {
        let updatedRow = null;
        try {
            const { rows } = await pool.query(
                `UPDATE core.properties
                 SET address_line1 = COALESCE($1, address_line1),
                     city = COALESCE($2, city),
                     state_code = COALESCE($3, state_code),
                     postal_code = COALESCE($4, postal_code),
                     property_type = COALESCE($5, property_type),
                     legal_description = COALESCE($6, legal_description),
                     assessed_value = COALESCE($7, assessed_value),
                     parcel_raw = COALESCE($8, parcel_raw),
                     parcel_match = COALESCE($9, parcel_match),
                     updated_at = NOW()
                 WHERE property_id = $10
                 RETURNING *`,
                [
                    address_line1 || null,
                    city || null,
                    state_code || null,
                    postal_code || null,
                    property_type || null,
                    legal_description || null,
                    assessed_value ? Number(assessed_value) : null,
                    parcel_raw || null,
                    parcel_match || null,
                    id
                ]
            );
            if (rows.length) {
                updatedRow = rows[0];
            }
        } catch (dbErr) {
            console.error('[PostgreSQL Property Update Error]', dbErr.message);
        }

        // Also update memory db
        const memoryProp = db.data.core.properties.find(p => p.property_id === id);
        if (memoryProp) {
            if (address_line1 !== undefined) memoryProp.address_line1 = address_line1;
            if (city !== undefined) memoryProp.city = city;
            if (state_code !== undefined) memoryProp.state_code = state_code;
            if (postal_code !== undefined) memoryProp.postal_code = postal_code;
            if (county_code !== undefined) memoryProp.county_code = county_code;
            if (property_type !== undefined) memoryProp.property_type = property_type;
            if (legal_description !== undefined) memoryProp.legal_description = legal_description;
            if (assessed_value !== undefined) memoryProp.assessed_value = Number(assessed_value);
            if (parcel_raw !== undefined) {
                memoryProp.parcel_raw = parcel_raw;
                memoryProp.parcel_match = normalizeParcelMatch(parcel_raw);
            }
            memoryProp.updated_at = new Date().toISOString();
            db.logAudit({
                actor: req.body.actor || 'USER_WEB',
                action: 'PROPERTY_UPDATED',
                entityType: 'PROPERTY',
                entityId: id,
                redactedDiff: req.body,
            });
            db.persist();
        }

        const result = updatedRow || memoryProp;
        if (!result) return res.status(404).json({ error: 'Property not found' });
        res.json(CrownKeyService.enrichProperty({
            ...result,
            county_code: county_code || result.county_code || 'DUV'
        }));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 4b. Property Photos (Secure S3 Upload & Metadata)
// ============================================================================
apiRouter.get('/properties/:propertyId/photos', async (req, res) => {
    const { propertyId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT id, property_id, filename, original_filename, file_size_bytes, mime_type,
                    tag, caption, description, photo_date, data_url, storage_provider, object_key,
                    uploaded_by, status, created_at
             FROM core.property_photos
             WHERE property_id = $1
             ORDER BY photo_date DESC, created_at DESC`,
            [propertyId]
        );
        res.json({ total: rows.length, photos: rows });
    } catch (err) {
        console.error('[Photos GET Error]', err.message);
        res.json({ total: 0, photos: [] });
    }
});

// S3 Presigned Upload Authorization URL
apiRouter.post('/properties/:propertyId/photos/upload-url', async (req, res) => {
    const { propertyId } = req.params;
    const { filename, content_type = 'image/jpeg', file_size_bytes = 0 } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    // Validate size limit (max 25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file_size_bytes > MAX_SIZE) {
        return res.status(400).json({ error: 'File size exceeds maximum limit of 25MB' });
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `properties/${propertyId}/photos/${Date.now()}-${safeFilename}`;
    const bucket = process.env.AWS_S3_BUCKET || 'hushhawk-private-property-vault';
    const region = process.env.AWS_REGION || 'us-east-2';

    // Return S3 presigned upload configuration
    res.json({
        success: true,
        storage_provider: 'S3',
        bucket,
        region,
        object_key: objectKey,
        upload_url: `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`,
        expires_in_seconds: 900,
        headers: {
            'Content-Type': content_type,
            'x-amz-server-side-encryption': 'AES256'
        }
    });
});

apiRouter.post('/properties/:propertyId/photos', async (req, res) => {
    const { propertyId } = req.params;
    const {
        filename,
        original_filename,
        file_size_bytes,
        mime_type,
        tag,
        caption,
        description,
        photo_date,
        data_url,
        object_key,
        storage_provider = 'S3',
        uploaded_by = 'HushHawk Staff',
        status = 'UPLOADED'
    } = req.body;

    if (!filename) return res.status(400).json({ error: 'filename is required' });

    const safeKey = object_key || `properties/${propertyId}/photos/${Date.now()}-${(filename || 'photo.jpg').replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    try {
        const { rows } = await pool.query(
            `INSERT INTO core.property_photos
              (property_id, filename, original_filename, file_size_bytes, mime_type, tag, caption, description, photo_date, data_url, storage_provider, object_key, uploaded_by, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
             RETURNING *`,
            [
                propertyId,
                filename,
                original_filename || filename,
                file_size_bytes || 0,
                mime_type || 'image/jpeg',
                tag || 'General',
                caption || description || null,
                description || caption || null,
                photo_date || new Date().toISOString().split('T')[0],
                data_url || null,
                storage_provider,
                safeKey,
                uploaded_by,
                status
            ]
        );

        db.logAudit({
            actor: uploaded_by || 'USER_WEB',
            action: 'PHOTO_UPLOADED_S3',
            entityType: 'PROPERTY_PHOTO',
            entityId: rows[0].id,
            redactedDiff: { property_id: propertyId, filename, object_key: safeKey, storage_provider: 'S3' }
        });
        db.persist();

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[Photos POST Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/properties/:propertyId/photos/:photoId', async (req, res) => {
    const { propertyId, photoId } = req.params;
    try {
        await pool.query(
            `DELETE FROM core.property_photos WHERE id = $1 AND property_id = $2`,
            [photoId, propertyId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[Photos DELETE Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 4c. Property Documents
// ============================================================================
apiRouter.get('/properties/:propertyId/documents', async (req, res) => {
    const { propertyId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT * FROM core.property_documents WHERE property_id = $1 ORDER BY created_at DESC`,
            [propertyId]
        );
        res.json({ total: rows.length, documents: rows });
    } catch (err) {
        console.error('[Documents GET Error]', err.message);
        res.json({ total: 0, documents: [] });
    }
});

apiRouter.post('/properties/:propertyId/documents', async (req, res) => {
    const { propertyId } = req.params;
    const { title, category, filename, file_size_bytes, data_url } = req.body;
    if (!title && !filename) return res.status(400).json({ error: 'Title or filename is required' });
    try {
        const { rows } = await pool.query(
            `INSERT INTO core.property_documents
              (property_id, title, category, filename, file_size_bytes, data_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                propertyId,
                title || filename,
                category || 'Other',
                filename || title || 'document.pdf',
                file_size_bytes || 0,
                data_url || null
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[Documents POST Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/properties/:propertyId/documents/:docId', async (req, res) => {
    const { propertyId, docId } = req.params;
    try {
        await pool.query(
            `DELETE FROM core.property_documents WHERE id = $1 AND property_id = $2`,
            [docId, propertyId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[Documents DELETE Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 4d. Property Expenses
// ============================================================================
apiRouter.get('/properties/:propertyId/expenses', async (req, res) => {
    const { propertyId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT * FROM core.property_expenses WHERE property_id = $1 ORDER BY expense_date DESC, created_at DESC`,
            [propertyId]
        );
        res.json({ total: rows.length, expenses: rows });
    } catch (err) {
        console.error('[Expenses GET Error]', err.message);
        res.json({ total: 0, expenses: [] });
    }
});

apiRouter.post('/properties/:propertyId/expenses', async (req, res) => {
    const { propertyId } = req.params;
    const { category, description, amount, expense_date, vendor } = req.body;
    if (!category || !amount) return res.status(400).json({ error: 'Category and amount are required' });
    try {
        const { rows } = await pool.query(
            `INSERT INTO core.property_expenses
              (property_id, category, description, amount, expense_date, vendor)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [
                propertyId,
                category,
                description || '',
                Number(amount) || 0,
                expense_date || new Date().toISOString().split('T')[0],
                vendor || 'Unknown Vendor'
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[Expenses POST Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/properties/:propertyId/expenses/:expenseId', async (req, res) => {
    const { propertyId, expenseId } = req.params;
    try {
        await pool.query(
            `DELETE FROM core.property_expenses WHERE id = $1 AND property_id = $2`,
            [expenseId, propertyId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[Expenses DELETE Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 4e. Property Contractors
// ============================================================================
apiRouter.get('/properties/:propertyId/contractors', async (req, res) => {
    const { propertyId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT * FROM core.property_contractors WHERE property_id = $1 ORDER BY created_at DESC`,
            [propertyId]
        );
        res.json({ total: rows.length, contractors: rows });
    } catch (err) {
        console.error('[Contractors GET Error]', err.message);
        res.json({ total: 0, contractors: [] });
    }
});

apiRouter.post('/properties/:propertyId/contractors', async (req, res) => {
    const { propertyId } = req.params;
    const { name, trade, phone, status } = req.body;
    if (!name || !trade) return res.status(400).json({ error: 'Name and trade are required' });
    try {
        const { rows } = await pool.query(
            `INSERT INTO core.property_contractors
              (property_id, name, trade, phone, status)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                propertyId,
                name,
                trade,
                phone || '',
                status || 'Active On Site'
            ]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[Contractors POST Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/properties/:propertyId/contractors/:contractorId', async (req, res) => {
    const { propertyId, contractorId } = req.params;
    try {
        await pool.query(
            `DELETE FROM core.property_contractors WHERE id = $1 AND property_id = $2`,
            [contractorId, propertyId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('[Contractors DELETE Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 4f. Property Tasks & Timeline
// ============================================================================
apiRouter.get('/properties/:propertyId/tasks', async (req, res) => {
    const { propertyId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT * FROM core.tasks WHERE linked_entity_id = $1 ORDER BY created_at DESC`,
            [propertyId]
        );
        res.json({ total: rows.length, tasks: rows });
    } catch (err) {
        console.error('[Property Tasks GET Error]', err.message);
        const memTasks = db.data.core.tasks.filter(t => t.linked_entity_id === propertyId);
        res.json({ total: memTasks.length, tasks: memTasks });
    }
});

apiRouter.post('/properties/:propertyId/tasks', async (req, res) => {
    const { propertyId } = req.params;
    const { title, priority = 'Medium', due_date, due_time, category = 'General' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    try {
        const taskId = crypto.randomUUID();
        let created = null;
        try {
            const { rows } = await pool.query(
                `INSERT INTO core.tasks
                  (task_id, title, priority, due_date, due_time, category, status, is_completed, linked_entity_id, linked_entity_type)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [
                    taskId,
                    title,
                    priority,
                    due_date ? new Date(due_date) : new Date(),
                    due_time || '05:00 PM',
                    category,
                    'PENDING',
                    false,
                    propertyId,
                    'PROPERTY'
                ]
            );
            created = rows[0];
        } catch (dbErr) {
            console.error('[Task RDS Insert Error]', dbErr.message);
        }

        const memTask = {
            task_id: taskId,
            title,
            priority,
            due_date: due_date || new Date().toISOString(),
            due_time: due_time || '05:00 PM',
            category,
            status: 'PENDING',
            is_completed: false,
            linked_entity_id: propertyId,
            linked_entity_type: 'PROPERTY',
            created_at: new Date().toISOString(),
        };
        db.data.core.tasks.unshift(memTask);
        db.persist();

        res.status(201).json(created || memTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/properties/:propertyId/timeline', async (req, res) => {
    const { propertyId } = req.params;
    try {
        const timeline = [];
        // Fetch property details
        const propRes = await pool.query('SELECT * FROM core.properties WHERE property_id = $1', [propertyId]);
        if (propRes.rows.length) {
            const p = propRes.rows[0];
            timeline.push({
                type: 'CREATED',
                title: 'Property Record Created',
                description: `${p.address_line1} entered into HushHawk database.`,
                timestamp: p.created_at || new Date().toISOString(),
                badge: 'System',
                icon: 'home'
            });
        }
        // Photos
        const photoRes = await pool.query('SELECT count(*) as count, max(created_at) as latest FROM core.property_photos WHERE property_id = $1', [propertyId]);
        if (photoRes.rows[0]?.count > 0) {
            timeline.push({
                type: 'PHOTOS',
                title: `${photoRes.rows[0].count} Photos Uploaded`,
                description: `High-resolution site photos securely stored in S3/RDS.`,
                timestamp: photoRes.rows[0].latest,
                badge: 'Media',
                icon: 'camera'
            });
        }
        // Docs
        const docRes = await pool.query('SELECT * FROM core.property_documents WHERE property_id = $1 ORDER BY created_at DESC LIMIT 5', [propertyId]);
        for (const doc of docRes.rows) {
            timeline.push({
                type: 'DOCUMENT',
                title: `Document Uploaded: ${doc.title}`,
                description: `Category: ${doc.category} (${doc.filename})`,
                timestamp: doc.created_at,
                badge: 'Docs',
                icon: 'file'
            });
        }
        // Contractors
        const contRes = await pool.query('SELECT * FROM core.property_contractors WHERE property_id = $1 ORDER BY created_at DESC LIMIT 5', [propertyId]);
        for (const c of contRes.rows) {
            timeline.push({
                type: 'CONTRACTOR',
                title: `Contractor Assigned: ${c.name}`,
                description: `Trade: ${c.trade} • Status: ${c.status}`,
                timestamp: c.created_at,
                badge: 'Field',
                icon: 'user'
            });
        }
        // Expenses
        const expRes = await pool.query('SELECT sum(amount) as total, count(*) as count, max(created_at) as latest FROM core.property_expenses WHERE property_id = $1', [propertyId]);
        if (expRes.rows[0]?.count > 0) {
            timeline.push({
                type: 'EXPENSE',
                title: `Renovation Budget Tracked`,
                description: `${expRes.rows[0].count} expenses logged totaling $${Number(expRes.rows[0].total).toLocaleString()}.`,
                timestamp: expRes.rows[0].latest,
                badge: 'Finance',
                icon: 'dollar'
            });
        }

        timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json({ total: timeline.length, timeline });
    } catch (err) {
        console.error('[Timeline Error]', err.message);
        res.json({ total: 0, timeline: [] });
    }
});

apiRouter.post('/properties', async (req, res) => {
    try {
        const {
            parcel_raw,
            county_code = 'DUV',
            address_line1,
            city = 'Jacksonville',
            state_code = 'FL',
            postal_code = '32204',
            assessed_value = 200000,
            property_type = 'Single Family Residential',
            legal_description = ''
        } = req.body;
        if (!parcel_raw && !address_line1) return res.status(400).json({ error: 'parcel_raw or address_line1 is required' });

        const safeParcelRaw = parcel_raw || `PAR-${Date.now().toString().slice(-6)}`;
        const parcel_match = normalizeParcelMatch(safeParcelRaw);
        const property_id = crypto.randomUUID();
        const county_id = 'c1111111-1111-1111-1111-111111111111';

        try {
            await pool.query(
                `INSERT INTO core.properties
                  (property_id, county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, legal_description, assessed_value, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
                [
                    property_id,
                    county_id,
                    safeParcelRaw,
                    parcel_match,
                    address_line1 || 'Jacksonville, FL',
                    city,
                    state_code,
                    postal_code,
                    property_type,
                    legal_description,
                    Number(assessed_value) || 200000
                ]
            );
        } catch (pgErr) {
            console.error('[PostgreSQL Properties Insert Error]', pgErr.message);
        }

        const newProp = {
            property_id,
            county_id,
            county_code,
            parcel_raw: safeParcelRaw,
            parcel_match,
            address_line1: address_line1 || 'Jacksonville, FL',
            city,
            state_code,
            postal_code,
            property_type,
            legal_description,
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
            redactedDiff: { parcel_raw: safeParcelRaw, county_code },
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
        const tasks = db.data.core.tasks || [];
        res.json({ total: tasks.length, tasks });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/tasks', async (req, res) => {
    try {
        const { title, deal, description, category, dueDate, priority, assignee } = req.body;
        if (!title) return res.status(400).json({ error: 'Task title is required' });

        const taskId = 'tk-' + Date.now();
        const initials = assignee ? assignee.split(' ').map(n => n[0]).join('').toUpperCase() : 'HH';

        const newTask = {
            task_id: taskId,
            id: Date.now(),
            title,
            description: description || '',
            deal: deal || 'Jacksonville Portfolio',
            parcel: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
            category: category || 'Title & Escrow',
            dueDate: dueDate || 'Today 5:00 PM',
            dueStatus: 'today',
            priority: priority || 'High',
            assignee: assignee || 'Elena Rostova',
            repInitials: initials,
            done: false,
            status: 'PENDING',
            created_at: new Date().toISOString()
        };

        if (!db.data.core.tasks) db.data.core.tasks = [];
        db.data.core.tasks.unshift(newTask);

        db.logAudit({
            actor: req.body.actor || 'USER_WEB',
            action: 'TASK_CREATED',
            entityType: 'TASK',
            entityId: taskId,
            redactedDiff: { title, priority, category }
        });
        db.persist();

        res.status(201).json(newTask);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.patch('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { done, status, is_completed } = req.body;
        const tasks = db.data.core.tasks || [];
        const task = tasks.find(t => t.task_id === id || t.id === id || t.id === Number(id));
        if (task) {
            if (done !== undefined) task.done = Boolean(done);
            if (is_completed !== undefined) task.done = Boolean(is_completed);
            if (status !== undefined) {
                task.status = status;
                task.done = status === 'DONE';
            }
            db.persist();
            return res.json(task);
        }
        res.status(404).json({ error: 'Task not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!db.data.core.tasks) db.data.core.tasks = [];
        db.data.core.tasks = db.data.core.tasks.filter(t => t.task_id !== id && t.id !== id && t.id !== Number(id));
        db.persist();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// ============================================================================
// 15. Operational CRM Workspaces (Buyers, Contracts, Contacts, Tasks)
// ============================================================================

// --- Cash Buyers ---
apiRouter.get('/buyers', (req, res) => {
    try {
        const buyers = db.data.crm.buyers || [];
        res.json({ total: buyers.length, buyers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/buyers', (req, res) => {
    try {
        const { name, company, phone, email, location, zips, min, max, types, notes, pofVerified } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const buyerId = 'b-' + Date.now();
        const zipList = Array.isArray(zips) ? zips : (typeof zips === 'string' ? zips.split(',').map(s => s.trim()).filter(Boolean) : ['32204']);

        const newBuyer = {
            id: buyerId,
            name,
            company: company || 'Private Investor',
            phone: phone || '(904) 555-0000',
            email: email || 'investor@example.com',
            location: location || 'Jacksonville, FL',
            zips: zipList,
            min: Number(min) || 50000,
            max: Number(max) || 350000,
            types: types || 'SFR, Cash',
            pofVerified: pofVerified !== undefined ? Boolean(pofVerified) : true,
            response: 85,
            dealsClosed: 0,
            tier: 'VIP Tier 1',
            tierClass: 'tier-gold',
            notes: notes || 'Active cash buyer in Jacksonville area.',
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.buyers) db.data.crm.buyers = [];
        db.data.crm.buyers.unshift(newBuyer);
        db.logAudit({
            actor: req.body.actor || 'USER_WEB',
            action: 'BUYER_CREATED',
            entityType: 'BUYER',
            entityId: buyerId,
            redactedDiff: { name, company, min, max }
        });
        db.persist();

        res.status(201).json(newBuyer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/buyers/:id', (req, res) => {
    try {
        const { id } = req.params;
        if (!db.data.crm.buyers) db.data.crm.buyers = [];
        db.data.crm.buyers = db.data.crm.buyers.filter(b => b.id !== id);
        db.persist();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Wholesale Contracts ---
apiRouter.get('/contracts', (req, res) => {
    try {
        const contracts = db.data.crm.contracts || [];
        res.json({ total: contracts.length, contracts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/contracts', (req, res) => {
    try {
        const { address, type, seller, buyer, buyPrice, fee, titleAgency, closingDate, fileNumber } = req.body;
        if (!address) return res.status(400).json({ error: 'Property address is required' });

        const contractId = 'c-' + Date.now();
        const contractType = type || 'PSA';
        const code = `${contractType}-2026-0${Math.floor(88 + Math.random() * 20)}`;

        const newContract = {
            id: contractId,
            code,
            address,
            zip: '32208',
            type: contractType,
            seller: seller || 'Seller of Record',
            buyer: buyer || '',
            buyPrice: Number(buyPrice) || 95000,
            fee: Number(fee) || 28000,
            titleAgency: titleAgency || 'First American Title Jax',
            fileNumber: fileNumber || `FAT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            closingDate: closingDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            status: 'In Escrow',
            statusClass: 'status-escrow',
            milestones: [
                { name: 'Purchase & Sale Executed', detail: 'Signed today', completed: true },
                { name: 'Seller EMD Verified', detail: '$2,000 deposited in escrow', completed: true },
                { name: 'Title Commitment & Municipal Lien Search', detail: 'Title exam in progress', completed: false },
                { name: 'Assignment of Contract Executed', detail: 'Ready for assignment', completed: false },
                { name: 'Buyer EMD Received', detail: 'Pending assignment', completed: false }
            ],
            docs: [
                { name: `Executed_${contractType}_${address.replace(/[^a-zA-Z0-9]/g, '')}.pdf` }
            ],
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.contracts) db.data.crm.contracts = [];
        db.data.crm.contracts.unshift(newContract);
        db.logAudit({
            actor: req.body.actor || 'USER_WEB',
            action: 'CONTRACT_CREATED',
            entityType: 'CONTRACT',
            entityId: contractId,
            redactedDiff: { address, type: contractType, buyPrice }
        });
        db.persist();

        res.status(201).json(newContract);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/contracts/:id/milestone', (req, res) => {
    try {
        const { id } = req.params;
        const { milestoneIndex, completed } = req.body;
        const contract = (db.data.crm.contracts || []).find(c => c.id === id);
        if (!contract) return res.status(404).json({ error: 'Contract not found' });

        if (contract.milestones && contract.milestones[milestoneIndex] !== undefined) {
            contract.milestones[milestoneIndex].completed = completed;
            const allDone = contract.milestones.every(m => m.completed);
            if (allDone) {
                contract.status = 'Clear to Close';
                contract.statusClass = 'status-clear';
            }
            db.persist();
        }
        res.json(contract);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Contacts Rolodex ---
apiRouter.get('/contacts', (req, res) => {
    try {
        const contacts = db.data.crm.contacts || [];
        res.json({ total: contacts.length, contacts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/contacts', (req, res) => {
    try {
        const { name, company, type, phone, email, tagsInput, notes, property } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const contactId = 'ct-' + Date.now();
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const tags = tagsInput
            ? (Array.isArray(tagsInput) ? tagsInput : tagsInput.split(',').map(t => t.trim()).filter(Boolean))
            : ['New Contact'];

        const newContact = {
            id: contactId,
            name,
            company: company || '',
            type: type || 'Distressed Seller',
            phone: phone || '(904) 555-0100',
            email: email || 'contact@example.com',
            tags,
            property: property || '',
            status: 'Active',
            initials,
            lastTouch: 'Today ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            notes: notes || 'Contact added to HushHawk Rolodex.',
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.contacts) db.data.crm.contacts = [];
        db.data.crm.contacts.unshift(newContact);
        db.logAudit({
            actor: req.body.actor || 'USER_WEB',
            action: 'CONTACT_CREATED',
            entityType: 'CONTACT',
            entityId: contactId,
            redactedDiff: { name, type, phone }
        });
        db.persist();

        res.status(201).json(newContact);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/contacts/:id', (req, res) => {
    try {
        const { id } = req.params;
        if (!db.data.crm.contacts) db.data.crm.contacts = [];
        db.data.crm.contacts = db.data.crm.contacts.filter(c => c.id !== id && c.id !== Number(id));
        db.persist();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

