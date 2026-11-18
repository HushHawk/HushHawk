/**
 * BatchLeads inbound webhook. Only data that arrives in the payload is stored: a push without a parcel and a
 * registered county is rejected rather than filled in. Distress tags become POSSIBLE events (a list tag is a signal,
 * not an official record) and the raw payload is kept as the source record.
 */
import crypto from 'crypto';
import { pool, withTransaction, audit } from '../store/pgClient.js';
import { normalizeParcelMatch } from '../../../packages/crownkey/index.js';
import { CrmService } from './crmService.js';
import { CrownKeyService } from './crownkeyService.js';
import { EventService, HttpError } from './eventService.js';
import { PodioService } from './podioService.js';
import { ParcelLookupService } from './parcelLookupService.js';
import { AutomationService } from './automationService.js';

const clean = (val, fallback = '') => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') {
        const inner = val.street || val.street_address || val.address || val.formatted || val.name || val.value || val.line1 || '';
        return typeof inner === 'string' ? inner.trim() : fallback;
    }
    return String(val).trim();
};
const first = (...values) => values.map(v => clean(v)).find(Boolean) || '';

export class BatchLeadsService {
    static formatPhone(raw) {
        const digits = String(raw || '').replace(/\D/g, '');
        if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        if (digits.length === 11 && digits.startsWith('1')) return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        return String(raw || '').trim();
    }

    static async ingestWebhook(payload = {}) {
        const root = payload.property || payload.data || payload.lead || payload.item || payload || {};
        const addr = [root.address, root.propertyAddress, root.property_address].find(v => v && typeof v === 'object') || {};

        const address = first(root.street_address, root.propertyAddress, root.property_address, root.address, root.address_line1, root.formatted_address, addr.street, addr.street_address, addr.line1);
        const city = first(root.city, root.property_city, addr.city);
        const state = first(root.state, root.property_state, addr.state).toUpperCase();
        const zip = first(root.zip, root.zip_code, root.property_zip, root.postal_code, addr.zip, addr.postal_code);
        let countyName = first(root.county, root.property_county, addr.county);
        let parcelRaw = first(root.apn, root.parcel_number, root.parcel_id, root.parcel, root.parcel_raw);
        // A push with an address but no parcel: take the parcel from the county record, and only when the street address matches it.
        let resolved = null;
        if (!parcelRaw && address) {
            const lookup = await ParcelLookupService.resolve({ line1: address, city, state: state || 'FL', zip });
            if (lookup.found) {
                resolved = lookup.parcel;
                parcelRaw = resolved.parcelId;
                countyName = countyName || resolved.countyCode;
            } else {
                throw new HttpError(422, `The BatchLeads push had no parcel / APN and none could be verified from the address: ${lookup.reason}`);
            }
        }
        if (!parcelRaw) throw new HttpError(422, 'The BatchLeads push did not include a parcel / APN or a property address.');
        if (!countyName) throw new HttpError(422, 'The BatchLeads push did not include the property county.');

        const { rows: counties } = await pool.query('SELECT county_id, county_name, county_code FROM ref.counties');
        const norm = s => s.toUpperCase().replace(/\.$/, '').replace(/^ST\.? /, 'ST ');
        const county = counties.find(c => norm(c.county_name) === norm(countyName) || norm(c.county_name) === `${norm(countyName)} COUNTY` || c.county_code === countyName.toUpperCase());
        if (!county) throw new HttpError(422, `County '${countyName}' is not in the county registry.`);

        const owner = [root.owner, root.contact].find(v => v && typeof v === 'object') || {};
        const firstName = first(root.owner_first_name, root.first_name, owner.first_name);
        const lastName = first(root.owner_last_name, root.last_name, owner.last_name);
        const fullName = first(root.owner_name, root.owner_full_name, root.full_name, root.contact_name, owner.name, owner.full_name) || `${firstName} ${lastName}`.trim();

        const phones = [];
        const phoneList = root.phone_numbers || root.phones;
        if (Array.isArray(phoneList)) {
            phoneList.forEach((item, i) => {
                const num = typeof item === 'object' ? (item.number || item.phone || '') : item;
                if (String(num).replace(/\D/g, '').length >= 7) phones.push({ slot: i + 1, raw: String(num).trim(), formatted: this.formatPhone(num), type: typeof item === 'object' ? (item.type || null) : null, is_primary: i === 0 });
            });
        } else {
            for (let i = 1; i <= 5; i++) {
                const num = root[`phone_${i}`] || root[`phone${i}`] || (i === 1 ? (root.phone || root.primary_phone) : null);
                if (num && String(num).replace(/\D/g, '').length >= 7) phones.push({ slot: i, raw: String(num).trim(), formatted: this.formatPhone(num), type: null, is_primary: i === 1 });
            }
        }
        const emails = Array.isArray(root.emails)
            ? root.emails.map(e => (typeof e === 'object' ? (e.email || e.address) : e)).filter(e => e && String(e).includes('@')).map(e => String(e).trim().toLowerCase())
            : [root.email || root.primary_email].filter(e => e && String(e).includes('@')).map(e => String(e).trim().toLowerCase());
        const mailStreet = first(root.mailing_street, root.mailing_address);
        const mailRest = `${first(root.mailing_city, root.mail_city)} ${first(root.mailing_state, root.mail_state)} ${first(root.mailing_zip, root.mail_zip)}`.trim();
        const mailing = mailStreet ? `${mailStreet}, ${mailRest}`.trim() : (mailRest || null);

        const lists = Array.isArray(root.lists) ? root.lists : (root.list_name ? [root.list_name] : []);
        const tags = Array.isArray(root.tags) ? root.tags : (root.tag ? [root.tag] : []);
        const signal = re => lists.concat(tags).some(t => re.test(String(t)));
        const pillars = [
            [root.is_foreclosure || signal(/foreclos/i), 'FC'], [root.is_tax_delinquent || signal(/tax/i), 'TAX'],
            [root.is_vacant || root.vacancy || signal(/vacan/i), 'VAC'], [root.is_absentee || signal(/absentee/i), 'ABS']
        ].filter(([on]) => on).map(([, code]) => code);

        const externalId = String(root.property_id || root.id || '').trim() || null;
        const parcelMatch = normalizeParcelMatch(parcelRaw);
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

        const out = await withTransaction(async client => {
            const { rows: [existing] } = await client.query('SELECT property_id FROM core.properties WHERE county_id = $1 AND parcel_match = $2', [county.county_id, parcelMatch]);
            let propertyId = existing?.property_id;
            if (!propertyId) {
                ({ rows: [{ property_id: propertyId }] } = await client.query(
                    `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, legal_description, assessed_value, metadata)
                     VALUES ($1,$2,$3,$4,$5,coalesce(nullif($6,''),'FL'),$7,$8,$9,$10,$11::jsonb) RETURNING property_id`,
                    [county.county_id, parcelRaw, parcelMatch, address || null, city || null, state, zip || null,
                     resolved?.propertyType || null, resolved?.legalDescription || null, resolved?.justValue ?? null,
                     JSON.stringify(resolved ? { parcel_source: resolved.source, parcel_verification: resolved.verification, parcel_resolved_at: new Date().toISOString(), county_owner_of_record: resolved.owner } : {})]));
            }
            const { rows: [source] } = await client.query(
                `INSERT INTO raw.source_records (source_system, jurisdiction, source_external_id, payload, payload_hash, parser_version)
                 VALUES ('BATCHLEADS', $1, $2, $3, $4, 'webhook-v1')
                 ON CONFLICT (source_system, jurisdiction, source_external_id) WHERE source_external_id IS NOT NULL
                 DO UPDATE SET payload = EXCLUDED.payload, payload_hash = EXCLUDED.payload_hash, observed_at = now()
                 RETURNING source_record_id`,
                [county.county_name, externalId || `${parcelMatch}:${payloadHash.slice(0, 12)}`, JSON.stringify(payload), payloadHash]);

            const { rows: [prior] } = await client.query(`SELECT lead_id FROM core.leads WHERE property_id = $1 AND first_source_code = 'BATCHLEADS' ORDER BY created_at LIMIT 1`, [propertyId]);
            let leadId = prior?.lead_id; let isNew = false;
            if (leadId) {
                await client.query(
                    `INSERT INTO core.attribution_touchpoints (lead_id, source_code, contact_method, evidence, created_by) VALUES ($1,'BATCHLEADS','IMPORT','Repeat BatchLeads push','BatchLeads webhook')`, [leadId]);
            } else {
                const lead = await CrmService.createLead({
                    sourceCode: 'BATCHLEADS', sourceDetail: lists.length ? `BatchLeads: ${lists.join(', ')}` : 'BatchLeads push', contactMethod: 'IMPORT', propertyId,
                    attributionConfidence: 'VERIFIED', attributionEvidence: `BatchLeads webhook ${externalId || payloadHash.slice(0, 12)}`, actor: 'BatchLeads webhook', db: client,
                    person: fullName ? { name: fullName, phone: phones[0]?.formatted || phones[0]?.raw || null, email: emails[0] || null, mailingAddress: mailing } : null,
                    metadata: { tags, lists }
                });
                leadId = lead.lead_id; isNew = true;
                if (lead.person_id) {
                    await client.query('UPDATE core.people SET first_name = $2, last_name = $3, phones = $4, emails = $5 WHERE person_id = $1',
                        [lead.person_id, firstName || null, lastName || null, JSON.stringify(phones), JSON.stringify(emails)]);
                }
            }
            await audit(client, { actor: 'BatchLeads webhook', action: isNew ? 'BATCHLEADS_LEAD_INGESTED' : 'BATCHLEADS_REPEAT_PUSH', entityType: 'LEAD', entityId: leadId, diff: { propertyId, pillars } });
            return { propertyId, leadId, isNew, sourceRecordId: source.source_record_id };
        });

        const events = [];
        for (const pillarCode of pillars) {
            try {
                const r = await EventService.recordPillarEvent({
                    propertyId: out.propertyId, pillarCode, externalEventId: `BATCHLEADS:${externalId || parcelMatch}:${pillarCode}`,
                    verificationStatus: 'POSSIBLE', sourceRecordId: out.sourceRecordId, evidenceNotes: 'Signal from BatchLeads list/tag; not an official record', actor: 'BatchLeads webhook'
                });
                await pool.query('INSERT INTO core.lead_event_links (lead_id, event_id, verification_status, created_by) VALUES ($1,$2,\'POSSIBLE\',\'BatchLeads webhook\') ON CONFLICT DO NOTHING', [out.leadId, r.event.event_id]);
                events.push({ pillarCode, eventId: r.event.event_id, isNew: r.isNew });
            } catch (error) {
                events.push({ pillarCode, error: error.message });
            }
        }

        const [prop] = await CrownKeyService.loadProperties('WHERE p.property_id = $1', [out.propertyId]);
        const enriched = await CrownKeyService.enrichProperty(prop);
        const crownKey = enriched.leads.find(l => l.lead_id === out.leadId)?.crownKey || enriched.crownKeyBase;

        await pool.query(
            `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
             VALUES (gen_random_uuid(), $1, $2, 'LEAD', 'HIGH', 'cyan', 'zap', false, now())`,
            [`BatchLeads ${out.isNew ? 'lead' : 'repeat push'}: ${address || parcelRaw}`, `${fullName || 'Unnamed owner'} · ${crownKey}`]);
        await AutomationService.onLeadSaved('batchleads_lead', { leadId: out.leadId, eventId: externalId, target: address || parcelRaw }).catch(error => console.error('[BatchLeads] automation failed:', error.message));

        let podioItemId = null; let podioError = null;
        if (out.isNew && process.env.PODIO_CLIENT_ID && process.env.PODIO_APP_TOKEN) {
            try {
                const appId = process.env.PODIO_APP_ID;
                const auth = await PodioService.authenticateApp(appId, process.env.PODIO_APP_TOKEN);
                const res = await PodioService.createItem(auth.access_token, appId, {
                    'seller-name': fullName, 'property-address': address, 'phone-number': phones[0]?.formatted || '', email: emails[0] || '',
                    'lead-source': 'BatchLeads', 'crownkey-reference': crownKey, notes: lists.length ? `BatchLeads lists: ${lists.join(', ')}` : 'BatchLeads push'
                });
                podioItemId = res?.item_id || null;
            } catch (error) {
                podioError = error.message;
            }
        }
        return { success: true, crownKey, leadId: out.leadId, propertyId: out.propertyId, isNewLead: out.isNew, source: 'BATCHLEADS', events, podioItemId, podioError };
    }
}
