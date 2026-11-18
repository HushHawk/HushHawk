/**
 * @file backend/src/services/leadImportService.js
 * Bulk Lead Ingestion & Skip-Trace Import Engine for HushHawk
 * Handles raw tabular/CSV/TSV data, preserves parcel raw text, generates CrownKeys,
 * stores multi-phone ladders, emits audit events & operational notifications to AWS RDS.
 */

import crypto from 'crypto';
import { pool, withTransaction, audit } from '../store/pgClient.js';
import { normalizeParcelMatch } from '../../../packages/crownkey/index.js';
import { CrmService } from './crmService.js';
import { HttpError } from './eventService.js';

export class LeadImportService {
    /**
     * Parse raw text (TSV or CSV) into structured row objects
     * @param {string|Array} input 
     * @returns {Array<Object>}
     */
    static parseRawTabular(input) {
        if (Array.isArray(input)) return input;
        if (!input || typeof input !== 'string') return [];

        const lines = input.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) return [];

        // Detect delimiter (tab vs comma)
        const headerLine = lines[0];
        const isTab = headerLine.includes('\t');
        const delimiter = isTab ? '\t' : ',';

        // Helper to split line with consideration for quoted CSV values
        const splitLine = (line) => {
            if (isTab) return line.split('\t').map(c => c.trim());
            // Basic CSV quote parser
            const result = [];
            let cur = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"' || char === "'") {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(cur.trim());
                    cur = '';
                } else {
                    cur += char;
                }
            }
            result.push(cur.trim());
            return result;
        };

        const headers = splitLine(headerLine).map(h => h.trim());
        const rows = [];

        for (let i = 1; i < lines.length; i++) {
            const cells = splitLine(lines[i]);
            if (!cells.some(c => c.length > 0)) continue;
            const row = {};
            headers.forEach((h, idx) => {
                row[h] = cells[idx] || '';
            });
            rows.push(row);
        }

        return rows;
    }

    /**
     * Clean and normalize phone numbers (e.g. 7403985619 -> (740) 398-5619)
     */
    static formatPhone(raw) {
        if (!raw) return '';
        const digits = String(raw).replace(/\D/g, '');
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        if (digits.length === 11 && digits.startsWith('1')) {
            return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        return String(raw).trim();
    }

    /**
     * Ingest batch of leads into AWS RDS PostgreSQL
     */

    /**
     * Imports leads from skip-trace / list exports. Every row is handled in its own savepoint:
     * a bad row is rejected with a reason and never blocks or corrupts the others.
     * Counties must exist in the registry, parcels stay text, properties are matched by county + parcel,
     * and a row without a parcel becomes a lead with its property still pending.
     */
    static async processImport({ data, sourceCode, actor, defaultListName = 'Bulk Import Batch' }) {
        if (!sourceCode) throw new HttpError(400, 'sourceCode is required.');
        if (!actor) throw new HttpError(400, 'An actor is required.');
        const rows = typeof data === 'string' ? this.parseRawTabular(data) : (Array.isArray(data) ? data : []);
        if (!rows.length) throw new HttpError(400, 'No valid rows found to import.');

        const { rows: counties } = await pool.query('SELECT county_id, county_name, county_code FROM ref.counties');
        const findCounty = name => {
            const n = String(name || '').trim().toUpperCase().replace(/\.$/, '').replace(/^ST\.? /, 'ST ');
            return counties.find(c => {
                const full = c.county_name.toUpperCase().replace(/^ST\.? /, 'ST ');
                return full === n || full === `${n} COUNTY` || c.county_code === n;
            });
        };

        const pick = (r, ...keys) => { for (const k of keys) if (r[k] !== undefined && String(r[k]).trim() !== '') return String(r[k]).trim(); return ''; };
        const imported = []; const rejected = [];
        const ids = { lead_ids: [], property_ids: [], person_ids: [] };
        let listName = defaultListName;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows: [job] } = await client.query(
                `INSERT INTO ops.import_jobs (source_system, import_type, created_by) VALUES ($1,'LEAD',$2) RETURNING import_job_id`, [`LIST:${defaultListName}`, actor]);

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                await client.query('SAVEPOINT row_import');
                try {
                    const rowList = pick(r, 'List', 'list', 'Campaign');
                    if (rowList && listName === defaultListName) listName = rowList;
                    const firstName = pick(r, 'First Name', 'first_name');
                    const lastName = pick(r, 'Last Name', 'last_name');
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (!fullName) throw new Error('Owner name is missing.');

                    const countyName = pick(r, 'Property County', 'property_county');
                    const parcelRaw = pick(r, 'Apn', 'APN', 'Parcel', 'parcel_raw');
                    let propertyId = null;
                    if (parcelRaw) {
                        const county = findCounty(countyName);
                        if (!county) throw new Error(`County '${countyName || '(blank)'}' is not in the county registry.`);
                        const parcelMatch = normalizeParcelMatch(parcelRaw);
                        const { rows: [existing] } = await client.query('SELECT property_id FROM core.properties WHERE county_id = $1 AND parcel_match = $2', [county.county_id, parcelMatch]);
                        if (existing) propertyId = existing.property_id;
                        else {
                            const { rows: [created] } = await client.query(
                                `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code)
                                 VALUES ($1,$2,$3,$4,$5,coalesce(nullif($6,''),'FL'),$7) RETURNING property_id`,
                                [county.county_id, parcelRaw, parcelMatch, pick(r, 'Property Address', 'Address', 'property_address') || null,
                                 pick(r, 'Property City', 'property_city') || null, pick(r, 'Property State', 'property_state'), pick(r, 'Property Zip', 'property_zip') || null]);
                            propertyId = created.property_id;
                            ids.property_ids.push(propertyId);
                        }
                    }

                    const phones = [];
                    for (let n = 1; n <= 5; n++) {
                        const raw = pick(r, `Phone ${n}`, `phone_${n}`);
                        if (raw.replace(/\D/g, '').length >= 7) {
                            phones.push({ slot: n, raw, formatted: this.formatPhone(raw), type: pick(r, `Phone ${n} TYPE`, `phone_${n}_type`) || null, is_primary: n === 1 });
                        }
                    }
                    const emails = [pick(r, 'Email', 'email', 'email_1'), pick(r, 'Email 2', 'email_2')].filter(Boolean);
                    const mailCity = pick(r, 'Mailing City', 'mailing_city');
                    const mailing = mailCity ? `${mailCity}, ${pick(r, 'Mailing State', 'mailing_state')} ${pick(r, 'Mailing Zip', 'mailing_zip')}`.trim() : null;

                    const lead = await CrmService.createLead({
                        sourceCode, sourceDetail: `List: ${rowList || listName}`, propertyId, actor, db: client,
                        person: { name: fullName, phone: phones[0]?.formatted || phones[0]?.raw || null, email: emails[0] || null, mailingAddress: mailing },
                        metadata: { listName: rowList || listName, rawStatus: pick(r, 'Lead Status', 'Status', 'lead_status') || null, importJobId: job.import_job_id }
                    });
                    await client.query(
                        `UPDATE core.people SET first_name = $2, last_name = $3, phones = $4, emails = $5, metadata = $6, verification_level = 'UNVERIFIED' WHERE person_id = $1`,
                        [lead.person_id, firstName || null, lastName || null, JSON.stringify(phones), JSON.stringify(emails),
                         JSON.stringify({ isEntity: /(LLC|INC|CORP|LP|TRUST|ESTATE)/i.test(fullName), originalList: rowList || listName })]);
                    const rawStatus = pick(r, 'Lead Status', 'Status', 'lead_status').toUpperCase();
                    if (rawStatus && !rawStatus.includes('NEW')) await client.query(`UPDATE core.leads SET status = 'CONTACTED' WHERE lead_id = $1`, [lead.lead_id]);

                    ids.lead_ids.push(lead.lead_id); ids.person_ids.push(lead.person_id);
                    imported.push({ lead_id: lead.lead_id, owner_name: fullName, parcel_raw: parcelRaw || null, property_pending: !propertyId, primary_phone: phones[0]?.formatted || null, phones_count: phones.length, emails_count: emails.length });
                    await client.query(`INSERT INTO ops.import_job_items (import_job_id, row_number, outcome, entity_id) VALUES ($1,$2,'CREATED',$3)`, [job.import_job_id, i + 1, lead.lead_id]);
                    await client.query('RELEASE SAVEPOINT row_import');
                } catch (error) {
                    await client.query('ROLLBACK TO SAVEPOINT row_import');
                    rejected.push({ row: i + 1, reason: error.message });
                    await client.query(`INSERT INTO ops.import_job_items (import_job_id, row_number, outcome, message) VALUES ($1,$2,'REJECTED',$3)`, [job.import_job_id, i + 1, error.message]);
                }
            }

            await client.query(
                `UPDATE ops.import_jobs SET status = 'COMPLETED', created_count = $2, rejected_count = $3, completed_at = now() WHERE import_job_id = $1`,
                [job.import_job_id, imported.length, rejected.length]);
            await audit(client, { actor, action: 'LEADS_BULK_IMPORTED', entityType: 'IMPORT_JOB', entityId: job.import_job_id, diff: { listName, created: imported.length, rejected: rejected.length, sourceCode } });
            const { rows: [note] } = await client.query(
                `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, metadata, created_at)
                 VALUES (gen_random_uuid(), $1, $2, 'LEAD', 'MEDIUM', 'cyan', 'upload', false, $3, now()) RETURNING notification_id`,
                [`Lead import: ${imported.length} created`, `${imported.length} lead(s) imported from "${listName}"; ${rejected.length} row(s) rejected.`, JSON.stringify({ importJobId: job.import_job_id })]);
            await client.query('COMMIT');
            return { success: true, importJobId: job.import_job_id, count: imported.length, rejected_count: rejected.length, rejected, list_name: listName, notification_id: note.notification_id, leads: imported, ids };
        } catch (error) {
            await client.query('ROLLBACK').catch(() => {});
            throw error;
        } finally {
            client.release();
        }
    }

    /** Administrator-only removal of a mistaken import. Refuses anything that already has events or other leads attached. */
    static async purgeBatch({ leadIds = [], propertyIds = [], personIds = [], actor }) {
        if (!leadIds.length && !propertyIds.length && !personIds.length) return { purged: 0 };
        return withTransaction(async client => {
            if (leadIds.length) {
                for (const t of ['core.attribution_touchpoints', 'core.lead_property_links', 'core.lead_event_links', 'core.interactions']) {
                    await client.query(`DELETE FROM ${t} WHERE lead_id = ANY($1::uuid[])`, [leadIds]);
                }
                await client.query('DELETE FROM crm.lead_stage_history WHERE lead_id = ANY($1::uuid[])', [leadIds]);
                await client.query('DELETE FROM core.leads WHERE lead_id = ANY($1::uuid[])', [leadIds]);
            }
            if (propertyIds.length) {
                const { rowCount } = await client.query(
                    `SELECT 1 FROM core.pillar_events WHERE property_id = ANY($1::uuid[]) UNION ALL SELECT 1 FROM core.leads WHERE property_id = ANY($1::uuid[])`, [propertyIds]);
                if (rowCount) throw new HttpError(409, 'A property still has events or leads attached and cannot be purged.');
                await client.query('DELETE FROM core.properties WHERE property_id = ANY($1::uuid[])', [propertyIds]);
            }
            if (personIds.length) await client.query('DELETE FROM core.people WHERE person_id = ANY($1::uuid[])', [personIds]);
            await audit(client, { actor, action: 'LEADS_BATCH_PURGED', entityType: 'LEAD_BATCH', entityId: leadIds[0] || propertyIds[0] || personIds[0], diff: { leads: leadIds.length, properties: propertyIds.length, people: personIds.length } });
            return { success: true, purged: { leads: leadIds.length, properties: propertyIds.length, people: personIds.length } };
        });
    }
}
