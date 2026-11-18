import crypto from 'crypto';
import { pool, withTransaction, audit } from '../store/pgClient.js';
import { normalizeParcelMatch } from '../../../packages/crownkey/index.js';
import { EventService, HttpError } from './eventService.js';

const getPath = (obj, path) => (path ? path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj) : obj);

/** Canonical record shape every connector or manual import is mapped to. */
const FIELDS = ['parcel', 'externalId', 'caseReference', 'pillarCode', 'filingDate', 'amount', 'address', 'city', 'zip'];

function mapRecord(raw, fieldMap) {
    const out = {};
    for (const f of FIELDS) {
        const source = fieldMap?.[f];
        if (source) out[f] = getPath(raw, source);
    }
    return out;
}

export class ConnectorService {
    static async getRegistry() {
        const { rows } = await pool.query(
            `SELECT c.*, lr.status AS last_status, lr.records_fetched AS last_fetched, lr.error_summary AS last_error
             FROM ops.connectors c
             LEFT JOIN LATERAL (SELECT * FROM raw.connector_runs r WHERE r.connector_id = c.connector_id ORDER BY started_at DESC LIMIT 1) lr ON TRUE
             ORDER BY c.name`);
        return rows;
    }

    static async upsertConnector(input, actor) {
        const c = input || {};
        if (!c.connector_id || !c.name || !c.county_code) throw new HttpError(400, 'connector_id, name and county_code are required.');
        if (c.connector_type === 'HTTP_JSON' && !c.feed_url) throw new HttpError(400, 'feed_url is required for HTTP_JSON connectors.');
        if (c.feed_url && !/^https:\/\//i.test(c.feed_url)) throw new HttpError(400, 'feed_url must use https.');
        return withTransaction(async client => {
            const { rows: [row] } = await client.query(
                `INSERT INTO ops.connectors (connector_id, name, county_code, pillar_code, connector_type, feed_url, auth_env_var, records_path, field_map, schedule_minutes, parser_version, created_by)
                 VALUES ($1,$2,$3,$4,coalesce($5,'HTTP_JSON'),$6,$7,$8,coalesce($9::jsonb,'{}'::jsonb),$10,coalesce($11,'v1'),$12)
                 ON CONFLICT (connector_id) DO UPDATE SET name=EXCLUDED.name, county_code=EXCLUDED.county_code, pillar_code=EXCLUDED.pillar_code,
                   connector_type=EXCLUDED.connector_type, feed_url=EXCLUDED.feed_url, auth_env_var=EXCLUDED.auth_env_var,
                   records_path=EXCLUDED.records_path, field_map=EXCLUDED.field_map, schedule_minutes=EXCLUDED.schedule_minutes,
                   parser_version=EXCLUDED.parser_version
                 RETURNING *`,
                [c.connector_id, c.name, String(c.county_code).toUpperCase(), c.pillar_code || null, c.connector_type || null, c.feed_url || null,
                 c.auth_env_var || null, c.records_path || null, c.field_map ? JSON.stringify(c.field_map) : null, c.schedule_minutes || null, c.parser_version || null, actor]);
            await audit(client, { actor, action: 'CONNECTOR_SAVED', entityType: 'CONNECTOR', entityId: crypto.randomUUID(), diff: { connector_id: c.connector_id } });
            return row;
        });
    }

    static async setApproval(connectorId, { approved, enabled }, actor) {
        return withTransaction(async client => {
            const { rows: [row] } = await client.query(
                `UPDATE ops.connectors SET approval_status = CASE WHEN $2 THEN 'APPROVED' ELSE 'NEEDS_REVIEW' END,
                   enabled = ($2 AND coalesce($3, enabled)) WHERE connector_id = $1 RETURNING *`, [connectorId, Boolean(approved), enabled]);
            if (!row) throw new HttpError(404, 'Connector not found.');
            await audit(client, { actor, action: approved ? 'CONNECTOR_APPROVED' : 'CONNECTOR_UNAPPROVED', entityType: 'CONNECTOR', entityId: crypto.randomUUID(), diff: { connectorId } });
            return row;
        });
    }

    /** Pulls the configured feed, maps records, and ingests them. */
    static async runConnector(connectorId, { actor = 'SCHEDULER' } = {}) {
        const { rows: [config] } = await pool.query('SELECT * FROM ops.connectors WHERE connector_id = $1', [connectorId]);
        if (!config) throw new HttpError(404, `Connector '${connectorId}' not found.`);
        if (config.approval_status !== 'APPROVED' || !config.enabled) throw new HttpError(400, 'Connector is not approved and enabled.');
        if (config.connector_type !== 'HTTP_JSON') throw new HttpError(400, 'Only HTTP_JSON connectors can be pulled; use an import for manual feeds.');

        const { rows: [run] } = await pool.query(
            `INSERT INTO raw.connector_runs (connector_id, parser_version, cursor_watermark) VALUES ($1,$2,$3) RETURNING run_id`,
            [connectorId, config.parser_version, new Date().toISOString()]);
        try {
            const headers = { Accept: 'application/json' };
            if (config.auth_env_var) {
                const token = process.env[config.auth_env_var];
                if (!token) throw new Error(`Environment variable ${config.auth_env_var} is not set.`);
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await fetch(config.feed_url, { headers, signal: AbortSignal.timeout(60_000) });
            if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}.`);
            const body = await response.json();
            const list = getPath(body, config.records_path);
            if (!Array.isArray(list)) throw new Error('records_path did not resolve to an array.');
            const records = list.map(raw => ({ ...mapRecord(raw, config.field_map), pillarCode: mapRecord(raw, config.field_map).pillarCode || config.pillar_code, payload: raw }));
            const result = await this.ingest({ records, countyCode: config.county_code, sourceSystem: connectorId, connectorRunId: run.run_id, actor });
            await pool.query(
                `UPDATE raw.connector_runs SET status = 'COMPLETED', records_fetched = $2, records_parsed = $3, records_quarantined = $4, records_changed = $5,
                   error_summary = $6, completed_at = now() WHERE run_id = $1`,
                [run.run_id, list.length, result.created + result.updated + result.unchanged, result.rejected, result.created + result.updated,
                 result.rejected ? `${result.rejected} record(s) rejected; see import job ${result.importJobId}.` : null]);
            await pool.query('UPDATE ops.connectors SET last_run_at = now() WHERE connector_id = $1', [connectorId]);
            return { run_id: run.run_id, ...result };
        } catch (error) {
            await pool.query(`UPDATE raw.connector_runs SET status = 'FAILED', error_summary = $2, completed_at = now() WHERE run_id = $1`, [run.run_id, error.message]);
            await pool.query(
                `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
                 VALUES (gen_random_uuid(), $1, $2, 'SYSTEM', 'HIGH', 'red', 'database', false, now())`,
                [`Connector failed: ${config.name}`, error.message]).catch(() => {});
            throw error;
        }
    }

    /**
     * Ingests canonical records. Raw evidence is stored before anything is derived; properties match on
     * county + normalized parcel; events reuse existing cases; per-row outcomes are recorded on an import job.
     */
    static async ingest({ records, countyCode, sourceSystem, connectorRunId = null, importType = 'EVENT', actor }) {
        if (!Array.isArray(records) || !records.length) throw new HttpError(400, 'records must be a non-empty array.');
        if (!countyCode || !sourceSystem) throw new HttpError(400, 'countyCode and sourceSystem are required.');
        const { rows: [county] } = await pool.query('SELECT county_id, county_name, county_code FROM ref.counties WHERE county_code = $1', [String(countyCode).toUpperCase()]);
        if (!county) throw new HttpError(400, `County '${countyCode}' is not in the county registry.`);

        const { rows: [job] } = await pool.query(
            `INSERT INTO ops.import_jobs (source_system, county_id, import_type, created_by) VALUES ($1,$2,$3,$4) RETURNING import_job_id`,
            [sourceSystem, county.county_id, importType, actor]);
        const counts = { created: 0, updated: 0, unchanged: 0, rejected: 0, review: 0 };
        const item = (i, outcome, entityId, message) => pool.query(
            `INSERT INTO ops.import_job_items (import_job_id, row_number, outcome, entity_id, message) VALUES ($1,$2,$3,$4,$5)`,
            [job.import_job_id, i + 1, outcome, entityId || null, message || null]);

        for (let i = 0; i < records.length; i++) {
            const r = records[i] || {};
            try {
                const parcel = r.parcel == null ? '' : String(r.parcel).trim(); // parcels stay text: leading zeros preserved
                const externalId = r.externalId == null ? '' : String(r.externalId).trim();
                if (!parcel || !externalId) { counts.rejected++; await item(i, 'REJECTED', null, 'parcel and externalId are required.'); continue; }

                const payload = r.payload || r;
                const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
                const parcelMatch = normalizeParcelMatch(parcel);

                const outcome = await withTransaction(async client => {
                    const { rows: [existingSource] } = await client.query(
                        `SELECT source_record_id, payload_hash FROM raw.source_records WHERE source_system = $1 AND jurisdiction = $2 AND source_external_id = $3`,
                        [sourceSystem, county.county_name, externalId]);
                    let sourceRecordId; let changed = true;
                    if (existingSource) {
                        sourceRecordId = existingSource.source_record_id;
                        changed = existingSource.payload_hash !== payloadHash;
                        if (changed) {
                            await client.query('INSERT INTO raw.source_record_versions (source_record_id, payload, payload_hash) SELECT source_record_id, payload, payload_hash FROM raw.source_records WHERE source_record_id = $1', [sourceRecordId]);
                            await client.query('UPDATE raw.source_records SET payload = $2, payload_hash = $3, observed_at = now() WHERE source_record_id = $1', [sourceRecordId, JSON.stringify(payload), payloadHash]);
                        }
                    } else {
                        const { rows: [created] } = await client.query(
                            `INSERT INTO raw.source_records (connector_run_id, source_system, jurisdiction, source_external_id, payload, payload_hash, parser_version)
                             VALUES ($1,$2,$3,$4,$5,$6,'v1') RETURNING source_record_id`,
                            [connectorRunId, sourceSystem, county.county_name, externalId, JSON.stringify(payload), payloadHash]);
                        sourceRecordId = created.source_record_id;
                    }

                    let { rows: [property] } = await client.query('SELECT property_id FROM core.properties WHERE county_id = $1 AND parcel_match = $2', [county.county_id, parcelMatch]);
                    let propertyCreated = false;
                    if (!property) {
                        ({ rows: [property] } = await client.query(
                            `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, city, postal_code)
                             VALUES ($1,$2,$3,$4,$5,$6) RETURNING property_id`,
                            [county.county_id, parcel, parcelMatch, r.address || null, r.city || null, r.zip || null]));
                        propertyCreated = true;
                    }
                    return { sourceRecordId, propertyId: property.property_id, propertyCreated, changed: changed || propertyCreated };
                });

                let eventResult = null;
                if (r.pillarCode) {
                    eventResult = await EventService.recordPillarEvent({
                        propertyId: outcome.propertyId, pillarCode: r.pillarCode, caseReference: r.caseReference || externalId, externalEventId: externalId,
                        eventStatus: 'OPEN', verificationStatus: 'CONFIRMED', eventDate: r.filingDate || null,
                        filingAmount: r.amount === undefined || r.amount === null || r.amount === '' ? null : Number(r.amount),
                        sourceRecordId: outcome.sourceRecordId, evidenceNotes: `Ingested from ${sourceSystem}`, actor
                    });
                }
                if (outcome.propertyCreated || eventResult?.isNew) { counts.created++; await item(i, 'CREATED', outcome.propertyId); }
                else if (outcome.changed) { counts.updated++; await item(i, 'UPDATED', outcome.propertyId); }
                else { counts.unchanged++; await item(i, 'UNCHANGED', outcome.propertyId); }
            } catch (error) {
                counts.rejected++;
                await item(i, 'REJECTED', null, error.message);
            }
        }

        await pool.query(
            `UPDATE ops.import_jobs SET status = 'COMPLETED', created_count=$2, updated_count=$3, unchanged_count=$4, rejected_count=$5, review_count=$6, completed_at = now()
             WHERE import_job_id = $1`, [job.import_job_id, counts.created, counts.updated, counts.unchanged, counts.rejected, counts.review]);
        await withTransaction(client => audit(client, { actor, action: 'IMPORT_COMPLETED', entityType: 'IMPORT_JOB', entityId: job.import_job_id, diff: { sourceSystem, ...counts } }));
        return { importJobId: job.import_job_id, ...counts };
    }

    static async listRuns(limit = 100) {
        const { rows } = await pool.query('SELECT * FROM raw.connector_runs ORDER BY started_at DESC LIMIT $1', [Math.min(Number(limit) || 100, 500)]);
        return rows;
    }

    static async listImports(limit = 50) {
        const { rows } = await pool.query('SELECT j.*, c.county_code FROM ops.import_jobs j LEFT JOIN ref.counties c USING (county_id) ORDER BY started_at DESC LIMIT $1', [Math.min(Number(limit) || 50, 200)]);
        return rows;
    }

    static async getImport(id) {
        const { rows: [job] } = await pool.query('SELECT * FROM ops.import_jobs WHERE import_job_id = $1', [id]);
        if (!job) throw new HttpError(404, 'Import job not found.');
        const { rows: items } = await pool.query('SELECT * FROM ops.import_job_items WHERE import_job_id = $1 ORDER BY row_number LIMIT 1000', [id]);
        return { job, items };
    }

    /** Connectors whose schedule has elapsed. Used by the scheduler. */
    static async runDue() {
        const { rows } = await pool.query(
            `SELECT connector_id FROM ops.connectors
             WHERE enabled AND approval_status = 'APPROVED' AND connector_type = 'HTTP_JSON' AND schedule_minutes IS NOT NULL
               AND (last_run_at IS NULL OR last_run_at < now() - make_interval(mins => schedule_minutes))`);
        const results = [];
        for (const { connector_id } of rows) {
            try { results.push({ connector_id, ok: true, ...(await this.runConnector(connector_id)) }); }
            catch (error) { results.push({ connector_id, ok: false, error: error.message }); }
        }
        return results;
    }
}
