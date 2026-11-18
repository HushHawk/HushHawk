import { Router, urlencoded } from 'express';
import crypto from 'crypto';
import { db } from '../store/database.js';
import { pool, checkDatabaseHealth, withTransaction, audit, emitOutbox } from '../store/pgClient.js';
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
import { DirectMailTrackerService } from '../services/directMailTrackerService.js';
import { SmrtPhoneService } from '../services/smrtPhoneService.js';
import { DealFunnelService } from '../services/dealFunnelService.js';
import { LeadDeskService } from '../services/leadDeskService.js';
import { OutreachActionsService } from '../services/outreachActionsService.js';
import { PodioSyncService } from '../services/podioSyncService.js';
import { DeliveryService } from '../services/deliveryService.js';
import { MetaService, META_PLATFORMS } from '../services/metaService.js';
import { LeadClassifierService } from '../services/leadClassifierService.js';
import { ParcelLookupService } from '../services/parcelLookupService.js';
import { BackupService } from '../services/backupService.js';
import { HealthService } from '../services/healthService.js';
import { CarrierDispatchService } from '../services/carrierDispatchService.js';
import { renderCrownKey, validateCrownKeyFormat, normalizeParcelMatch } from '../../../packages/crownkey/index.js';
import { RbacService, ALL_SECTIONS } from '../services/rbacService.js';
import { BatchLeadsService } from '../services/batchLeadsService.js';
import { AutomationService } from '../services/automationService.js';
import { requireSession, loginRateLimit, accountLocked, recordLoginFailure, clearLoginFailures, webhookUrl as signedWebhookUrl, publicWebhookUrl, actorName } from '../middleware/auth.js';

export const apiRouter = Router();

// Middleware: correlation ID
apiRouter.use((req, res, next) => {
    res.setHeader('X-HushHawk-Version', 'v1.0.0');
    res.setHeader('X-Canonical-Truth', 'PostgreSQL-AWS-RDS');
    next();
});

// Every route below requires a valid session unless it is public (health, login, mailer QR pages)
// or a webhook carrying the shared secret. See middleware/auth.js.
apiRouter.use(requireSession);

// ============================================================================
// 1. Health & System Overview
// ============================================================================
apiRouter.get('/health', async (req, res) => {
    const pgHealth = await checkDatabaseHealth();
    const checks = pgHealth.status === 'ONLINE' ? await HealthService.checks().catch(() => ({ degraded: false })) : { degraded: true };
    res.status(pgHealth.status === 'ONLINE' ? 200 : 503).json({
        status: pgHealth.status === 'ONLINE' ? 'ONLINE' : 'DEGRADED',
        platform: 'HushHawk A-to-Z Property Intelligence Platform',
        version: '1.0.0',
        canonical_db: `AWS-RDS-PostgreSQL (${pgHealth.status})`,
        db_details: { status: pgHealth.status },
        degraded: Boolean(checks.degraded),
        checks,
        time: new Date().toISOString(),
    });
});

// ============================================================================
// 2. Universal Search (Omnisearch): Postgres only
// ============================================================================
const likeTerm = q => `%${q.replace(/[\\%_]/g, m => `\\${m}`)}%`;

apiRouter.get('/search', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) return res.json({ query: q, total: 0, results: [] });
        const term = likeTerm(q);
        const [props, people, businesses, events] = await Promise.all([
            pool.query(
                `SELECT DISTINCT p.*, c.county_code FROM core.properties p JOIN ref.counties c USING (county_id)
                 LEFT JOIN core.property_aliases a ON a.property_id = p.property_id
                 WHERE (c.county_code || '-' || p.parcel_raw) ILIKE $1 OR p.parcel_raw ILIKE $1 OR p.parcel_match ILIKE $1
                    OR p.address_line1 ILIKE $1 OR a.alias_parcel ILIKE $1 LIMIT 25`, [term]),
            pool.query(`SELECT person_id, full_name, primary_phone, primary_email, is_suppressed FROM core.people
                        WHERE full_name ILIKE $1 OR primary_phone ILIKE $1 OR primary_email ILIKE $1 LIMIT 25`, [term]),
            pool.query(`SELECT * FROM core.businesses WHERE legal_name ILIKE $1 OR registration_id ILIKE $1 LIMIT 25`, [term]),
            pool.query(
                `SELECT e.*, p.parcel_raw, c.county_code FROM core.pillar_events e JOIN core.properties p USING (property_id) JOIN ref.counties c ON c.county_id = p.county_id
                 WHERE e.case_reference ILIKE $1 OR e.external_event_id ILIKE $1
                    OR (c.county_code || '-' || p.parcel_raw || '-' || e.pillar_code || '-' || lpad(e.event_number::text, 3, '0')) ILIKE $1 LIMIT 25`, [term])
        ]);
        const enriched = await CrownKeyService.enrichProperties(props.rows);
        const results = [
            ...enriched.map(p => ({ type: 'PROPERTY', id: p.property_id, title: p.crownKeyBase, subtitle: [p.address_line1, p.city, p.postal_code].filter(Boolean).join(', '), data: p })),
            ...people.rows.map(x => ({ type: 'PERSON', id: x.person_id, title: x.full_name, subtitle: `${x.primary_phone || 'No phone'} · ${x.primary_email || 'No email'}`, badge: x.is_suppressed ? 'SUPPRESSED' : null, data: x })),
            ...businesses.rows.map(x => ({ type: 'BUSINESS', id: x.business_id, title: x.legal_name, subtitle: [x.registration_id && `Reg: ${x.registration_id}`, x.jurisdiction].filter(Boolean).join(' · '), data: x })),
            ...events.rows.map(x => ({ type: 'EVENT', id: x.event_id, title: `${x.pillar_code} · ${x.case_reference || x.external_event_id || 'event'}`, subtitle: `${x.event_status} · ${x.verification_status} · Parcel ${x.parcel_raw}`, data: x }))
        ];
        res.json({ query: q, total: results.length, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 3. CrownKey Reference API
// ============================================================================
apiRouter.post('/crownkey/render', (req, res) => {
    const { countyCode, parcelRaw, pillarCode, eventNumber, firstSourceCode } = req.body;
    res.json({ crownKey: renderCrownKey({ countyCode, parcelRaw, pillarCode, eventNumber, firstSourceCode }) });
});

// ============================================================================
// 4. Properties (Property 360): Postgres only
// ============================================================================
apiRouter.get('/properties', async (req, res) => {
    try {
        const { county, pillar, q } = req.query;
        const limit = Math.min(Number(req.query.limit) || 500, 2000);
        const offset = Number(req.query.offset) || 0;
        const params = [county || null, pillar || null, q ? likeTerm(String(q)) : null];
        const where = `WHERE ($1::text IS NULL OR c.county_code = $1)
                         AND ($2::text IS NULL OR EXISTS (SELECT 1 FROM core.pillar_events e WHERE e.property_id = p.property_id AND e.pillar_code = $2))
                         AND ($3::text IS NULL OR p.parcel_raw ILIKE $3 OR p.address_line1 ILIKE $3 OR (c.county_code || '-' || p.parcel_raw) ILIKE $3)`;
        const [{ rows: [{ total }] }, { rows }] = await Promise.all([
            pool.query(`SELECT count(*)::int AS total FROM core.properties p JOIN ref.counties c USING (county_id) ${where}`, params),
            pool.query(`SELECT p.*, c.county_code, c.county_name FROM core.properties p JOIN ref.counties c USING (county_id) ${where}
                        ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params)
        ]);
        res.json({ total, properties: await CrownKeyService.enrichProperties(rows) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/properties/:id', async (req, res) => {
    try {
        const [prop] = await CrownKeyService.loadProperties('WHERE p.property_id = $1', [req.params.id]);
        if (!prop) return res.status(404).json({ error: 'Property not found' });
        const [property, aliases, lineage, tasks] = await Promise.all([
            CrownKeyService.enrichProperty(prop),
            pool.query('SELECT * FROM core.property_aliases WHERE property_id = $1 ORDER BY created_at DESC', [prop.property_id]),
            pool.query('SELECT * FROM core.property_lineage WHERE predecessor_id = $1 OR successor_id = $1', [prop.property_id]),
            pool.query(`SELECT * FROM core.tasks WHERE linked_entity_type = 'PROPERTY' AND linked_entity_id = $1 ORDER BY created_at DESC`, [prop.property_id])
        ]);
        const evidence = await Promise.all(property.events.map(e => EventService.evidence(e.event_id).then(rows => rows.map(r => ({ ...r, event_id: e.event_id })))));
        res.json({ property, aliases: aliases.rows, lineage: lineage.rows, source_records: evidence.flat(), tasks: tasks.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// County and permanent identity never change here. A corrected parcel keeps the old value as a searchable alias.
apiRouter.put('/properties/:id', async (req, res) => {
    const { id } = req.params;
    const { address_line1, city, state_code, postal_code, parcel_raw, assessed_value, property_type, legal_description, correction_reason } = req.body;
    try {
        const updated = await withTransaction(async client => {
            const { rows: [before] } = await client.query('SELECT * FROM core.properties WHERE property_id = $1 FOR UPDATE', [id]);
            if (!before) return null;
            let parcelRaw = null; let parcelMatch = null;
            if (parcel_raw && parcel_raw !== before.parcel_raw) {
                if (!correction_reason || !String(correction_reason).trim()) throw Object.assign(new Error('correction_reason is required when the parcel changes.'), { status: 400 });
                parcelRaw = String(parcel_raw).trim();
                parcelMatch = normalizeParcelMatch(parcelRaw);
                await client.query(
                    `INSERT INTO core.property_aliases (property_id, alias_parcel, alias_type, source, valid_to, correction_reason)
                     VALUES ($1,$2,'PREVIOUS_PARCEL',$3, now(), $4)`, [id, before.parcel_raw, actorName(req), String(correction_reason).trim()]);
            }
            const { rows: [row] } = await client.query(
                `UPDATE core.properties SET address_line1 = COALESCE($1, address_line1), city = COALESCE($2, city), state_code = COALESCE($3, state_code),
                   postal_code = COALESCE($4, postal_code), property_type = COALESCE($5, property_type), legal_description = COALESCE($6, legal_description),
                   assessed_value = COALESCE($7, assessed_value), parcel_raw = COALESCE($8, parcel_raw), parcel_match = COALESCE($9, parcel_match), updated_at = now()
                 WHERE property_id = $10 RETURNING *`,
                [address_line1 || null, city || null, state_code || null, postal_code || null, property_type || null, legal_description || null,
                 assessed_value === undefined || assessed_value === null || assessed_value === '' ? null : Number(assessed_value), parcelRaw, parcelMatch, id]);
            await audit(client, { actor: actorName(req), action: 'PROPERTY_UPDATED', entityType: 'PROPERTY', entityId: id, diff: { before: { parcel_raw: before.parcel_raw, address_line1: before.address_line1 }, after: { parcel_raw: row.parcel_raw, address_line1: row.address_line1 }, correction_reason } });
            await emitOutbox(client, { aggregateType: 'PROPERTY', aggregateId: id, eventType: 'PROPERTY_UPDATED', payload: {} });
            return row;
        });
        if (!updated) return res.status(404).json({ error: 'Property not found' });
        const [prop] = await CrownKeyService.loadProperties('WHERE p.property_id = $1', [id]);
        res.json(await CrownKeyService.enrichProperty(prop));
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ error: 'Another property in this county already has that parcel.' });
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ============================================================================
// 4b. Property Photos (Secure S3 Upload & Metadata)
// ============================================================================
// Comparable sales and an ARV estimate from real nearby sales on the county roll. Nothing is estimated unless at least three comparables exist.
apiRouter.get('/properties/:propertyId/comps', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { rows: [p] } = await pool.query(
            `SELECT p.property_id, p.parcel_raw, p.address_line1, p.city, p.postal_code, p.assessed_value, p.metadata, c.county_code
             FROM core.properties p JOIN ref.counties c USING (county_id) WHERE p.property_id = $1`, [propertyId]);
        if (!p) return res.status(404).json({ error: 'Property not found.' });
        const key = `comps:${propertyId}`;
        if (!req.query.refresh) {
            const { rows: [hit] } = await pool.query("SELECT value FROM ops.kv_store WHERE key = $1 AND updated_at > now() - interval '7 days'", [key]);
            if (hit) return res.json({ ...hit.value, cached: true });
        }
        let sqft = Number(p.metadata?.living_area_sqft) || 0; let useCode = p.metadata?.land_use_code || null; let yearBuilt = p.metadata?.year_built || null;
        if (!sqft || !useCode) {
            const roll = await ParcelLookupService.fetchRollRecord(p.county_code, p.parcel_raw);
            if (roll) { sqft = roll.TOT_LVG_AR || 0; useCode = roll.DOR_UC || null; yearBuilt = roll.ACT_YR_BLT || null; }
        }
        const subject = { address: [p.address_line1, p.city, p.postal_code].filter(Boolean).join(', '), parcelId: p.parcel_raw, sqft, useCode, yearBuilt, assessedValue: Number(p.assessed_value) || null };
        const where = await ParcelLookupService.geocode([p.address_line1, p.city, 'FL', p.postal_code].filter(Boolean).join(', '));
        if (!where) return res.json({ subject, comps: [], estimate: null, reason: 'The address could not be located on the map.', source: 'County property appraiser roll' });
        const result = await ParcelLookupService.fetchComps({ lat: where.lat, lon: where.lon, countyCode: p.county_code, useCode, sqft, parcelId: p.parcel_raw });
        const out = { subject, ...result, source: 'Qualified sales on the county property appraiser roll (Florida Department of Revenue statewide layer)', generatedAt: new Date().toISOString() };
        await pool.query(`INSERT INTO ops.kv_store (key, value, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [key, JSON.stringify(out)]);
        res.json(out);
    } catch (err) {
        res.status(502).json({ error: `Comparable sales are unavailable right now: ${err.message}` });
    }
});

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

    const hasPhotoContent = typeof data_url === 'string' && /^data:[^,]+;base64,/.test(data_url);
    if (data_url && !hasPhotoContent) return res.status(400).json({ error: 'Invalid photo content.' });
    if (!hasPhotoContent && !object_key) return res.status(400).json({ error: 'Photo content or an uploaded object key is required.' });

    const safeKey = (hasPhotoContent ? null : object_key) || StorageService.buildObjectKey({
        entityType: 'properties',
        entityId: propertyId,
        category: 'photos',
        filename
    });

    if (hasPhotoContent) {
        const buffer = Buffer.from(data_url.slice(data_url.indexOf(',') + 1), 'base64');
        if (!buffer.length) return res.status(400).json({ error: 'The photo file is empty.' });
        try {
            await StorageService.uploadBuffer({
                objectKey: safeKey,
                buffer,
                contentType: mime_type || 'image/jpeg',
                requireStorage: true
            });
        } catch (error) {
            console.error('[Property photo storage unavailable]', error.name);
            return res.status(503).json({ error: 'Photo storage is unavailable. Try again later.' });
        }
    }

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

// S3 Presigned Download/View URL for Property Documents (supports ?disposition=inline or ?disposition=attachment)
apiRouter.get(['/properties/:propertyId/documents/:docId/download-url', '/properties/:propertyId/documents/:docId/preview-url'], async (req, res) => {
    const { propertyId, docId } = req.params;
    const disposition = req.query.disposition || (req.path.includes('preview-url') ? 'inline' : 'inline');
    try {
        const { rows } = await pool.query(
            `SELECT id, property_id, title, category, filename, object_key, storage_provider, data_url, mime_type, file_size_bytes FROM core.property_documents WHERE id = $1 AND property_id = $2`,
            [docId, propertyId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Document not found' });

        const doc = rows[0];
        const objectKey = doc.object_key || `properties/${propertyId}/documents/${doc.filename || 'document.pdf'}`;
        const presigned = await StorageService.getPresignedDownloadUrl({
            objectKey,
            filename: doc.filename,
            disposition,
            contentType: doc.mime_type || (doc.filename && doc.filename.endsWith('.pdf') ? 'application/pdf' : undefined)
        });
        res.json({
            ...presigned,
            doc_id: doc.id,
            title: doc.title,
            filename: doc.filename,
            category: doc.category,
            file_size_bytes: doc.file_size_bytes,
            data_url: doc.data_url,
            mime_type: doc.mime_type
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

// 6. Get Vault Presigned Download/Preview URL
apiRouter.get(['/vault/files/:id/download-url', '/vault/files/:id/preview-url'], async (req, res) => {
    const { id } = req.params;
    const disposition = req.query.disposition || 'inline';
    try {
        const { rows } = await pool.query('SELECT * FROM core.vault_files WHERE id = $1', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Vault file not found' });
        const file = rows[0];

        const presigned = await StorageService.getPresignedDownloadUrl({
            objectKey: file.object_key,
            filename: file.original_filename || file.filename,
            disposition,
            contentType: file.mime_type,
            expiresInSeconds: 3600
        });

        res.json({
            ...presigned,
            file_id: file.id,
            filename: file.original_filename || file.filename,
            original_filename: file.original_filename,
            category: file.category,
            file_size_bytes: file.file_size_bytes,
            mime_type: file.mime_type,
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
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/properties/:propertyId/tasks', async (req, res) => {
    const { propertyId } = req.params;
    const { title, priority = 'Medium', due_date, due_time, category = 'General' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    try {
        const { rows: [task] } = await pool.query(
            `INSERT INTO core.tasks (title, priority, due_date, due_time, category, status, is_completed, linked_entity_id, linked_entity_type, owner_id)
             VALUES ($1, $2, $3, $4, $5, 'PENDING', false, $6, 'PROPERTY', $7) RETURNING *`,
            [title, priority, due_date ? new Date(due_date) : null, due_time || null, category, propertyId, actorName(req)]);
        await audit(pool, { actor: actorName(req), action: 'TASK_CREATED', entityType: 'TASK', entityId: task.task_id, diff: { title, propertyId } });
        res.status(201).json(task);
    } catch (err) {
        res.status(err.code === '23503' || err.code === '22P02' ? 400 : 500).json({ error: err.message });
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
        const { parcel_raw, county_code, address_line1, city, state_code, postal_code, assessed_value, property_type, legal_description } = req.body || {};
        if (!county_code || !parcel_raw || !String(parcel_raw).trim()) {
            return res.status(400).json({ error: 'county_code and parcel_raw are required. Save the lead first if the parcel is not known yet.' });
        }
        const parcelRaw = String(parcel_raw).trim(); // stays text: leading zeros and punctuation preserved
        const parcelMatch = normalizeParcelMatch(parcelRaw);
        const result = await withTransaction(async client => {
            const { rows: [county] } = await client.query('SELECT county_id FROM ref.counties WHERE county_code = $1', [String(county_code).toUpperCase()]);
            if (!county) throw Object.assign(new Error(`County '${county_code}' is not in the county registry.`), { status: 400 });
            const { rows: [existing] } = await client.query('SELECT property_id FROM core.properties WHERE county_id = $1 AND parcel_match = $2', [county.county_id, parcelMatch]);
            if (existing) return { id: existing.property_id, created: false };
            const { rows: [row] } = await client.query(
                `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, legal_description, assessed_value)
                 VALUES ($1,$2,$3,$4,$5,coalesce($6,'FL'),$7,$8,$9,$10) RETURNING property_id`,
                [county.county_id, parcelRaw, parcelMatch, address_line1 || null, city || null, state_code || null, postal_code || null,
                 property_type || null, legal_description || null, assessed_value === undefined || assessed_value === '' ? null : Number(assessed_value)]);
            await emitOutbox(client, { aggregateType: 'PROPERTY', aggregateId: row.property_id, eventType: 'PROPERTY_CREATED', payload: {} });
            await audit(client, { actor: actorName(req), action: 'PROPERTY_CREATED', entityType: 'PROPERTY', entityId: row.property_id, diff: { parcel_raw: parcelRaw, county_code } });
            return { id: row.property_id, created: true };
        });
        const [prop] = await CrownKeyService.loadProperties('WHERE p.property_id = $1', [result.id]);
        res.status(result.created ? 201 : 200).json({ ...(await CrownKeyService.enrichProperty(prop)), already_existed: !result.created });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ============================================================================
// 5. People & Businesses (Person 360)
// ============================================================================
apiRouter.get('/people', async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 500, 2000);
        const q = req.query.q ? likeTerm(String(req.query.q)) : null;
        const { rows } = await pool.query(
            `SELECT pe.*, coalesce((SELECT jsonb_agg(jsonb_build_object('property_id', pr.property_id, 'parcel_raw', pr.parcel_raw, 'address_line1', pr.address_line1))
                                     FROM rel.entity_relationships r JOIN core.properties pr ON pr.property_id = r.to_entity_id
                                     WHERE r.from_entity_id = pe.person_id AND r.relationship_type = 'OWNS' AND r.verification_status = 'CONFIRMED'), '[]'::jsonb) AS owned_properties
             FROM core.people pe WHERE ($1::text IS NULL OR full_name ILIKE $1 OR primary_phone ILIKE $1 OR primary_email ILIKE $1)
             ORDER BY created_at DESC LIMIT ${limit}`, [q]);
        res.json({ total: rows.length, people: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/people/:id', async (req, res) => {
    try {
        const { rows: [person] } = await pool.query('SELECT * FROM core.people WHERE person_id = $1', [req.params.id]);
        if (!person) return res.status(404).json({ error: 'Person not found' });
        const [{ rows: owned }, { rows: interactions }, { rows: roles }] = await Promise.all([
            pool.query(`SELECT p.*, c.county_code FROM rel.entity_relationships r JOIN core.properties p ON p.property_id = r.to_entity_id JOIN ref.counties c ON c.county_id = p.county_id
                        WHERE r.from_entity_id = $1 AND r.relationship_type = 'OWNS' AND r.verification_status = 'CONFIRMED'`, [person.person_id]),
            pool.query('SELECT * FROM core.interactions WHERE person_id = $1 ORDER BY occurred_at DESC LIMIT 200', [person.person_id]),
            pool.query('SELECT role_code FROM core.contact_roles WHERE person_id = $1', [person.person_id])
        ]);
        res.json({ person, roles: roles.map(r => r.role_code), properties: await CrownKeyService.enrichProperties(owned), interactions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/businesses', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM core.businesses ORDER BY created_at DESC LIMIT 2000');
        res.json({ total: rows.length, businesses: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/people', async (req, res) => {
    try {
        const { first_name, last_name, full_name, primary_phone, primary_email, mailing_address, roles = [] } = req.body || {};
        const name = (full_name || `${first_name || ''} ${last_name || ''}`).trim();
        if (!name) return res.status(400).json({ error: 'A name is required.' });
        const person = await withTransaction(async client => {
            const { rows: [row] } = await client.query(
                `INSERT INTO core.people (full_name, first_name, last_name, primary_phone, primary_email, mailing_address) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
                [name, first_name || null, last_name || null, primary_phone || null, primary_email ? String(primary_email).trim().toLowerCase() : null, mailing_address || null]);
            for (const role of roles) await client.query('INSERT INTO core.contact_roles (person_id, role_code) VALUES ($1,$2) ON CONFLICT DO NOTHING', [row.person_id, role]);
            await audit(client, { actor: actorName(req), action: 'PERSON_CREATED', entityType: 'PERSON', entityId: row.person_id, diff: { roles } });
            return row;
        });
        res.status(201).json({ person });
    } catch (err) {
        res.status(err.code === '23503' ? 400 : 500).json({ error: err.code === '23503' ? 'Unknown role code.' : err.message });
    }
});

apiRouter.post('/businesses', async (req, res) => {
    try {
        const { legal_name, entity_type, jurisdiction, registration_id, registered_agent, status } = req.body || {};
        if (!legal_name || !jurisdiction) return res.status(400).json({ error: 'legal_name and jurisdiction are required.' });
        const business = await withTransaction(async client => {
            const { rows: [row] } = await client.query(
                `INSERT INTO core.businesses (legal_name, entity_type, jurisdiction, registration_id, status, registered_agent)
                 VALUES ($1, coalesce($2,'LLC'), $3, $4, coalesce($5,'ACTIVE'), $6) RETURNING *`,
                [legal_name, entity_type || null, jurisdiction, registration_id || null, status || null, registered_agent || null]);
            await audit(client, { actor: actorName(req), action: 'BUSINESS_CREATED', entityType: 'BUSINESS', entityId: row.business_id, diff: { legal_name } });
            return row;
        });
        res.status(201).json({ business });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 6. Pillar Events (atomic numbering, evidence, verification)
// ============================================================================
apiRouter.get('/events', async (req, res) => {
    try {
        const events = await EventService.list({ propertyId: req.query.propertyId || null, pillarCode: req.query.pillar || null, limit: req.query.limit, offset: req.query.offset });
        res.json({ total: events.length, events });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/events', async (req, res) => {
    try {
        const b = req.body || {};
        const result = await EventService.recordPillarEvent({
            propertyId: b.propertyId || b.property_id, pillarCode: b.pillarCode || b.pillar_code,
            caseReference: b.caseReference || b.case_reference, externalEventId: b.externalEventId || b.external_event_id,
            eventStatus: b.eventStatus || b.event_status || 'OPEN', verificationStatus: b.verificationStatus || b.verification_status || 'NEEDS_REVIEW',
            eventDate: b.eventDate || b.event_date || null, filingAmount: b.filingAmount ?? b.filing_amount ?? null,
            sourceRecordId: b.sourceRecordId || b.source_record_id || null, evidenceNotes: b.evidenceNotes || b.notes || null, actor: actorName(req)
        });
        res.status(result.isNew ? 201 : 200).json(result);
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

apiRouter.patch('/events/:id/status', async (req, res) => {
    try {
        const { eventStatus, verificationStatus, reason } = req.body || {};
        res.json(await EventService.updateStatus({ eventId: req.params.id, eventStatus, verificationStatus, reason, actor: actorName(req) }));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

apiRouter.get('/events/:id/evidence', async (req, res) => {
    try {
        res.json({ evidence: await EventService.evidence(req.params.id) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// 7. Leads & CRM Pipeline
// ============================================================================
apiRouter.get('/leads', async (req, res) => {
    try {
        res.json({ leads: await CrmService.getLeads({ limit: req.query.limit, offset: req.query.offset }) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const SELLER_STATUS = {
    NEW: 'New', CONTACTED: 'Contacted', QUALIFIED: 'Contacted', APPOINTMENT: 'Appointment', OFFER: 'Offer Made',
    CONTRACT: 'Under Contract', CLOSED: 'Closed', FOLLOW_UP: 'Follow Up', LOST: 'Lost'
};
const numberOrNull = v => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

apiRouter.get('/seller-leads', async (req, res) => {
    try {
        // Every lead is returned with its kind so the page can filter; non-sellers are marked, never silently dropped.
        const leads = await CrmService.getLeads({ limit: req.query.limit || 2000 });
        const rows = leads.map(l => {
            const meta = l.metadata || {};
            const prop = l.property;
            const sourceName = l.source_name || l.first_source_code || 'Unknown';
            // Underwriting figures are shown only when a person entered them; nothing is estimated here.
            return {
                id: l.lead_id,
                crownKey: l.crownKey,
                name: l.person?.full_name || '',
                address: prop?.address_line1 || meta.address || '',
                city: prop?.city || meta.city || '',
                zip: prop?.postal_code || meta.zip || '',
                phone: l.person?.primary_phone || '',
                email: l.person?.primary_email || '',
                source: sourceName,
                lead_source: l.first_source_code,
                leadSourceBadge: sourceName,
                status: SELLER_STATUS[l.status] || l.status,
                date: l.created_at ? new Date(l.created_at).toISOString().split('T')[0] : '',
                arv: numberOrNull(meta.arv),
                repairs: numberOrNull(meta.repairs),
                mao: numberOrNull(meta.mao),
                equity: numberOrNull(meta.equity),
                tags: [prop?.county_code, sourceName, l.lead_kind === 'NEEDS_REVIEW' ? 'Needs review' : null].filter(Boolean),
                leadKind: l.lead_kind,
                leadKindReason: l.lead_kind_reason || '',
                leadKindSetBy: l.lead_kind_set_by && l.lead_kind_set_by !== 'rule' ? l.lead_kind_set_by : null,
                type: prop?.property_type || '',
                photo: '',
                score: l.priority_score,
                assignee: l.assigned_user_id || '',
                notes: meta.notes || '',
                property_pending: !l.property_id
            };
        });
        res.json({ leads: rows, total: rows.length, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function resolveSourceCode(input) {
    const value = String(input || '').trim();
    if (!value) return null;
    const { rows: [row] } = await pool.query(
        `SELECT source_code FROM ref.lead_sources WHERE source_code = upper($1) OR lower(source_name) = lower($1) LIMIT 1`, [value]);
    return row?.source_code || null;
}

apiRouter.post('/leads', async (req, res) => {
    try {
        const b = req.body || {};
        const actor = actorName(req);
        if (b.name || b.address) {
            // Quick-add from the Seller Leads screen. The property stays pending until a parcel is verified.
            const sourceCode = await resolveSourceCode(b.sourceCode || b.source);
            if (!sourceCode) return res.status(400).json({ error: 'Choose a valid lead source.' });
            if (!b.name || !String(b.name).trim()) return res.status(400).json({ error: 'Seller name is required.' });
            const lead = await CrmService.createLead({
                sourceCode, sourceDetail: b.sourceDetail || null, contactMethod: b.contactMethod || null, platformCode: b.platformCode || null,
                medium: b.medium || null, campaignId: b.campaignId || null, actor,
                person: { name: b.name, phone: b.phone, email: b.email },
                metadata: { address: b.address || null, zip: b.zip || null, city: b.city || null, arv: b.arv ?? null, repairs: b.repairs ?? null, mao: b.mao ?? null, equity: b.equity ?? null }
            });
            let podio = { pushed: false };
            if (configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN')) {
                try {
                    await PodioSyncService.createLeadInPodio({ fullName: b.name, phone: b.phone, email: b.email, address: b.address, source: b.source || sourceCode, notes: 'Created in HushHawk' });
                    podio = { pushed: true };
                } catch (pErr) {
                    podio = { pushed: false, error: pErr.message };
                }
            }
            return res.status(201).json({ success: true, id: lead.lead_id, lead_id: lead.lead_id, crownKey: 'Property pending', status: 'New', source_code: sourceCode, podio });
        }
        const lead = await CrmService.createLead({
            ...b, sourceCode: b.sourceCode || b.first_source_code, contactMethod: b.contactMethod || b.contact_method,
            propertyId: b.propertyId || b.property_id || null, eventIds: b.eventIds || [], actor
        });
        res.status(201).json(lead);
    } catch (err) {
        res.status(err.status || (err.code === '23503' ? 400 : 500)).json({ error: err.message });
    }
});

// Bulk lead ingestion (CSV, TSV, or JSON array)
apiRouter.post('/leads/import', async (req, res) => {
    try {
        const { data, sourceCode, listName } = req.body || {};
        const result = await LeadImportService.processImport({ data, sourceCode, actor: actorName(req), defaultListName: listName || 'Skip-Trace Batch' });
        res.status(201).json(result);
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

// Administrator-only removal of a mistaken import
apiRouter.post('/leads/purge-test-batch', async (req, res) => {
    try {
        if (!req.user?.isAdmin) return res.status(403).json({ error: 'Administrator access is required.' });
        const { lead_ids, property_ids, person_ids } = req.body || {};
        res.json(await LeadImportService.purgeBatch({ leadIds: lead_ids || [], propertyIds: property_ids || [], personIds: person_ids || [], actor: actorName(req) }));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

apiRouter.patch('/leads/:id/kind', async (req, res) => {
    try {
        res.json(await LeadClassifierService.setKind({ leadId: req.params.id, kind: req.body?.kind, reason: req.body?.reason, actor: actorName(req) }));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

apiRouter.post('/leads/classify', async (req, res) => {
    try {
        res.json(await LeadClassifierService.classifyAll());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/leads/:id/stage', async (req, res) => {
    try {
        const { stage, reason } = req.body || {};
        res.json(await CrmService.updateLeadStage({ leadId: req.params.id, newStage: stage, reason, actor: actorName(req) }));
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

// Later responses are touchpoints on the same lead: first_source_code never changes.
apiRouter.post('/leads/:id/touchpoints', async (req, res) => {
    try {
        const b = req.body || {};
        res.status(201).json(await CrmService.addTouchpoint({ leadId: req.params.id, sourceCode: b.sourceCode || null, contactMethod: b.contactMethod, direction: b.direction,
            platformCode: b.platformCode, medium: b.medium, campaignId: b.campaignId, evidence: b.evidence, notes: b.notes, actor: actorName(req) }));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ============================================================================
// Podio CRM Coexistence & Inbound Webhook Receiver
// ============================================================================
apiRouter.post('/webhooks/podio', async (req, res) => {
    try {
        const body = req.body || {};
        const type = body.type || req.query.type;
        const hook_id = body.hook_id || req.query.hook_id;
        const code = body.code || req.query.code;
        const item_id = body.item_id || req.query.item_id;
        const app_id = body.app_id || req.query.app_id;

        // 1. Podio Handshake Verification (Auto-validate with Podio API)
        if (type === 'hook.verify') {
            console.log(`[Podio Webhook] Verification handshake received for hook: ${hook_id}, code: ${code}`);
            try {
                const auth = await PodioService.authenticateApp(PodioSyncService.LEADS_APP_ID, PodioSyncService.APP_TOKEN);
                await PodioService.validateWebhook(auth.access_token, hook_id, code);
                console.log(`[Podio Webhook] Hook ${hook_id} successfully validated and activated in Podio!`);
            } catch (vErr) {
                console.warn('[Podio Webhook Validation Warn]:', vErr.message);
            }
            return res.json({ status: 'VERIFIED', hook_id, code, message: 'Podio webhook endpoint verified and activated successfully' });
        }

        // 2. Podio Item Deletion Webhook
        if (type === 'item.delete') {
            const externalItemId = String(item_id || req.body.item_id || '');
            console.log(`[Podio Webhook] Processing item.delete for Item #${externalItemId}...`);
            if (externalItemId) {
                try {
                    // Check external sync map
                    const mapRes = await pool.query(
                        `SELECT internal_entity_type, internal_uuid FROM crm.external_sync_map WHERE external_system = 'PODIO' AND external_item_id = $1`,
                        [externalItemId]
                    );
                    if (mapRes.rows.length > 0) {
                        const { internal_entity_type, internal_uuid } = mapRes.rows[0];
                        if (internal_entity_type === 'LEAD') {
                            await pool.query(`UPDATE core.leads SET status = 'LOST', updated_at = NOW() WHERE lead_id = $1`, [internal_uuid]);
                        }
                        await pool.query(
                            `DELETE FROM crm.external_sync_map WHERE external_system = 'PODIO' AND external_item_id = $1`,
                            [externalItemId]
                        );
                    }
                    // Remove from buyers and contacts if present
                    await pool.query(`DELETE FROM crm.cash_buyers WHERE id = $1`, ['b-' + externalItemId]);
                    await pool.query(`DELETE FROM crm.seller_contacts WHERE id = $1`, ['c-' + externalItemId]);
                    await pool.query(`DELETE FROM crm.deal_funnel WHERE id = $1`, ['off-' + externalItemId]);
                } catch (delErr) {
                    console.warn(`[Podio Webhook Delete Warn]:`, delErr.message);
                }
            }
            return res.status(200).json({ ok: true, type: 'DELETE', item_id: externalItemId, status: 'PROCESSED' });
        }

        // 3. Item create/update: fetch the live item and apply the same rules as the scheduled sync.
        if (type === 'item.create' || type === 'item.update') {
            const externalItemId = String(item_id || req.body.item?.item_id || '');
            if (!externalItemId) return res.status(200).json({ ok: true, notice: 'No item_id in webhook payload' });

            const synced = await PodioSyncService.syncItem(app_id, externalItemId);
            if (synced.type === 'LEAD') {
                if (type === 'item.create' && synced.stored) {
                    const { rows: [map] } = await pool.query(
                        `SELECT internal_uuid FROM crm.external_sync_map WHERE external_system = 'PODIO' AND internal_entity_type = 'LEAD' AND external_item_id = $1`, [externalItemId]);
                    if (map) await AutomationService.onLeadSaved('podio_lead', { leadId: map.internal_uuid, eventId: externalItemId, target: null });
                }
                return res.status(synced.stored ? 200 : 502).json({ ok: synced.stored, type: 'LEAD', item_id: externalItemId });
            }
            if (synced.type === 'PROPERTY') return res.status(200).json({ ok: synced.result !== 'failed', type: 'PROPERTY', item_id: externalItemId, result: synced.result });

            const item = synced.item;
            const appIdStr = synced.appId;
            const field = label => item?.fields?.find(f => f.label.toLowerCase() === label.toLowerCase())?.values?.[0]?.value;
            const textOf = v => (v && typeof v === 'object' ? v.text : v) || '';
            const A = PodioSyncService.APPS;

            if (appIdStr === A.CASH_BUYERS.id) {
                const entityName = field('Entity Name') || item.title;
                if (!entityName) return res.status(200).json({ ok: true, notice: 'Cash buyer has no name yet' });
                const criteria = String(field('About Cash Buyer/Criteria') || '').replace(/<[^>]+>/g, ' ').trim();
                const propType = textOf(field('Type Of Property Buyer is Looking For?'));
                await pool.query(
                    `INSERT INTO crm.cash_buyers (id, full_name, company, phone, email, buy_box, status, created_at)
                     VALUES ($1,$2,$2,$3,$4,$5,NULL,NOW())
                     ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, company = EXCLUDED.company, phone = EXCLUDED.phone, email = EXCLUDED.email, buy_box = EXCLUDED.buy_box`,
                    ['b-' + externalItemId, entityName, field('Phone #(s)') || null, field('Email ID(s)') || null, [propType, criteria].filter(Boolean).join(' · ') || null]);
                return res.status(200).json({ ok: true, type: 'BUYER', item_id: externalItemId });
            }
            if (appIdStr === A.CONTACTS.id) {
                if (!item.title) return res.status(200).json({ ok: true, notice: 'Contact has no name yet' });
                await pool.query(
                    `INSERT INTO crm.seller_contacts (id, seller_name, phone, email, property_address, lead_status, lead_score, created_at)
                     VALUES ($1,$2,$3,$4,NULL,NULL,NULL,NOW())
                     ON CONFLICT (id) DO UPDATE SET seller_name = EXCLUDED.seller_name, phone = EXCLUDED.phone, email = EXCLUDED.email`,
                    ['c-' + externalItemId, item.title, field('Phone #(s)') || null, field('Email ID(s)') || null]);
                return res.status(200).json({ ok: true, type: 'CONTACT', item_id: externalItemId });
            }
            if (appIdStr === A.OFFERS.id) {
                const price = parseFloat(field('Purchase Price'));
                const address = field('Legal Description') || item.title;
                if (!address || !(price > 0)) return res.status(200).json({ ok: true, notice: 'Offer is missing an address or price; waiting for Podio to be completed' });
                await pool.query(
                    `INSERT INTO crm.deal_funnel (id, code, milestone_index, address, seller, buy_price, fee, days_in_stage, source, notes, created_at, updated_at)
                     VALUES ($1,$2,3,$3,$4,$5,0,0,'Podio Offers',$6,NOW(),NOW())
                     ON CONFLICT (id) DO UPDATE SET buy_price = EXCLUDED.buy_price, notes = EXCLUDED.notes, updated_at = NOW()`,
                    ['off-' + externalItemId, `OFF-${externalItemId}`, address, item.title || address, price,
                     [`Status: ${textOf(field('STATUS'))}`, field('Notes')].filter(Boolean).join(' | ')]);
                return res.status(200).json({ ok: true, type: 'OFFER', item_id: externalItemId });
            }
            if (appIdStr === A.FEEDS.id) {
                const typeText = textOf(field('Type'));
                const mode = textOf(field('Mode')).toUpperCase();
                const body = field('Text Message') || field('Call Prompt') || field('Email Body') || field('Email Subject') || '';
                const method = typeText.toUpperCase().includes('CALL') ? 'CALL' : typeText.toUpperCase().includes('EMAIL') ? 'EMAIL' : 'TEXT';
                const phone = String(field('From Phone') || '').replace(/\D/g, '').slice(-10);
                const { rows: [person] } = phone.length === 10 ? await pool.query(
                    `SELECT pe.person_id, l.lead_id, l.property_id FROM core.people pe
                     LEFT JOIN LATERAL (SELECT lead_id, property_id FROM core.leads WHERE person_id = pe.person_id ORDER BY created_at DESC LIMIT 1) l ON TRUE
                     WHERE right(regexp_replace(coalesce(pe.primary_phone,''), '\\D', '', 'g'), 10) = $1 LIMIT 1`, [phone]) : { rows: [] };
                await pool.query(
                    `INSERT INTO core.interactions (lead_id, person_id, property_id, method, direction, actor_id, result, notes, occurred_at)
                     VALUES ($1,$2,$3,$4,$5,'Podio Feeds','RECEIVED',$6,coalesce($7::timestamptz, now()))`,
                    [person?.lead_id || null, person?.person_id || null, person?.property_id || null, method, mode.includes('OUT') ? 'OUTBOUND' : 'INBOUND',
                     `[Podio Feeds #${externalItemId}] ${String(body).replace(/<[^>]+>/g, ' ').trim().slice(0, 500)}`, item.created_on || null]);
                return res.status(200).json({ ok: true, type: 'COMMUNICATION', item_id: externalItemId, matched: Boolean(person) });
            }
            return res.status(200).json({ ok: true, notice: `Podio app ${appIdStr} is not mapped to a HushHawk workspace.` });
        }

        // 4. Comments become notes on the lead they belong to; nothing is invented.
        if (type === 'comment.create') {
            const commentValue = String(req.body.value || req.body.comment || '').trim();
            const itemId = String(item_id || req.body.item_id || '');
            if (commentValue && itemId) {
                const { rows: [map] } = await pool.query(
                    `SELECT internal_uuid FROM crm.external_sync_map WHERE external_system = 'PODIO' AND internal_entity_type = 'LEAD' AND external_item_id = $1`, [itemId]);
                if (map) {
                    await pool.query(
                        `INSERT INTO core.interactions (lead_id, person_id, property_id, method, direction, actor_id, result, notes)
                         SELECT l.lead_id, l.person_id, l.property_id, 'OTHER', 'INBOUND', 'Podio comment', 'NOTE', $2 FROM core.leads l WHERE l.lead_id = $1`,
                        [map.internal_uuid, `[Podio comment] ${commentValue.slice(0, 1000)}`]);
                    return res.status(201).json({ ok: true, message: 'Podio comment recorded on the lead' });
                }
            }
        }

        res.json({ ok: true, received: true });
    } catch (err) {
        console.error('[Podio Webhook Error]', err);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/integrations/podio/register-all-webhooks', async (req, res) => {
    try {
        const webhookUrl = signedWebhookUrl('/api/v1/webhooks/podio');
        const results = await PodioSyncService.registerAllWebhooks(webhookUrl);
        res.json({ success: true, webhookUrl, results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// smrtPhone Direct Webhook & Telephony Engine
// ============================================================================
apiRouter.post('/webhooks/smrtphone', async (req, res) => {
    try {
        console.log('[smrtPhone Webhook] Received payload:', JSON.stringify(req.body).slice(0, 200));
        const result = await SmrtPhoneService.handleWebhook(req.body);
        await pool.query(
            `INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, request_id, redacted_diff)
             VALUES ('smrtPhone', 'SMRTPHONE_WEBHOOK', 'INTEGRATION', gen_random_uuid(), $1, '{}'::jsonb)`,
            [crypto.randomUUID()]
        ).catch(() => {});
        res.status(201).json(result);
    } catch (err) {
        console.error('[smrtPhone Webhook Error]', err.message);
        res.status(err.status || 500).json({ error: err.message });
    }
});

apiRouter.get('/webhooks/meta', (req, res) => {
    const check = MetaService.verifyHandshake(req.query);
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    res.status(200).type('text/plain').send(check.challenge);
});

apiRouter.post('/webhooks/meta', async (req, res) => {
    const check = MetaService.verifySignature(req.rawBody, req.get('x-hub-signature-256'));
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    try {
        const result = await MetaService.handleWebhook(req.body);
        res.status(200).json({ received: true, ...result });
    } catch (err) {
        console.error('[Meta Webhook Error]', err.message);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/integrations/meta/status', (req, res) => {
    res.json({ ...MetaService.status(), webhookUrl: publicWebhookUrl('/api/v1/webhooks/meta'), channels: Object.keys(META_PLATFORMS) });
});

apiRouter.get('/admin/backups', async (req, res) => {
    try { res.json(await BackupService.status()); } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/admin/backups/run', async (req, res) => {
    try { res.status(201).json(await BackupService.run({ actor: actorName(req) })); } catch (err) { res.status(503).json({ error: `Backup failed: ${err.message}` }); }
});

apiRouter.get('/integrations/smrtphone/status', async (req, res) => {
    const ready = configured('PUBLIC_API_URL', 'WEBHOOK_SECRET');
    let lastEventAt = null;
    try {
        const { rows: [row] } = await pool.query("SELECT max(created_at) AS at FROM audit.audit_events WHERE action = 'SMRTPHONE_WEBHOOK'");
        lastEventAt = row?.at || null;
    } catch { /* status stays null when the audit table is unavailable */ }
    res.json({
        ok: ready,
        service: 'smrtPhone webhook receiver',
        status: ready ? 'READY' : 'NOT_CONFIGURED',
        webhookUrl: publicWebhookUrl('/api/v1/webhooks/smrtphone'),
        lastEventAt
    });
});

apiRouter.get('/carrier/status', (req, res) => {
    res.json(CarrierDispatchService.getCarrierStatus());
});

apiRouter.get('/integrations/smrtphone/active-call', (req, res) => {
    const call = SmrtPhoneService.getActiveCall();
    res.json({ ok: true, activeCall: call });
});

apiRouter.post('/integrations/smrtphone/dismiss-call', (req, res) => {
    const result = SmrtPhoneService.dismissActiveCall();
    res.json(result);
});

apiRouter.post('/integrations/smrtphone/simulate-call', (req, res) => {
    return res.status(410).json({
        error: 'Simulation endpoints are disabled in production environment. Real-time calls are synchronized via official smrtPhone webhooks.'
    });
});

// ============================================================================
// BatchLeads Inbound Webhook & Automated Lead Ingestion Engine
// ============================================================================
const handleBatchLeadsWebhook = async (req, res) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
        return res.status(200).json({
            ok: true,
            status: 'READY',
            service: 'BatchLeads Webhook Ingestion Gateway',
            endpoint: '/api/v1/integrations/batchleads/webhook',
            timestamp: new Date().toISOString()
        });
    }
    try {
        console.log('[BatchLeads Webhook] Received payload:', JSON.stringify(req.body).slice(0, 500));
        const result = await BatchLeadsService.ingestWebhook(req.body);
        res.status(201).json(result);
    } catch (err) {
        console.error('[BatchLeads Webhook Error]', err);
        res.status(400).json({ error: err.message });
    }
};

apiRouter.all('/integrations/batchleads/webhook', handleBatchLeadsWebhook);
apiRouter.all('/webhooks/batchleads', handleBatchLeadsWebhook);

apiRouter.get('/integrations/batchleads/status', async (req, res) => {
    const ready = configured('PUBLIC_API_URL', 'WEBHOOK_SECRET');
    let lastLeadAt = null;
    try {
        const { rows: [row] } = await pool.query("SELECT max(created_at) AS at FROM core.leads WHERE first_source_code = 'BATCHLEADS'");
        lastLeadAt = row?.at || null;
    } catch { /* leave null */ }
    res.json({
        ok: ready,
        service: 'BatchLeads webhook receiver',
        status: ready ? 'READY' : 'NOT_CONFIGURED',
        webhookUrl: publicWebhookUrl('/api/v1/integrations/batchleads/webhook'),
        dedicatedSourceCode: 'BATCHLEADS',
        lastLeadAt
    });
});

apiRouter.get('/integrations/podio/status', async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.query.refresh === 'true';
        const status = await PodioSyncService.getStatus(force);
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/integrations/podio/apps', (req, res) => {
    res.json({
        ok: true,
        workspace: 'Elite Homes USA Group LLC',
        spaceId: 10347996,
        totalApps: Object.keys(PodioSyncService.APPS).length,
        apps: PodioSyncService.APPS
    });
});

apiRouter.post('/integrations/podio/sync-all', async (req, res) => {
    try {
        const summary = await PodioSyncService.syncAll();
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const podioReady = () => configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_APP_ID');
const notConfigured = (res, key) => res.json({ total: 0, [key]: [], configured: false, notice: 'Podio is not configured, so there is nothing to read.' });

apiRouter.get('/acquisitions/offers', async (req, res) => {
    try {
        if (!podioReady()) return notConfigured(res, 'offers');
        const offers = await PodioSyncService.syncOffers();
        res.json({ total: offers.length, offers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/offers', async (req, res) => {
    try {
        if (!podioReady()) return notConfigured(res, 'offers');
        const offers = await PodioSyncService.syncOffers();
        res.json({ total: offers.length, offers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/dispositions/whiteboard', async (req, res) => {
    try {
        if (!podioReady()) return notConfigured(res, 'deals');
        const whiteboard = await PodioSyncService.syncWhiteboard();
        res.json({ total: whiteboard.length, deals: whiteboard });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/integrations/podio/sync', async (req, res) => {
    try {
        const [propsCount, leadsCount] = await Promise.all([
            PodioSyncService.syncProperties(),
            PodioSyncService.syncLeads()
        ]);
        res.json({
            success: true,
            ok: true,
            propertiesSynced: propsCount,
            leadsSynced: leadsCount,
            message: `Podio synchronization complete: ${leadsCount} leads and ${propsCount} properties synchronized.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/integrations/podio/sync-communications', async (req, res) => {
    try {
        const count = await PodioSyncService.syncCommunications();
        res.json({
            success: true,
            ok: true,
            syncedCount: count,
            synced: count,
            message: `Podio communications synchronized live (${count} feeds refreshed)`
        });
    } catch (err) {
        res.status(502).json({ error: err.message });
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
        const webhookUrl = signedWebhookUrl('/api/v1/webhooks/podio');

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
apiRouter.get('/interactions', async (req, res) => {
    try {
        res.json({ interactions: await CrmService.listInteractions({ leadId: req.query.leadId || null, limit: req.query.limit }) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/interactions', async (req, res) => {
    try {
        const interaction = await CrmService.recordInteraction({ ...req.body, actor: actorName(req) });
        res.status(201).json(interaction);
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message });
    }
});

// Outbound Call Dispatch with Section 14 Compliance Gate & Interaction Logging
apiRouter.post('/calls/dispatch', async (req, res) => {
    try {
        const { recipientPhone, leadId, personId, propertyId, actor = actorName(req), notes = '', templateId = 'tmpl-seller-outreach-v1' } = req.body;
        if (!recipientPhone) {
            return res.status(400).json({ error: 'recipientPhone is required' });
        }

        // 1. Mandatory 6-Step Compliance Gate (Blueprint Section 14)
        const compliance = await ComplianceService.evaluateOutboundRequest({
            channel: 'CALL',
            recipientPhone,
            personId: personId || null,
            user: req.user,
        });

        if (!compliance.allowed) {
            return res.status(403).json({
                error: 'OUTBOUND_CALL_BLOCKED_BY_COMPLIANCE_GATE',
                details: compliance.checks.find(c => !c.passed)?.reason,
                compliance
            });
        }

        // 2. Dispatch Live Call or Provide Click-to-Dial Native Link
        const carrierResult = await CarrierDispatchService.dispatchCall({ to: recipientPhone });

        // 3. Log Interaction to core.interactions (PostgreSQL RDS)
        const interaction = await CrmService.recordInteraction({
            leadId,
            personId,
            propertyId,
            method: 'CALL',
            direction: 'OUTBOUND',
            actor,
            result: carrierResult.liveCarrier ? 'CALL_BRIDGED' : 'CLICK_TO_DIAL',
            notes: notes || `Outbound phone call initiated to ${recipientPhone} [${carrierResult.provider.toUpperCase()} Status: ${carrierResult.status}]`
        });

        // 4. Emit Operational Notification
        const notifId = crypto.randomUUID();
        await pool.query(
            `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())`,
            [
                notifId,
                `Outbound Call: ${recipientPhone}`,
                `Call initiated by ${actor} (${carrierResult.provider.toUpperCase()}). Compliance gate passed.`,
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
            interaction,
            carrier: carrierResult
        });
    } catch (err) {
        console.error('[Call Dispatch Error]', err);
        res.status(500).json({ error: err.message });
    }
});

// Tasks
apiRouter.get('/tasks', async (req, res) => {
    try {
        try {
            const { rows } = await pool.query(`
                SELECT t.task_id, t.title, t.due_date, t.status, t.owner_id, t.category, t.priority,
                       t.is_completed, t.due_time, t.linked_entity_type, t.linked_entity_id, t.created_at,
                       p.address_line1 as property_address, p.city as property_city, p.parcel_raw,
                       pe.full_name as rep_name
                FROM core.tasks t
                LEFT JOIN core.properties p ON t.linked_entity_id = p.property_id
                LEFT JOIN core.people pe ON t.owner_id = pe.person_id::text
                ORDER BY t.is_completed ASC, t.created_at DESC
            `);
            if (rows && rows.length > 0) {
                const formatted = rows.map(r => {
                    const dueDateStr = r.due_time || (r.due_date ? new Date(r.due_date).toLocaleDateString() : 'Today 5:00 PM');
                    const dueStatus = dueDateStr.toLowerCase().includes('today')
                        ? 'today'
                        : (dueDateStr.toLowerCase().includes('overdue') ? 'overdue' : 'normal');
                    const dealAddress = r.property_address
                        ? `${r.property_address}${r.property_city ? ', ' + r.property_city : ''}`
                        : '';
                    const parcelNumber = r.parcel_raw ? `DUV-${r.parcel_raw}` : '';
                    const assignee = r.rep_name || r.owner_id || actorName(req);
                    const initials = assignee.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AR';
                    return {
                        id: r.task_id,
                        task_id: r.task_id,
                        title: r.title || 'Untitled Task',
                        description: r.linked_entity_type ? `${r.linked_entity_type} Task` : '',
                        status: r.status || 'PENDING',
                        is_completed: Boolean(r.is_completed || r.status === 'COMPLETED' || r.status === 'Done'),
                        done: Boolean(r.is_completed || r.status === 'COMPLETED' || r.status === 'Done'),
                        category: r.category || 'Title & Escrow',
                        priority: r.priority || 'High',
                        dueDate: dueDateStr,
                        dueStatus: dueStatus,
                        deal: dealAddress,
                        parcel: parcelNumber,
                        assignee: assignee,
                        repInitials: initials,
                        created_at: r.created_at
                    };
                });
                return res.json({ total: formatted.length, tasks: formatted });
            }
            return res.json({ total: 0, tasks: [] });
        } catch (dbErr) {
            throw dbErr;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/tasks', async (req, res) => {
    try {
        const { title, deal, description, category, dueDate, priority, assignee } = req.body || {};
        if (!title || !String(title).trim()) return res.status(400).json({ error: 'Task title is required' });
        const rep = assignee || actorName(req);
        const { rows: [row] } = await pool.query(
            `INSERT INTO core.tasks (title, status, category, priority, is_completed, due_time, owner_id)
             VALUES ($1, 'PENDING', $2, $3, false, $4, $5) RETURNING *`,
            [String(title).trim(), category || 'General', priority || 'Medium', dueDate || null, rep]);
        await audit(pool, { actor: actorName(req), action: 'TASK_CREATED', entityType: 'TASK', entityId: row.task_id, diff: { title: row.title, assignee: rep } });
        const due = row.due_time || '';
        res.status(201).json({
            id: row.task_id, task_id: row.task_id, title: row.title, description: description || '', deal: deal || '', parcel: '',
            status: row.status, done: false, is_completed: false, category: row.category, priority: row.priority,
            dueDate: due, dueStatus: due.toLowerCase().includes('overdue') ? 'overdue' : due.toLowerCase().includes('today') ? 'today' : 'normal',
            assignee: rep, repInitials: rep.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(), created_at: row.created_at
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { done, status, is_completed } = req.body || {};
        const isDone = done !== undefined ? Boolean(done) : (is_completed !== undefined ? Boolean(is_completed) : (status === 'COMPLETED' || status === 'Done'));
        const newStatus = isDone ? 'COMPLETED' : (['PENDING', 'IN_PROGRESS', 'CANCELLED'].includes(status) ? status : 'PENDING');
        const { rows: [r] } = await pool.query(
            `UPDATE core.tasks SET is_completed = $1, status = $2, completed_at = CASE WHEN $1 THEN NOW() ELSE NULL END WHERE task_id::text = $3 RETURNING *`,
            [isDone, newStatus, id]);
        if (!r) return res.status(404).json({ error: 'Task not found' });
        await audit(pool, { actor: actorName(req), action: 'TASK_STATUS_UPDATED', entityType: 'TASK', entityId: r.task_id, diff: { status: r.status } });
        res.json({ id: r.task_id, task_id: r.task_id, title: r.title, status: r.status, is_completed: r.is_completed, done: r.is_completed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/tasks/:id', async (req, res) => {
    try {
        const { rows: [r] } = await pool.query('DELETE FROM core.tasks WHERE task_id::text = $1 RETURNING task_id, title', [req.params.id]);
        if (!r) return res.status(404).json({ error: 'Task not found' });
        await audit(pool, { actor: actorName(req), action: 'TASK_DELETED', entityType: 'TASK', entityId: r.task_id, diff: { title: r.title } });
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

// Exclude the five demonstration alerts shipped by the original seed.
const demoNotificationIds = [
    'a1000000-0000-0000-0000-000000000001',
    'a2000000-0000-0000-0000-000000000002',
    'a3000000-0000-0000-0000-000000000003',
    'a4000000-0000-0000-0000-000000000004',
    'a5000000-0000-0000-0000-000000000005'
];

apiRouter.get('/notifications', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const { rows: [result] } = await pool.query(`
            WITH live_notifications AS (
                SELECT * FROM ops.notifications WHERE notification_id <> ALL($1::uuid[])
            ), latest AS (
                SELECT * FROM live_notifications
                WHERE NOT $2::boolean OR is_read = false
                ORDER BY created_at DESC, notification_id DESC
                LIMIT 50
            )
            SELECT
                (SELECT count(*)::int FROM live_notifications WHERE is_read = false) AS unread_count,
                coalesce(json_agg(latest ORDER BY latest.created_at DESC, latest.notification_id DESC), '[]') AS notifications
            FROM latest
        `, [demoNotificationIds, req.query.unread_only === 'true']);

        res.json({
            total: result.notifications.length,
            unread_count: result.unread_count,
            notifications: result.notifications.map(n => ({
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
// 8. Human Review Loop (identity candidates)
// ============================================================================
apiRouter.get('/review/queue', async (req, res) => {
    try {
        res.json({ queue: await IdentityService.getReviewQueue({ status: req.query.status || null, limit: req.query.limit }) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/review/decision', async (req, res) => {
    try {
        const { candidateId, decision, reason } = req.body || {};
        res.json(await IdentityService.submitDecision({ candidateId, decision, reason, actor: actorName(req) }));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

apiRouter.post('/review/reverse', async (req, res) => {
    try {
        if (!req.user?.isAdmin) return res.status(403).json({ error: 'Administrator access is required to reverse a decision.' });
        const { decisionId, reversalReason } = req.body || {};
        res.json(await IdentityService.reverseDecision({ decisionId, reversalReason, actor: actorName(req) }));
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

// ============================================================================
// 9. Connectors, imports and raw evidence
// ============================================================================
const sendError = (res, err) => res.status(err.status || 500).json({ error: err.message });

apiRouter.get('/connectors', async (req, res) => {
    try { res.json({ connectors: await ConnectorService.getRegistry() }); } catch (err) { sendError(res, err); }
});

apiRouter.post('/connectors', async (req, res) => {
    try {
        if (!req.user?.isAdmin) return res.status(403).json({ error: 'Administrator access is required.' });
        res.status(201).json(await ConnectorService.upsertConnector(req.body, actorName(req)));
    } catch (err) { sendError(res, err); }
});

apiRouter.post('/connectors/:id/approval', async (req, res) => {
    try { res.json(await ConnectorService.setApproval(req.params.id, req.body || {}, actorName(req))); } catch (err) { sendError(res, err); }
});

apiRouter.post('/connectors/:id/run', async (req, res) => {
    try { res.json({ success: true, run: await ConnectorService.runConnector(req.params.id, { actor: actorName(req) }) }); } catch (err) { sendError(res, err); }
});

apiRouter.get('/connectors/runs', async (req, res) => {
    try { res.json({ runs: await ConnectorService.listRuns(req.query.limit) }); } catch (err) { sendError(res, err); }
});

apiRouter.get('/raw/source-records', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT source_record_id, source_system, jurisdiction, source_external_id, observed_at, source_url, payload_hash, parser_version
             FROM raw.source_records ORDER BY observed_at DESC LIMIT $1 OFFSET $2`, [Math.min(Number(req.query.limit) || 200, 1000), Number(req.query.offset) || 0]);
        res.json({ records: rows });
    } catch (err) { sendError(res, err); }
});

// Manual / pushed imports: records are already in the canonical shape.
apiRouter.post('/imports', async (req, res) => {
    try {
        const { records, countyCode, sourceSystem, importType } = req.body || {};
        res.status(201).json(await ConnectorService.ingest({ records, countyCode, sourceSystem, importType: importType || 'EVENT', actor: actorName(req) }));
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/imports', async (req, res) => {
    try { res.json({ imports: await ConnectorService.listImports(req.query.limit) }); } catch (err) { sendError(res, err); }
});

apiRouter.get('/imports/:id', async (req, res) => {
    try { res.json(await ConnectorService.getImport(req.params.id)); } catch (err) { sendError(res, err); }
});

// ============================================================================
// 10. Relationship graph (Postgres projection + Neo4j sync status)
// ============================================================================
apiRouter.get('/graph/projection', async (req, res) => {
    try { res.json(await GraphService.getGraphProjection({ filterEntityId: req.query.entityId || null, limit: req.query.limit })); } catch (err) { sendError(res, err); }
});

apiRouter.get('/graph/reconciliation', async (req, res) => {
    try { res.json(await GraphService.runReconciliation()); } catch (err) { sendError(res, err); }
});

apiRouter.post('/graph/sync', async (req, res) => {
    try { res.json(await GraphService.syncOutbox()); } catch (err) { sendError(res, err); }
});

// ============================================================================
// 11. Compliance gate and suppression
// ============================================================================
apiRouter.post('/compliance/evaluate', async (req, res) => {
    try {
        const b = req.body || {};
        res.json(await ComplianceService.evaluateOutboundRequest({ channel: b.channel, recipientPhone: b.recipientPhone, recipientEmail: b.recipientEmail,
            recipientAddress: b.recipientAddress, personId: b.personId, campaignId: b.campaignId, user: req.user }));
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/compliance/suppression', async (req, res) => {
    try { res.json({ records: await ComplianceService.listSuppression() }); } catch (err) { sendError(res, err); }
});

apiRouter.post('/compliance/suppression/import', async (req, res) => {
    try {
        const b = req.body || {};
        const entries = Array.isArray(b.entries) ? b.entries : String(b.text || '').split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
        res.status(201).json(await ComplianceService.importSuppression({ entries, reason: b.reason, source: b.source, actor: actorName(req) }));
    } catch (err) { sendError(res, err); }
});

apiRouter.post('/compliance/suppression', async (req, res) => {
    try {
        const b = req.body || {};
        res.status(201).json(await ComplianceService.addSuppression({ type: b.type, value: b.value, reason: b.reason, source: b.source, actor: actorName(req) }));
    } catch (err) { sendError(res, err); }
});

// ============================================================================
// 12. Dictionaries, governance and audit (admin)
// ============================================================================
apiRouter.get('/admin/pillars', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ref.pillars ORDER BY pillar_code');
        res.json({ total: rows.length, pillars: rows });
    } catch (err) { sendError(res, err); }
});

// Activation is a deliberate administrator action and is audited: nothing is enabled automatically.
apiRouter.patch('/admin/pillars/:code', async (req, res) => {
    try {
        const { review_status, production_enabled } = req.body || {};
        if (review_status && !['APPROVED', 'NEEDS_REVIEW', 'PROPOSED', 'RETIRED'].includes(review_status)) return res.status(400).json({ error: 'Invalid review_status.' });
        const row = await withTransaction(async client => {
            const { rows: [before] } = await client.query('SELECT * FROM ref.pillars WHERE pillar_code = $1 FOR UPDATE', [req.params.code]);
            if (!before) throw Object.assign(new Error('Pillar not found.'), { status: 404 });
            const status = review_status || before.review_status;
            const enabled = production_enabled === undefined ? before.production_enabled : Boolean(production_enabled);
            if (enabled && status !== 'APPROVED') throw Object.assign(new Error('Only an APPROVED pillar can be enabled in production.'), { status: 400 });
            const { rows: [after] } = await client.query('UPDATE ref.pillars SET review_status = $2, production_enabled = $3 WHERE pillar_code = $1 RETURNING *', [req.params.code, status, enabled]);
            await audit(client, { actor: actorName(req), action: 'PILLAR_GOVERNANCE_CHANGED', entityType: 'PILLAR', entityId: crypto.randomUUID(),
                diff: { pillar: req.params.code, before: { review_status: before.review_status, production_enabled: before.production_enabled }, after: { review_status: status, production_enabled: enabled } } });
            return after;
        });
        res.json(row);
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/admin/counties', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ref.counties ORDER BY county_code');
        res.json({ total: rows.length, counties: rows });
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/admin/lead-sources', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ref.lead_sources ORDER BY source_code');
        res.json({ total: rows.length, lead_sources: rows });
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/admin/dictionaries', async (req, res) => {
    try {
        const [methods, roles, platforms] = await Promise.all([
            pool.query('SELECT * FROM ref.contact_methods ORDER BY method_code'),
            pool.query('SELECT * FROM ref.person_roles ORDER BY role_code'),
            pool.query('SELECT * FROM ref.platforms ORDER BY platform_code')
        ]);
        res.json({ contact_methods: methods.rows, person_roles: roles.rows, platforms: platforms.rows });
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/admin/audit-log', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM audit.audit_events WHERE ($1::text IS NULL OR entity_type = $1) ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
            [req.query.entityType || null, Math.min(Number(req.query.limit) || 200, 1000), Number(req.query.offset) || 0]);
        res.json({ audit_events: rows });
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/admin/outbox', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM ops.outbox_events ORDER BY created_at DESC LIMIT $1', [Math.min(Number(req.query.limit) || 200, 1000)]);
        res.json({ outbox_events: rows });
    } catch (err) { sendError(res, err); }
});

apiRouter.get('/admin/sync-map', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM crm.external_sync_map ORDER BY last_sync_at DESC NULLS LAST LIMIT 1000');
        res.json({ sync_map: rows });
    } catch (err) { sendError(res, err); }
});

// ============================================================================
// 13. Reports: unique counts only (a lead linked to four pillars is still one lead)
// ============================================================================
apiRouter.get('/reports/overview', async (req, res) => {
    try {
        const [{ rows: [k] }, { rows: attribution }, { rows: pillars }, { rows: stages }] = await Promise.all([
            pool.query(`SELECT (SELECT count(*) FROM core.leads WHERE lead_kind IN ('SELLER','NEEDS_REVIEW'))::int AS unique_leads,
                               (SELECT count(*) FROM core.leads WHERE lead_kind = 'NEEDS_REVIEW')::int AS leads_needing_review,
                               (SELECT count(*) FROM core.leads WHERE lead_kind IN ('BUSINESS','AUTOMATED','INTERNAL'))::int AS non_seller_contacts,
                               (SELECT count(*) FROM core.properties)::int AS total_properties,
                               (SELECT count(*) FROM core.pillar_events)::int AS total_pillar_events,
                               (SELECT count(*) FROM core.people)::int AS unique_contacts,
                               (SELECT count(*) FROM raw.source_records)::int AS raw_source_evidence,
                               (SELECT count(*) FROM rel.identity_candidates WHERE status = 'PENDING')::int AS pending_human_reviews,
                               (SELECT count(*) FROM crm.suppression_records)::int AS suppressed_contacts,
                               (SELECT count(*) FROM ops.outbox_events WHERE published_at IS NULL)::int AS outbox_pending,
                               coalesce((SELECT extract(epoch FROM now() - min(created_at))::int FROM ops.outbox_events WHERE published_at IS NULL), 0) AS outbox_oldest_pending_seconds`),
            pool.query("SELECT coalesce(first_source_code, 'UNKNOWN') AS key, count(*)::int AS n FROM core.leads WHERE lead_kind IN ('SELLER','NEEDS_REVIEW') GROUP BY 1 ORDER BY n DESC"),
            pool.query('SELECT pillar_code AS key, count(*)::int AS n FROM core.pillar_events GROUP BY 1 ORDER BY n DESC'),
            pool.query("SELECT status AS key, count(*)::int AS n FROM core.leads WHERE lead_kind IN ('SELLER','NEEDS_REVIEW') GROUP BY 1 ORDER BY n DESC")
        ]);
        const toMap = rows => Object.fromEntries(rows.map(r => [r.key, r.n]));
        res.json({ kpis: k, attribution_breakdown: toMap(attribution), pillar_event_breakdown: toMap(pillars), pipeline_stages_breakdown: toMap(stages), generated_at: new Date().toISOString() });
    } catch (err) { sendError(res, err); }
});

// ============================================================================
// 15. Operational CRM Workspaces (Buyers, Contracts, Contacts, Tasks)
// ============================================================================

// --- Cash Buyers (PostgreSQL crm.cash_buyers) ---
const buyerDto = r => ({
    id: r.id, name: r.full_name, company: r.company || '', phone: r.phone || '', email: r.email || '', location: r.location || '',
    zips: r.zips || [], min: r.price_min === null ? null : Number(r.price_min), max: r.price_max === null ? null : Number(r.price_max),
    types: r.property_types || r.buy_box || '', pofVerified: r.pof_verified, notes: r.notes || '', status: r.status || '',
    podioItemId: r.podio_item_id || null, created_at: r.created_at
});

const handleGetBuyers = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM crm.cash_buyers ORDER BY created_at DESC');
        res.json({ total: rows.length, buyers: rows.map(buyerDto) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

apiRouter.get('/buyers', handleGetBuyers);
apiRouter.get('/cash-buyers', handleGetBuyers);

const handlePostBuyer = async (req, res) => {
    try {
        const name = req.body.name || req.body.full_name;
        const { company, phone, email, location, zips, min, max, types, notes, pofVerified } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
        if (!phone && !email) return res.status(400).json({ error: 'A phone number or email is required' });
        const buyerId = 'b-' + crypto.randomUUID();
        const zipList = Array.isArray(zips) ? zips : (typeof zips === 'string' ? zips.split(',').map(z => z.trim()).filter(Boolean) : []);
        const num = v => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

        const { rows: [row] } = await pool.query(
            `INSERT INTO crm.cash_buyers (id, full_name, company, phone, email, location, zips, price_min, price_max, property_types, buy_box, pof_verified, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,$12) RETURNING *`,
            [buyerId, String(name).trim(), company || null, phone || null, email || null, location || null, zipList, num(min), num(max), types || null, Boolean(pofVerified), notes || null]);
        await audit(pool, { actor: actorName(req), action: 'BUYER_CREATED', entityType: 'BUYER', entityId: crypto.randomUUID(), diff: { buyerId, name } });

        let podio = { pushed: false };
        if (configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN')) {
            try {
                const podioBuyer = await PodioSyncService.createCashBuyerInPodio({ name, company, phone, email, criteria: notes || types || '', min, max, propertyType: types, notes: `Created in HushHawk (${buyerId})` });
                if (podioBuyer?.item_id) {
                    await pool.query('UPDATE crm.cash_buyers SET podio_item_id = $2 WHERE id = $1', [buyerId, String(podioBuyer.item_id)]);
                    podio = { pushed: true, podioItemId: podioBuyer.item_id };
                }
            } catch (pBuyerErr) {
                podio = { pushed: false, error: pBuyerErr.message };
            }
        }
        res.status(201).json({ ...buyerDto(row), podio });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

apiRouter.post('/buyers', handlePostBuyer);
apiRouter.post('/cash-buyers', handlePostBuyer);

const handleDeleteBuyer = async (req, res) => {
    try {
        const { rows: [row] } = await pool.query('DELETE FROM crm.cash_buyers WHERE id = $1 RETURNING id, full_name, podio_item_id', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Buyer not found' });
        // A buyer that lives in Podio must be removed there too, otherwise the next sync brings it back.
        const podioItemId = row.podio_item_id || (/^b-\d+$/.test(row.id) ? row.id.slice(2) : null);
        let podio = { removed: false };
        if (podioItemId && configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN')) {
            try {
                const auth = await PodioService.authenticateApp(PodioSyncService.LEADS_APP_ID, PodioSyncService.APP_TOKEN);
                await PodioService.deleteItem(auth.access_token, podioItemId);
                podio = { removed: true };
            } catch (podioErr) {
                podio = { removed: false, error: podioErr.message };
            }
        }
        await audit(pool, { actor: actorName(req), action: 'BUYER_DELETED', entityType: 'BUYER', entityId: crypto.randomUUID(), diff: { buyerId: row.id, name: row.full_name } });
        res.json({ success: true, deleted: row.id, podio });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

apiRouter.delete('/buyers/:id', handleDeleteBuyer);
apiRouter.delete('/cash-buyers/:id', handleDeleteBuyer);

// ============================================================================
// Deal-Flow Funnel (12 Milestones) Management API (Canonical PostgreSQL RDS)
// ============================================================================
apiRouter.get('/deal-funnel', async (req, res) => {
    try {
        const funnel = await DealFunnelService.getFunnel();
        res.json(funnel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const handleAdvanceDeal = async (req, res) => {
    try {
        const { dealId, targetMilestoneIndex, newMilestoneIndex, notes, actor } = req.body;
        if (!dealId) return res.status(400).json({ error: 'dealId is required' });
        const target = targetMilestoneIndex !== undefined ? targetMilestoneIndex : newMilestoneIndex;
        const result = await DealFunnelService.advanceDeal({
            dealId,
            targetMilestoneIndex: target,
            notes,
            actor: actor || req.headers['x-actor'] || 'USER_WEB'
        });
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

apiRouter.patch('/deal-funnel/advance', handleAdvanceDeal);
apiRouter.post('/deal-funnel/advance', handleAdvanceDeal);

apiRouter.post('/deal-funnel/deals', async (req, res) => {
    try {
        const newDeal = await DealFunnelService.createDeal(req.body, actorName(req));
        res.status(201).json(newDeal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/deal-funnel', async (req, res) => {
    try {
        const newDeal = await DealFunnelService.createDeal(req.body, actorName(req));
        res.status(201).json(newDeal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.put('/deal-funnel/deals/:id', async (req, res) => {
    try {
        const updated = await DealFunnelService.updateDeal(req.params.id, req.body);
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.delete('/deal-funnel/deals/:id', async (req, res) => {
    try {
        const deleted = await DealFunnelService.deleteDeal(req.params.id);
        res.json({ success: true, deleted });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ============================================================================
// Lead Conversation Desk (v2) - 16 Platforms & Realtime Messaging
// ============================================================================
apiRouter.get('/lead-desk/platforms', async (req, res) => {
    try {
        const platforms = await LeadDeskService.getPlatforms();
        res.json({ platforms, total: platforms.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/lead-desk/threads', async (req, res) => {
    try {
        const { platform, priority } = req.query;
        const threads = await LeadDeskService.getThreads({ platformId: platform || 'facebook', priority });
        res.json({ threads, total: threads.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/lead-desk/threads/:id', async (req, res) => {
    try {
        const thread = await LeadDeskService.getThreadDetail(req.params.id);
        res.json(thread);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

apiRouter.get('/lead-desk/threads/:id/messages', async (req, res) => {
    try {
        const thread = await LeadDeskService.getThreadDetail(req.params.id);
        res.json({ messages: thread.messages || [], total: (thread.messages || []).length });
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

apiRouter.post('/lead-desk/threads/:id/messages', async (req, res) => {
    try {
        const { content, senderName, senderType } = req.body;
        const message = await LeadDeskService.sendMessage({
            threadId: req.params.id,
            content,
            senderName: senderName || req.headers['x-actor'] || actorName(req),
            senderType: senderType || 'rep'
        });
        res.status(201).json(message);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/lead-desk/send', async (req, res) => {
    try {
        const { threadId, recipient, recipientPhone, channel, text, content, senderName } = req.body;
        const msgText = text || content;
        if (!msgText) return res.status(400).json({ error: 'Message content is required' });

        if (threadId) {
            const message = await LeadDeskService.sendMessage({
                threadId,
                content: msgText,
                senderName: senderName || actorName(req),
                senderType: 'rep'
            });
            return res.status(201).json(message);
        }

        if (channel === 'email' || req.body.email) {
            const sentEmail = await OutreachActionsService.sendEmail({
                recipientName: req.body.recipientName || null,
                email: req.body.email || recipient,
                subject: req.body.subject,
                body: msgText
            });
            return res.status(201).json(sentEmail);
        } else {
            const sentText = await OutreachActionsService.sendText({
                recipientPhone: recipientPhone || recipient,
                contactName: req.body.contactName || null,
                message: msgText
            });
            return res.status(201).json(sentText);
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/lead-desk/threads/:id/assign', async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const result = await LeadDeskService.assignThread({
            threadId: req.params.id,
            assignedTo: assignedTo || actorName(req)
        });
        res.json({ success: true, thread: result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/lead-desk/threads/:id/schedule', async (req, res) => {
    try {
        const { dueDate, notes } = req.body;
        const result = await LeadDeskService.scheduleFollowUp({
            threadId: req.params.id,
            dueDate: dueDate || 'Tomorrow',
            notes: notes || 'Scheduled from Conversation Desk'
        });
        res.status(201).json({ success: true, followUp: result });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.get('/lead-desk/sync', async (req, res) => {
    try {
        const { since, platformId } = req.query;
        const syncData = await LeadDeskService.sync({ since, platformId: platformId || 'facebook' });
        res.json(syncData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Executive Outreach Action Boxes: SEND MAILERS, CALL, TEXT, EMAIL
// ============================================================================
apiRouter.get('/outreach-actions/summary', async (req, res) => {
    try {
        const summary = await OutreachActionsService.getSummary();
        res.json(summary);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/outreach-actions/mailers', async (req, res) => {
    try {
        const mailers = await OutreachActionsService.getMailersQueue();
        res.json({ total: mailers.length, mailers });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/mailers/queue', async (req, res) => {
    try {
        const { propertyIds, limit } = req.body;
        const queued = await OutreachActionsService.queueProperties({ propertyIds, limit });
        res.status(201).json({ queued, count: queued.length });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/mailers/batch', async (req, res) => {
    try {
        const { template, postage, propertyIds } = req.body;
        const result = await OutreachActionsService.createMailerBatch({ template, postage, propertyIds });
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.get('/outreach-actions/calls', async (req, res) => {
    try {
        const calls = await OutreachActionsService.getCallsQueue();
        res.json({ total: calls.length, calls });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/calls/queue', async (req, res) => {
    try {
        const queued = await OutreachActionsService.queueCall(req.body);
        res.status(201).json(queued);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/calls/log', async (req, res) => {
    try {
        const { callId, contactName, phone, propertyAddress, propertyId, result, notes, nextStep } = req.body;
        const updatedCall = await OutreachActionsService.logCall({
            callId,
            contactName,
            phone,
            propertyAddress,
            propertyId,
            result,
            notes,
            nextStep
        });
        res.json(updatedCall);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.get('/outreach-actions/texts', async (req, res) => {
    try {
        const texts = await OutreachActionsService.getTextsQueue();
        res.json({ total: texts.length, texts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/texts/queue', async (req, res) => {
    try {
        const queued = await OutreachActionsService.queueText(req.body);
        res.status(201).json(queued);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/texts/send', async (req, res) => {
    try {
        const { textId, phone, recipientPhone, contactName, message, propertyId, personId } = req.body;
        const gate = await ComplianceService.evaluateOutboundRequest({ channel: 'TEXT', recipientPhone: recipientPhone || phone, personId: personId || null, user: req.user });
        if (!gate.allowed) return res.status(403).json({ error: 'OUTBOUND_TEXT_BLOCKED_BY_COMPLIANCE_GATE', details: gate.checks.find(c => !c.passed)?.reason, compliance: gate });
        const sentText = await OutreachActionsService.sendText({
            actor: actorName(req),
            textId,
            phone,
            recipientPhone,
            contactName,
            message,
            propertyId
        });
        res.status(201).json(sentText);
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message, carrier: err.carrier });
    }
});

apiRouter.get('/outreach-actions/emails', async (req, res) => {
    try {
        const emails = await OutreachActionsService.getEmailsQueue();
        res.json({ total: emails.length, emails });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/emails/queue', async (req, res) => {
    try {
        const queued = await OutreachActionsService.queueEmail(req.body);
        res.status(201).json(queued);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/outreach-actions/emails/send', async (req, res) => {
    try {
        const { emailId, recipientName, name, email, subject, body, propertyAddress, propertyId, personId } = req.body;
        const gate = await ComplianceService.evaluateOutboundRequest({ channel: 'EMAIL', recipientEmail: email, personId: personId || null, user: req.user });
        if (!gate.allowed) return res.status(403).json({ error: 'OUTBOUND_EMAIL_BLOCKED_BY_COMPLIANCE_GATE', details: gate.checks.find(c => !c.passed)?.reason, compliance: gate });
        const sentEmail = await OutreachActionsService.sendEmail({
            actor: actorName(req),
            emailId,
            recipientName: recipientName || name,
            email,
            subject,
            body,
            propertyAddress,
            propertyId
        });
        res.status(201).json(sentEmail);
    } catch (err) {
        res.status(err.status || 400).json({ error: err.message, carrier: err.carrier });
    }
});

// --- Wholesale Contracts & Dispositions ---
apiRouter.get('/contracts', async (req, res) => {
    try {
        const pgContracts = await pool.query(`
            SELECT 
                id, code, address, city, state, zip, 
                CASE WHEN milestone_index >= 10 THEN 'Assignment' ELSE 'PSA' END as type,
                seller, 
                COALESCE(buyer, '—') as buyer,
                buy_price as "buyPrice",
                fee,
                title_agency as "titleAgency",
                file_number as "fileNumber",
                TO_CHAR(closing_date, 'YYYY-MM-DD') as "closingDate",
                CASE 
                    WHEN milestone_index = 11 THEN 'Closed & Funded'
                    WHEN milestone_index = 10 THEN 'Assignment Executed'
                    WHEN milestone_index >= 8 THEN 'Dispo Launched'
                    WHEN milestone_index >= 6 THEN 'EMD Confirmed'
                    ELSE 'In Escrow'
                END as status,
                CASE 
                    WHEN milestone_index = 11 THEN 'status-closed'
                    ELSE 'status-escrow'
                END as "statusClass",
                milestone_index as "milestoneIndex"
            FROM crm.deal_funnel 
            WHERE milestone_index >= 4
            ORDER BY milestone_index DESC, created_at DESC
        `);

        let contracts = pgContracts.rows.map(c => ({
            ...c,
            buyPrice: Number(c.buyPrice) || 0,
            fee: Number(c.fee) || 0,
            docs: [
                { name: `Executed_${c.type}_${c.address.replace(/[^a-zA-Z0-9]/g, '')}.pdf` }
            ],
            milestones: [
                { name: 'Purchase & Sale Executed', detail: 'Signed & verified', completed: true },
                { name: 'Seller EMD Verified', detail: 'EMD verified', completed: c.milestoneIndex >= 6 },
                { name: 'Title Commitment & Municipal Lien Search', detail: 'Title cleared', completed: c.milestoneIndex >= 7 },
                { name: 'Assignment of Contract Executed', detail: 'Assigned to cash buyer', completed: c.milestoneIndex >= 10 },
                { name: 'Buyer EMD Received & Closing Funded', detail: 'Closed & fee disbursed', completed: c.milestoneIndex >= 11 }
            ]
        }));

        res.json({ total: contracts.length, contracts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/dispositions', async (req, res) => {
    try {
        const pgContracts = await pool.query(`
            SELECT 
                id, code, address, zip, 
                CASE WHEN milestone_index >= 10 THEN 'Assignment' ELSE 'PSA' END as type,
                seller, 
                COALESCE(buyer, '—') as buyer,
                buy_price as "buyPrice",
                fee,
                title_agency as "titleAgency",
                file_number as "fileNumber",
                TO_CHAR(closing_date, 'YYYY-MM-DD') as "closingDate",
                CASE 
                    WHEN milestone_index = 11 THEN 'Closed & Funded'
                    WHEN milestone_index = 10 THEN 'Assignment Executed'
                    WHEN milestone_index >= 8 THEN 'Dispo Launched'
                    WHEN milestone_index >= 6 THEN 'EMD Confirmed'
                    ELSE 'In Escrow'
                END as status,
                CASE 
                    WHEN milestone_index = 11 THEN 'status-closed'
                    ELSE 'status-escrow'
                END as "statusClass",
                milestone_index as "milestoneIndex"
            FROM crm.deal_funnel 
            WHERE milestone_index >= 4
            ORDER BY milestone_index DESC, created_at DESC
        `);

        let contracts = pgContracts.rows.map(c => ({
            ...c,
            buyPrice: Number(c.buyPrice) || 0,
            fee: Number(c.fee) || 0,
            docs: [
                { name: `Executed_${c.type}_${c.address.replace(/[^a-zA-Z0-9]/g, '')}.pdf` }
            ]
        }));

        if (!contracts.length) {
            contracts = db.data.crm.contracts || [];
        }

        res.json({ total: contracts.length, dispositions: contracts, contracts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/contracts', async (req, res) => {
    try {
        const { address, type, seller, buyer, buyPrice, fee, emd, titleAgency, closingDate, fileNumber, city, state, zip, county } = req.body || {};
        if (!address || !String(address).trim()) return res.status(400).json({ error: 'Property address is required' });
        if (!seller || !String(seller).trim()) return res.status(400).json({ error: 'Seller is required' });
        if (!(Number(buyPrice) > 0)) return res.status(400).json({ error: 'A purchase price greater than zero is required' });

        // A signed contract is milestone 4 of the deal funnel; the funnel is the single source of truth.
        const deal = await DealFunnelService.createDeal({
            milestoneIndex: 4, address, seller, buyer, buyPrice, fee, titleAgency, fileNumber, closingDate, city, state, zip, county,
            source: 'Contract Desk', notes: type ? `Contract type: ${type}` : null
        }, actorName(req));

        let podio = { pushed: false };
        if (Number(emd) >= 0 && emd !== undefined && emd !== '' && configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN')) {
            try {
                await PodioSyncService.createOfferInPodio({ address, buyPrice, emd, county: county || '', status: 'Contract Sent', notes: `Drafted from HushHawk (${deal.code})` });
                podio = { pushed: true };
            } catch (pOfferErr) {
                podio = { pushed: false, error: pOfferErr.message };
            }
        }
        res.status(201).json({ ...deal, podio });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.post('/offers', async (req, res) => {
    try {
        const { address, buyPrice, emd, status, notes, leadItemId } = req.body || {};
        if (!address && !leadItemId) {
            return res.status(400).json({ error: 'Property address or leadItemId is required' });
        }
        const offer = await PodioSyncService.createOfferInPodio({
            address,
            buyPrice,
            emd,
            status,
            notes,
            leadItemId
        });
        res.status(201).json({ success: true, offer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Contracts are deal-funnel rows (milestone 4 and above). Every change is recorded in the deal history and the audit log.
apiRouter.patch('/contracts/:id/milestone', async (req, res) => {
    try {
        const { milestoneIndex, completed } = req.body || {};
        const { rows: [deal] } = await pool.query(
            `UPDATE crm.deal_funnel SET history = coalesce(history, '[]'::jsonb) || $2::jsonb, updated_at = now() WHERE id = $1 RETURNING id`,
            [req.params.id, JSON.stringify([{ action: 'MILESTONE_TOGGLE', milestoneIndex, completed: Boolean(completed), actor: actorName(req), at: new Date().toISOString() }])]);
        if (!deal) return res.status(404).json({ error: 'Contract not found' });
        res.json({ id: deal.id, milestoneIndex, completed: Boolean(completed), success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/contracts/:id', async (req, res) => {
    try {
        const u = req.body || {};
        const num = v => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
        const selected = u.status === 'Buyer Selected';
        const { rows: [deal] } = await pool.query(
            `UPDATE crm.deal_funnel SET
                buyer = coalesce($2, buyer), fee = coalesce($3, fee), title_agency = coalesce($4, title_agency), file_number = coalesce($5, file_number),
                milestone_index = CASE WHEN $6 THEN greatest(milestone_index, 9) ELSE milestone_index END,
                history = CASE WHEN $6 THEN coalesce(history, '[]'::jsonb) || $7::jsonb ELSE history END,
                updated_at = now()
             WHERE id = $1 RETURNING *`,
            [req.params.id, u.buyer || null, num(u.fee), u.titleAgency || null, u.fileNumber || null, selected,
             JSON.stringify([{ action: 'BUYER_SELECTED', buyer: u.buyer || null, actor: actorName(req), at: new Date().toISOString() }])]);
        if (!deal) return res.status(404).json({ error: 'Contract not found' });
        await audit(pool, { actor: actorName(req), action: 'CONTRACT_UPDATED', entityType: 'DEAL', entityId: crypto.randomUUID(), diff: { dealId: deal.id, fields: Object.keys(u) } });
        res.json({ id: deal.id, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/contracts/:id', async (req, res) => {
    try {
        const { rows: [deal] } = await pool.query('DELETE FROM crm.deal_funnel WHERE id = $1 RETURNING id, code, address', [req.params.id]);
        if (!deal) return res.status(404).json({ error: 'Contract not found' });
        await audit(pool, { actor: actorName(req), action: 'CONTRACT_DELETED', entityType: 'DEAL', entityId: crypto.randomUUID(), diff: { dealId: deal.id, code: deal.code, address: deal.address } });
        res.json({ success: true, deleted: deal.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Sends the deal packet to cash buyers. Each buyer passes the compliance gate and the email transport individually;
// the response reports exactly who was sent, blocked or failed, and nothing is logged as sent unless it was.
apiRouter.post('/dispositions/blast', async (req, res) => {
    try {
        const { address, fee, price, message, buyerIds } = req.body || {};
        if (!address || !String(address).trim()) return res.status(400).json({ error: 'The property address is required.' });
        const { rows: buyers } = await pool.query(
            `SELECT * FROM crm.cash_buyers WHERE email IS NOT NULL AND email <> '' AND ($1::text[] IS NULL OR id = ANY($1)) ORDER BY created_at LIMIT 200`,
            [Array.isArray(buyerIds) && buyerIds.length ? buyerIds : null]);
        if (!buyers.length) return res.status(400).json({ error: 'No cash buyers with an email address were found.' });

        const lines = [`New off-market opportunity: ${address}`];
        if (Number(price) > 0) lines.push(`Price: $${Number(price).toLocaleString('en-US')}`);
        if (Number(fee) > 0) lines.push(`Assignment fee: $${Number(fee).toLocaleString('en-US')}`);
        if (message) lines.push('', String(message));
        const text = lines.join('\n');

        const results = [];
        for (const buyer of buyers) {
            const gate = await ComplianceService.evaluateOutboundRequest({ channel: 'EMAIL', recipientEmail: buyer.email, user: req.user });
            if (!gate.allowed) {
                results.push({ buyerId: buyer.id, email: buyer.email, outcome: 'BLOCKED', reason: gate.checks.find(c => !c.passed)?.reason });
                continue;
            }
            const sent = await DeliveryService.email({ to: buyer.email, subject: `Off-market deal: ${address}`, text, leadName: buyer.company || buyer.full_name, propertyAddress: address });
            if (!sent.success) {
                results.push({ buyerId: buyer.id, email: buyer.email, outcome: 'FAILED', reason: sent.error });
                continue;
            }
            await pool.query(
                `INSERT INTO core.interactions (method, direction, actor_id, result, notes) VALUES ('EMAIL','OUTBOUND',$1,'SENT',$2)`,
                [actorName(req), `Deal blast for ${address} sent to ${buyer.company || buyer.full_name} (${buyer.email})`]);
            results.push({ buyerId: buyer.id, email: buyer.email, outcome: 'SENT' });
        }
        const sentCount = results.filter(r => r.outcome === 'SENT').length;
        await audit(pool, { actor: actorName(req), action: 'DISPOSITION_BLAST', entityType: 'DISPOSITION', entityId: crypto.randomUUID(), diff: { address, attempted: buyers.length, sent: sentCount } });
        res.status(sentCount ? 200 : 502).json({ success: sentCount > 0, attempted: buyers.length, sent: sentCount, results, dispatchedAt: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Contacts Rolodex (Podio App 30087414 Live Sync with PostgreSQL) ---
const contactDto = row => {
    const name = row.seller_name || '';
    return {
        id: row.id, name, company: row.company || '', type: row.contact_type || '', phone: row.phone || '', email: row.email || '',
        tags: row.tags || [], property: row.property_address || '', status: row.lead_status || '',
        initials: name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2),
        lastTouch: row.updated_at || row.created_at, notes: row.notes || '', created_at: row.created_at
    };
};

apiRouter.get('/contacts', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM crm.seller_contacts ORDER BY created_at DESC LIMIT 5000');
        res.json({ total: rows.length, contacts: rows.map(contactDto) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/contacts', async (req, res) => {
    try {
        const { name, company, type, phone, email, tagsInput, notes, property } = req.body || {};
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
        if (!phone && !email) return res.status(400).json({ error: 'A phone number or email is required' });
        const tags = tagsInput ? (Array.isArray(tagsInput) ? tagsInput : String(tagsInput).split(',').map(t => t.trim()).filter(Boolean)) : [];
        const { rows: [row] } = await pool.query(
            `INSERT INTO crm.seller_contacts (id, seller_name, phone, email, property_address, company, contact_type, tags, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
            ['sel-' + crypto.randomUUID(), String(name).trim(), phone || null, email || null, property || null, company || null, type || null, tags, notes || null]);
        await audit(pool, { actor: actorName(req), action: 'CONTACT_CREATED', entityType: 'CONTACT', entityId: crypto.randomUUID(), diff: { contactId: row.id, name } });
        res.status(201).json(contactDto(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/contacts/:id', async (req, res) => {
    try {
        const { rows: [row] } = await pool.query('DELETE FROM crm.seller_contacts WHERE id = $1 RETURNING id, seller_name', [req.params.id]);
        if (!row) return res.status(404).json({ error: 'Contact not found' });
        await audit(pool, { actor: actorName(req), action: 'CONTACT_DELETED', entityType: 'CONTACT', entityId: crypto.randomUUID(), diff: { contactId: row.id, name: row.seller_name } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Skip Tracing (Podio App 30087425 Cold Leads Live Sync) ---
apiRouter.get('/skip-tracing', async (req, res, next) => {
    try {
        const [leads, queued] = await Promise.all([
            podioReady() ? PodioSyncService.syncColdLeads() : Promise.resolve([]),
            pool.query(`SELECT lead.lead_id AS id, property.address_line1 AS address,
                    property.postal_code AS zip, person.full_name AS "ownerName"
                FROM core.leads lead JOIN core.properties property USING (property_id)
                LEFT JOIN core.people person USING (person_id)
                WHERE lead.status = 'QUEUED_FOR_SKIP_TRACE'
                ORDER BY lead.created_at DESC`)
        ]);
        const traces = [
            ...leads.map(lead => ({
                id: lead.id, ownerName: lead.name, address: lead.address,
                primaryPhone: lead.phone, email: lead.email, source: 'Podio'
            })),
            ...queued.rows.map(lead => ({ ...lead, ownerName: lead.ownerName ?? 'Owner unavailable', source: 'County queue' })),
            ...(db.data.crm.skip_traces || []).filter(trace => trace.source === 'Internal lookup')
        ];
        res.json({ total: traces.length, traces });
    } catch (error) {
        next(error);
    }
});

apiRouter.post('/skip-tracing', async (req, res, next) => {
    try {
        const { ownerName, address, zip } = req.body;
        if (typeof ownerName !== 'string' || !ownerName.trim() || typeof address !== 'string' || !address.trim()) {
            return res.status(400).json({ error: 'Owner name and street address are required.' });
        }
        const street = address.split(',')[0].trim();
        const result = await pool.query(
            `SELECT DISTINCT person.primary_phone, person.primary_email, property.property_id
             FROM core.properties property JOIN core.leads lead USING (property_id)
             JOIN core.people person USING (person_id)
             WHERE lower(property.address_line1) = lower($1)
               AND lower(person.full_name) = lower($2)
               AND ($3 = '' OR property.postal_code = $3)
             LIMIT 2`, [street, ownerName.trim(), typeof zip === 'string' ? zip.trim() : '']
        );
        const match = result.rows.length === 1 ? result.rows[0] : null;
        const trace = {
            id: crypto.randomUUID(), ownerName: ownerName.trim(), address, zip,
            primaryPhone: match?.primary_phone ?? null, email: match?.primary_email ?? null,
            property_id: match?.property_id ?? null, source: 'Internal lookup',
            created_at: new Date().toISOString()
        };
        (db.data.crm.skip_traces ||= []).unshift(trace);
        db.persist();
        res.status(201).json(trace);
    } catch (error) {
        next(error);
    }
});

apiRouter.post('/skip-tracing/batch', (req, res) => {
    res.status(503).json({ error: 'Batch contact verification requires a configured skip-tracing provider.' });
});

// --- Facebook Leads: real leads whose first source is Facebook ---
const FB_STAGE = { NEW: 'New Ingested', CONTACTED: 'Contacted', QUALIFIED: 'Qualified', OFFER: 'Offer Made', CONTRACT: 'Under Contract', CLOSED: 'Closed', FOLLOW_UP: 'Follow Up', LOST: 'Lost' };

const fbLeadDto = l => {
    const meta = l.metadata || {};
    return {
        id: l.lead_id, name: l.full_name || '', phone: l.primary_phone || '', email: l.primary_email || '',
        address: l.address_line1 || meta.address || '', parcelId: l.parcel_raw || '', campaign: meta.campaign || l.source_detail || '',
        motivationScore: l.priority_score, stage: meta.pushedToPipeline ? 'Pushed to Pipeline' : (FB_STAGE[l.status] || l.status),
        submittedTime: l.created_at, askingPrice: meta.askingPrice ?? null, arv: meta.arv ?? null, timeframe: meta.timeframe || '',
        reason: meta.reason || '', notes: meta.notes || '', created_at: l.created_at
    };
};

apiRouter.get('/facebook-leads', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT l.*, pe.full_name, pe.primary_phone, pe.primary_email, pr.address_line1, pr.parcel_raw
             FROM core.leads l LEFT JOIN core.people pe USING (person_id) LEFT JOIN core.properties pr ON pr.property_id = l.property_id
             WHERE l.first_source_code IN ('FB','IG','SOCAD','SOCIAL') ORDER BY l.created_at DESC LIMIT 2000`);
        res.json({ total: rows.length, leads: rows.map(fbLeadDto) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// New Facebook leads arrive through the Podio sync / webhooks (source mapped from Podio) or are added by hand.
apiRouter.post('/facebook-leads/sync', async (req, res) => {
    try {
        if (!configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN')) return res.status(503).json({ error: 'Podio is not configured, so there is nothing to sync.' });
        const before = await pool.query(`SELECT count(*)::int AS n FROM core.leads WHERE first_source_code = 'FB'`);
        const synced = await PodioSyncService.syncLeads();
        const after = await pool.query(`SELECT count(*)::int AS n FROM core.leads WHERE first_source_code = 'FB'`);
        res.json({ success: true, polledCount: synced, newLeads: Math.max(0, after.rows[0].n - before.rows[0].n), timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/facebook-leads', async (req, res) => {
    try {
        const { name, phone, email, address, campaign, timeframe, askingPrice, reason, notes } = req.body || {};
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
        const lead = await CrmService.createLead({
            sourceCode: 'FB', sourceDetail: campaign || null, contactMethod: 'WEBFORM', platformCode: 'FB', medium: 'PAID', actor: actorName(req),
            person: { name, phone, email },
            metadata: { campaign: campaign || null, timeframe: timeframe || null, askingPrice: askingPrice === undefined || askingPrice === '' ? null : Number(askingPrice), reason: reason || null, notes: notes || null, address: address || null }
        });
        res.status(201).json({ id: lead.lead_id, name, phone: phone || '', email: email || '', address: address || '', campaign: campaign || '', stage: FB_STAGE.NEW, created_at: lead.created_at });
    } catch (err) {
        res.status(err.status || 500).json({ error: err.message });
    }
});

apiRouter.patch('/facebook-leads/:id', async (req, res) => {
    try {
        const { stage, notes } = req.body || {};
        const { rows: [lead] } = await pool.query(
            `SELECT l.*, pe.full_name, pe.primary_phone, pe.primary_email, pr.address_line1 FROM core.leads l
             LEFT JOIN core.people pe USING (person_id) LEFT JOIN core.properties pr ON pr.property_id = l.property_id WHERE l.lead_id = $1`, [req.params.id]);
        if (!lead) return res.status(404).json({ error: 'Lead not found' });
        if (notes !== undefined) {
            await pool.query(`UPDATE core.leads SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('notes', $2::text), updated_at = now() WHERE lead_id = $1`, [lead.lead_id, notes]);
        }
        if (stage === 'Pushed to Pipeline') {
            const meta = lead.metadata || {};
            const address = lead.address_line1 || meta.address;
            if (!address) return res.status(400).json({ error: 'The lead needs a property address before it can enter the deal pipeline.' });
            await DealFunnelService.createDeal({
                id: 'funnel-fb-' + lead.lead_id, milestoneIndex: 0, address, seller: lead.full_name || 'Unnamed seller', phone: lead.primary_phone, email: lead.primary_email,
                buyPrice: meta.askingPrice, source: 'Facebook', notes: 'Pushed from Facebook Leads'
            }, actorName(req));
            await pool.query(`UPDATE core.leads SET metadata = coalesce(metadata, '{}'::jsonb) || '{"pushedToPipeline": true}'::jsonb, updated_at = now() WHERE lead_id = $1`, [lead.lead_id]);
        }
        const { rows: [fresh] } = await pool.query(
            `SELECT l.*, pe.full_name, pe.primary_phone, pe.primary_email, pr.address_line1, pr.parcel_raw FROM core.leads l
             LEFT JOIN core.people pe USING (person_id) LEFT JOIN core.properties pr ON pr.property_id = l.property_id WHERE l.lead_id = $1`, [req.params.id]);
        res.json(fbLeadDto(fresh));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Follow Ups (core.outreach_calls) ---
const followUpDto = r => {
    const seller = r.contact_name || '';
    return {
        id: r.id, seller, address: r.property_address || '', parcelId: r.parcel_raw || '', phone: r.phone || '', email: '',
        cadenceStage: r.cadence_stage || '', motivation: r.priority === 'High' || r.priority === 'Overdue' ? 'Hot' : '', channel: 'Call',
        lastOffer: null, arv: null, dueDate: r.due_label || '', dueUrgency: r.priority === 'Overdue' ? 'urgent' : 'medium',
        activityCount: r.activity_count || 0, assignedRep: '', repInitials: seller.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2),
        status: r.status, notes: r.notes || '', created_at: r.created_at
    };
};

apiRouter.get('/follow-ups', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT c.*, p.parcel_raw, (SELECT count(*)::int FROM core.interactions i WHERE c.property_id IS NOT NULL AND i.property_id = c.property_id) AS activity_count
             FROM core.outreach_calls c LEFT JOIN core.properties p ON c.property_id = p.property_id
             WHERE c.status <> 'COMPLETED'
             ORDER BY CASE c.priority WHEN 'Overdue' THEN 1 WHEN 'High' THEN 2 ELSE 3 END, c.created_at ASC`);
        const followUps = rows.map(followUpDto);
        res.json({ total: followUps.length, followUps });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/follow-ups', async (req, res) => {
    try {
        const seller = req.body.seller || req.body.name;
        const address = req.body.address || req.body.property_address;
        const { phone, cadenceStage, priority, notes, propertyId } = req.body || {};
        if (!seller || !phone) return res.status(400).json({ error: 'A contact name and phone number are required.' });
        const { rows: [row] } = await pool.query(
            `INSERT INTO core.outreach_calls (id, contact_name, phone, property_address, property_id, cadence_stage, priority, notes, status, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',NOW()) RETURNING *`,
            ['call-' + crypto.randomUUID(), seller, phone, address || null, propertyId || null, cadenceStage || null, ['High', 'Overdue', 'Normal'].includes(priority) ? priority : 'Normal', notes || null]);
        await audit(pool, { actor: actorName(req), action: 'FOLLOW_UP_CREATED', entityType: 'FOLLOW_UP', entityId: crypto.randomUUID(), diff: { followUpId: row.id } });
        res.status(201).json(followUpDto(row));
    } catch (err) {
        res.status(err.code === '22P02' || err.code === '23503' ? 400 : 500).json({ error: err.message });
    }
});

apiRouter.patch('/follow-ups/:id', async (req, res) => {
    try {
        const { status, priority, notes, cadenceStage } = req.body || {};
        const { rows: [row] } = await pool.query(
            `UPDATE core.outreach_calls SET status = coalesce($2, status), priority = coalesce($3, priority), notes = coalesce($4, notes),
               cadence_stage = coalesce($5, cadence_stage), updated_at = now() WHERE id = $1 RETURNING *`,
            [req.params.id, ['PENDING', 'COMPLETED'].includes(status) ? status : null, ['High', 'Overdue', 'Normal'].includes(priority) ? priority : null, notes ?? null, cadenceStage ?? null]);
        if (!row) return res.status(404).json({ error: 'Follow-up not found' });
        res.json(followUpDto(row));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Direct Mail ---
apiRouter.get('/direct-mail', async (req, res) => {
    try {
        let directMail = db.data.crm.direct_mail || [];
        // Filter out leftover test suites / test runs
        directMail = directMail.filter(b => b && b.batchCode && !b.batchCode.startsWith('DM-TEST-'));
        const counts = await DirectMailTrackerService.getBatchScanCounts();
        const mailBatches = directMail.map(batch => ({
            ...batch,
            scans: counts.get(batch.batchCode)?.scans ?? 0,
            conversions: counts.get(batch.batchCode)?.conversions ?? 0
        }));
        res.json({ total: mailBatches.length, mailBatches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/direct-mail', async (req, res) => {
    try {
        const { name, audience, zips, format, quantity, dropDate, costPerPiece } = req.body;
        const actor = actorName(req);
        if (!name) return res.status(400).json({ error: 'Batch name is required' });
        if (!audience || !zips || !format) return res.status(400).json({ error: 'Audience, ZIP codes and format are required' });

        const batchId = Date.now();
        const batchUuid = crypto.randomUUID();
        const batchCode = `DM-${new Date().getUTCFullYear()}-${batchUuid.slice(0, 8).toUpperCase()}`;
        const qty = Number(quantity || req.body.count || 500);
        if (!Number.isSafeInteger(qty) || qty < 1) return res.status(400).json({ error: 'Quantity must be a positive whole number' });
        // The per-piece price comes from the print vendor quote the user enters; it is never assumed.
        const unitCost = costPerPiece === undefined || costPerPiece === '' ? null : Number(costPerPiece);
        if (unitCost !== null && !(unitCost >= 0)) return res.status(400).json({ error: 'costPerPiece must be a non-negative number' });
        const cost = unitCost === null ? null : Math.round(qty * unitCost * 100) / 100;

        const newBatch = {
            id: batchId,
            batch_uuid: batchUuid,
            batchCode,
            name,
            audience,
            zips,
            format,
            quantity: qty,
            cost,
            calls: 0,
            responseRate: '0.00',
            status: 'Draft',
            statusClass: 'status-draft',
            dropDate: dropDate || null,
            created_at: new Date().toISOString()
        };

        if (!db.data.crm.direct_mail) db.data.crm.direct_mail = [];
        db.data.crm.direct_mail.unshift(newBatch);
        db.persist();

        // Audit Trail in PostgreSQL RDS
        try {
            await pool.query(
                `INSERT INTO audit.audit_events (audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at)
                 VALUES ($1, $2, 'DIRECT_MAIL_BATCH_CREATED', 'DIRECT_MAIL_BATCH', $3, $4, $5, NOW())`,
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
                    `Direct Mail Batch Saved: ${batchCode}`,
                    `${qty} planned pieces (${newBatch.format}) for ${newBatch.zips}.`,
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

// ============================================================================
// Intelligent Direct Mail & CrownKey QR Scanner Tracking
// ============================================================================
const mailTrackingUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const mailTrackingKey = /^[a-z0-9]+(?:-[a-z0-9]+){2,}$/i;

function validMailTrackingKey(key) {
    return typeof key === 'string' && key.length <= 100 && mailTrackingKey.test(key);
}

apiRouter.head('/track/qr/:code', (_req, res) => res.set('Cache-Control', 'no-store').status(204).end());

apiRouter.get('/track/qr/:code', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const pieceId = req.query.piece;
    if (!validMailTrackingKey(req.params.code) ||
        (pieceId !== undefined && (typeof pieceId !== 'string' || !mailTrackingUuid.test(pieceId)))) {
        return res.status(400).send('Invalid mailer link.');
    }
    try {
        const result = await DirectMailTrackerService.recordScan(req.params.code, {
            pieceId,
            ip: req.ip,
            userAgent: req.get('user-agent'),
            city: req.get('x-vercel-ip-city'),
            region: req.get('x-vercel-ip-country-region')
        });
        if (!result) return res.status(404).send('Mail piece unavailable.');
        if (req.get('accept')?.includes('application/json')) {
            return res.json({ ok: true, tracked: true, scan: result, destinationUrl: result.ctaUrl });
        }
        res.redirect(result.ctaUrl);
    } catch (err) {
        console.error('[QR Scan Track Error]', err.message);
        res.status(503).send('Mail tracking is temporarily unavailable.');
    }
});

function sendMailOfferPage(res, status, title, content) {
    res.set({
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"
    });
    res.status(status).type('html').send(`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title} | HushHawk</title>
<style>body{font:1rem system-ui;background:#f4f5f7;color:#102034;margin:0;padding:2rem 1rem}main{background:white;max-width:30rem;margin:auto;padding:2rem;border-radius:.5rem}label{display:block;margin:1rem 0}input:not([type=checkbox]){display:block;box-sizing:border-box;width:100%;padding:.65rem}button{background:#102034;color:white;padding:.75rem 1rem;border:0;border-radius:.25rem;font:inherit}</style>
<main><p>HushHawk Acquisitions</p><h1>${title}</h1>${content}</main></html>`);
}

function showMailCallbackForm(res, status = 200) {
    const error = status === 400 ? '<p>Please enter a name and valid phone number and confirm that we may contact you.</p>' : '';
    sendMailOfferPage(res, status, 'Request a callback', `${error}
<p>Leave your contact details to discuss the mailer you received.</p>
<form method="post">
<label>Name<input name="name" autocomplete="name" maxlength="100" required></label>
<label>Phone<input name="phone" type="tel" autocomplete="tel" maxlength="30" required></label>
<label><input type="checkbox" name="consent" value="yes" required> HushHawk may call me about this mailer.</label>
<button type="submit">Request callback</button>
</form>`);
}

apiRouter.get('/track/offer/:scanId', async (req, res) => {
    if (!mailTrackingUuid.test(req.params.scanId)) return res.sendStatus(404);
    const { rows: [scan] } = await pool.query(
        'SELECT converted_at FROM core.direct_mail_scans WHERE scan_id = $1', [req.params.scanId]
    );
    if (!scan) return res.sendStatus(404);
    if (scan.converted_at) return sendMailOfferPage(res, 200, 'Request received', '<p>Thank you for contacting HushHawk.</p>');
    showMailCallbackForm(res);
});

apiRouter.post('/track/offer/:scanId', urlencoded({ extended: false, limit: '2kb', parameterLimit: 3 }), async (req, res) => {
    if (!mailTrackingUuid.test(req.params.scanId)) return res.sendStatus(404);
    const { name, phone, consent } = req.body || {};
    const digits = typeof phone === 'string' && /^[+()\d .-]{7,30}$/.test(phone) ? phone.replace(/\D/g, '') : '';
    if (typeof name !== 'string' || !name.trim() || name.length > 100 ||
        digits.length < 10 || digits.length > 15 || consent !== 'yes') {
        return showMailCallbackForm(res, 400);
    }
    if (!(await DirectMailTrackerService.recordCallbackRequest(req.params.scanId, name.trim(), digits))) {
        return res.sendStatus(404);
    }
    res.redirect(303, req.originalUrl.split('?')[0]);
});

apiRouter.post('/direct-mail/track-scan', async (req, res) => {
    const { crownKey, pieceId, city, region } = req.body || {};
    if (!validMailTrackingKey(crownKey) ||
        (pieceId != null && (typeof pieceId !== 'string' || !mailTrackingUuid.test(pieceId)))) {
        return res.status(400).json({ error: 'A valid CrownKey and optional mail piece ID are required' });
    }
    const result = await DirectMailTrackerService.recordScan(crownKey, {
        pieceId, ip: req.ip, userAgent: req.get('user-agent'), city, region
    });
    if (!result) return res.status(404).json({ error: 'Mail piece unavailable' });
    res.status(201).json(result);
});

apiRouter.get('/direct-mail/stats-by-pillar', async (req, res) => {
    try {
        const stats = await DirectMailTrackerService.getStatsByPillar();
        res.json({ ok: true, stats });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/direct-mail/generate-piece', async (req, res) => {
    const { countyCode, pillarCode, identifier, address, ownerName, trackingPhone, batchCode, propertyId } = req.body || {};
    if (![countyCode, pillarCode, identifier, address].every(value => typeof value === 'string' && value.trim()) ||
        !validMailTrackingKey(`${countyCode}-${pillarCode}-${identifier}`) ||
        !Object.hasOwn(DirectMailTrackerService.PILLAR_MAP, pillarCode.toUpperCase()) ||
        (propertyId != null && (typeof propertyId !== 'string' || !mailTrackingUuid.test(propertyId)))) {
        return res.status(400).json({ error: 'A valid county, pillar, identifier and recipient address are required' });
    }
    const origin = new URL(process.env.DIRECT_MAIL_PUBLIC_URL || 'https://hushhawk-kohl.vercel.app').origin;
    const piece = await DirectMailTrackerService.generatePiece({
        countyCode, pillarCode, identifier, address: address.trim(), ownerName, trackingPhone,
        batchCode: batchCode || undefined, propertyId, origin
    });
    res.status(201).json({ ok: true, piece });
});

apiRouter.post('/direct-mail/simulate-scan', (req, res) => {
    res.status(410).json({ error: 'Simulated scans are disabled for Direct Mail reporting' });
});

// --- County Records ---
apiRouter.get('/county-records', async (req, res) => {
    try {
        let records = [];
        try {
            const { rows } = await pool.query(`
                SELECT
                    p.property_id, p.parcel_raw, p.parcel_match, p.address_line1, p.city, p.state_code, p.postal_code,
                    p.assessed_value, p.legal_description, p.property_type, p.created_at,
                    c.county_code, c.county_name,
                    per.full_name AS owner_name,
                    per.primary_phone AS owner_phone,
                    per.primary_email AS owner_email,
                    per.mailing_address AS owner_mailing_address,
                    pe.pillar_code AS distress_pillar,
                    pe.filing_amount AS delinquent_amount,
                    pe.event_date AS last_filing_date
                FROM core.properties p
                LEFT JOIN ref.counties c ON p.county_id = c.county_id
                LEFT JOIN core.leads l ON l.property_id = p.property_id
                LEFT JOIN core.people per ON l.person_id = per.person_id
                LEFT JOIN core.pillar_events pe ON pe.property_id = p.property_id
                ORDER BY p.created_at DESC
            `);
            if (rows && rows.length > 0) {
                const seen = new Set();
                records = rows
                    .filter(r => {
                        if (seen.has(r.property_id)) return false;
                        seen.add(r.property_id);
                        return true;
                    })
                    .map((r, idx) => {
                        const assessed = Number(r.assessed_value) || 0;
                        // Market value and equity need an AVM and mortgage balance; neither is available, so they are not estimated.
                        const estValue = null;
                        const equity = null;
                        const countyName = r.county_name || r.county_code || '';
                        const ownerName = r.owner_name || null;
                        const PILLAR_LABELS = {
                            FC: 'Foreclosure',
                            PFC: 'Pre-Foreclosure',
                            TAX: 'Tax Delinquency',
                            CODE: 'Code Violation',
                            PRB: 'Probate / Estate',
                            VAC: 'Vacant Property',
                            ML: 'Municipal Lien',
                            EVICT: 'Eviction / Landlord',
                            ABS: 'Absentee High Equity'
                        };
                        const distressLabel = r.distress_pillar ? (PILLAR_LABELS[r.distress_pillar] || r.distress_pillar) : null;
                        const tags = [];
                        if (ownerName) tags.push('Absentee Owner');
                        if (equity > 50000) tags.push('High Equity');
                        if (distressLabel) tags.push(distressLabel);

                        return {
                            id: r.property_id || `rec-${idx}`,
                            crownKey: `${r.county_code || 'DUV'}-${r.parcel_raw || 'PARCEL-' + idx}`,
                            parcel: r.parcel_raw || r.parcel_match,
                            address: r.address_line1 || '',
                            city: r.city || '',
                            county: countyName,
                            zip: r.postal_code || '',
                            owner: ownerName,
                            ownerType: ownerName ? 'Absentee Owner' : null,
                            mailingAddress: r.owner_mailing_address || null,
                            assessedValue: assessed || null,
                            estimatedValue: estValue || null,
                            equity: equity || null,
                            equityPercent: (assessed > 0 && equity > 0) ? Math.round((equity / assessed) * 100) : null,
                            legalDescription: r.legal_description || null,
                            distress: distressLabel,
                            distressClass: r.distress_pillar ? `distress-${r.distress_pillar.toLowerCase()}` : 'distress-tax',
                            delinquentAmount: r.delinquent_amount ? Number(r.delinquent_amount) : null,
                            lastFiling: r.last_filing_date ? new Date(r.last_filing_date).toISOString().split('T')[0] : null,
                            skipStatus: r.owner_phone ? 'Enriched' : 'Unskipped',
                            status: 'Active Record',
                            tags: tags,
                            phone: r.owner_phone || null,
                            email: r.owner_email || null
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

// Push County Records into Real Skip-Tracing Pipeline (PostgreSQL)
apiRouter.post('/county-records/push-to-skip-trace', async (req, res) => {
    try {
        const { recordIds = [], records = [] } = req.body;
        const targetIds = recordIds.length ? recordIds : (Array.isArray(records) ? records.map(r => r.id) : []);
        if (!targetIds.length) return res.status(400).json({ error: 'No records selected for skip tracing' });

        const insertedLeads = [];
        const now = new Date();
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        for (const id of targetIds) {
            if (typeof id !== 'string' || !UUID_REGEX.test(id)) continue;
            const leadId = crypto.randomUUID();
            const { rowCount } = await pool.query(
                `INSERT INTO core.leads (lead_id, property_id, first_source_code, status, created_at)
                 SELECT $1, property_id, 'COUNTY_TAX_DELINQUENT', 'QUEUED_FOR_SKIP_TRACE', $3
                 FROM core.properties WHERE property_id = $2`,
                [leadId, id, now]
            );
            if (!rowCount) continue;
            insertedLeads.push(leadId);
        }


        // Audit log
        db.logAudit({
            actor: actorName(req),
            action: 'COUNTY_RECORDS_PUSHED_TO_SKIP_TRACE',
            entityType: 'SKIP_TRACE_QUEUE',
            entityId: `BATCH-${Date.now()}`,
            redactedDiff: { count: targetIds.length }
        });

        res.status(200).json({
            ok: true,
            pushedCount: targetIds.length,
            message: `Successfully pushed ${targetIds.length} county parcel records into PostgreSQL Skip-Trace enrichment queue.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Communications (Real PostgreSQL Database) ---
apiRouter.get('/communications', async (req, res) => {
    try {
        const threadsQuery = `
            SELECT 
                t.id,
                t.platform_id,
                t.contact_name,
                t.contact_phone,
                t.contact_email,
                t.property_id,
                t.property_address,
                t.property_city,
                t.property_state,
                t.property_zip,
                t.property_specs,
                t.lead_score,
                t.priority,
                t.status,
                t.unread_count,
                t.last_message_preview,
                t.last_message_at,
                p.parcel_raw
            FROM core.conversation_desk_threads t
            LEFT JOIN core.properties p ON t.property_id = p.property_id
            ORDER BY t.last_message_at DESC NULLS LAST
        `;
        const { rows: threadsRows } = await pool.query(threadsQuery);

        const threadIds = threadsRows.map(r => r.id);
        let messagesByThread = {};
        if (threadIds.length > 0) {
            const msgsQuery = `
                SELECT id, thread_id, sender_type, sender_name, content, sent_at
                FROM core.conversation_desk_messages
                WHERE thread_id = ANY($1)
                ORDER BY sent_at ASC
            `;
            const { rows: msgs } = await pool.query(msgsQuery, [threadIds]);
            for (const m of msgs) {
                if (!messagesByThread[m.thread_id]) messagesByThread[m.thread_id] = [];
                messagesByThread[m.thread_id].push({
                    id: m.id,
                    sender: m.sender_type === 'lead' ? 'contact' : 'rep',
                    name: m.sender_name,
                    text: m.content,
                    time: new Date(m.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
                    outgoing: m.sender_type !== 'lead'
                });
            }
        }

        const threads = threadsRows.map((t) => {
            let commType = 'SMS';
            if (t.platform_id === 'smrtphone' || t.platform_id === 'calls') commType = 'Calls';
            else if (t.platform_id === 'email' || t.platform_id === 'gmail') commType = 'Email';
            else if (['zillow', 'trulia', 'homesdotcom', 'realtor'].includes(t.platform_id)) commType = 'Buyers';
            else if (t.platform_id === 'podio') commType = 'Podio';

            return {
                id: t.id,
                contact: t.contact_name,
                phone: t.contact_phone || '',
                email: t.contact_email,
                address: t.property_address || '',
                property_id: t.property_id,
                parcelId: t.parcel_raw,
                type: commType,
                role: t.status || '',
                source: t.platform_id ? t.platform_id.toUpperCase() : 'CRM',
                lastMessage: t.last_message_preview || '',
                time: t.last_message_at ? new Date(t.last_message_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
                unread: (t.unread_count || 0) > 0,
                messages: messagesByThread[t.id] || []
            };
        });

        res.json({ total: threads.length, threads });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/communications/messages', async (req, res, next) => {
    try {
        const session = await getAuthenticatedSession(req);
        if (!session) return res.status(401).json({ error: 'Sign in again to send a message.' });
        if (!session.user.permissions.includes('/communications')) {
            return res.status(403).json({ error: 'Your role cannot send messages from Communications.' });
        }
        const { threadId, text } = req.body;
        const message = typeof text === 'string' ? text.trim() : '';
        if (!message || message.length > 10000) {
            return res.status(400).json({ error: 'Enter a message of 1 to 10,000 characters.' });
        }
        const { rows: [thread] } = await pool.query(
            'SELECT property_id, contact_name, property_address, contact_phone, contact_email, platform_id FROM core.conversation_desk_threads WHERE id = $1',
            [threadId]
        );
        if (!thread) return res.status(404).json({ error: 'Conversation not found.' });
        const isEmail = ['email', 'gmail'].includes(thread.platform_id) || (!thread.contact_phone && Boolean(thread.contact_email));
        const to = isEmail ? thread.contact_email : thread.contact_phone;
        if (!to && !META_PLATFORMS[thread.platform_id]) return res.status(409).json({ error: 'This contact has no address or number for the selected channel.' });

        const subject = 'Property update from HushHawk';
        const carrier = await (META_PLATFORMS[thread.platform_id] ? MetaService.sendToThread(threadId, message) : isEmail
            ? DeliveryService.email({ to, subject, text: message, leadName: thread.contact_name, propertyAddress: thread.property_address })
            : DeliveryService.text({ to, message, leadName: thread.contact_name, propertyAddress: thread.property_address }));
        if (!carrier?.success) {
            return res.status(503).json({ error: carrier?.provider === 'meta' && carrier.error ? `${carrier.error} Your draft was kept.` : 'The delivery provider could not accept this message. Your draft was kept.' });
        }

        const id = `msg-${crypto.randomUUID()}`;
        const now = new Date();
        let historySaved = false;
        try {
            await pool.query(
                `WITH saved AS (
                    INSERT INTO core.conversation_desk_messages (id, thread_id, sender_type, sender_name, content, sent_at)
                    VALUES ($1, $2, 'agent', $3, $4, $5) RETURNING id
                 ), updated AS (
                    UPDATE core.conversation_desk_threads
                    SET last_message_preview = $4, last_message_at = $5, updated_at = $5
                    WHERE id = $2 AND (last_message_at IS NULL OR last_message_at <= $5)
                 )
                 INSERT INTO core.interactions (property_id, method, direction, actor_id, result, notes, occurred_at)
                 SELECT $6, $7, 'OUTBOUND', $8, 'ACCEPTED', $9, $5 FROM saved`,
                [id, threadId, session.user.name, message, now, thread.property_id,
                    thread.platform_id === 'whatsapp' ? 'WHATSAPP' : META_PLATFORMS[thread.platform_id] ? 'DM' : isEmail ? 'EMAIL' : 'TEXT', session.user.id, `Accepted by ${carrier.provider}`]
            );
            historySaved = true;
        } catch (error) {
            console.error('[Communications history unavailable]', error.message);
        }
        return res.status(historySaved ? 201 : 202).json({ accepted: true, historySaved });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// TEAM CHAT & PROPERTY LAYER MESSENGER (every signed-in team member)
// ============================================================================

apiRouter.get('/chat/threads', async (req, res) => {
    try {
        const activeUser = actorName(req);
        let threads = [];
        try {
            const query = `
                SELECT 
                    t.id, t.title, t.thread_type, t.property_id, t.crownkey, t.created_by,
                    t.last_message_text, t.last_message_at, t.last_message_sender, t.created_at, t.updated_at,
                    p.address_line1, p.city, p.state_code, p.postal_code, p.parcel_raw,
                    COUNT(m.id) FILTER (WHERE m.sender_name <> $1 AND NOT ($1 = ANY(m.read_by)) AND NOT ('*' = ANY(m.read_by))) AS unread_count,
                    COUNT(m.id) AS total_messages
                FROM core.partner_chat_threads t
                LEFT JOIN core.properties p ON t.property_id = p.property_id
                LEFT JOIN core.partner_chat_messages m ON t.id = m.thread_id
                GROUP BY t.id, p.address_line1, p.city, p.state_code, p.postal_code, p.parcel_raw
                ORDER BY t.last_message_at DESC NULLS LAST, t.updated_at DESC
            `;
            const { rows } = await pool.query(query, [activeUser]);
            threads = rows.map(r => ({
                id: r.id,
                title: r.title,
                thread_type: r.thread_type,
                property_id: r.property_id,
                crownkey: r.crownkey,
                created_by: r.created_by,
                last_message_text: r.last_message_text,
                last_message_at: r.last_message_at,
                last_message_sender: r.last_message_sender,
                unread_count: parseInt(r.unread_count || '0', 10),
                total_messages: parseInt(r.total_messages || '0', 10),
                property: r.property_id ? {
                    property_id: r.property_id,
                    address: r.address_line1,
                    city: r.city,
                    state: r.state_code,
                    zip: r.postal_code,
                    parcel: r.parcel_raw
                } : null
            }));
        } catch (dbErr) {
            throw dbErr;
        }

        const { rows: team } = await pool.query(`SELECT full_name FROM core.users WHERE status = 'ACTIVE' AND full_name <> $1 ORDER BY full_name`, [activeUser]);
        const totalUnread = threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);

        res.json({
            ok: true,
            active_user: activeUser,
            partner_user: team[0]?.full_name || '',
            participants: team.map(t => t.full_name),
            total_unread: totalUnread,
            threads
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/chat/threads', async (req, res) => {
    try {
        const { title, thread_type, property_id, created_by } = req.body;
        const sender = created_by || actorName(req);

        // If thread for property already exists, return existing
        if (property_id) {
            const existing = await pool.query(
                `SELECT * FROM core.partner_chat_threads WHERE property_id = $1 LIMIT 1`,
                [property_id]
            );
            if (existing.rows.length > 0) {
                return res.json({ ok: true, thread: existing.rows[0], created: false });
            }
        }

        // Fetch property details for crownkey & title
        let propTitle = title;
        let crownkey = 'ALL-PARTNER-CHANNEL';
        if (property_id) {
            const propRes = await pool.query(
                `SELECT address_line1, city, state_code, postal_code, parcel_raw FROM core.properties WHERE property_id = $1`,
                [property_id]
            );
            if (propRes.rows.length > 0) {
                const p = propRes.rows[0];
                propTitle = `${p.address_line1}, ${p.city} ${p.state_code}`;
                crownkey = `DUV-${p.parcel_raw || p.address_line1}`;
            }
        }

        const insertQuery = `
            INSERT INTO core.partner_chat_threads 
                (title, thread_type, property_id, crownkey, created_by, last_message_text, last_message_at, last_message_sender)
            VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
            RETURNING *
        `;
        const { rows } = await pool.query(insertQuery, [
            propTitle || 'New Conversation',
            property_id ? 'property' : (thread_type || 'general'),
            property_id || null,
            crownkey,
            sender,
            'Thread created',
            sender
        ]);

        res.status(201).json({ ok: true, thread: rows[0], created: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/chat/threads/:threadId/messages', async (req, res) => {
    try {
        const { threadId } = req.params;
        const activeUser = actorName(req);

        // Fetch thread
        const threadRes = await pool.query(`
            SELECT t.*, p.address_line1, p.city, p.state_code, p.postal_code, p.parcel_raw
            FROM core.partner_chat_threads t
            LEFT JOIN core.properties p ON t.property_id = p.property_id
            WHERE t.id = $1
        `, [threadId]);

        if (threadRes.rows.length === 0) {
            return res.status(404).json({ error: 'Thread not found' });
        }

        // Fetch messages
        const msgsRes = await pool.query(`
            SELECT * FROM core.partner_chat_messages
            WHERE thread_id = $1
            ORDER BY created_at ASC
        `, [threadId]);

        // Auto-mark as read for activeUser
        await pool.query(`
            UPDATE core.partner_chat_messages
            SET read_by = array_append(read_by, $2)
            WHERE thread_id = $1 AND NOT ($2 = ANY(read_by)) AND NOT ('*' = ANY(read_by))
        `, [threadId, activeUser]);

        res.json({
            ok: true,
            thread: threadRes.rows[0],
            messages: msgsRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/chat/threads/:threadId/messages', async (req, res) => {
    try {
        const { threadId } = req.params;
        const {
            sender_name,
            sender_role,
            message_text,
            tag,
            attachments,
            reply_to_id,
            reply_to_sender,
            reply_to_text
        } = req.body;
        if (!message_text || !message_text.trim()) {
            return res.status(400).json({ error: 'Message text is required' });
        }

        const sender = actorName(req);
        const role = req.user?.roleName || req.user?.role || null;

        // Get thread for property_id & title
        const threadRes = await pool.query(`SELECT * FROM core.partner_chat_threads WHERE id = $1`, [threadId]);
        if (threadRes.rows.length === 0) {
            return res.status(404).json({ error: 'Thread not found' });
        }
        const thread = threadRes.rows[0];

        // Insert message
        const insertMsg = `
            INSERT INTO core.partner_chat_messages
                (thread_id, sender_id, sender_name, sender_role, message_text, property_id, tag, attachments, read_by, reply_to_id, reply_to_sender, reply_to_text)
            VALUES ($1, $13, $2, $3, $4, $5, $6, $7, ARRAY[$8]::text[], $9, $10, $11)
            RETURNING *
        `;
        const { rows: msgRows } = await pool.query(insertMsg, [
            threadId,
            sender,
            role,
            message_text.trim(),
            thread.property_id || null,
            tag || null,
            JSON.stringify(attachments || []),
            sender,
            reply_to_id || null,
            reply_to_sender || null,
            reply_to_text || null,
            req.user?.id || null
        ]);

        // Update thread
        await pool.query(`
            UPDATE core.partner_chat_threads
            SET last_message_text = $1, last_message_at = now(), last_message_sender = $2, updated_at = now()
            WHERE id = $3
        `, [message_text.trim(), sender, threadId]);

        // If tagged to property, record into core.interactions
        if (thread.property_id) {
            try {
                await pool.query(`
                    INSERT INTO core.interactions
                        (interaction_id, property_id, method, direction, actor_id, result, notes, occurred_at)
                    VALUES
                        (gen_random_uuid(), $1, 'TEXT', 'OUTBOUND', $2, 'RECORDED', $3, now())
                `, [
                    thread.property_id,
                    sender,
                    `[Partner iMessage] ${sender}: ${message_text.slice(0, 300)}`
                ]);
            } catch (intErr) {
                console.warn('[Partner Chat Interaction Warn]', intErr.message);
            }
        }

        // Emit real-time operational notification
        try {
            await pool.query(`
                INSERT INTO ops.notifications (title, body, category, is_read, metadata)
                VALUES ($1, $2, 'PARTNER_CHAT', false, $3)
            `, [
                `New message from ${sender} (${thread.title})`,
                message_text.slice(0, 120),
                JSON.stringify({ threadId, property_id: thread.property_id, sender })
            ]);
        } catch (notifErr) {
            console.warn('[Notification insert warn]', notifErr.message);
        }

        res.status(201).json({
            ok: true,
            message: msgRows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/chat/threads/:threadId/read', async (req, res) => {
    try {
        const { threadId } = req.params;
        const activeUser = actorName(req);

        await pool.query(`
            UPDATE core.partner_chat_messages
            SET read_by = array_append(read_by, $2)
            WHERE thread_id = $1 AND NOT ($2 = ANY(read_by)) AND NOT ('*' = ANY(read_by))
        `, [threadId, activeUser]);

        res.json({ ok: true, threadId, user_name: activeUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.delete('/chat/messages/:messageId', async (req, res) => {
    try {
        const { messageId } = req.params;
        const msgRes = await pool.query(`SELECT thread_id, property_id FROM core.partner_chat_messages WHERE id = $1`, [messageId]);
        if (msgRes.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }
        const { thread_id: threadId } = msgRes.rows[0];

        // Delete message
        await pool.query(`DELETE FROM core.partner_chat_messages WHERE id = $1`, [messageId]);

        // Recalculate latest message in thread
        const lastMsgRes = await pool.query(`
            SELECT message_text, sender_name, created_at 
            FROM core.partner_chat_messages 
            WHERE thread_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `, [threadId]);

        if (lastMsgRes.rows.length > 0) {
            await pool.query(`
                UPDATE core.partner_chat_threads
                SET last_message_text = $1, last_message_sender = $2, last_message_at = $3, updated_at = now()
                WHERE id = $4
            `, [lastMsgRes.rows[0].message_text, lastMsgRes.rows[0].sender_name, lastMsgRes.rows[0].created_at, threadId]);
        } else {
            await pool.query(`
                UPDATE core.partner_chat_threads
                SET last_message_text = NULL, last_message_sender = NULL, updated_at = now()
                WHERE id = $1
            `, [threadId]);
        }

        res.json({ ok: true, deleted_id: messageId, threadId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/chat/presence', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT u.full_name AS user_name, u.full_name, coalesce(r.name, u.role) AS role, pp.last_active_at, pp.current_device,
                   CASE WHEN pp.last_active_at > now() - interval '5 minutes' THEN coalesce(pp.status, 'online') ELSE 'offline' END AS status
            FROM core.users u
            LEFT JOIN core.roles r ON r.role_key = u.role
            LEFT JOIN core.partner_presence pp ON pp.user_name = u.full_name
            WHERE u.status = 'ACTIVE' ORDER BY u.full_name`);
        res.json({ ok: true, presence: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/chat/presence', async (req, res) => {
    try {
        const { status, current_device } = req.body || {};
        await pool.query(`
            INSERT INTO core.partner_presence (user_name, full_name, status, role, last_active_at, current_device)
            VALUES ($1, $1, $2, $3, now(), $4)
            ON CONFLICT (user_name) DO UPDATE SET status = EXCLUDED.status, last_active_at = now(), current_device = coalesce(EXCLUDED.current_device, core.partner_presence.current_device)`,
            [actorName(req), ['online', 'away', 'offline'].includes(status) ? status : 'online', req.user?.roleName || req.user?.role || null, current_device || null]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/chat/search-properties', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        let query = `
            SELECT p.property_id, p.address_line1, p.city, p.state_code, p.postal_code, p.parcel_raw,
                   t.id as existing_thread_id
            FROM core.properties p
            LEFT JOIN core.partner_chat_threads t ON p.property_id = t.property_id
        `;
        let params = [];
        if (q) {
            query += ` WHERE p.address_line1 ILIKE $1 OR p.city ILIKE $1 OR p.parcel_raw ILIKE $1 OR p.postal_code ILIKE $1 `;
            params.push(`%${q}%`);
        }
        query += ` ORDER BY p.address_line1 ASC LIMIT 15`;
        const { rows } = await pool.query(query, params);
        res.json({ ok: true, properties: rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/properties/:propertyId/partner-chat', async (req, res) => {
    try {
        const { propertyId } = req.params;
        const threadRes = await pool.query(`
            SELECT * FROM core.partner_chat_threads WHERE property_id = $1 LIMIT 1
        `, [propertyId]);

        if (threadRes.rows.length === 0) {
            return res.json({ ok: true, thread: null, messages: [] });
        }

        const thread = threadRes.rows[0];
        const msgsRes = await pool.query(`
            SELECT * FROM core.partner_chat_messages WHERE thread_id = $1 ORDER BY created_at ASC
        `, [thread.id]);

        res.json({
            ok: true,
            thread,
            messages: msgsRes.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Calendar Events ---
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Dates are calendar days (YYYY-MM-DD) and are never converted through a timezone.
function describeDay(isoDate) {
    const [y, m, d] = isoDate.split('-').map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return { dayNum: String(d), month: MONTH_NAMES[m - 1].toUpperCase(), dateString: `${DAY_NAMES[weekday]}, ${MONTH_NAMES[m - 1]} ${d}` };
}

apiRouter.get('/calendar', (req, res) => {
    const events = [...db.data.crm.calendar_events].sort((a, b) => `${a.date} ${a.sortTime || ''}`.localeCompare(`${b.date} ${b.sortTime || ''}`));
    res.json({ total: events.length, events });
});

apiRouter.post('/calendar', (req, res) => {
    try {
        const { title, type, date, time, address, rep, notes, contactName, phone, lockbox, parcelId } = req.body || {};
        if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title is required' });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return res.status(400).json({ error: 'A date in YYYY-MM-DD format is required' });
        if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return res.status(400).json({ error: 'That date is not valid' });
        if (!time || !String(time).trim()) return res.status(400).json({ error: 'A time is required' });

        const event = {
            id: crypto.randomUUID(), date, ...describeDay(date), time: String(time).trim(), title: String(title).trim(),
            address: address || '', parcelId: parcelId || '', type: type || '', rep: rep || actorName(req), contactName: contactName || '',
            phone: phone || '', lockbox: lockbox || '', notes: notes || '', completed: false, created_by: actorName(req), created_at: new Date().toISOString()
        };
        db.data.crm.calendar_events.unshift(event);
        db.persist();
        db.logAudit({ actor: actorName(req), action: 'CALENDAR_EVENT_CREATED', entityType: 'CALENDAR_EVENT', entityId: event.id, redactedDiff: { title: event.title, date } });
        res.status(201).json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/calendar/events/:id', (req, res) => {
    const event = db.data.crm.calendar_events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Appointment not found' });
    for (const key of ['title', 'time', 'address', 'rep', 'notes', 'contactName', 'phone', 'lockbox', 'type', 'completed']) {
        if (req.body && key in req.body) event[key] = req.body[key];
    }
    if (req.body?.date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(req.body.date)) return res.status(400).json({ error: 'A date in YYYY-MM-DD format is required' });
        Object.assign(event, { date: req.body.date, ...describeDay(req.body.date) });
    }
    db.persist();
    res.json(event);
});

apiRouter.delete('/calendar/events/:id', (req, res) => {
    const index = db.data.crm.calendar_events.findIndex(e => e.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: 'Appointment not found' });
    const [removed] = db.data.crm.calendar_events.splice(index, 1);
    db.persist();
    db.logAudit({ actor: actorName(req), action: 'CALENDAR_EVENT_DELETED', entityType: 'CALENDAR_EVENT', entityId: removed.id, redactedDiff: { title: removed.title } });
    res.json({ success: true });
});

// ============================================================================
// Team Management, Role-Based Access Control (RBAC) & Audit Trails
// ============================================================================

async function getAuthenticatedSession(req) {
    const token = req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    const session = await RbacService.getSession(token);
    return session ? { token, user: session.user } : null;
}

async function requireTeamAdmin(req, res, next) {
    res.set('Cache-Control', 'no-store');
    try {
        const session = await getAuthenticatedSession(req);
        if (!session) return res.status(401).json({ error: 'Sign in again to continue.' });
        if (!session.user.isAdmin) return res.status(403).json({ error: 'Administrator access is required.' });
        req.teamActor = session.user;
        next();
    } catch (error) {
        next(error);
    }
}

apiRouter.use(['/roles', '/rbac', '/team', '/audit'], requireTeamAdmin);

// 1. Roles & Section Permissions
const handleGetRoles = async (req, res) => {
    try {
        const roles = await RbacService.getRoles();
        res.json({ total: roles.length, roles });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const handleCreateRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await RbacService.createRole({ name, description, permissions, actor: req.teamActor });
        res.status(201).json({ success: true, role });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const handleUpdateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        const role = await RbacService.updateRole(id, { name, description, permissions, actor: req.teamActor });
        res.json({ success: true, role });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

const handleDeleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const actor = req.teamActor;
        const result = await RbacService.deleteRole(id, actor);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

apiRouter.get('/roles', handleGetRoles);
apiRouter.get('/rbac/roles', handleGetRoles);
apiRouter.post('/roles', handleCreateRole);
apiRouter.post('/rbac/roles', handleCreateRole);
apiRouter.put('/roles/:id', handleUpdateRole);
apiRouter.put('/rbac/roles/:id', handleUpdateRole);
apiRouter.delete('/roles/:id', handleDeleteRole);
apiRouter.delete('/rbac/roles/:id', handleDeleteRole);

apiRouter.get('/rbac/sections', (req, res) => {
    res.json({
        total: ALL_SECTIONS.length,
        sections: ALL_SECTIONS
    });
});

// 2. Team Members Management
apiRouter.get('/team', async (req, res) => {
    try {
        const members = await RbacService.getTeamMembers();
        res.json({ total: members.length, members });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/team', async (req, res) => {
    try {
        const { name, email, phone, role, password, permissions } = req.body;
        const newMember = await RbacService.createTeamMember({
            name,
            email,
            phone,
            role,
            password,
            permissions,
            actor: req.teamActor
        });
        res.status(201).json(newMember);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.patch('/team/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await RbacService.updateTeamMember(id, { ...req.body, actor: req.teamActor });
        res.json({ success: true, member: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.put('/team/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await RbacService.updateTeamMember(id, { ...req.body, actor: req.teamActor });
        res.json({ success: true, member: updated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Password Change & Reset Endpoints
apiRouter.post('/team/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password, autoGenerate } = req.body;
        const result = await RbacService.updatePassword(id, { password, autoGenerate, actor: req.teamActor });
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

apiRouter.delete('/team/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const actor = req.teamActor;
        const result = await RbacService.deleteTeamMember(id, actor);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 3. Authentication Endpoint
apiRouter.post('/auth/login', loginRateLimit, async (req, res) => {
    try {
        const { email, password } = req.body;
        if (accountLocked(email)) return res.status(429).json({ ok: false, error: 'Too many failed sign-ins for this account. Try again in 15 minutes.' });
        let result;
        try {
            result = await RbacService.authenticate({ email, password });
        } catch (err) {
            recordLoginFailure(email);
            throw err;
        }
        clearLoginFailures(email);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(401).json({ ok: false, error: err.message });
    }
});

// 4. Activity Logs & Audit Trail (Admin Only)
apiRouter.get('/audit/logs', async (req, res) => {
    try {
        const result = await RbacService.getActivityLogs(req.query);
        res.json({ ok: true, ...result });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

apiRouter.post('/auth/logout', async (req, res, next) => {
    try {
        const session = await getAuthenticatedSession(req);
        if (session) await RbacService.signOut(session.token, session.user);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// Dashboard Live Metrics
// ============================================================================
apiRouter.get('/dashboard/metrics', async (req, res) => {
    try {
        const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');
        const [{ rows: [lead] }, { rows: [contact] }, { rows: [buyers] }, { rows: [funnel] }, { rows: counties }] = await Promise.all([
            pool.query(`SELECT count(*) FILTER (WHERE lead_kind IN ('SELLER','NEEDS_REVIEW'))::int AS total, count(*)::int AS everyone,
                               count(*) FILTER (WHERE lead_kind = 'SELLER')::int AS sellers, count(*) FILTER (WHERE lead_kind = 'NEEDS_REVIEW')::int AS review,
                               count(*) FILTER (WHERE lead_kind = 'BUSINESS')::int AS business, count(*) FILTER (WHERE lead_kind = 'AUTOMATED')::int AS automated,
                               count(*) FILTER (WHERE lead_kind = 'INTERNAL')::int AS internal,
                               count(*) FILTER (WHERE lost_reason = 'Removed in Podio')::int AS removed_in_podio,
                               count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM crm.external_sync_map m WHERE m.internal_uuid = core.leads.lead_id AND m.external_system = 'PODIO'))::int AS only_here FROM core.leads`),
            pool.query(`SELECT count(DISTINCT lead_id) FILTER (WHERE direction = 'OUTBOUND')::int AS contacted FROM core.interactions WHERE lead_id IS NOT NULL`),
            pool.query('SELECT count(*)::int AS total FROM crm.cash_buyers'),
            pool.query(`SELECT count(*) FILTER (WHERE milestone_index = 2)::int AS appointments, count(*) FILTER (WHERE milestone_index = 3)::int AS offers,
                               count(*) FILTER (WHERE milestone_index BETWEEN 4 AND 7)::int AS contracts, count(*) FILTER (WHERE milestone_index BETWEEN 8 AND 10)::int AS dispo,
                               coalesce(sum(fee) FILTER (WHERE milestone_index >= 4), 0) AS revenue,
                               round(avg(buy_price) FILTER (WHERE buy_price > 0)) AS avg_mao, round(avg(arv) FILTER (WHERE arv > 0)) AS avg_arv
                        FROM crm.deal_funnel`),
            pool.query(`SELECT c.county_name AS name, count(p.property_id)::int AS count FROM ref.counties c
                        LEFT JOIN core.properties p ON p.county_id = c.county_id GROUP BY c.county_name ORDER BY count DESC, c.county_name`)
        ]);
        const contactRate = lead.total ? `${Math.round((contact.contacted / lead.total) * 100)}%` : '0%';
        res.json({
            metrics: [
                { iconKey: 'users', label: 'Total Seller Leads', value: String(lead.total), change: 'Live', href: '/seller-leads',
                  note: `of ${lead.everyone} contacts · ${lead.everyone - lead.total} not sellers`,
                  help: `${lead.sellers} confirmed sellers and ${lead.review} contacts to review are counted. Not counted: ${lead.business} business contacts, ${lead.automated} automated senders and ${lead.internal} internal or test records. The ${lead.everyone} contacts are everything synced from Podio, including contacts since deleted there (kept as Lost, never erased), plus ${lead.only_here} created only in HushHawk. Change a contact's type on the Seller Leads page.` },
                { iconKey: 'phone', label: 'Contact Rate', value: contactRate, change: 'Live', href: '/communications' },
                { iconKey: 'calendar', label: 'Appointments Set', value: String(funnel.appointments), change: 'Live', href: '/calendar' },
                { iconKey: 'file', label: 'Offers Pending', value: String(funnel.offers), change: 'Live', href: '/acquisitions' },
                { iconKey: 'handshake', label: 'Under Contract', value: String(funnel.contracts), change: 'Live', href: '/contracts' },
                { iconKey: 'badgeDollar', label: 'Assignment Revenue', value: money(funnel.revenue), change: 'Live', href: '/analytics' },
                { iconKey: 'calculator', label: 'Avg. MAO', value: funnel.avg_mao ? money(funnel.avg_mao) : '—', change: 'Live', href: '/deal-analyzer' },
                { iconKey: 'house', label: 'Avg. ARV', value: funnel.avg_arv ? money(funnel.avg_arv) : '—', change: 'Live', href: '/deal-analyzer' },
                { iconKey: 'users', label: 'Cash Buyer Matches', value: String(buyers.total), change: 'Live', href: '/cash-buyers' },
                { iconKey: 'dollar', label: 'Dispo Opportunities', value: String(funnel.dispo), change: 'Live', href: '/dispositions' }
            ],
            signals: [
                { code: 'LEADS', label: 'Lead flow', value: String(lead.total), change: 'Live' },
                { code: 'BUYERS', label: 'Cash buyers', value: String(buyers.total), change: 'Live' },
                { code: 'CONTRACT', label: 'Under contract', value: String(funnel.contracts), change: 'Live' },
                { code: 'YIELD', label: 'Assignment revenue', value: money(funnel.revenue), change: 'Live' },
                { code: 'DEALS', label: 'Dispo opportunities', value: String(funnel.dispo), change: 'Live' }
            ],
            countyIntelligence: counties.map(c => ({ name: c.name, count: String(c.count) }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// System Settings API
// ============================================================================
const SETTINGS_SECTIONS = ['general', 'underwriting'];
const configured = (...names) => names.every(n => Boolean(process.env[n]));

async function loadStoredSettings() {
    const { rows } = await pool.query('SELECT key, value FROM ops.app_settings');
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

function integrationStatuses(pgOnline, s3Config) {
    const carrier = CarrierDispatchService.getCarrierStatus();
    const mk = (name, icon, ok, okText, offText, description, endpoint) => ({
        name, icon, description, endpoint, enabled: ok,
        status: ok ? 'active' : 'warn', statusText: ok ? okText : offText
    });
    return [
        mk('PostgreSQL Core Database', 'database', pgOnline, 'Connected', 'Unreachable',
            'CrownKey registry, events, leads and audit trail.', null),
        mk('Amazon S3 Private Vault', 'database', s3Config.status === 'CONFIGURED', 'Configured', 'Not configured',
            'Private bucket for photos, deeds and documents.', s3Config.bucket ? `s3://${s3Config.bucket}` : null),
        mk('Podio CRM Sync', 'refresh', configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN'), 'Credentials configured', 'Credentials missing',
            'Two-way sync plus webhook listener.', publicWebhookUrl('/api/v1/webhooks/podio')),
        mk('Twilio SMS & Voice', 'phone', Boolean(carrier?.sms?.configured), 'Configured', 'Not configured',
            'Outbound SMS and calls.', null),
        mk('Email Delivery', 'mail', Boolean(carrier?.email?.configured), carrier?.email?.provider || 'Configured', 'Not configured',
            'Outbound email.', null),
        mk('smrtPhone Webhook', 'phone', configured('PUBLIC_API_URL', 'WEBHOOK_SECRET'), 'Webhook endpoint ready', 'Set PUBLIC_API_URL and WEBHOOK_SECRET',
            'Inbound call and SMS events.', publicWebhookUrl('/api/v1/webhooks/smrtphone')),
        mk('BatchLeads Webhook', 'zap', configured('PUBLIC_API_URL', 'WEBHOOK_SECRET'), 'Webhook endpoint ready', 'Set PUBLIC_API_URL and WEBHOOK_SECRET',
            'Tag-push lead ingestion.', publicWebhookUrl('/api/v1/integrations/batchleads/webhook'))
    ];
}

apiRouter.get('/settings', async (req, res) => {
    try {
        const stored = await loadStoredSettings();
        const s3Config = StorageService.getConfig();
        const pg = await checkDatabaseHealth();
        res.json({
            general: { entityName: '', titleCompany: '', titleEmail: '', primaryCounty: '', ein: '', ...(stored.general || {}) },
            underwriting: { maoDiscount: null, minSpread: null, defaultEmd: null, inspectionDays: null, requireProofOfFunds: false, ...(stored.underwriting || {}) },
            security: {
                s3Bucket: s3Config.bucket, s3Region: s3Config.region, s3Encryption: s3Config.encryption, s3Status: s3Config.status
            },
            podio: { appId: process.env.PODIO_APP_ID || null, configured: configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN') },
            storage: s3Config,
            integrations: integrationStatuses(pg.status === 'ONLINE', s3Config)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/settings', async (req, res) => {
    try {
        const entries = SETTINGS_SECTIONS.filter(k => req.body && typeof req.body[k] === 'object' && req.body[k] !== null);
        if (!entries.length) return res.status(400).json({ error: 'Provide general and/or underwriting settings.' });
        for (const key of entries) {
            await pool.query(
                `INSERT INTO ops.app_settings (key, value, updated_by, updated_at) VALUES ($1, $2, $3, now())
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
                [key, JSON.stringify(req.body[key]), actorName(req)]
            );
        }
        res.json({ ok: true, saved: entries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Live Integration Diagnostics: every result is measured or read from real configuration.
const INTEGRATION_TESTS = {
    postgres: { name: 'PostgreSQL Core Database', run: async () => { await pool.query('SELECT 1'); return 'Query succeeded.'; } },
    podio: {
        name: 'Podio CRM',
        run: async () => {
            if (!configured('PODIO_CLIENT_ID', 'PODIO_APP_TOKEN')) throw new Error('PODIO_CLIENT_ID / PODIO_APP_TOKEN are not set.');
            await PodioService.authenticateApp(PodioSyncService.LEADS_APP_ID, PodioSyncService.APP_TOKEN);
            return 'Podio authentication succeeded.';
        }
    },
    s3: {
        name: 'Amazon S3 Vault',
        run: async () => {
            const cfg = StorageService.getConfig();
            if (cfg.status !== 'CONFIGURED') throw new Error('S3 credentials or bucket are not configured.');
            return `Bucket ${cfg.bucket} is configured.`;
        }
    },
    carriers: {
        name: 'SMS / Email carriers',
        run: async () => {
            const c = CarrierDispatchService.getCarrierStatus();
            if (!c.sms.configured && !c.email.configured) throw new Error('No SMS or email carrier is configured.');
            return `SMS: ${c.sms.configured ? c.sms.provider : 'not configured'}; Email: ${c.email.configured ? c.email.provider : 'not configured'}.`;
        }
    },
    webhooks: {
        name: 'Inbound webhooks',
        run: async () => {
            if (!configured('PUBLIC_API_URL', 'WEBHOOK_SECRET')) throw new Error('PUBLIC_API_URL and WEBHOOK_SECRET must be set.');
            return 'Webhook URL and secret are configured.';
        }
    }
};

async function runIntegrationTest(key) {
    const test = INTEGRATION_TESTS[key];
    const t0 = Date.now();
    try {
        const message = await test.run();
        return { key, name: test.name, ok: true, status: 'active', statusText: message, latencyMs: Date.now() - t0 };
    } catch (e) {
        return { key, name: test.name, ok: false, status: 'error', statusText: e.message, latencyMs: Date.now() - t0 };
    }
}

apiRouter.post('/integrations/test-all', async (req, res) => {
    const results = await Promise.all(Object.keys(INTEGRATION_TESTS).map(runIntegrationTest));
    res.json({ ok: results.every(r => r.ok), testedAt: new Date().toISOString(), results });
});

apiRouter.post('/integrations/test/:name', async (req, res) => {
    const needle = req.params.name.toLowerCase();
    const alias = { database: 'postgres', rds: 'postgres', vault: 's3', sms: 'carriers', email: 'carriers', carrier: 'carriers', smrtphone: 'webhooks', batchleads: 'webhooks' };
    const key = Object.keys(INTEGRATION_TESTS).find(k => needle.includes(k)) || Object.entries(alias).find(([k]) => needle.includes(k))?.[1];
    if (!key) return res.status(404).json({ ok: false, error: `Unknown integration '${req.params.name}'.` });
    const r = await runIntegrationTest(key);
    res.json({ ok: r.ok, name: r.name, latencyMs: r.latencyMs, status: r.status, message: r.statusText });
});

// ============================================================================
// Automations
// ============================================================================
async function requireAutomationAccess(req, res, next) {
    try {
        const session = await getAuthenticatedSession(req);
        if (!session) return res.status(401).json({ error: 'Sign in again to use Automations.' });

        if (!session.user.permissions.includes('/automations')) {
            return res.status(403).json({ error: 'Your role does not have access to Automations.' });
        }
        req.automationActor = session.user.name;
        next();
    } catch (err) {
        next(err);
    }
}

apiRouter.use('/automations', requireAutomationAccess);

function sendAutomationError(res, error) {
    if (!error.status) console.error('[Automations]', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Automations is temporarily unavailable.' });
}

apiRouter.get('/automations', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const result = await AutomationService.list();
        res.json({ ...result, legacyRules: (db.data.automations || []).map(rule => rule.name).filter(Boolean) });
    } catch (error) {
        sendAutomationError(res, error);
    }
});

apiRouter.post('/automations', async (req, res) => {
    try {
        res.status(201).json(await AutomationService.create(req.body || {}));
    } catch (error) {
        sendAutomationError(res, error);
    }
});

apiRouter.patch('/automations/:id', async (req, res) => {
    try {
        res.json(await AutomationService.update(req.params.id, req.body || {}));
    } catch (error) {
        sendAutomationError(res, error);
    }
});

apiRouter.delete('/automations/:id', async (req, res) => {
    try {
        await AutomationService.archive(req.params.id);
        res.json({ ok: true });
    } catch (error) {
        sendAutomationError(res, error);
    }
});

apiRouter.post('/automations/:id/execute', async (req, res) => {
    try {
        const run = await AutomationService.runManual(req.params.id, req.automationActor);
        res.status(run.status === 'succeeded' ? 200 : 422).json(run);
    } catch (error) {
        sendAutomationError(res, error);
    }
});

// ============================================================================
// Marketing Campaigns API (Real PostgreSQL Lead Aggregation)
// ============================================================================
apiRouter.get('/marketing', async (req, res) => {
    try {
        // Lead counts per first source, with dictionary names. Spend only appears where a campaign for that channel has a budget entered.
        const { rows } = await pool.query(
            `SELECT l.first_source_code AS code, coalesce(s.source_name, l.first_source_code, 'Unknown') AS channel, count(*)::int AS leads,
                    count(*) FILTER (WHERE l.status IN ('CONTRACT','CLOSED'))::int AS contracts
             FROM core.leads l LEFT JOIN ref.lead_sources s ON s.source_code = l.first_source_code
             WHERE l.lead_kind IN ('SELLER','NEEDS_REVIEW')
             GROUP BY l.first_source_code, s.source_name ORDER BY leads DESC`);
        const campaigns = db.data.marketing_campaigns || [];
        const spendFor = name => campaigns.filter(c => String(c.channel || '').toLowerCase() === String(name).toLowerCase()).reduce((sum, c) => sum + (Number(c.spend) || 0), 0);
        const money = v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const channelStats = rows.map(r => {
            const spend = spendFor(r.channel);
            return {
                channel: r.channel, source_code: r.code, leads: r.leads, contracts: r.contracts,
                spend: spend > 0 ? money(spend) : '—', cpl: spend > 0 && r.leads ? money(spend / r.leads) : '—', roi: '—'
            };
        });
        res.json({ campaigns, channelStats, total: campaigns.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/marketing', (req, res) => {
    try {
        if (!db.data.marketing_campaigns) db.data.marketing_campaigns = [];
        if (!req.body.name || !String(req.body.name).trim() || !req.body.channel) return res.status(400).json({ error: 'A campaign name and channel are required.' });
        const campaign = {
            id: 'm-' + Date.now(),
            name: req.body.name,
            channel: req.body.channel,
            targetAudience: req.body.targetAudience || '',
            spend: Number(req.body.budget ?? req.body.spend ?? 0) || 0,
            leads: 0,
            cpl: 0,
            contracts: 0,
            roi: 0,
            status: 'Active',
            dateRange: '',
            createdAt: new Date().toISOString()
        };
        db.data.marketing_campaigns.unshift(campaign);
        db.persist();
        res.status(201).json(campaign);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.patch('/marketing/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body || {};
        const campaigns = db.data.marketing_campaigns || [];
        const camp = campaigns.find(c => c.id === id);
        if (!camp) return res.status(404).json({ error: 'Campaign not found' });

        Object.assign(camp, updates);
        db.persist();
        res.json(camp);
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
// Analytics & Reporting Aggregation API (Canonical PostgreSQL RDS)
// ============================================================================
apiRouter.get('/analytics', async (req, res) => {
    try {
        let totalLeads = 0;
        let totalContracts = 0;
        let totalClosed = 0;
        let totalRevenue = 0;
        let avgSpread = 0;
        let buyersCount = 0;
        let funnelCounts = { qualified: 0, offers: 0, assigned: 0 };

        try {
            const [leadsCount, funnelStats, buyersStat] = await Promise.all([
                pool.query("SELECT count(*)::int as count FROM core.leads WHERE lead_kind IN ('SELLER','NEEDS_REVIEW')"),
                pool.query(`
                    SELECT 
                        count(*)::int as total_deals,
                        count(*) FILTER (WHERE milestone_index >= 4)::int as contracts_count,
                        count(*) FILTER (WHERE milestone_index = 11)::int as closed_count,
                        COALESCE(sum(fee), 0)::numeric as total_revenue,
                        COALESCE(avg(fee), 0)::numeric as avg_spread
                    FROM crm.deal_funnel
                `),
                pool.query('SELECT count(*)::int as count FROM crm.cash_buyers')
            ]);

            totalLeads = leadsCount.rows[0]?.count || 0;
            const fRow = funnelStats.rows[0];
            totalContracts = fRow?.contracts_count || 0;
            totalClosed = fRow?.closed_count || 0;
            totalRevenue = Number(fRow?.total_revenue) || 0;
            avgSpread = Math.round(Number(fRow?.avg_spread) || 0);
            buyersCount = buyersStat.rows[0]?.count || 0;
            const { rows: [steps] } = await pool.query(
                `SELECT (SELECT count(*) FROM core.leads WHERE lead_kind IN ('SELLER','NEEDS_REVIEW') AND status IN ('QUALIFIED','OFFER','CONTRACT','CLOSED'))::int AS qualified,
                        (SELECT count(*) FROM core.leads WHERE lead_kind IN ('SELLER','NEEDS_REVIEW') AND status IN ('OFFER','CONTRACT','CLOSED'))::int AS offers,
                        (SELECT count(*) FROM crm.deal_funnel WHERE milestone_index >= 9)::int AS assigned`);
            funnelCounts = steps;
        } catch (dbErr) {
            return res.status(500).json({ error: dbErr.message });
        }

        // Submarkets dynamic query from real properties
        let submarkets = [];
        try {
            const subRes = await pool.query(`
                SELECT zip, count(*)::int AS deals, coalesce(sum(buy_price), 0) AS volume, coalesce(round(avg(fee) FILTER (WHERE fee > 0)), 0) AS avg_spread
                FROM crm.deal_funnel WHERE zip IS NOT NULL AND zip <> ''
                GROUP BY zip ORDER BY deals DESC LIMIT 5`);
            submarkets = subRes.rows.map(r => ({ area: r.zip, deals: r.deals, volume: Number(r.volume), avgSpread: Number(r.avg_spread) }));
        } catch (_) {}

        res.json({
            kpis: {
                totalRevenue: totalRevenue,
                contractsUnderEscrow: totalContracts,
                avgAssignmentSpread: avgSpread,
                dispoSpeedDays: null
            },
            funnel: [
                { label: 'Total Inbound Raw Leads', value: totalLeads },
                { label: 'Qualified Sellers', value: funnelCounts.qualified },
                { label: 'Offers Presented', value: funnelCounts.offers },
                { label: 'Executed Purchase Contracts (PSA)', value: totalContracts },
                { label: 'Assigned to Cash Buyers', value: funnelCounts.assigned },
                { label: 'Closed & Escrow Wire Disbursed', value: totalClosed }
            ],
            leaderboard: [],
            submarkets
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// HAWKAI: Dedicated Admin AI Copilot Intelligence Routes (Enterprise Authenticated)
// ============================================================================
function verifyHawkAIAuth(req) {
    // requireSession has already validated the Bearer token; HawkAI is limited to administrators.
    return Boolean(req.user && req.user.isAdmin);
}

apiRouter.post('/ai/query', async (req, res) => {
    try {
        if (!verifyHawkAIAuth(req)) {
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
    if (!verifyHawkAIAuth(req)) {
        return res.status(401).json({
            ok: false,
            error: 'Unauthorized: HawkAI Copilot requires an active authenticated administrator session.'
        });
    }
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
        if (!verifyHawkAIAuth(req)) {
            return res.status(401).json({
                ok: false,
                error: 'Unauthorized: HawkAI Copilot requires an active authenticated administrator session.'
            });
        }
        const audit = await getMissingDataAudit();
        res.json({ ok: true, data: audit });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});
