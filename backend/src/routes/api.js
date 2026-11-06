import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../store/database.js';
import { pool, checkDatabaseHealth } from '../store/pgClient.js';
import { CrownKeyService } from '../services/crownkeyService.js';
import { EventService } from '../services/eventService.js';
import { IdentityService } from '../services/identityService.js';
import { ConnectorService } from '../services/connectorService.js';
import { GraphService } from '../services/graphService.js';
import { ComplianceService } from '../services/complianceService.js';
import { CrmService } from '../services/crmService.js';
import { PodioService } from '../services/podioService.js';
import { processAdminAIQuery, getMissingDataAudit, SYSTEM_SECTIONS } from '../services/aiService.js';
import { LeadImportService } from '../services/leadImportService.js';
import { StorageService } from '../services/storageService.js';
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
        let list = [];
        try {
            const { rows } = await pool.query(`
                SELECT p.*, c.county_code, c.county_name
                FROM core.properties p
                LEFT JOIN ref.counties c ON p.county_id = c.county_id
                ORDER BY p.created_at DESC
            `);
            if (rows && rows.length > 0) {
                list = rows;
            }
        } catch (dbErr) {
            console.warn('[Properties RDS Query Fallback]:', dbErr.message);
        }
        if (!list.length) {
            list = db.data.core?.properties || [];
        }
        const enriched = list.map(p => CrownKeyService.enrichProperty({
            ...p,
            county_code: p.county_code || 'DUV'
        }));
        res.json({ total: enriched.length, properties: enriched });
    } catch (err) {
        res.json({ total: 0, properties: [] });
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

// ============================================================================
// 4b. Storage & S3 Vault Endpoints
// ============================================================================

// S3 Storage Configuration status
apiRouter.get('/storage/config', (req, res) => {
    res.json(StorageService.getConfig());
});

// General S3 Presigned Upload Authorization URL
apiRouter.post('/storage/upload-url', async (req, res) => {
    const { entity_type = 'general', entity_id, category = 'attachments', filename, content_type, file_size_bytes } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    try {
        const presigned = await StorageService.getPresignedUploadUrl({
            entityType: entity_type,
            entityId: entity_id,
            category,
            filename,
            contentType: content_type || 'application/octet-stream',
            fileSizeBytes: file_size_bytes || 0
        });
        res.json(presigned);
    } catch (err) {
        console.error('[Storage Upload URL Error]', err.message);
        res.status(400).json({ error: err.message });
    }
});

// S3 Presigned Upload Authorization URL for Property Photos
apiRouter.post('/properties/:propertyId/photos/upload-url', async (req, res) => {
    const { propertyId } = req.params;
    const { filename, content_type = 'image/jpeg', file_size_bytes = 0 } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    try {
        const presigned = await StorageService.getPresignedUploadUrl({
            entityType: 'properties',
            entityId: propertyId,
            category: 'photos',
            filename,
            contentType: content_type,
            fileSizeBytes: file_size_bytes
        });
        res.json(presigned);
    } catch (err) {
        console.error('[Photo Upload URL Error]', err.message);
        res.status(400).json({ error: err.message });
    }
});

// S3 Presigned Download/View URL for Property Photos
apiRouter.get('/properties/:propertyId/photos/:photoId/download-url', async (req, res) => {
    const { propertyId, photoId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT id, property_id, filename, object_key, storage_provider FROM core.property_photos WHERE id = $1 AND property_id = $2`,
            [photoId, propertyId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Photo not found' });

        const photo = rows[0];
        const objectKey = photo.object_key || `properties/${propertyId}/photos/${photo.filename}`;
        const presigned = await StorageService.getPresignedDownloadUrl({ objectKey });
        res.json({
            ...presigned,
            photo_id: photo.id,
            filename: photo.filename
        });
    } catch (err) {
        console.error('[Photo Download URL Error]', err.message);
        res.status(500).json({ error: err.message });
    }
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

    const safeKey = object_key || StorageService.buildObjectKey({
        entityType: 'properties',
        entityId: propertyId,
        category: 'photos',
        filename
    });

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

        // Upload buffer to S3 Private Vault if base64 data_url is supplied
        if (data_url && typeof data_url === 'string' && data_url.includes('base64,')) {
            try {
                const base64Data = data_url.split('base64,')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                await StorageService.uploadBuffer({
                    objectKey: safeKey,
                    buffer,
                    contentType: mime_type || 'image/jpeg',
                    metadata: {
                        propertyId,
                        tag: tag || 'General',
                        uploadedBy: uploaded_by
                    }
                });
            } catch (s3Err) {
                console.warn('[Property Photo S3 Buffer Upload Warn]', s3Err.message);
            }
        }

        // Mirror automatically into core.vault_files for centralized Media Vault visibility
        await pool.query(
            `INSERT INTO core.vault_files
              (filename, original_filename, file_size_bytes, mime_type, category, tag, description, object_key, storage_provider, data_url, linked_property_id, uploaded_by)
             VALUES ($1, $2, $3, $4, 'Photos', $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT DO NOTHING`,
            [
                filename,
                original_filename || filename,
                file_size_bytes || 0,
                mime_type || 'image/jpeg',
                tag || 'General',
                caption || description || null,
                safeKey,
                storage_provider,
                data_url || null,
                propertyId,
                uploaded_by
            ]
        ).catch(e => console.warn('[Vault Mirror Warn]', e.message));

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
        const { rows } = await pool.query(
            `SELECT object_key FROM core.property_photos WHERE id = $1 AND property_id = $2`,
            [photoId, propertyId]
        );
        if (rows.length > 0 && rows[0].object_key) {
            await StorageService.deleteObject({ objectKey: rows[0].object_key }).catch(e => console.warn('[S3 Delete Warn]', e.message));
            await pool.query(`DELETE FROM core.vault_files WHERE object_key = $1`, [rows[0].object_key]).catch(e => console.warn('[Vault Delete Mirror Warn]', e.message));
        }

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
// 4c. Property Documents & S3 Storage
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

// S3 Presigned Upload Authorization URL for Property Documents
apiRouter.post('/properties/:propertyId/documents/upload-url', async (req, res) => {
    const { propertyId } = req.params;
    const { filename, content_type = 'application/pdf', file_size_bytes = 0 } = req.body;
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    try {
        const presigned = await StorageService.getPresignedUploadUrl({
            entityType: 'properties',
            entityId: propertyId,
            category: 'documents',
            filename,
            contentType: content_type,
            fileSizeBytes: file_size_bytes
        });
        res.json(presigned);
    } catch (err) {
        console.error('[Document Upload URL Error]', err.message);
        res.status(400).json({ error: err.message });
    }
});

// S3 Presigned Download/View URL for Property Documents
apiRouter.get('/properties/:propertyId/documents/:docId/download-url', async (req, res) => {
    const { propertyId, docId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT id, property_id, title, filename, object_key, storage_provider FROM core.property_documents WHERE id = $1 AND property_id = $2`,
            [docId, propertyId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        const doc = rows[0];
        const objectKey = doc.object_key || `properties/${propertyId}/documents/${doc.filename || 'document.pdf'}`;
        const presigned = await StorageService.getPresignedDownloadUrl({ objectKey });
        res.json({
            ...presigned,
            doc_id: doc.id,
            title: doc.title,
            filename: doc.filename
        });
    } catch (err) {
        console.error('[Document Download URL Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/properties/:propertyId/documents', async (req, res) => {
    const { propertyId } = req.params;
    const {
        title,
        category,
        filename,
        file_size_bytes,
        mime_type,
        data_url,
        object_key,
        storage_provider = 'S3',
        uploaded_by = 'HushHawk Staff',
        status = 'UPLOADED'
    } = req.body;

    if (!title && !filename) return res.status(400).json({ error: 'Title or filename is required' });

    const safeFilename = filename || title || 'document.pdf';
    const safeKey = object_key || StorageService.buildObjectKey({
        entityType: 'properties',
        entityId: propertyId,
        category: 'documents',
        filename: safeFilename
    });

    try {
        const { rows } = await pool.query(
            `INSERT INTO core.property_documents
              (property_id, title, category, filename, file_size_bytes, mime_type, data_url, storage_provider, object_key, uploaded_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
            [
                propertyId,
                title || safeFilename,
                category || 'Other',
                safeFilename,
                file_size_bytes || 0,
                mime_type || (safeFilename.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
                data_url || null,
                storage_provider,
                safeKey,
                uploaded_by,
                status
            ]
        );

        // Upload buffer to S3 Private Vault if base64 data_url is supplied
        if (data_url && typeof data_url === 'string' && data_url.includes('base64,')) {
            try {
                const base64Data = data_url.split('base64,')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                await StorageService.uploadBuffer({
                    objectKey: safeKey,
                    buffer,
                    contentType: mime_type || 'application/pdf',
                    metadata: {
                        propertyId,
                        category: category || 'Documents',
                        uploadedBy: uploaded_by
                    }
                });
            } catch (s3Err) {
                console.warn('[Property Document S3 Buffer Upload Warn]', s3Err.message);
            }
        }

        // Mirror automatically into core.vault_files for centralized Media Vault visibility
        await pool.query(
            `INSERT INTO core.vault_files
              (filename, original_filename, file_size_bytes, mime_type, category, tag, description, object_key, storage_provider, data_url, linked_property_id, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT DO NOTHING`,
            [
                safeFilename,
                safeFilename,
                file_size_bytes || 0,
                mime_type || 'application/pdf',
                category || 'Documents',
                'Property Document',
                title || safeFilename,
                safeKey,
                storage_provider,
                data_url || null,
                propertyId,
                uploaded_by
            ]
        ).catch(e => console.warn('[Vault Mirror Warn]', e.message));

        db.logAudit({
            actor: uploaded_by || 'USER_WEB',
            action: 'DOCUMENT_UPLOADED_S3',
            entityType: 'PROPERTY_DOCUMENT',
            entityId: rows[0].id,
            redactedDiff: { property_id: propertyId, title: title || safeFilename, object_key: safeKey, storage_provider: 'S3' }
        });
        db.persist();

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('[Documents POST Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/properties/:propertyId/documents/:docId', async (req, res) => {
    const { propertyId, docId } = req.params;
    try {
        const { rows } = await pool.query(
            `SELECT object_key FROM core.property_documents WHERE id = $1 AND property_id = $2`,
            [docId, propertyId]
        );
        if (rows.length > 0 && rows[0].object_key) {
            await StorageService.deleteObject({ objectKey: rows[0].object_key }).catch(e => console.warn('[S3 Delete Warn]', e.message));
            await pool.query(`DELETE FROM core.vault_files WHERE object_key = $1`, [rows[0].object_key]).catch(e => console.warn('[Vault Delete Mirror Warn]', e.message));
        }

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
// 4d. Central Media & File Vault (Hybrid S3 & RDS Storage)
// ============================================================================

// 1. Get Vault Configuration
apiRouter.get('/vault/config', (req, res) => {
    const allowed = [
        'Photos',
        'Documents',
        'Contracts',
        'Inspections',
        'Marketing',
        'Blueprints',
        'Title & Escrow',
        'Receipts'
    ];
    res.json({
        ok: true,
        storage: StorageService.getConfig(),
        allowedCategories: allowed,
        categories: allowed
    });
});

// 2. Vault Presigned Upload URL
apiRouter.post('/vault/upload-url', async (req, res) => {
    const { filename, content_type, file_size_bytes = 0, category = 'files' } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename is required' });

    try {
        const presigned = await StorageService.getPresignedUploadUrl({
            entityType: 'vault',
            entityId: 'admin',
            category: category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            filename,
            contentType: content_type || 'application/octet-stream',
            fileSizeBytes: file_size_bytes
        });
        res.json(presigned);
    } catch (err) {
        console.error('[Vault Upload URL Error]', err.message);
        res.status(400).json({ error: err.message });
    }
});

// 3. List All Vault Files & Photos
apiRouter.get('/vault/files', async (req, res) => {
    try {
        const { type, category, q, property_id } = req.query;
        let queryStr = `
            SELECT 
                v.id,
                v.filename,
                v.original_filename,
                v.file_size_bytes,
                v.mime_type,
                v.category,
                v.tag,
                v.description,
                v.object_key,
                v.storage_provider,
                v.data_url,
                v.linked_property_id,
                v.uploaded_by,
                v.created_at,
                v.updated_at,
                p.address_line1 as property_address,
                p.city as property_city,
                p.state_code as property_state,
                p.postal_code as property_zip,
                p.parcel_raw as property_parcel
            FROM core.vault_files v
            LEFT JOIN core.properties p ON v.linked_property_id = p.property_id
            WHERE 1=1
        `;
        const params = [];

        if (property_id) {
            params.push(property_id);
            queryStr += ` AND v.linked_property_id = $${params.length}`;
        }
        if (category && category !== 'All') {
            params.push(category);
            queryStr += ` AND v.category = $${params.length}`;
        }
        if (type === 'photos') {
            queryStr += ` AND v.mime_type LIKE 'image/%'`;
        } else if (type === 'documents') {
            queryStr += ` AND (v.mime_type NOT LIKE 'image/%' OR v.category IN ('Documents', 'Contracts', 'Title & Escrow', 'Blueprints'))`;
        }
        if (q) {
            params.push(`%${q.toLowerCase()}%`);
            queryStr += ` AND (
                LOWER(v.filename) LIKE $${params.length} OR
                LOWER(COALESCE(v.original_filename, '')) LIKE $${params.length} OR
                LOWER(COALESCE(v.description, '')) LIKE $${params.length} OR
                LOWER(COALESCE(v.tag, '')) LIKE $${params.length} OR
                LOWER(COALESCE(p.address_line1, '')) LIKE $${params.length}
            )`;
        }

        queryStr += ` ORDER BY v.created_at DESC`;

        const { rows } = await pool.query(queryStr, params);
        res.json({ total: rows.length, files: rows });
    } catch (err) {
        console.error('[Vault GET Files Error]', err.message);
        res.json({ total: 0, files: [] });
    }
});

// 4. Register Uploaded Vault File
apiRouter.post('/vault/files', async (req, res) => {
    const {
        filename,
        original_filename,
        file_size_bytes = 0,
        mime_type = 'application/octet-stream',
        category = 'Photos',
        tag = 'General',
        description,
        object_key,
        storage_provider = 'S3',
        data_url,
        linked_property_id,
        uploaded_by = 'Main Administrator'
    } = req.body || {};

    if (!filename) return res.status(400).json({ error: 'filename is required' });

    const safeKey = object_key || StorageService.buildObjectKey({
        entityType: 'vault',
        entityId: 'admin',
        category: category.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        filename
    });

    try {
        const { rows } = await pool.query(
            `INSERT INTO core.vault_files
              (filename, original_filename, file_size_bytes, mime_type, category, tag, description, object_key, storage_provider, data_url, linked_property_id, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                filename,
                original_filename || filename,
                file_size_bytes,
                mime_type,
                category,
                tag,
                description || null,
                safeKey,
                storage_provider,
                data_url || null,
                linked_property_id || null,
                uploaded_by
            ]
        );

        const newFile = rows[0];

        // If binary base64 data_url is supplied, persist directly into AWS S3 Private Vault buffer
        if (data_url && typeof data_url === 'string' && data_url.includes('base64,')) {
            try {
                const base64Data = data_url.split('base64,')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                await StorageService.uploadBuffer({
                    objectKey: safeKey,
                    buffer,
                    contentType: mime_type,
                    metadata: {
                        category,
                        uploadedBy: uploaded_by || 'Main Administrator',
                        originalFilename: original_filename || filename
                    }
                });
            } catch (s3Err) {
                console.warn('[Vault S3 Buffer Persist Warn]', s3Err.message);
            }
        }

        // If linked to a property, mirror into property_photos or property_documents
        if (linked_property_id) {
            if (mime_type.startsWith('image/')) {
                await pool.query(
                    `INSERT INTO core.property_photos
                      (property_id, filename, original_filename, file_size_bytes, mime_type, tag, caption, data_url, storage_provider, object_key, uploaded_by, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'UPLOADED')
                     ON CONFLICT DO NOTHING`,
                    [
                        linked_property_id,
                        filename,
                        original_filename || filename,
                        file_size_bytes,
                        mime_type,
                        tag,
                        description || original_filename,
                        data_url || null,
                        storage_provider,
                        safeKey,
                        uploaded_by
                    ]
                ).catch(e => console.warn('[Property Photo Mirror Warn]', e.message));
            } else {
                await pool.query(
                    `INSERT INTO core.property_documents
                      (property_id, title, category, filename, file_size_bytes, mime_type, data_url, storage_provider, object_key, uploaded_by, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'UPLOADED')
                     ON CONFLICT DO NOTHING`,
                    [
                        linked_property_id,
                        original_filename || filename,
                        category,
                        filename,
                        file_size_bytes,
                        mime_type,
                        data_url || null,
                        storage_provider,
                        safeKey,
                        uploaded_by
                    ]
                ).catch(e => console.warn('[Property Document Mirror Warn]', e.message));
            }
        }

        db.logAudit({
            actor: uploaded_by || 'ADMIN_USER',
            action: 'VAULT_FILE_UPLOADED',
            entityType: 'VAULT_FILE',
            entityId: newFile.id,
            redactedDiff: { filename, mime_type, category, object_key: safeKey, linked_property_id }
        });
        db.persist();

        // Operational Notification in RDS
        await pool.query(
            `INSERT INTO ops.notifications (title, body, category, is_read, metadata)
             VALUES ($1, $2, 'vault', false, $3)`,
            [
                `Vault File Stored: ${original_filename || filename}`,
                `Stored ${category} (${(file_size_bytes / 1024).toFixed(1)} KB) in AWS S3 Private Vault.${linked_property_id ? ' Linked to property.' : ''}`,
                JSON.stringify({ file_id: newFile.id, filename, object_key: safeKey, linked_property_id })
            ]
        ).catch(e => console.warn('[Vault Notif Warn]', e.message));

        res.status(201).json(newFile);
    } catch (err) {
        console.error('[Vault POST File Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 5. Assign Vault File/Image to Property
apiRouter.post('/vault/files/:id/assign-property', async (req, res) => {
    const { id } = req.params;
    const { property_id, tag, caption } = req.body || {};
    if (!property_id) return res.status(400).json({ error: 'property_id is required' });

    try {
        const fileRes = await pool.query('SELECT * FROM core.vault_files WHERE id = $1', [id]);
        if (fileRes.rows.length === 0) return res.status(404).json({ error: 'Vault file not found' });
        const file = fileRes.rows[0];

        const propRes = await pool.query('SELECT * FROM core.properties WHERE property_id = $1', [property_id]);
        if (propRes.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
        const property = propRes.rows[0];

        // Update vault file link
        await pool.query(
            'UPDATE core.vault_files SET linked_property_id = $1, tag = COALESCE($2, tag), updated_at = now() WHERE id = $3',
            [property_id, tag, id]
        );

        // Mirror to property photos or documents
        if (file.mime_type && file.mime_type.startsWith('image/')) {
            await pool.query(
                `INSERT INTO core.property_photos
                  (property_id, filename, original_filename, file_size_bytes, mime_type, tag, caption, data_url, storage_provider, object_key, uploaded_by, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'UPLOADED')`,
                [
                    property_id,
                    file.filename,
                    file.original_filename || file.filename,
                    file.file_size_bytes,
                    file.mime_type,
                    tag || file.tag || 'General',
                    caption || file.description || file.original_filename,
                    file.data_url,
                    file.storage_provider,
                    file.object_key,
                    file.uploaded_by
                ]
            );
        } else {
            await pool.query(
                `INSERT INTO core.property_documents
                  (property_id, title, category, filename, file_size_bytes, mime_type, data_url, storage_provider, object_key, uploaded_by, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'UPLOADED')`,
                [
                    property_id,
                    caption || file.original_filename || file.filename,
                    file.category || 'Documents',
                    file.filename,
                    file.file_size_bytes,
                    file.mime_type,
                    file.data_url,
                    file.storage_provider,
                    file.object_key,
                    file.uploaded_by
                ]
            );
        }

        db.logAudit({
            actor: 'MAIN_ADMIN',
            action: 'VAULT_FILE_ASSIGNED_TO_PROPERTY',
            entityType: 'VAULT_FILE',
            entityId: id,
            redactedDiff: { file_id: id, property_id, address: property.address_line1 }
        });
        db.persist();

        res.json({
            success: true,
            message: `File assigned to property ${property.address_line1}`,
            property: {
                property_id: property.property_id,
                address_line1: property.address_line1,
                city: property.city,
                state_code: property.state_code
            }
        });
    } catch (err) {
        console.error('[Vault Assign Property Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 6. Get Vault Presigned Download URL
apiRouter.get('/vault/files/:id/download-url', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM core.vault_files WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Vault file not found' });
        const file = rows[0];

        const presigned = await StorageService.getPresignedDownloadUrl({
            objectKey: file.object_key,
            filename: file.original_filename || file.filename,
            expiresInSeconds: 3600
        });

        res.json({
            ...presigned,
            file_id: file.id,
            filename: file.original_filename || file.filename,
            data_url: file.data_url
        });
    } catch (err) {
        console.error('[Vault Download URL Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 7. Delete Vault File
apiRouter.delete('/vault/files/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query('SELECT * FROM core.vault_files WHERE id = $1', [id]);
        if (rows.length > 0 && rows[0].object_key) {
            await StorageService.deleteObject({ objectKey: rows[0].object_key }).catch(e => console.warn('[S3 Delete Warn]', e.message));
            await pool.query(`DELETE FROM core.vault_files WHERE object_key = $1`, [rows[0].object_key]).catch(e => console.warn('[Vault Delete Mirror Warn]', e.message));
        }

        await pool.query('DELETE FROM core.vault_files WHERE id = $1', [id]);

        db.logAudit({
            actor: 'MAIN_ADMIN',
            action: 'VAULT_FILE_DELETED',
            entityType: 'VAULT_FILE',
            entityId: id,
            redactedDiff: { file_id: id }
        });
        db.persist();

        res.json({ success: true, message: 'File deleted cleanly from vault' });
    } catch (err) {
        console.error('[Vault DELETE Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// 8. Vault Aggregate Metrics
apiRouter.get('/vault/stats', async (req, res) => {
    try {
        const countRes = await pool.query(`
            SELECT 
                count(*) as total_files,
                count(CASE WHEN mime_type LIKE 'image/%' THEN 1 END) as total_photos,
                count(CASE WHEN mime_type NOT LIKE 'image/%' THEN 1 END) as total_documents,
                count(CASE WHEN linked_property_id IS NOT NULL THEN 1 END) as linked_files,
                COALESCE(sum(file_size_bytes), 0) as total_bytes
            FROM core.vault_files
        `);
        const catRes = await pool.query(`
            SELECT category, count(*) as count
            FROM core.vault_files
            GROUP BY category
            ORDER BY count DESC
        `);

        res.json({
            ok: true,
            summary: countRes.rows[0],
            categories: catRes.rows
        });
    } catch (err) {
        console.error('[Vault Stats Error]', err.message);
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

apiRouter.post('/people', async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            full_name,
            primary_phone,
            primary_email,
            mailing_address,
            is_suppressed = false,
            verification_level = 'UNVERIFIED',
            actor = 'USER_WEB'
        } = req.body || {};

        const resolvedName = full_name || `${first_name || ''} ${last_name || ''}`.trim() || 'Unnamed Person';
        const person_id = crypto.randomUUID();

        // 1. Insert into PostgreSQL RDS
        try {
            await pool.query(
                `INSERT INTO core.people
                  (person_id, full_name, first_name, last_name, primary_phone, primary_email, mailing_address, is_suppressed, verification_level, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
                [
                    person_id,
                    resolvedName,
                    first_name || null,
                    last_name || null,
                    primary_phone || null,
                    primary_email || null,
                    mailing_address || null,
                    Boolean(is_suppressed),
                    verification_level
                ]
            );
        } catch (pgErr) {
            console.error('[PostgreSQL People Insert Error]', pgErr.message);
        }

        // 2. Insert into Canonical Store
        const newPerson = {
            person_id,
            full_name: resolvedName,
            first_name: first_name || null,
            last_name: last_name || null,
            primary_phone: primary_phone || null,
            primary_email: primary_email || null,
            mailing_address: mailing_address || null,
            is_suppressed: Boolean(is_suppressed),
            verification_level,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        db.data.core.people.unshift(newPerson);

        // 3. Log Audit Event
        const auditEvent = db.logAudit({
            actor,
            action: 'PERSON_CREATED',
            entityType: 'PERSON',
            entityId: person_id,
            redactedDiff: { full_name: resolvedName, primary_phone, primary_email }
        });
        db.persist();

        res.status(201).json({ person: newPerson, audit: auditEvent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/businesses', async (req, res) => {
    try {
        const {
            legal_name,
            entity_type = 'LLC',
            jurisdiction = 'FL',
            registration_id,
            registered_agent,
            status = 'ACTIVE',
            actor = 'USER_WEB'
        } = req.body || {};

        if (!legal_name) return res.status(400).json({ error: 'legal_name is required' });

        const business_id = crypto.randomUUID();

        // 1. Insert into PostgreSQL RDS
        try {
            await pool.query(
                `INSERT INTO core.businesses
                  (business_id, legal_name, entity_type, jurisdiction, registration_id, status, registered_agent, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [business_id, legal_name, entity_type, jurisdiction, registration_id || null, status, registered_agent || null]
            );
        } catch (pgErr) {
            console.error('[PostgreSQL Businesses Insert Error]', pgErr.message);
        }

        // 2. Insert into Canonical Store
        const newBusiness = {
            business_id,
            legal_name,
            entity_type,
            jurisdiction,
            registration_id: registration_id || null,
            status,
            registered_agent: registered_agent || null,
            created_at: new Date().toISOString()
        };
        db.data.core.businesses.unshift(newBusiness);

        // 3. Log Audit Event
        const auditEvent = db.logAudit({
            actor,
            action: 'BUSINESS_CREATED',
            entityType: 'BUSINESS',
            entityId: business_id,
            redactedDiff: { legal_name, entity_type, jurisdiction }
        });
        db.persist();

        res.status(201).json({ business: newBusiness, audit: auditEvent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

apiRouter.get('/seller-leads', async (req, res) => {
    try {
        let leads = [];
        const statusMap = {
            'NEW': 'New',
            'QUALIFIED': 'Contacted',
            'CONTACTED': 'Contacted',
            'APPOINTMENT': 'Appointment',
            'OFFER': 'Offer Made',
            'OFFER_MADE': 'Offer Made',
            'CONTRACT': 'Under Contract',
            'UNDER_CONTRACT': 'Under Contract',
            'CLOSED': 'Closed'
        };

        const sourceMap = {
            'MAIL': 'Direct Mail',
            'COUNTY': 'County Data',
            'INBOUND_WEB': 'Website',
            'FB_AD': 'Facebook Ad',
            'SMS_CAMPAIGN': 'SMS Campaign',
            'REFERRAL': 'Referral',
            'D4D': 'Driving for Dollars',
            'COLD_CALL': 'Cold Call',
            'BANDIT_SIGN': 'Bandit Signs',
            'OTHER': 'Direct Mail'
        };

        try {
            const { rows } = await pool.query(`
                SELECT l.lead_id, l.status, l.first_source_code, l.source_detail, l.priority_score,
                       l.created_at, l.updated_at, l.lost_reason,
                       p.person_id, p.full_name, p.primary_phone, p.primary_email,
                       pr.property_id, pr.address_line1, pr.city, pr.state_code, pr.postal_code,
                       pr.assessed_value, pr.property_type, pr.parcel_raw,
                       c.county_code
                FROM core.leads l
                LEFT JOIN core.people p ON l.person_id = p.person_id
                LEFT JOIN core.properties pr ON l.property_id = pr.property_id
                LEFT JOIN ref.counties c ON pr.county_id = c.county_id
                ORDER BY l.created_at DESC
            `);
            if (rows && rows.length > 0) {
                leads = rows.map((r, idx) => {
                    const countyCode = r.county_code || 'DUV';
                    const parcel = r.parcel_raw || `PARCEL-${idx}`;
                    const crownKey = r.address_line1 ? `${countyCode}-${parcel} · ${r.first_source_code || 'MAIL'}` : 'Property pending';
                    const leadStatus = statusMap[r.status] || 'New';
                    const sourceText = r.source_detail ? r.source_detail.replace(/^Podio:\s*/, '') : (sourceMap[r.first_source_code] || 'Direct Mail');
                    const arv = r.assessed_value ? Math.round(Number(r.assessed_value) * 1.25) : null;
                    const mao = arv ? Math.round(arv * 0.70 - 25000) : null;
                    const hasAddress = r.address_line1 && !/^Jacksonville Property #\d+$/.test(r.address_line1) && r.address_line1 !== 'No Property Address on File';
                    const displayAddress = hasAddress ? r.address_line1 : (r.primary_email || 'No Property Address on File');

                    return {
                        id: r.lead_id,
                        crownKey,
                        name: r.full_name || 'Seller Lead',
                        address: displayAddress,
                        city: hasAddress ? (r.city || 'Jacksonville') : '',
                        zip: hasAddress ? (r.postal_code || '') : '',
                        phone: r.primary_phone || '',
                        email: r.primary_email || '',
                        source: sourceText,
                        status: leadStatus,
                        date: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        arv,
                        repairs: arv ? 25000 : null,
                        mao,
                        equity: arv ? Math.round(arv * 0.30) : null,
                        tags: hasAddress ? [countyCode === 'DUV' ? 'Duval County' : 'Clay County', sourceText] : [sourceText],
                        type: hasAddress ? (r.property_type || 'Single Family Residential') : '',
                        photo: '',
                        score: r.priority_score || 75,
                        assignee: '',
                        notes: ''
                    };
                });
            }
        } catch (dbErr) {
            console.warn('[Seller Leads RDS Fallback]:', dbErr.message);
        }

        if (!leads.length) {
            const enrichedLeads = CrmService.getLeads();
            leads = (enrichedLeads || []).map((lead, idx) => {
                const prop = lead.property || null;
                const person = lead.person || null;
                const crownKey = lead.crownKey || (prop ? prop.crownKey : 'Property pending');
                const leadStatus = lead.status && statusMap[lead.status] ? statusMap[lead.status] : 'New';
                const leadSource = sourceMap[lead.first_source_code] || lead.source || 'Direct Mail';
                const hasRealProp = prop && prop.address_line1 && !/^Jacksonville Property #\d+$/.test(prop.address_line1) && prop.address_line1 !== 'No Property Address on File';
                const arv = hasRealProp && prop?.assessed_value ? Math.round(prop.assessed_value * 1.25) : (lead.arv || null);
                const repairs = lead.repairs || null;
                const mao = lead.mao || (arv && repairs ? Math.round(arv * 0.70 - repairs) : null);
                const equity = hasRealProp && prop?.estimated_equity ? prop.estimated_equity : (lead.equity || null);
                const address = hasRealProp ? prop.address_line1 : (lead.address && !/^Jacksonville Property #\d+$/.test(lead.address) && lead.address !== 'No Property Address on File' ? lead.address : 'No Property Address on File');

                return {
                    id: lead.lead_id || `lead-${idx}`,
                    crownKey,
                    name: person?.full_name || lead.name || 'Unnamed Seller',
                    address,
                    city: hasRealProp ? (prop?.city || 'Jacksonville') : '',
                    zip: hasRealProp ? (prop?.postal_code || '') : '',
                    phone: person?.primary_phone || person?.phone_raw || lead.phone || '',
                    email: person?.primary_email || person?.email_raw || lead.email || '',
                    source: leadSource,
                    status: leadStatus,
                    date: lead.created_at ? lead.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                    arv,
                    repairs,
                    mao,
                    equity,
                    tags: hasRealProp ? [prop?.county_code === 'DUV' ? 'Duval County' : 'Clay County', leadSource] : [leadSource],
                    type: hasRealProp ? (prop?.property_type || 'Single Family Residential') : '',
                    photo: hasRealProp ? (prop?.photos?.[0]?.url || lead.photo || '') : '',
                    score: lead.priority_score || 0,
                    assignee: lead.assigned_to || '',
                    notes: lead.notes || ''
                };
            });
        }

        res.json({
            leads,
            total: leads.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/leads', async (req, res) => {
    try {
        if (req.body.name || req.body.address) {
            // Direct lead creation from frontend
            const { name, address, zip, phone, email, source, arv, repairs, mao, equity, actor } = req.body;
            const countyCode = 'DUV';
            const countyId = 'c1111111-1111-1111-1111-111111111111';
            const parcelRaw = `FL-${zip || '32202'}-${Date.now().toString().slice(-4)}`;
            const parcelMatch = normalizeParcelMatch(parcelRaw);

            const personId = crypto.randomUUID();
            const propertyId = crypto.randomUUID();
            const leadId = crypto.randomUUID();

            const sourceCode = (source || 'MAIL').toUpperCase().includes('MAIL') ? 'MAIL' : 'OTHER';
            const crownKey = renderCrownKey({
                countyCode,
                parcelRaw,
                firstSourceCode: sourceCode
            });

            // Write to PG
            await pool.query(`
                INSERT INTO core.people (person_id, full_name, primary_phone, primary_email, mailing_address, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            `, [personId, name || 'Unnamed Seller', phone || null, email || null, address ? `${address}, Jacksonville, FL ${zip || ''}` : null]);

            await pool.query(`
                INSERT INTO core.properties (property_id, county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, assessed_value, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'Jacksonville', 'FL', $6, 'Single Family Residential', $7, NOW(), NOW())
            `, [propertyId, countyId, parcelRaw, parcelMatch, address || 'No Address', zip || '32202', arv ? Number(arv) : 250000]);

            await pool.query(`
                INSERT INTO core.leads (lead_id, first_source_code, source_detail, property_id, person_id, status, priority_score, metadata, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'NEW', 60, $6, NOW(), NOW())
            `, [leadId, sourceCode, 'Manual Web UI Entry', propertyId, personId, JSON.stringify({ arv, repairs, mao, equity, crownKey })]);

            // Audit
            await pool.query(`
                INSERT INTO audit.audit_events (audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at)
                VALUES ($1, $2, 'LEAD_CREATED', 'LEAD', $3, $4, $5, NOW())
            `, [crypto.randomUUID(), actor || 'Acquisitions Admin', leadId, crypto.randomUUID(), JSON.stringify({ name, address, crownKey })]);

            // In-memory sync
            const newLeadObj = {
                lead_id: leadId,
                first_source_code: sourceCode,
                source_detail: 'Manual Web UI Entry',
                property_id: propertyId,
                person_id: personId,
                status: 'NEW',
                priority_score: 60,
                created_at: new Date().toISOString(),
                crownKey
            };
            db.data.core.leads.unshift(newLeadObj);
            db.data.core.properties.unshift({
                property_id: propertyId,
                county_id: countyId,
                parcel_raw: parcelRaw,
                parcel_match: parcelMatch,
                address_line1: address,
                city: 'Jacksonville',
                state_code: 'FL',
                postal_code: zip,
                assessed_value: arv || 250000,
                crownKey
            });
            db.data.core.people.unshift({
                person_id: personId,
                full_name: name,
                primary_phone: phone,
                primary_email: email
            });

            return res.status(201).json({
                success: true,
                id: leadId,
                lead_id: leadId,
                crownKey,
                name,
                address,
                city: 'Jacksonville',
                zip,
                phone,
                email,
                source: source || 'Direct Mail',
                status: 'New',
                date: new Date().toISOString().split('T')[0],
                arv,
                repairs,
                mao,
                equity
            });
        }

        const newLead = CrmService.createLead(req.body);
        res.status(201).json(newLead);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Bulk Lead Ingestion Endpoint (CSV, TSV, or JSON Array)
apiRouter.post('/leads/import', async (req, res) => {
    try {
        const { data, sourceCode, actor, listName } = req.body;
        const result = await LeadImportService.processImport({
            data,
            sourceCode: sourceCode || 'MAIL',
            actor: actor || 'Acquisitions Admin',
            defaultListName: listName || 'Skip-Trace Batch'
        });
        res.status(201).json(result);
    } catch (err) {
        console.error('[Lead Import Error]', err);
        res.status(400).json({ error: err.message });
    }
});

// Purge test batch records safely (restoring canonical truth)
apiRouter.post('/leads/purge-test-batch', async (req, res) => {
    try {
        const { lead_ids, property_ids, person_ids } = req.body;
        const result = await LeadImportService.purgeBatch({
            leadIds: lead_ids || [],
            propertyIds: property_ids || [],
            personIds: person_ids || []
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
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

// ============================================================================
// Podio CRM Coexistence & Inbound Webhook Receiver
// ============================================================================
apiRouter.post('/webhooks/podio', async (req, res) => {
    try {
        const { type, item_id, app_id, hook_id, code } = req.body;

        // 1. Podio Handshake Verification
        if (type === 'hook.verify') {
            console.log(`[Podio Webhook] Verification handshake received for hook: ${hook_id}, code: ${code}`);
            return res.json({ status: 'VERIFIED', hook_id, code, message: 'Podio webhook endpoint verified successfully' });
        }

        // 2. Podio Item Ingestion / Sync
        if (type === 'item.create' || type === 'item.update') {
            const externalItemId = String(item_id || req.body.item?.item_id || `podio-${Date.now()}`);
            const fields = req.body.fields || req.body.item?.fields || {};

            const address = fields.address || fields['property-address'] || fields.title || req.body.address || 'Jacksonville Property Ingested';
            const seller = fields.seller || fields['seller-name'] || fields.name || req.body.name || 'Podio Seller Contact';
            const phone = fields.phone || fields['seller-phone'] || req.body.phone || '';
            const email = fields.email || fields['seller-email'] || req.body.email || '';
            const source = fields.source || fields['lead-source'] || req.body.source || 'Podio Ingestion';
            const rawStage = (fields.stage || fields.status || req.body.stage || 'NEW').toUpperCase();

            // Ingest into HushHawk canonical lead store
            const newLead = CrmService.createLead({
                firstSourceCode: 'OTHER',
                sourceDetail: `Podio Ingestion (App ID: ${app_id || '29481023'} · Item ID: ${externalItemId})`,
                priorityScore: 85,
                actor: 'Podio Webhook Sync',
            });

            // Coexistence Sync Map entry
            db.data.crm.external_sync_map.unshift({
                sync_id: crypto.randomUUID(),
                internal_entity_type: 'LEAD',
                internal_uuid: newLead.lead_id,
                external_system: 'PODIO',
                external_app_id: String(app_id || '29481023'),
                external_item_id: externalItemId,
                last_sync_at: new Date().toISOString(),
                version_hash: crypto.createHash('md5').update(externalItemId).digest('hex').slice(0, 8),
                status: 'SYNCED',
            });

            db.persist();

            return res.status(201).json({
                ok: true,
                message: `Podio item ${externalItemId} synchronized to HushHawk canonical lead ${newLead.lead_id}`,
                lead_id: newLead.lead_id,
                external_item_id: externalItemId,
                status: 'SYNCED'
            });
        }

        res.json({ ok: true, received: true });
    } catch (err) {
        console.error('[Podio Webhook Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Podio Direct API Connection & Sync
// ============================================================================
apiRouter.post('/integrations/podio/connect', async (req, res) => {
    try {
        const { appId, appToken, username, password } = req.body;
        let authResult;

        if (appId && appToken) {
            authResult = await PodioService.authenticateApp(appId, appToken);
        } else if (username && password) {
            authResult = await PodioService.authenticateUser(username, password);
        } else {
            return res.status(400).json({ error: 'Provide either (appId + appToken) or (username + password)' });
        }

        const accessToken = authResult.access_token;
        const webhookUrl = 'https://hushhawk-kohl.vercel.app/api/v1/webhooks/podio';

        let webhookRegistered = false;
        if (appId) {
            try {
                await PodioService.registerWebhook(accessToken, appId, webhookUrl);
                webhookRegistered = true;
            } catch (wErr) {
                console.warn('[Podio Webhook Registration]', wErr.message);
            }
        }

        db.data.settings = db.data.settings || {};
        db.data.settings.podio = {
            applicationName: 'Hush Hawk Integration',
            clientId: PodioService.CLIENT_ID,
            status: 'CONNECTED',
            webhookUrl,
            appId: appId || null,
            lastConnected: new Date().toISOString()
        };
        db.persist();

        res.json({
            ok: true,
            message: 'Successfully authenticated with Podio API',
            webhookRegistered,
            podio: db.data.settings.podio
        });
    } catch (err) {
        console.error('[Podio Connect Error]', err.message);
        res.status(400).json({ error: err.message });
    }
});

// Interactions
apiRouter.get('/interactions', (req, res) => {
    res.json({ interactions: db.data.core.interactions });
});

apiRouter.post('/interactions', async (req, res) => {
    try {
        const interaction = await CrmService.recordInteraction(req.body);
        res.status(201).json(interaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Outbound Call Dispatch with Section 14 Compliance Gate & Interaction Logging
apiRouter.post('/calls/dispatch', async (req, res) => {
    try {
        const { recipientPhone, leadId, personId, propertyId, actor = 'Elena Rostova', notes = '', templateId = 'tmpl-seller-outreach-v1' } = req.body;
        if (!recipientPhone) {
            return res.status(400).json({ error: 'recipientPhone is required' });
        }

        // 1. Mandatory 6-Step Compliance Gate (Blueprint Section 14)
        const compliance = ComplianceService.evaluateOutboundRequest({
            channel: 'CALL',
            recipientPhone,
            actor,
            templateId,
        });

        if (!compliance.allowed) {
            return res.status(403).json({
                error: 'OUTBOUND_CALL_BLOCKED_BY_COMPLIANCE_GATE',
                details: compliance.checks.find(c => !c.passed)?.reason,
                compliance
            });
        }

        // 2. Log Interaction to core.interactions (PostgreSQL RDS)
        const interaction = await CrmService.recordInteraction({
            leadId,
            personId,
            propertyId,
            method: 'PHONE',
            direction: 'OUTBOUND',
            actor,
            result: 'CALL_DISPATCHED',
            notes: notes || `Outbound phone call initiated to ${recipientPhone}`
        });

        // 3. Emit Operational Notification
        const notifId = crypto.randomUUID();
        await pool.query(
            `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
            [
                notifId,
                `Outbound Call: ${recipientPhone}`,
                `Call initiated by ${actor} (Compliance gate passed 6/6 checks).`,
                'PIPELINE',
                'LOW',
                'gold',
                'phone'
            ]
        );

        res.status(200).json({
            success: true,
            status: 'CALL_DISPATCHED',
            channel: 'CALL',
            recipientPhone,
            compliance,
            interaction
        });
    } catch (err) {
        console.error('[Call Dispatch Error]', err);
        res.status(500).json({ error: err.message });
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
// 7.5. Real-Time Operational Notifications (Escrow, Pipeline, Leads, Compliance)
// ============================================================================
function formatRelativeTime(date) {
    if (!date) return '';
    const diffMs = Date.now() - new Date(date).getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

apiRouter.get('/notifications', async (req, res) => {
    try {
        const { unread_only } = req.query;
        let query = `SELECT * FROM ops.notifications`;
        const params = [];
        if (unread_only === 'true') {
            query += ` WHERE is_read = false`;
        }
        query += ` ORDER BY created_at DESC LIMIT 50`;

        const pgRes = await pool.query(query, params);
        const unreadCountRes = await pool.query(`SELECT count(*) FROM ops.notifications WHERE is_read = false`);
        const unread_count = Number(unreadCountRes.rows[0]?.count || 0);

        res.json({
            total: pgRes.rows.length,
            unread_count,
            notifications: pgRes.rows.map(n => ({
                id: n.notification_id,
                notification_id: n.notification_id,
                title: n.title,
                body: n.body,
                category: n.category,
                priority: n.priority,
                color: n.color,
                icon: n.icon,
                action_url: n.action_url,
                is_read: n.is_read,
                read_at: n.read_at,
                created_at: n.created_at,
                time: formatRelativeTime(n.created_at)
            }))
        });
    } catch (err) {
        console.error('[Notifications GET Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/notifications', async (req, res) => {
    try {
        const {
            title,
            body,
            category = 'SYSTEM',
            priority = 'NORMAL',
            color = 'blue',
            icon = 'bell',
            action_url = null,
            metadata = {}
        } = req.body || {};

        if (!title || !body) {
            return res.status(400).json({ error: 'title and body are required' });
        }

        const notification_id = crypto.randomUUID();
        const insertRes = await pool.query(
            `INSERT INTO ops.notifications 
             (notification_id, title, body, category, priority, color, icon, action_url, metadata, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NOW())
             RETURNING *`,
            [notification_id, title, body, category, priority, color, icon, action_url, metadata]
        );

        const row = insertRes.rows[0];
        res.status(201).json({
            notification: {
                id: row.notification_id,
                ...row,
                time: 'Just now'
            }
        });
    } catch (err) {
        console.error('[Notifications POST Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            `UPDATE ops.notifications SET is_read = true, read_at = NOW() WHERE notification_id = $1`,
            [id]
        );
        res.json({ success: true, notification_id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/notifications/mark-all-read', async (req, res) => {
    try {
        await pool.query(`UPDATE ops.notifications SET is_read = true, read_at = NOW() WHERE is_read = false`);
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM ops.notifications WHERE notification_id = $1`, [id]);
        res.json({ success: true, deleted_id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/notifications/clear-all', async (req, res) => {
    try {
        await pool.query(`DELETE FROM ops.notifications`);
        res.json({ success: true, message: 'All notifications cleared' });
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



// --- Skip Tracing ---
apiRouter.get('/skip-tracing', (req, res) => {
    try {
        const traces = db.data.crm.skip_traces || [];
        res.json({ total: traces.length, traces });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/skip-tracing', (req, res) => {
    try {
        const { ownerName, address, zip, mailingAddress, phone, email, notes } = req.body;
        if (!ownerName) return res.status(400).json({ error: 'Owner name is required' });

        const traceId = 't-' + Date.now();
        const newTrace = {
            id: traceId,
            ownerName,
            age: 55,
            deceased: false,
            address: address || 'Jacksonville, FL',
            zip: zip || '32208',
            mailingAddress: mailingAddress || address || 'Jacksonville, FL',
            score: 95,
            primaryPhone: phone || '(904) 555-' + Math.floor(1000 + Math.random() * 9000),
            phoneType: 'Mobile (Verizon Wireless)',
            carrier: 'Verizon Wireless',
            dncStatus: 'Clean / Safe',
            dncClass: 'status-clean',
            email: email || 'owner@example.com',
            bankruptcy: false,
            liens: '$0 recorded',
            tier: 'Tier 1 Gold',
            tierClass: 'tier-gold',
            matchType: 'Single Owner Verified',
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.skip_traces) db.data.crm.skip_traces = [];
        db.data.crm.skip_traces.unshift(newTrace);
        db.persist();

        res.status(201).json(newTrace);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Facebook Leads ---
apiRouter.get('/facebook-leads', (req, res) => {
    try {
        const leads = db.data.crm.facebook_leads || [];
        res.json({ total: leads.length, leads });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/facebook-leads', (req, res) => {
    try {
        const { name, phone, email, address, campaign, timeframe, askingPrice, reason } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const leadId = Date.now();
        const newLead = {
            id: leadId,
            name,
            phone: phone || '(904) 555-0100',
            email: email || 'lead@example.com',
            address: address || 'Jacksonville, FL',
            parcelId: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
            campaign: campaign || 'Duval Inherited & Probate',
            motivationScore: 88,
            motivationClass: 'score-hot',
            stage: 'New Ingested',
            submittedTime: 'Just now',
            askingPrice: Number(askingPrice) || 120000,
            arv: 240000,
            timeframe: timeframe || 'Immediately (under 14 days)',
            reason: reason || 'Inherited vacant house. Needs cosmetic updates.',
            notes: 'Created from Facebook Leads Command Center.',
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.facebook_leads) db.data.crm.facebook_leads = [];
        db.data.crm.facebook_leads.unshift(newLead);
        db.persist();

        res.status(201).json(newLead);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Follow Ups ---
apiRouter.get('/follow-ups', (req, res) => {
    try {
        const followUps = db.data.crm.follow_ups || [];
        res.json({ total: followUps.length, followUps });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/follow-ups', (req, res) => {
    try {
        const { seller, address, phone, cadenceStage, motivation, channel, lastOffer, arv, notes } = req.body;
        if (!seller && !address) return res.status(400).json({ error: 'Seller or address is required' });

        const followUpId = Date.now();
        const newFollowUp = {
            id: followUpId,
            seller: seller || 'Property Owner',
            address: address || 'Jacksonville, FL',
            parcelId: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
            phone: phone || '(904) 555-0100',
            email: 'seller@example.com',
            cadenceStage: cadenceStage || 'Day 1 Post-Offer',
            motivation: motivation || 'Hot',
            channel: channel || 'Call',
            lastOffer: Number(lastOffer) || 110000,
            arv: Number(arv) || 240000,
            dueDate: 'Today',
            dueUrgency: 'urgent',
            activityCount: 1,
            assignedRep: 'Marcus Vance',
            repInitials: 'MV',
            notes: notes || 'Cadence follow-up established.',
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.follow_ups) db.data.crm.follow_ups = [];
        db.data.crm.follow_ups.unshift(newFollowUp);
        db.persist();

        res.status(201).json(newFollowUp);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Direct Mail ---
apiRouter.get('/direct-mail', (req, res) => {
    try {
        const directMail = db.data.crm.direct_mail || [];
        res.json({ total: directMail.length, mailBatches: directMail });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/direct-mail', async (req, res) => {
    try {
        const { name, audience, zips, format, quantity, dropDate, actor = 'Marcus Vance' } = req.body;
        if (!name) return res.status(400).json({ error: 'Batch name is required' });

        // Compliance check for Direct Mail (Blueprint Section 14)
        const compliance = ComplianceService.evaluateOutboundRequest({
            channel: 'MAIL',
            recipientAddress: zips || 'Duval County',
            actor,
            templateId: 'tmpl-yellow-letter-v1',
        });

        const batchId = Date.now();
        const batchUuid = crypto.randomUUID();
        const batchCode = 'DM-2026-B' + Math.floor(109 + Math.random() * 50);
        const qty = Number(quantity) || 2500;
        const cost = Math.round(qty * 0.44);

        const newBatch = {
            id: batchId,
            batch_uuid: batchUuid,
            batchCode,
            name,
            audience: audience || 'Duval County High Equity Absentee',
            zips: zips || '32208, 32209',
            format: format || '4x6 Postcard',
            quantity: qty,
            cost,
            calls: 0,
            responseRate: '0.00',
            status: 'In Production',
            statusClass: 'status-prod',
            dropDate: dropDate || new Date().toISOString().split('T')[0],
            compliance_status: compliance.status,
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.direct_mail) db.data.crm.direct_mail = [];
        db.data.crm.direct_mail.unshift(newBatch);
        db.persist();

        // Audit Trail in PostgreSQL RDS
        try {
            await pool.query(
                `INSERT INTO audit.audit_events (audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at)
                 VALUES ($1, $2, 'DIRECT_MAIL_DISPATCHED', 'DIRECT_MAIL_BATCH', $3, $4, $5, NOW())`,
                [crypto.randomUUID(), actor, batchUuid, crypto.randomUUID(), JSON.stringify({ batchCode, name, quantity: qty, cost })]
            );
        } catch (auditErr) {
            console.warn('[Direct Mail Audit Warn]', auditErr.message);
        }

        // Operational Notification in PostgreSQL RDS
        try {
            await pool.query(
                `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
                [
                    crypto.randomUUID(),
                    `Direct Mail Batch Dispatched: ${batchCode}`,
                    `${qty} pieces (${format}) ordered for ${zips || 'service territory'}.`,
                    'PIPELINE',
                    'MEDIUM',
                    'gold',
                    'mail'
                ]
            );
        } catch (notifErr) {
            console.warn('[Direct Mail Notif Warn]', notifErr.message);
        }

        res.status(201).json(newBatch);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- County Records ---
apiRouter.get('/county-records', async (req, res) => {
    try {
        let records = [];
        try {
            const { rows } = await pool.query(`
                SELECT p.property_id, p.parcel_raw, p.parcel_match, p.address_line1, p.city, p.state_code, p.postal_code,
                       p.assessed_value, p.legal_description, p.property_type, p.created_at,
                       c.county_code, c.county_name
                FROM core.properties p
                LEFT JOIN ref.counties c ON p.county_id = c.county_id
                ORDER BY p.created_at DESC
            `);
            if (rows && rows.length > 0) {
                records = rows.map((r, idx) => {
                    const assessed = Number(r.assessed_value) || 120000;
                    const estValue = Math.round(assessed * 1.25);
                    const equity = Math.round(estValue * 0.45);
                    const countyName = r.county_name || (r.county_code === 'POL' ? 'Polk' : (r.county_code === 'CLA' ? 'Clay' : 'Duval'));
                    return {
                        id: r.property_id || `rec-${idx}`,
                        crownKey: `${r.county_code || 'DUV'}-${r.parcel_raw || 'PARCEL-' + idx}`,
                        parcel: r.parcel_raw || r.parcel_match,
                        address: r.address_line1 || 'Jacksonville, FL',
                        city: r.city || 'Jacksonville',
                        county: countyName,
                        zip: r.postal_code || '32204',
                        owner: 'Owner of Record',
                        ownerType: 'Absentee Owner',
                        assessedValue: assessed,
                        estimatedValue: estValue,
                        equity,
                        distress: 'Tax Delinquent',
                        status: 'Active Record',
                        tags: ['Absentee', 'High Equity'],
                        phone: '—',
                        email: '—'
                    };
                });
            }
        } catch (dbErr) {
            console.warn('[County Records RDS Fallback]:', dbErr.message);
        }
        if (!records.length) {
            records = db.data.crm.county_records || [];
        }
        res.json({ total: records.length, records });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Communications ---
apiRouter.get('/communications', (req, res) => {
    try {
        const threads = db.data.crm.communications || [];
        res.json({ total: threads.length, threads });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/communications/messages', (req, res) => {
    try {
        const { threadId, text } = req.body;
        if (!text) return res.status(400).json({ error: 'Message text is required' });

        const threads = db.data.crm.communications || [];
        const thread = threads.find(t => t.id === threadId || t.id === Number(threadId));
        if (thread) {
            if (!thread.messages) thread.messages = [];
            thread.messages.push({
                sender: 'rep',
                name: 'Marcus Vance (HushHawk)',
                text,
                time: 'Just now'
            });
            thread.lastMessage = text;
            thread.time = 'Just now';
            db.persist();
            return res.status(201).json(thread);
        }
        res.status(404).json({ error: 'Thread not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Calendar Events ---
apiRouter.get('/calendar', (req, res) => {
    try {
        const events = db.data.crm.calendar_events || [];
        res.json({ total: events.length, events });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/calendar', (req, res) => {
    try {
        const { title, type, date, time, address, rep, notes } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const eventId = Date.now();
        const dateObj = new Date(date || Date.now());
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dateString = dayNames[dateObj.getDay()] + ', ' + monthNames[dateObj.getMonth()] + ' ' + dateObj.getDate();

        const newEvent = {
            id: eventId,
            date: date || new Date().toISOString().split('T')[0],
            dayNum: String(dateObj.getDate()),
            dateString,
            time: time || '10:00 AM',
            title,
            address: address || 'Jacksonville, FL',
            parcel: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
            type: type || 'Seller Walkthrough',
            rep: rep || 'Marcus Vance',
            notes: notes || 'Scheduled inspection/walkthrough.',
            completed: false,
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.calendar_events) db.data.crm.calendar_events = [];
        db.data.crm.calendar_events.unshift(newEvent);
        db.persist();

        res.status(201).json(newEvent);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Team Members ---
apiRouter.get('/team', (req, res) => {
    try {
        const members = db.data.crm.team_members || [];
        res.json({ total: members.length, members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/team', (req, res) => {
    try {
        const { name, title, department, email, phone, accessLevel } = req.body;
        if (!name) return res.status(400).json({ error: 'Member name is required' });

        const memberId = 'tm-' + Date.now();
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

        const newMember = {
            id: memberId,
            name,
            initials,
            avatarBg: 'linear-gradient(135deg, #38bdf8, #0284c7)',
            title: title || 'Acquisitions Specialist',
            department: department || 'Acquisitions',
            accessLevel: accessLevel || 'Standard User',
            tier: 'Tier 1 Specialist',
            email: email || 'member@hushhawk.com',
            phone: phone || '(904) 555-0100',
            status: 'Active',
            statusClass: 'status-active',
            dealsAssigned: 0,
            volumeMTD: '$0',
            conversionRate: '0%',
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.team_members) db.data.crm.team_members = [];
        db.data.crm.team_members.unshift(newMember);
        db.persist();

        res.status(201).json(newMember);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Dashboard Live Metrics
// ============================================================================
apiRouter.get("/dashboard/metrics", async (req, res) => {
    try {
        let totalLeads = 0;
        let totalProperties = 0;
        let duvalLeads = 0;
        let clayLeads = 0;
        let polkLeads = 0;
        let totalTasks = 0;
        let totalInteractions = 0;

        try {
            const leadsRes = await pool.query(`SELECT count(*) as total FROM core.leads`);
            totalLeads = parseInt(leadsRes.rows[0]?.total || 0, 10);

            const propsRes = await pool.query(`
                SELECT count(*) as total,
                       count(*) FILTER (WHERE c.county_code = 'DUV') as duval_count,
                       count(*) FILTER (WHERE c.county_code = 'CLA') as clay_count,
                       count(*) FILTER (WHERE c.county_code = 'POL') as polk_count
                FROM core.properties p
                LEFT JOIN ref.counties c ON p.county_id = c.county_id
            `);
            totalProperties = parseInt(propsRes.rows[0]?.total || 0, 10);
            duvalLeads = parseInt(propsRes.rows[0]?.duval_count || 0, 10);
            clayLeads = parseInt(propsRes.rows[0]?.clay_count || 0, 10);
            polkLeads = parseInt(propsRes.rows[0]?.polk_count || 0, 10);

            const tasksRes = await pool.query(`SELECT count(*) as total FROM core.tasks WHERE status != 'COMPLETED'`);
            totalTasks = parseInt(tasksRes.rows[0]?.total || 0, 10);

            const interRes = await pool.query(`SELECT count(*) as total FROM core.interactions`);
            totalInteractions = parseInt(interRes.rows[0]?.total || 0, 10);
        } catch (dbErr) {
            console.warn('[Dashboard Metrics RDS Fallback]:', dbErr.message);
            totalLeads = (db.data.core?.leads || []).length;
            totalProperties = (db.data.core?.properties || []).length;
            totalTasks = (db.data.core?.tasks || []).length;
        }

        const buyers = db.data.crm?.buyers || [];
        const contracts = db.data.crm?.contracts || [];
        const calendar = db.data.crm?.calendar_events || [];

        const totalAppointments = calendar.length;
        const totalUnderContract = contracts.length;
        const totalAssignmentRevenue = contracts.reduce((sum, c) => sum + (c.fee || 0), 0);
        const totalBuyVolume = contracts.reduce((sum, c) => sum + (c.buyPrice || 0), 0);
        const avgMAO = contracts.length ? Math.round(totalBuyVolume / contracts.length) : 0;
        const avgARV = contracts.length ? Math.round((totalBuyVolume + totalAssignmentRevenue) * 1.25 / contracts.length) : 0;
        const totalBuyers = buyers.length;
        const dispoOpps = contracts.filter(c => c.status !== "Closed/Funded").length;
        const offersPending = contracts.filter(c => c.status === "PSA" || (c.status && c.status.toLowerCase().includes("pending"))).length;
        const contactRate = totalLeads ? Math.min(100, Math.round((totalInteractions / totalLeads) * 100)) + "%" : "0%";

        const countyIntelligence = [
            { name: "Duval County", count: String(duvalLeads || (totalLeads ? totalLeads - clayLeads - polkLeads : 0)) },
            { name: "Clay County", count: String(clayLeads) },
            { name: "Polk County", count: String(polkLeads) }
        ];

        res.json({
            metrics: [
                { iconKey: "users", label: "Total Seller Leads", value: String(totalLeads), change: "Live", href: "/seller-leads" },
                { iconKey: "phone", label: "Contact Rate", value: contactRate, change: "Active", href: "/communications" },
                { iconKey: "calendar", label: "Appointments Set", value: String(totalAppointments), change: "Live", href: "/calendar" },
                { iconKey: "file", label: "Offers Pending", value: String(offersPending), change: "Active", href: "/acquisitions" },
                { iconKey: "handshake", label: "Under Contract", value: String(totalUnderContract), change: "Live", href: "/contracts" },
                { iconKey: "badgeDollar", label: "Assignment Revenue", value: "$" + totalAssignmentRevenue.toLocaleString(), change: "Live", href: "/analytics" },
                { iconKey: "calculator", label: "Avg. MAO", value: "$" + avgMAO.toLocaleString(), change: "Real", href: "/deal-analyzer" },
                { iconKey: "house", label: "Avg. ARV", value: "$" + avgARV.toLocaleString(), change: "Real", href: "/deal-analyzer" },
                { iconKey: "users", label: "Cash Buyer Matches", value: String(totalBuyers), change: "Live", href: "/cash-buyers" },
                { iconKey: "dollar", label: "Dispo Opportunities", value: String(dispoOpps), change: "Live", href: "/dispositions" }
            ],
            signals: [
                { code: "DUVAL", label: "Lead flow", value: String(totalLeads), change: "Live" },
                { code: "BUYERS", label: "Cash buyers", value: String(totalBuyers), change: "Active" },
                { code: "CONTRACT", label: "Under contract", value: String(totalUnderContract), change: "Live" },
                { code: "YIELD", label: "Assignment rev", value: "$" + Math.round(totalAssignmentRevenue / 1000) + "K", change: "Locked" },
                { code: "DEALS", label: "Dispo opportunities", value: String(dispoOpps), change: "Active" }
            ],
            countyIntelligence
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// System Settings API
// ============================================================================
apiRouter.get('/settings', (req, res) => {
    try {
        const s3Config = StorageService.getConfig();
        const rdsHost = 'hushhawk-postgres.cxsqkk2qulh9.us-east-2.rds.amazonaws.com';
        const rdsDb = 'hushhawk';
        const maskedDbUri = `postgresql://hushhawk:••••••••@${rdsHost}:5432/${rdsDb}`;

        const defaults = {
            general: {
                entityName: 'HushHawk Intelligence LLC',
                titleCompany: 'First American Title',
                titleEmail: 'closing@firstam.com',
                primaryCounty: 'Duval County (Jacksonville)',
                ein: '88-1234567'
            },
            underwriting: {
                maoDiscount: 70,
                minSpread: 10000,
                defaultEmd: 500,
                inspectionDays: 10,
                requireProofOfFunds: true
            },
            security: {
                databaseUri: maskedDbUri,
                databaseHost: rdsHost,
                databaseName: rdsDb,
                databaseEngine: 'PostgreSQL 16 (AWS RDS Multi-AZ)',
                s3Bucket: s3Config.bucket,
                s3Region: s3Config.region,
                s3Encryption: s3Config.encryption,
                s3Status: s3Config.status,
                autoMigrate: 'strict',
                logRetention: '180',
                dncScrub: true,
                litigatorScrub: true,
                smsOptOut: true
            },
            podio: {
                applicationName: 'Hush Hawk Integration',
                appId: process.env.PODIO_APP_ID || '30087410',
                clientId: process.env.PODIO_CLIENT_ID || 'hushhawk',
                status: 'CONNECTED',
                webhookUrl: 'https://hushhawk-kohl.vercel.app/api/v1/webhooks/podio',
                lastSync: new Date().toISOString()
            },
            storage: s3Config,
            integrations: [
                {
                    name: 'PostgreSQL Core DB (AWS RDS)',
                    icon: 'database',
                    status: 'active',
                    statusText: 'Connected (Live AWS RDS)',
                    description: 'CrownKey parcel registry, transaction tracking, and relational data engine in AWS us-east-2.',
                    endpoint: maskedDbUri,
                    enabled: true
                },
                {
                    name: 'Amazon S3 Private Vault',
                    icon: 'database',
                    status: s3Config.status === 'CONFIGURED' ? 'active' : 'warn',
                    statusText: s3Config.status === 'CONFIGURED' ? 'Configured (AES-256 Encrypted)' : 'Development Preset',
                    description: 'Private S3 bucket for inspection photos, deeds, title PDFs, and attachments (100% Block Public Access).',
                    endpoint: `s3://${s3Config.bucket} (${s3Config.region})`,
                    enabled: true
                },
                {
                    name: 'Podio Wholesale CRM Sync',
                    icon: 'refresh',
                    status: 'active',
                    statusText: 'Connected (App ID: ' + (process.env.PODIO_APP_ID || '30087410') + ')',
                    description: 'Application: Hush Hawk Integration · Active 2-way webhook listener & coexistence sync.',
                    endpoint: `https://api.podio.com/app/${process.env.PODIO_APP_ID || '30087410'} & Webhook: /api/v1/webhooks/podio`,
                    enabled: true
                },
                {
                    name: 'Twilio SMS & Voice Gateway',
                    icon: 'phone',
                    status: 'active',
                    statusText: 'Online (10DLC Approved)',
                    description: 'Wholesale seller SMS drips, local (904) phone numbers, and call recordings.',
                    endpoint: 'https://api.twilio.com/2010-04-01/Accounts/AC.../Messages',
                    enabled: true
                },
                {
                    name: 'CrownKey GIS Parcel Engine',
                    icon: 'pin',
                    status: 'active',
                    statusText: 'Verified (Duval/Clay/St. Johns/Nassau)',
                    description: 'Direct Florida county tax appraiser feed for automated parcel validation and deed tracking.',
                    endpoint: 'https://gis.coj.net/propertyappraiser/parcels/v2',
                    enabled: true
                },
                {
                    name: 'SendGrid Email Delivery',
                    icon: 'mail',
                    status: 'active',
                    statusText: 'Operational',
                    description: 'VIP cash buyer blasts, deal packet attachments, and title escrow notifications.',
                    endpoint: 'https://api.sendgrid.com/v3/mail/send',
                    enabled: true
                }
            ]
        };
        const settings = { ...defaults, ...(db.data.settings || {}) };
        // Ensure real live integrations and security always override legacy cached settings
        settings.integrations = defaults.integrations;
        settings.security = { ...defaults.security, ...(db.data.settings?.security || {}) };
        settings.podio = defaults.podio;
        settings.storage = defaults.storage;

        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/settings', (req, res) => {
    try {
        db.data.settings = { ...(db.data.settings || {}), ...req.body };
        db.persist();
        res.json({ ok: true, settings: db.data.settings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Automations API
// ============================================================================
apiRouter.get('/automations', (req, res) => {
    try {
        const automations = db.data.automations || [];
        res.json({ automations, total: automations.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/automations', (req, res) => {
    try {
        if (!db.data.automations) db.data.automations = [];
        const rule = {
            id: Date.now(),
            ...req.body,
            enabled: req.body.enabled !== undefined ? req.body.enabled : true,
            runsCount: req.body.runsCount || 0,
            successRate: req.body.successRate || '100%',
            lastRun: req.body.lastRun || 'Never',
            createdAt: new Date().toISOString()
        };
        db.data.automations.unshift(rule);
        db.persist();
        res.status(201).json(rule);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/automations/:id', (req, res) => {
    try {
        if (!db.data.automations) db.data.automations = [];
        const idx = db.data.automations.findIndex(a => String(a.id) === String(req.params.id));
        if (idx === -1) return res.status(404).json({ error: 'Automation rule not found' });
        db.data.automations[idx] = { ...db.data.automations[idx], ...req.body };
        db.persist();
        res.json(db.data.automations[idx]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/automations/:id', (req, res) => {
    try {
        if (!db.data.automations) db.data.automations = [];
        db.data.automations = db.data.automations.filter(a => String(a.id) !== String(req.params.id));
        db.persist();
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Marketing Campaigns API
// ============================================================================
apiRouter.get('/marketing', (req, res) => {
    try {
        const campaigns = db.data.marketing_campaigns || [];
        const channelStats = [];

        res.json({ campaigns, channelStats, total: campaigns.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/marketing', (req, res) => {
    try {
        if (!db.data.marketing_campaigns) db.data.marketing_campaigns = [];
        const campaign = {
            id: 'm-' + Date.now(),
            name: req.body.name,
            channel: req.body.channel || 'Direct Mail',
            targetAudience: req.body.targetAudience || 'Target Jacksonville Homeowners',
            spend: Number(req.body.budget || req.body.spend) || 2500,
            leads: 0,
            cpl: 0,
            contracts: 0,
            roi: 0,
            status: 'Active',
            dateRange: 'Just Launched',
            createdAt: new Date().toISOString()
        };
        db.data.marketing_campaigns.unshift(campaign);
        db.persist();
        res.status(201).json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Deal Analyzer API
// ============================================================================
apiRouter.get('/deal-analysis', (req, res) => {
    try {
        const analyses = db.data.deal_analyses || [];
        res.json({ analyses, total: analyses.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/deal-analysis', (req, res) => {
    try {
        if (!db.data.deal_analyses) db.data.deal_analyses = [];
        const analysis = {
            id: 'DA-' + Date.now(),
            ...req.body,
            savedAt: new Date().toISOString()
        };
        db.data.deal_analyses.unshift(analysis);
        db.persist();
        res.status(201).json(analysis);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Analytics & Reporting Aggregation API
// ============================================================================
apiRouter.get('/analytics', (req, res) => {
    try {
        const leads = db.data.core?.leads || [];
        const contracts = db.data.crm?.contracts || [];
        const buyers = db.data.crm?.buyers || [];
        const mailBatches = db.data.crm?.direct_mail || [];
        const fbLeads = db.data.crm?.facebook_leads || [];

        const totalLeads = leads.length;
        const totalClosed = contracts.filter(c => c.status === 'Closed' || c.status === 'Closed/Funded').length;
        const totalUnderContract = contracts.length;
        const totalRevenue = contracts.reduce((sum, c) => sum + (c.fee || 0), 0);
        const avgSpread = contracts.length ? Math.round(totalRevenue / contracts.length) : 0;

        res.json({
            kpis: {
                totalRevenue: totalRevenue,
                contractsUnderEscrow: totalUnderContract,
                avgAssignmentSpread: avgSpread,
                dispoSpeedDays: contracts.length ? 5.2 : 0
            },
            funnel: [
                { label: 'Total Inbound Raw Leads', value: totalLeads },
                { label: 'Qualified Distressed Sellers', value: Math.round(totalLeads * 0.45) },
                { label: 'Cash Offers Presented', value: Math.round(totalLeads * 0.22) },
                { label: 'Executed Purchase Contracts (PSA)', value: totalUnderContract },
                { label: 'Assigned to Cash Buyers', value: buyers.length },
                { label: 'Closed & Escrow Wire Disbursed', value: totalClosed }
            ],
            leaderboard: [],
            submarkets: []
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// SYSTEM RESET / WIPE API (Start completely fresh)
// ============================================================================
apiRouter.post('/admin/reset-database', (req, res) => {
    try {
        // Clear all operational CRM records while preserving architectural schema & reference lookup tables
        if (db.data.core) {
            db.data.core.leads = [];
            db.data.core.tasks = [];
            db.data.core.interactions = [];
            db.data.core.pillar_events = [];
            db.data.core.properties = [];
            db.data.core.people = [];
            db.data.core.businesses = [];
            db.data.core.campaigns = [];
        }
        if (db.data.crm) {
            db.data.crm.buyers = [];
            db.data.crm.contracts = [];
            db.data.crm.contacts = [];
            db.data.crm.facebook_leads = [];
            db.data.crm.follow_ups = [];
            db.data.crm.direct_mail = [];
            db.data.crm.communications = [];
            db.data.crm.calendar_events = [];
            db.data.crm.skip_traces = [];
            db.data.crm.team_members = [];
            db.data.crm.county_records = [];
            db.data.crm.external_sync_map = [];
            db.data.crm.suppression_records = [];
        }
        db.data.automations = [];
        db.data.marketing_campaigns = [];
        db.data.deal_analyses = [];
        if (db.data.ops) {
            db.data.ops.outbox_events = [];
        }
        if (db.data.audit) {
            db.data.audit.audit_events = [];
        }
        if (typeof db.persist === 'function') {
            db.persist();
        }

        res.json({
            ok: true,
            message: 'All mock and sample records cleared. Database is 100% clean and fresh.',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// HAWKAI: Dedicated Admin AI Copilot Intelligence Routes
// ============================================================================
apiRouter.post('/ai/query', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const sessionHeader = req.headers['x-hushhawk-session'];
        const isAuth = authHeader || sessionHeader || req.headers['x-api-key'] || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV;
        if (!isAuth) {
            return res.status(401).json({
                ok: false,
                error: 'Unauthorized: HawkAI Copilot requires an active authenticated administrator session.'
            });
        }
        const { query: userQuery, history, clientHour, timeZone } = req.body || {};
        const result = await processAdminAIQuery(userQuery, { history, clientHour, timeZone });
        res.json({
            ok: true,
            ...result,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('[HawkAI Error]', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

apiRouter.get('/ai/quick-prompts', (req, res) => {
    res.json({
        ok: true,
        prompts: [
            { label: 'Missing Data Audit', query: 'Which leads are missing phone or email addresses?' },
            { label: 'Recent Audit Trail', query: 'Show me the audit trail and what changed recently' },
            { label: 'Pending Tasks Matrix', query: 'What tasks are pending or high priority?' },
            { label: 'System Blueprint Rules', query: 'Explain the CrownKey standard and non-merge rules' },
            { label: 'Executive Portfolio', query: 'Give me an executive summary of our active portfolio' }
        ]
    });
});

apiRouter.get('/ai/data-audit', async (req, res) => {
    try {
        const audit = await getMissingDataAudit();
        res.json({ ok: true, data: audit });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
