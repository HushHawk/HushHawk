import { renderCrownKey } from '../../../packages/crownkey/index.js';
import { pool } from '../store/pgClient.js';

/**
 * CrownKey display references are always assembled from structured fields in Postgres.
 * They are display strings only and are never used as keys or joins.
 */
export class CrownKeyService {
    /** Property rows joined with their county code. */
    static async loadProperties(whereSql = '', params = [], db = pool) {
        const { rows } = await db.query(
            `SELECT p.*, c.county_code
             FROM core.properties p JOIN ref.counties c ON c.county_id = p.county_id
             ${whereSql}`, params);
        return rows;
    }

    /**
     * Adds crownKeyBase, per-event keys, and per-lead keys to property rows using two batched queries.
     * - crownKeyBase: COUNTY-PARCEL
     * - events[].crownKey: COUNTY-PARCEL-PILLAR-NNN
     * - leads[].crownKey: event-level key (when the lead is linked to an event) plus that lead's own first source
     */
    static async enrichProperties(props, db = pool) {
        if (!props.length) return [];
        const ids = props.map(p => p.property_id);
        const [{ rows: events }, { rows: leads }, { rows: leadEvents }] = await Promise.all([
            db.query(`SELECT * FROM core.pillar_events WHERE property_id = ANY($1::uuid[]) ORDER BY created_at`, [ids]),
            db.query(`SELECT lead_id, property_id, first_source_code, status FROM core.leads WHERE property_id = ANY($1::uuid[]) ORDER BY created_at`, [ids]),
            db.query(`SELECT le.lead_id, le.event_id FROM core.lead_event_links le
                      JOIN core.leads l ON l.lead_id = le.lead_id
                      WHERE l.property_id = ANY($1::uuid[]) AND le.verification_status <> 'REJECTED'`, [ids])
        ]);
        const eventLinkByLead = new Map(leadEvents.map(r => [r.lead_id, r.event_id]));

        return props.map(prop => {
            const base = { countyCode: prop.county_code, parcelRaw: prop.parcel_raw };
            const propEvents = events
                .filter(e => e.property_id === prop.property_id)
                .map(e => ({ ...e, crownKey: renderCrownKey({ ...base, pillarCode: e.pillar_code, eventNumber: e.event_number }) }));
            const propLeads = leads
                .filter(l => l.property_id === prop.property_id)
                .map(l => {
                    const ev = propEvents.find(e => e.event_id === eventLinkByLead.get(l.lead_id));
                    return {
                        ...l,
                        crownKey: renderCrownKey({
                            ...base,
                            pillarCode: ev?.pillar_code,
                            eventNumber: ev?.event_number,
                            firstSourceCode: l.first_source_code
                        })
                    };
                });
            const crownKeyBase = renderCrownKey(base);
            return {
                ...prop,
                crownKeyBase,
                // The property headline is the base reference; event and lead keys are listed separately.
                crownKey: crownKeyBase,
                events_count: propEvents.length,
                events: propEvents,
                leads: propLeads
            };
        });
    }

    static async enrichProperty(prop, db = pool) {
        if (!prop) return null;
        const [enriched] = await this.enrichProperties([prop], db);
        return enriched;
    }

    /** Render a key for a stored property and optional event / lead source. */
    static async renderForProperty(propertyId, { pillarCode = null, eventNumber = null, firstSourceCode = null } = {}, db = pool) {
        const [prop] = await this.loadProperties('WHERE p.property_id = $1', [propertyId], db);
        if (!prop) return renderCrownKey({ firstSourceCode });
        return renderCrownKey({ countyCode: prop.county_code, parcelRaw: prop.parcel_raw, pillarCode, eventNumber, firstSourceCode });
    }
}
