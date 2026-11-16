/**
 * @file backend/src/services/batchLeadsService.js
 * Dedicated BatchLeads Automated Webhook & Lead Ingestion Engine
 * 
 * Supports:
 * - Real-time push button webhook from Darren's BatchLeads Workspace (tag triggers: "Push to HushHawk", "Hot Lead", etc.)
 * - Strict CrownKey attribution: e.g. DUV-[PARCEL]-VAC-001 · BATCHLEADS
 * - PostgreSQL canonical persistence (core.properties, core.people, core.pillar_events, core.leads, core.tasks)
 * - Automatic Podio Seller Leads CRM dispatch with dedicated BatchLeads source
 * - Real-time in-app executive notification and live audit trail recording
 */

import crypto from 'crypto';
import { pool } from '../store/pgClient.js';
import { db } from '../store/database.js';
import { renderCrownKey, normalizeParcelMatch } from '../../../packages/crownkey/index.js';
import { PodioService } from './podioService.js';

const COUNTY_LOOKUP = {
    'DUVAL': { code: 'DUV', id: 'c1111111-1111-1111-1111-111111111111' },
    'CLAY': { code: 'CLY', id: 'c3333333-3333-3333-3333-333333333333' },
    'ST. JOHNS': { code: 'STJ', id: 'c2222222-2222-2222-2222-222222222222' },
    'ST JOHNS': { code: 'STJ', id: 'c2222222-2222-2222-2222-222222222222' },
    'NASSAU': { code: 'NAS', id: 'c4444444-4444-4444-4444-444444444444' }
};

export class BatchLeadsService {
    /**
     * Clean and format phone number to standard (904) 555-1234
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
     * Ingest an inbound lead webhook payload from BatchLeads
     * @param {Object} payload Raw BatchLeads webhook JSON payload
     * @returns {Promise<Object>} Processed lead record with CrownKey and status
     */
    static async ingestWebhook(payload = {}) {
        // Extract normalized fields regardless of whether nested in payload.property, payload.data, or root
        const root = payload.property || payload.data || payload.lead || payload.item || payload;

        // 1. Property Details
        const rawAddress = (
            root.street_address || 
            root.propertyAddress ||
            root.property_address || 
            root.address || 
            root.address_line1 || 
            root.formatted_address || 
            root.address1 ||
            '1000 Commercial Way'
        ).trim();

        const city = (root.city || root.propertyCity || root.property_city || 'Jacksonville').trim();
        const state = (root.state || root.propertyState || root.property_state || 'FL').trim().toUpperCase();
        const zip = (root.zip || root.propertyZip || root.zip_code || root.property_zip || root.postal_code || '32202').trim();
        const countyName = (root.county || root.propertyCounty || root.property_county || 'Duval').trim().toUpperCase();

        const countyInfo = COUNTY_LOOKUP[countyName] || COUNTY_LOOKUP['DUVAL'];
        const countyCode = countyInfo.code;
        const countyId = countyInfo.id;

        // Parcel / APN (preserve formatting, leading zeros, hyphens)
        const parcelRaw = (
            root.apn || 
            root.parcel_number || 
            root.parcel_id || 
            root.parcel || 
            root.parcel_raw || 
            '091823-0000'
        ).trim();
        const parcelMatch = normalizeParcelMatch(parcelRaw);

        // 2. Owner / Contact Details
        let fullName = (
            root.owner_name || 
            root.owner_full_name || 
            root.full_name || 
            root.contact_name || 
            ''
        ).trim();

        const firstName = (root.owner_first_name || root.first_name || '').trim();
        const lastName = (root.owner_last_name || root.last_name || '').trim();
        if (!fullName && (firstName || lastName)) {
            fullName = `${firstName} ${lastName}`.trim();
        }
        if (!fullName) fullName = 'Property Owner';

        // Extract Phones
        const phones = [];
        if (Array.isArray(root.phone_numbers || root.phones)) {
            const rawList = root.phone_numbers || root.phones;
            rawList.forEach((item, idx) => {
                const num = typeof item === 'object' ? (item.number || item.phone || '') : item;
                const type = typeof item === 'object' ? (item.type || 'Mobile') : (idx === 0 ? 'Mobile' : 'Landline');
                if (num && String(num).replace(/\D/g, '').length >= 7) {
                    phones.push({
                        slot: idx + 1,
                        raw: String(num).trim(),
                        formatted: this.formatPhone(num),
                        type,
                        is_primary: idx === 0
                    });
                }
            });
        } else {
            for (let i = 1; i <= 5; i++) {
                const num = root[`phone_${i}`] || root[`phone${i}`] || (i === 1 ? (root.phone || root.primary_phone) : null);
                if (num && String(num).replace(/\D/g, '').length >= 7) {
                    phones.push({
                        slot: i,
                        raw: String(num).trim(),
                        formatted: this.formatPhone(num),
                        type: i === 1 ? 'Mobile' : 'Landline',
                        is_primary: i === 1
                    });
                }
            }
        }
        const primaryPhone = phones[0]?.formatted || phones[0]?.raw || '+19045550199';

        // Extract Emails
        const emails = [];
        if (Array.isArray(root.emails)) {
            root.emails.forEach(e => {
                const emailStr = typeof e === 'object' ? (e.email || e.address) : e;
                if (emailStr && String(emailStr).includes('@')) emails.push(String(emailStr).trim().toLowerCase());
            });
        } else if (root.email || root.primary_email) {
            emails.push(String(root.email || root.primary_email).trim().toLowerCase());
        }
        const primaryEmail = emails[0] || '';

        // Mailing Address
        const mailCity = (root.mailing_city || root.mail_city || '').trim();
        const mailState = (root.mailing_state || root.mail_state || '').trim();
        const mailZip = (root.mailing_zip || root.mail_zip || '').trim();
        const mailStreet = (root.mailing_street || root.mailing_address || '').trim();
        const mailingAddress = mailStreet ? `${mailStreet}, ${mailCity} ${mailState} ${mailZip}`.trim() : (mailCity ? `${mailCity}, ${mailState} ${mailZip}`.trim() : '');

        // 3. Distress Indicators & List Attribution
        const lists = Array.isArray(root.lists) ? root.lists : (root.list_name ? [root.list_name] : ['BatchLeads Vacants']);
        const tags = Array.isArray(root.tags) ? root.tags : (root.tag ? [root.tag] : ['BatchLeads Push', 'Hot Lead']);
        const isVacant = Boolean(root.is_vacant || root.vacancy || lists.some(l => /vacan/i.test(l)));
        const isTaxDelinquent = Boolean(root.is_tax_delinquent || lists.some(l => /tax/i.test(l)));
        const isForeclosure = Boolean(root.is_foreclosure || lists.some(l => /foreclos/i.test(l)));
        const isAbsentee = Boolean(root.is_absentee || lists.some(l => /absentee/i.test(l)));

        // Determine CrownKey Pillar Code
        let pillarCode = 'VAC'; // Default to VAC since Darren's primary list is 9,131 Vacants
        if (isForeclosure) pillarCode = 'FC';
        else if (isTaxDelinquent) pillarCode = 'TAX';
        else if (isVacant) pillarCode = 'VAC';
        else if (isAbsentee) pillarCode = 'ABS';

        // Render Canonical CrownKey with dedicated BATCHLEADS lead source
        const crownKey = renderCrownKey({
            countyCode,
            parcelRaw,
            pillarCode,
            eventNumber: 1,
            firstSourceCode: 'BATCHLEADS'
        });

        const batchLeadsPropertyId = root.property_id || root.id || `bl-${Date.now()}`;
        const estimatedEquity = parseFloat(root.estimated_equity || root.equity || 75000);
        const estimatedValue = parseFloat(root.estimated_value || root.arv || 215000);

        // 4. PostgreSQL Database Persistence
        const client = await pool.connect();
        const propertyId = crypto.randomUUID();
        const personId = crypto.randomUUID();
        const eventId = crypto.randomUUID();
        const leadId = crypto.randomUUID();
        const taskId = crypto.randomUUID();

        try {
            await client.query('BEGIN');

            // 4a. Insert/Update core.properties
            const propRes = await client.query(`
                INSERT INTO core.properties (
                    property_id, county_id, parcel_raw, parcel_match, address_line1,
                    city, state_code, postal_code, property_type, assessed_value, metadata, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
                ON CONFLICT (county_id, parcel_match) DO UPDATE SET
                    address_line1 = EXCLUDED.address_line1,
                    city = EXCLUDED.city,
                    assessed_value = EXCLUDED.assessed_value,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
                RETURNING property_id;
            `, [
                propertyId,
                countyId,
                parcelRaw,
                parcelMatch,
                rawAddress,
                city,
                state,
                zip,
                'SINGLE_FAMILY',
                estimatedValue,
                JSON.stringify({
                    source: 'BATCHLEADS',
                    batchLeadsPropertyId,
                    estimatedEquity,
                    lists,
                    tags,
                    isVacant,
                    darrenWorkspaceSync: true
                })
            ]);
            const finalPropertyId = propRes.rows[0]?.property_id || propertyId;

            // 4b. Insert/Update core.people
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
                primaryPhone,
                primaryEmail || null,
                mailingAddress || null,
                false,
                'TIER_2_SKIP_TRACED',
                JSON.stringify(phones),
                JSON.stringify(emails),
                JSON.stringify({ source: 'BATCHLEADS', batchLeadsPropertyId, lists })
            ]);

            // 4c. Insert Pillar Event (core.pillar_events)
            await client.query(`
                INSERT INTO core.pillar_events (
                    event_id, property_id, pillar_code, event_number, external_event_id,
                    case_reference, event_status, verification_status, event_date, created_at
                ) VALUES ($1, $2, $3, 1, $4, $5, 'OPEN', 'CONFIRMED', CURRENT_DATE, NOW())
                ON CONFLICT (property_id, pillar_code, event_number) DO UPDATE SET
                    external_event_id = EXCLUDED.external_event_id,
                    case_reference = EXCLUDED.case_reference;
            `, [
                eventId,
                finalPropertyId,
                pillarCode,
                String(batchLeadsPropertyId),
                crownKey
            ]);

            // 4d. Insert Lead (core.leads) with DEDICATED BatchLeads attribution
            await client.query(`
                INSERT INTO core.leads (
                    lead_id, first_source_code, source_detail, property_id, person_id,
                    status, priority_score, assigned_user_id, metadata, created_at, updated_at
                ) VALUES ($1, 'BATCHLEADS', $2, $3, $4, 'NEW', 92, '01111111-1111-1111-1111-111111111111', $5, NOW(), NOW())
            `, [
                leadId,
                `BatchLeads Webhook Tag Push: ${tags.join(', ')} (Darren's Workspace)`,
                finalPropertyId,
                personId,
                JSON.stringify({
                    crown_key: crownKey,
                    lead_source: 'BATCHLEADS',
                    lead_source_name: 'BatchLeads Push',
                    channel: 'BatchLeads Inbound Webhook',
                    badge: 'BatchLeads',
                    badgeColor: '#8b5cf6',
                    workspace: "Darren's Workspace",
                    rawAddress,
                    primaryPhone,
                    primaryEmail,
                    estimatedEquity,
                    estimatedValue,
                    tags,
                    lists
                })
            ]);

            // 4e. Link Property to Person in rel.entity_relationships
            await client.query(`
                INSERT INTO rel.entity_relationships (
                    relationship_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id,
                    relationship_type, verification_status, confidence_score, created_at
                ) VALUES ($1, 'PERSON', $2, 'PROPERTY', $3, 'OWNER', 'CONFIRMED', 0.95, NOW())
            `, [
                crypto.randomUUID(),
                personId,
                finalPropertyId
            ]);

            // 4f. Create High-Priority Task in core.tasks
            await client.query(`
                INSERT INTO core.tasks (
                    task_id, title, status, category, priority, is_completed, due_time, created_at
                ) VALUES ($1, $2, 'PENDING', 'Acquisitions', 'URGENT', false, 'Within 1 Hour', NOW())
            `, [
                taskId,
                `🔥 Call New BatchLeads Lead: ${fullName} · ${rawAddress} (Hot Lead Push)`
            ]);

            // 4g. Emit Immutable Audit Event
            await client.query(`
                INSERT INTO audit.audit_events (
                    audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at
                ) VALUES ($1, 'BatchLeads Webhook', 'BATCHLEADS_LEAD_INGESTED', 'LEAD', $2, $3, $4, NOW())
            `, [
                crypto.randomUUID(),
                leadId,
                crypto.randomUUID(),
                JSON.stringify({
                    crownKey,
                    address: rawAddress,
                    owner: fullName,
                    phone: primaryPhone,
                    source: 'BATCHLEADS',
                    tags,
                    batchLeadsPropertyId
                })
            ]);

            await client.query('COMMIT');
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }

        // 5. In-Memory Store Synchronization (Instant UI Availability)
        const uiLead = {
            id: leadId,
            lead_id: leadId,
            property_id: propertyId,
            crown_key: crownKey,
            crownKey,
            name: fullName,
            contact_name: fullName,
            phone: primaryPhone,
            email: primaryEmail,
            address: rawAddress,
            city,
            state,
            zip,
            lead_source: 'BATCHLEADS',
            source: 'BatchLeads',
            leadSourceBadge: 'BatchLeads',
            sourceColor: '#8b5cf6',
            stage: 'New',
            status: 'NEW',
            motivation: 'High',
            temperature: 'Hot',
            score: 92,
            tags: ['BatchLeads', ...tags],
            arv: estimatedValue,
            equity: estimatedEquity,
            notes: `Auto-ingested via BatchLeads webhook from Darren's Workspace. Tags: ${tags.join(', ')}. Lists: ${lists.join(', ')}.`,
            createdAt: new Date().toISOString()
        };

        if (Array.isArray(db.data.crm.leads)) {
            db.data.crm.leads.unshift(uiLead);
        }

        // Create Operational Notification
        const notification = {
            id: `bl-notif-${Date.now()}`,
            type: 'LEAD_INGESTED',
            title: `🚀 New BatchLeads Lead: ${rawAddress}`,
            message: `${fullName} pushed from Darren's Workspace with CrownKey ${crownKey}.`,
            severity: 'URGENT',
            created_at: new Date().toISOString(),
            read: false,
            link: '/seller-leads'
        };
        if (Array.isArray(db.data.crm.notifications)) {
            db.data.crm.notifications.unshift(notification);
        }

        // 6. Optional Outbound Sync to Podio (App 30087410 - Seller Leads)
        let podioItemId = null;
        try {
            if (process.env.PODIO_CLIENT_ID && process.env.PODIO_APP_TOKEN) {
                const auth = await PodioService.authenticateApp(process.env.PODIO_APP_ID || '30087410', process.env.PODIO_APP_TOKEN);
                if (auth && auth.access_token) {
                    const fields = {
                        'seller-name': fullName,
                        'property-address': rawAddress,
                        'phone-number': primaryPhone,
                        'email': primaryEmail,
                        'lead-source': 'BatchLeads',
                        'crownkey-reference': crownKey,
                        'motivation': 'High',
                        'notes': `Pushed from Darren's BatchLeads Workspace. Lists: ${lists.join(', ')}`
                    };
                    const podioRes = await PodioService.createItem(auth.access_token, process.env.PODIO_APP_ID || '30087410', fields);
                    podioItemId = podioRes?.item_id || null;
                }
            }
        } catch (podioErr) {
            console.warn('[BatchLeads Podio Sync Info]:', podioErr.message);
        }

        return {
            success: true,
            crownKey,
            leadId,
            propertyId,
            source: 'BATCHLEADS',
            sourceName: 'BatchLeads Webhook Push',
            owner: fullName,
            address: rawAddress,
            phone: primaryPhone,
            email: primaryEmail,
            podioItemId,
            tags,
            message: `Lead successfully attributed to BATCHLEADS with CrownKey: ${crownKey}`
        };
    }
}
