import crypto from 'crypto';
import { pool, withTransaction, audit } from '../store/pgClient.js';
import { EventService } from './eventService.js';
import { ParcelLookupService } from './parcelLookupService.js';

/**
 * Events that the county property appraiser's own roll proves, using the approved rules in the pillar dictionary:
 *   ABS  Absentee Owner     owner mailing ZIP differs from the site ZIP
 *   OOS  Out of State Owner owner mailing state is not FL
 * The roll record is stored as evidence (with a version history when the county changes it) and each event links to it. When the
 * roll later shows the condition no longer applies, the event is marked RESOLVED, never deleted. Pillars that need other sources (foreclosure,
 * tax, code, probate...) are not touched here.
 */
const zip5 = v => String(v ?? '').replace(/\D/g, '').slice(0, 5);

export function rollConditions(row) {
    const siteZip = zip5(row.PHY_ZIPCD); const ownerZip = zip5(row.OWN_ZIPCD);
    const ownerState = String(row.OWN_STATE || '').trim().toUpperCase();
    return {
        ABS: Boolean(siteZip && ownerZip && siteZip !== ownerZip),
        OOS: Boolean(ownerState && ownerState !== 'FL'),
        evidence: {
            ABS: `Owner mailing ZIP ${ownerZip || '(none)'} versus site ZIP ${siteZip || '(none)'} on the county roll.`,
            OOS: `Owner mailing state ${ownerState || '(none)'} on the county roll.`
        }
    };
}

export class CountyRollService {
    static async refreshAll({ actor = 'County roll' } = {}) {
        const { rows: props } = await pool.query(
            `SELECT p.property_id, p.parcel_raw, c.county_code, c.county_name FROM core.properties p JOIN ref.counties c USING (county_id)
             WHERE p.metadata->>'parcel_source' IS NOT NULL`);
        const summary = { checked: 0, eventsCreated: 0, eventsResolved: 0, eventsReopened: 0, notOnRoll: 0, failed: [] };
        for (const prop of props) {
            try {
                const row = await ParcelLookupService.fetchRollRecord(prop.county_code, prop.parcel_raw);
                if (!row) { summary.notOnRoll++; continue; }
                summary.checked++;
                await this.applyRoll({ prop, row, actor, summary });
            } catch (error) {
                summary.failed.push({ parcel: prop.parcel_raw, error: error.message });
            }
        }
        return summary;
    }

    static async applyRoll({ prop, row, actor, summary }) {
        const payload = JSON.stringify(row);
        const hash = crypto.createHash('sha256').update(payload).digest('hex');
        const sourceRecordId = await withTransaction(async client => {
            const { rows: [existing] } = await client.query(
                `SELECT source_record_id, payload_hash FROM raw.source_records WHERE source_system = 'FL_DOR_CADASTRAL' AND jurisdiction = $1 AND source_external_id = $2`, [prop.county_name, prop.parcel_raw]);
            if (existing) {
                if (existing.payload_hash !== hash) {
                    await client.query('INSERT INTO raw.source_record_versions (source_record_id, payload, payload_hash) SELECT source_record_id, payload, payload_hash FROM raw.source_records WHERE source_record_id = $1', [existing.source_record_id]);
                    await client.query('UPDATE raw.source_records SET payload = $2, payload_hash = $3, observed_at = now() WHERE source_record_id = $1', [existing.source_record_id, payload, hash]);
                }
                return existing.source_record_id;
            }
            const { rows: [created] } = await client.query(
                `INSERT INTO raw.source_records (source_system, jurisdiction, source_external_id, payload, payload_hash, parser_version)
                 VALUES ('FL_DOR_CADASTRAL', $1, $2, $3, $4, 'parcel-lookup-v1') RETURNING source_record_id`, [prop.county_name, prop.parcel_raw, payload, hash]);
            return created.source_record_id;
        });
        await pool.query(
            `UPDATE core.properties SET assessed_value = coalesce($2, assessed_value), metadata = coalesce(metadata, '{}'::jsonb) || $3::jsonb, updated_at = now() WHERE property_id = $1`,
            [prop.property_id, row.JV ?? null, JSON.stringify({ county_owner_of_record: row.OWN_NAME || null, owner_mailing: [row.OWN_ADDR1, row.OWN_CITY, row.OWN_STATE, row.OWN_ZIPCD].filter(Boolean).join(', ') || null, roll_checked_at: new Date().toISOString() })]);

        const cond = rollConditions(row);
        for (const code of ['ABS', 'OOS']) {
            const externalEventId = `FLDOR:${prop.county_code}:${prop.parcel_raw}:${code}`;
            const { rows: [event] } = await pool.query('SELECT event_id, event_status FROM core.pillar_events WHERE property_id = $1 AND pillar_code = $2 AND external_event_id = $3', [prop.property_id, code, externalEventId]);
            if (cond[code]) {
                if (!event) {
                    await EventService.recordPillarEvent({ propertyId: prop.property_id, pillarCode: code, caseReference: `ROLL-${row.ASMNT_YR || 'CURRENT'}`, externalEventId, eventStatus: 'OPEN', verificationStatus: 'CONFIRMED', sourceRecordId, evidenceNotes: cond.evidence[code], actor });
                    summary.eventsCreated++;
                } else if (event.event_status !== 'OPEN') {
                    await EventService.updateStatus({ eventId: event.event_id, eventStatus: 'OPEN', reason: `The county roll shows the condition again. ${cond.evidence[code]}`, actor });
                    summary.eventsReopened++;
                }
            } else if (event && event.event_status === 'OPEN') {
                await EventService.updateStatus({ eventId: event.event_id, eventStatus: 'RESOLVED', reason: `The county roll no longer shows the condition. ${cond.evidence[code]}`, actor });
                summary.eventsResolved++;
            }
        }
    }
}
