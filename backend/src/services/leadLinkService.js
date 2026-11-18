import crypto from 'crypto';
import { pool, withTransaction, audit } from '../store/pgClient.js';
import { normalizeParcelMatch } from '../../../packages/crownkey/index.js';
import { ParcelLookupService } from './parcelLookupService.js';

/**
 * Links leads to properties by address. A conversation thread (calls, texts, emails logged in Podio Feeds) often names the property it is
 * about. When that address is a real street address, the county parcel is looked up (and accepted only if the recorded address matches),
 * the property is registered, and every lead sharing the thread's email or phone number is linked to it. A lead that already has a
 * property is never changed, and nothing is guessed: an address that cannot be verified leaves the lead unlinked.
 */
export class LeadLinkService {
    static parseStreet(text) {
        const m = String(text || '').match(/^\s*(\d+[^,]*?)\s*,\s*([^,]+?)\s*,\s*([A-Za-z]{2})\b\s*(\d{5})?/);
        return m ? { line1: m[1], city: m[2], state: m[3].toUpperCase(), zip: m[4] || null } : null;
    }

    static async linkFromConversations() {
        const { rows: threads } = await pool.query(
            `SELECT DISTINCT t.id, t.property_address, lower(t.contact_email) email, regexp_replace(coalesce(t.contact_phone,''), '\\D', '', 'g') phone
             FROM core.conversation_desk_threads t
             WHERE t.property_id IS NULL AND t.property_address ~ '^\\s*[0-9]+\\s+\\S+.*,'`);
        const { rows: counties } = await pool.query('SELECT county_id, county_name, county_code FROM ref.counties');
        const byAddress = new Map();
        for (const t of threads) (byAddress.get(t.property_address) || byAddress.set(t.property_address, []).get(t.property_address)).push(t);

        const summary = { addressesTried: 0, propertiesRegistered: 0, leadsLinked: 0, notFound: [] };
        for (const [addressText, group] of byAddress) {
            const parts = this.parseStreet(addressText);
            if (!parts) continue;
            const key = `parcel-lookup:thread:${crypto.createHash('sha1').update(addressText).digest('hex')}`;
            const { rows: [prev] } = await pool.query('SELECT value, updated_at FROM ops.kv_store WHERE key = $1', [key]);
            if (prev && Date.now() - new Date(prev.updated_at).getTime() < (prev.value.retry ? 3600e3 : 7 * 86400e3)) continue;
            summary.addressesTried++;
            const result = await ParcelLookupService.resolve(parts);
            if (!result.found) {
                await pool.query(`INSERT INTO ops.kv_store (key, value, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
                    [key, JSON.stringify({ address: addressText, status: 'NOT_FOUND', reason: result.reason, retry: Boolean(result.retry) })]);
                summary.notFound.push({ address: addressText, reason: result.reason });
                continue;
            }
            const found = result.parcel;
            const county = counties.find(c => c.county_code === found.countyCode);
            if (!county) continue;
            await withTransaction(async client => {
                const { rows: [existing] } = await client.query('SELECT property_id FROM core.properties WHERE county_id = $1 AND parcel_match = $2', [county.county_id, normalizeParcelMatch(found.parcelId)]);
                let propertyId = existing?.property_id;
                if (!propertyId) {
                    ({ rows: [{ property_id: propertyId }] } = await client.query(
                        `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code, property_type, legal_description, assessed_value, metadata)
                         VALUES ($1,$2,$3,$4,$5,'FL',$6,$7,$8,$9,$10::jsonb) RETURNING property_id`,
                        [county.county_id, found.parcelId, normalizeParcelMatch(found.parcelId), parts.line1, parts.city, parts.zip, found.propertyType, found.legalDescription, found.justValue,
                         JSON.stringify({ parcel_source: found.source, parcel_verification: found.verification, parcel_resolved_at: new Date().toISOString(), county_owner_of_record: found.owner, linked_from: 'conversation address' })]));
                    await client.query(
                        `INSERT INTO raw.source_records (source_system, jurisdiction, source_external_id, payload, payload_hash, parser_version)
                         VALUES ('FL_DOR_CADASTRAL', $1, $2, $3, $4, 'parcel-lookup-v1') ON CONFLICT (source_system, jurisdiction, source_external_id) WHERE source_external_id IS NOT NULL DO NOTHING`,
                        [county.county_name, found.parcelId, JSON.stringify(found.raw), crypto.createHash('sha256').update(JSON.stringify(found.raw)).digest('hex')]);
                    await audit(client, { actor: 'Lead linker', action: 'PARCEL_RESOLVED', entityType: 'PROPERTY', entityId: propertyId, diff: { parcel: found.parcelId, county: county.county_name, address: addressText } });
                    summary.propertiesRegistered++;
                }
                const emails = group.map(t => t.email).filter(Boolean);
                const phones = group.map(t => t.phone).filter(p => p.length >= 10);
                const { rows: linked } = await client.query(
                    `UPDATE core.leads l SET property_id = $1, updated_at = now()
                     FROM core.people p
                     WHERE p.person_id = l.person_id AND l.property_id IS NULL
                       AND ((p.primary_email IS NOT NULL AND lower(p.primary_email) = ANY($2::text[]))
                         OR (p.primary_phone IS NOT NULL AND regexp_replace(p.primary_phone, '\\D', '', 'g') = ANY($3::text[])))
                     RETURNING l.lead_id`, [propertyId, emails, phones]);
                for (const row of linked) await audit(client, { actor: 'Lead linker', action: 'LEAD_LINKED_TO_PROPERTY', entityType: 'LEAD', entityId: row.lead_id, diff: { propertyId, via: 'conversation address', address: addressText } });
                await client.query('UPDATE core.conversation_desk_threads SET property_id = $1 WHERE id = ANY($2::text[])', [propertyId, group.map(t => t.id)]);
                summary.leadsLinked += linked.length;
            });
        }
        return summary;
    }
}
