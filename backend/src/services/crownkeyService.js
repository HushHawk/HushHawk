import { renderCrownKey, validateCrownKeyFormat, normalizeParcelMatch } from '../../../packages/crownkey/index.js';
import { db } from '../store/database.js';

export class CrownKeyService {
    /**
     * Compute CrownKey for a property, optionally with a specific event and source.
     */
    static getPropertyCrownKey(propertyId, { pillarCode = null, eventNumber = null, firstSourceCode = null } = {}) {
        const prop = db.data.core.properties.find(p => p.property_id === propertyId);
        if (!prop) {
            return renderCrownKey({ firstSourceCode });
        }

        const county = db.data.ref.counties.find(c => c.county_id === prop.county_id);
        const countyCode = county ? county.county_code : prop.county_code || 'DUV';

        return renderCrownKey({
            countyCode,
            parcelRaw: prop.parcel_raw,
            pillarCode,
            eventNumber,
            firstSourceCode,
        });
    }

    /**
     * Enrich a property record with rendered CrownKey and associated events.
     */
    static enrichProperty(prop) {
        if (!prop) return null;
        const county = db.data.ref.counties.find(c => c.county_id === prop.county_id);
        const countyCode = county ? county.county_code : prop.county_code || 'DUV';

        // Find primary event if any
        const events = db.data.core.pillar_events.filter(e => e.property_id === prop.property_id);
        const primaryEvent = events[0] || null;

        // Find lead if any
        const lead = db.data.core.leads.find(l => l.property_id === prop.property_id);
        const firstSourceCode = lead ? lead.first_source_code : null;

        const crownKey = renderCrownKey({
            countyCode,
            parcelRaw: prop.parcel_raw,
            pillarCode: primaryEvent?.pillar_code,
            eventNumber: primaryEvent?.event_number,
            firstSourceCode,
        });

        const crownKeyBase = renderCrownKey({
            countyCode,
            parcelRaw: prop.parcel_raw,
        });

        return {
            ...prop,
            county_code: countyCode,
            crownKey,
            crownKeyBase,
            events_count: events.length,
            events,
            lead,
        };
    }
}
