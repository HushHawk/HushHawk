/**
 * @file backend/src/services/leadImportService.js
 * Bulk Lead Ingestion & Skip-Trace Import Engine for HushHawk
 * Handles raw tabular/CSV/TSV data, preserves parcel raw text, generates CrownKeys,
 * stores multi-phone ladders, emits audit events & operational notifications to AWS RDS.
 */

import crypto from 'crypto';
import { pool } from '../store/pgClient.js';
import { db } from '../store/database.js';
import { renderCrownKey, normalizeParcelMatch } from '../../../packages/crownkey/index.js';

// County mapping cache for standard FL service territory
const COUNTY_MAP = {
    'CLAY': { code: 'CLY', id: 'c3333333-3333-3333-3333-333333333333', name: 'Clay County' },
    'DUVAL': { code: 'DUV', id: 'c1111111-1111-1111-1111-111111111111', name: 'Duval County' },
    'ST. JOHNS': { code: 'STJ', id: 'c2222222-2222-2222-2222-222222222222', name: 'St. Johns County' },
    'ST JOHNS': { code: 'STJ', id: 'c2222222-2222-2222-2222-222222222222', name: 'St. Johns County' },
    'NASSAU': { code: 'NAS', id: 'c4444444-4444-4444-4444-444444444444', name: 'Nassau County' },
};

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
    static async processImport({
        data,
        sourceCode = 'MAIL',
        actor = 'Acquisitions Admin',
        defaultListName = 'Bulk Import Batch'
    }) {
        const rows = typeof data === 'string' ? this.parseRawTabular(data) : (Array.isArray(data) ? data : []);
        if (!rows.length) {
            throw new Error('No valid rows found to import.');
        }

        const client = await pool.connect();
        const importedLeads = [];
        const createdPropertyIds = [];
        const createdPersonIds = [];
        const createdLeadIds = [];
        let listName = defaultListName;

        try {
            await client.query('BEGIN');

            for (const r of rows) {
                // Header flexibility
                const status = r['Lead Status'] || r['Status'] || r['lead_status'] || 'New';
                const firstName = (r['First Name'] || r['first_name'] || '').trim();
                const lastName = (r['Last Name'] || r['last_name'] || '').trim();
                const rowListName = (r['List'] || r['list'] || r['Campaign'] || '').trim();
                if (rowListName && listName === defaultListName) {
                    listName = rowListName;
                }

                // Construct full name & check if entity
                let fullName = `${firstName} ${lastName}`.trim();
                if (!fullName) fullName = lastName || firstName || 'Unknown Contact';

                const isEntity = /(LLC|INC|CORP|LP|TRUST|ESTATE)/i.test(fullName);

                // Geographic & Property details
                const propCity = (r['Property City'] || r['property_city'] || 'Middleburg').trim();
                const propState = (r['Property State'] || r['property_state'] || 'FL').trim();
                const propZip = (r['Property Zip'] || r['property_zip'] || '').trim();
                const propCountyName = (r['Property County'] || r['property_county'] || 'Clay').trim();

                const countyLookup = COUNTY_MAP[propCountyName.toUpperCase()] || COUNTY_MAP['CLAY'];
                const countyId = countyLookup.id;
                const countyCode = countyLookup.code;

                // Raw APN parcel preservation
                const parcelRaw = (r['Apn'] || r['APN'] || r['Parcel'] || r['parcel_raw'] || '').trim();
                const parcelMatch = normalizeParcelMatch(parcelRaw);

                // Mailing Address
                const mailCity = (r['Mailing City'] || r['mailing_city'] || '').trim();
                const mailState = (r['Mailing State'] || r['mailing_state'] || '').trim();
                const mailZip = (r['Mailing Zip'] || r['mailing_zip'] || '').trim();
                const mailCounty = (r['Mailing County'] || r['mailing_county'] || '').trim();
                const mailingAddress = mailCity ? `${mailCity}, ${mailState} ${mailZip}`.trim() : '';

                // Contact Ladder (Phones 1..5 with types)
                const phones = [];
                for (let p = 1; p <= 5; p++) {
                    const phoneRaw = r[`Phone ${p}`] || r[`phone_${p}`] || '';
                    const phoneType = r[`Phone ${p} TYPE`] || r[`phone_${p}_type`] || (p === 1 ? 'Mobile' : 'Landline');
                    if (phoneRaw && String(phoneRaw).trim().length >= 7) {
                        phones.push({
                            slot: p,
                            raw: String(phoneRaw).trim(),
                            formatted: this.formatPhone(phoneRaw),
                            type: phoneType.trim(),
                            is_primary: p === 1
                        });
                    }
                }

                const primaryPhone = phones[0]?.formatted || phones[0]?.raw || '';

                // Emails (Email & Email 2)
                const email1 = (r['Email'] || r['email'] || r['email_1'] || '').trim();
                const email2 = (r['Email 2'] || r['email_2'] || '').trim();
                const emails = [email1, email2].filter(Boolean);
                const primaryEmail = emails[0] || '';

                // Render canonical CrownKey
                const crownKey = renderCrownKey({
                    countyCode,
                    parcelRaw: parcelRaw || '00-00-00-000000-000-00',
                    firstSourceCode: sourceCode
                });

                // 1. Create or Find core.people
                const personId = crypto.randomUUID();
                await client.query(`
                    INSERT INTO core.people (
                        person_id, full_name, first_name, last_name, primary_phone, primary_email,
                        mailing_address, is_suppressed, verification_level, phones, emails, metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
                `, [
                    personId,
                    fullName,
                    firstName || null,
                    lastName || null,
                    primaryPhone || null,
                    primaryEmail || null,
                    mailingAddress || null,
                    false,
                    'TIER_1_UNVERIFIED',
                    JSON.stringify(phones),
                    JSON.stringify(emails),
                    JSON.stringify({ isEntity, mailingCounty: mailCounty, originalList: listName })
                ]);
                createdPersonIds.push(personId);

                // 2. Create core.properties
                const propertyId = crypto.randomUUID();
                const addressLine1 = propCity ? `${propCity} Property (${parcelRaw})` : `Parcel ${parcelRaw}`;
                await client.query(`
                    INSERT INTO core.properties (
                        property_id, county_id, parcel_raw, parcel_match, address_line1,
                        city, state_code, postal_code, property_type, assessed_value, metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                `, [
                    propertyId,
                    countyId,
                    parcelRaw,
                    parcelMatch,
                    addressLine1,
                    propCity,
                    propState,
                    propZip,
                    'Single Family Residential',
                    250000.00,
                    JSON.stringify({ countyCode, crownKey, listName })
                ]);
                createdPropertyIds.push(propertyId);

                // 3. Create core.leads
                const leadId = crypto.randomUUID();
                const normalizedStatus = status.toUpperCase().includes('NEW') ? 'NEW' : 'CONTACTED';
                await client.query(`
                    INSERT INTO core.leads (
                        lead_id, first_source_code, source_detail, property_id, person_id,
                        status, priority_score, metadata, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                `, [
                    leadId,
                    sourceCode,
                    `Skip-Trace List: ${listName}`,
                    propertyId,
                    personId,
                    normalizedStatus,
                    65,
                    JSON.stringify({
                        crownKey,
                        rawStatus: status,
                        phoneCount: phones.length,
                        emailCount: emails.length,
                        listName
                    })
                ]);
                createdLeadIds.push(leadId);

                // Also sync to in-memory store for instant UI reactivity
                const leadRecord = {
                    lead_id: leadId,
                    first_source_code: sourceCode,
                    source_detail: `Skip-Trace List: ${listName}`,
                    property_id: propertyId,
                    person_id: personId,
                    status: normalizedStatus,
                    priority_score: 65,
                    created_at: new Date().toISOString(),
                    crownKey
                };
                db.data.core.leads.unshift(leadRecord);
                db.data.core.properties.unshift({
                    property_id: propertyId,
                    county_id: countyId,
                    parcel_raw: parcelRaw,
                    parcel_match: parcelMatch,
                    address_line1: addressLine1,
                    city: propCity,
                    state_code: propState,
                    postal_code: propZip,
                    crownKey
                });
                db.data.core.people.unshift({
                    person_id: personId,
                    full_name: fullName,
                    primary_phone: primaryPhone,
                    primary_email: primaryEmail
                });

                importedLeads.push({
                    lead_id: leadId,
                    crownKey,
                    owner_name: fullName,
                    parcel_raw: parcelRaw,
                    city: propCity,
                    zip: propZip,
                    primary_phone: primaryPhone,
                    phones_count: phones.length,
                    primary_email: primaryEmail,
                    emails_count: emails.length,
                    status: normalizedStatus
                });
            }

            // 4. Record Audit Event
            const auditId = crypto.randomUUID();
            await client.query(`
                INSERT INTO audit.audit_events (
                    audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [
                auditId,
                actor,
                'LEADS_BULK_IMPORTED',
                'LEAD_BATCH',
                createdLeadIds[0],
                crypto.randomUUID(),
                JSON.stringify({
                    count: rows.length,
                    list_name: listName,
                    lead_ids: createdLeadIds
                })
            ]);

            // 5. Trigger Real-Time Operational Notification
            const notifId = crypto.randomUUID();
            await client.query(`
                INSERT INTO ops.notifications (
                    notification_id, title, body, category, priority, color, icon, is_read, metadata, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, $8, NOW())
            `, [
                notifId,
                `Real-Time Lead Ingestion: ${rows.length} Leads`,
                `Successfully ingested ${rows.length} skip-traced records from "${listName}" into PostgreSQL.`,
                'LEAD',
                'MEDIUM',
                'cyan',
                'upload',
                JSON.stringify({ count: rows.length, list_name: listName, lead_ids: createdLeadIds })
            ]);

            await client.query('COMMIT');

            return {
                success: true,
                count: importedLeads.length,
                list_name: listName,
                notification_id: notifId,
                leads: importedLeads,
                ids: {
                    lead_ids: createdLeadIds,
                    property_ids: createdPropertyIds,
                    person_ids: createdPersonIds
                }
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Purge specific imported batch (for cleanup after verification testing)
     */
    static async purgeBatch({ leadIds = [], propertyIds = [], personIds = [] }) {
        if (!leadIds.length && !propertyIds.length && !personIds.length) {
            return { purged: 0 };
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (leadIds.length) {
                await client.query('DELETE FROM core.leads WHERE lead_id = ANY($1)', [leadIds]);
                // In-memory sync
                db.data.core.leads = db.data.core.leads.filter(l => !leadIds.includes(l.lead_id));
            }
            if (propertyIds.length) {
                await client.query('DELETE FROM core.properties WHERE property_id = ANY($1)', [propertyIds]);
                db.data.core.properties = db.data.core.properties.filter(p => !propertyIds.includes(p.property_id));
            }
            if (personIds.length) {
                await client.query('DELETE FROM core.people WHERE person_id = ANY($1)', [personIds]);
                db.data.core.people = db.data.core.people.filter(p => !personIds.includes(p.person_id));
            }

            await client.query('COMMIT');
            return {
                success: true,
                purged_leads: leadIds.length,
                purged_properties: propertyIds.length,
                purged_people: personIds.length
            };
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }
}
