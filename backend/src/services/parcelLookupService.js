/**
 * Finds the real county parcel for a street address.
 *
 * Source: the Florida Department of Revenue statewide parcel layer (every county property appraiser's roll, published as an ArcGIS
 * feature service). The service cannot be searched by address text, so the address is geocoded first (US Census geocoder) and the
 * parcels around that point are fetched. A parcel is accepted ONLY when its own recorded situs address matches the requested
 * street number and street name. Anything less is reported as not found, so a wrong parcel is never attached to a property.
 */
const PARCEL_LAYER = 'https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0';
const GEOCODER = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

/** Florida DOR county numbers mapped to HushHawk county codes (checked against the live layer). */
export const DOR_COUNTY_TO_CODE = { 20: 'CLY', 26: 'DUV', 28: 'FLAG', 55: 'NAS', 63: 'POL', 65: 'STJ' };

const SUFFIX = { STREET: 'ST', DRIVE: 'DR', AVENUE: 'AVE', ROAD: 'RD', BOULEVARD: 'BLVD', LANE: 'LN', COURT: 'CT', CIRCLE: 'CIR', PLACE: 'PL', TERRACE: 'TER', HIGHWAY: 'HWY', PARKWAY: 'PKWY', TRAIL: 'TRL', WAY: 'WAY', SQUARE: 'SQ' };
const DIRECTION = { NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W', NORTHEAST: 'NE', NORTHWEST: 'NW', SOUTHEAST: 'SE', SOUTHWEST: 'SW' };

/** DOR land-use codes 000-009 are residential; anything else is left unclassified rather than guessed. */
const USE_CODE = { '000': 'Vacant Land', '001': 'Single Family', '002': 'Mobile Home', '003': 'Multi-Family', '004': 'Condominium', '005': 'Cooperative', '006': 'Retirement Home', '007': 'Miscellaneous Residential', '008': 'Multi-Family', '009': 'Residential Common Elements' };

export function normalizeStreet(text) {
    const tokens = String(text || '').toUpperCase().replace(/[.,#]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
        .map(t => DIRECTION[t] || SUFFIX[t] || t)
        .map(t => t.replace(/^(\d+)(ST|ND|RD|TH)$/, '$1'));
    return tokens;
}

/** Same street when the number matches exactly and one address's remaining words are all present in the other (a trailing unit letter is tolerated). */
export function sameStreetAddress(requested, recorded) {
    const a = normalizeStreet(requested); const b = normalizeStreet(recorded);
    if (!a.length || !b.length || a[0] !== b[0] || !/^\d+$/.test(a[0])) return false;
    const [short, long] = a.length <= b.length ? [a, b] : [b, a];
    const extras = long.filter(t => !short.includes(t));
    return short.slice(1).every(t => long.includes(t)) && extras.every(t => t.length <= 2 || /^\d+$/.test(t) && t.length <= 4);
}

/** Fields read from the county roll; the owner mailing fields drive the Absentee Owner and Out-of-State Owner events. */
export const ROLL_FIELDS = 'CO_NO,PARCEL_ID,PHY_ADDR1,PHY_CITY,PHY_ZIPCD,OWN_NAME,OWN_ADDR1,OWN_ADDR2,OWN_CITY,OWN_STATE,OWN_ZIPCD,DOR_UC,JV,ACT_YR_BLT,TOT_LVG_AR,LND_SQFOOT,S_LEGAL,ASMNT_YR,SALE_PRC1,SALE_YR1,SALE_MO1';

let queue = Promise.resolve();
const throttled = fn => { const run = queue.then(fn, fn); queue = run.then(() => new Promise(r => setTimeout(r, 350)), () => new Promise(r => setTimeout(r, 350))); return run; };

async function getJson(url, params) {
    const res = await fetch(`${url}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(45000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return res.json();
}

export class ParcelLookupService {
    /** Reads one parcel's current roll record by county and parcel number. Returns null when the roll has no such parcel. */
    static fetchRollRecord(countyCode, parcelId) {
        const countyNo = Object.entries(DOR_COUNTY_TO_CODE).find(([, code]) => code === countyCode)?.[0];
        if (!countyNo) return Promise.resolve(null);
        return throttled(async () => {
            const data = await getJson(`${PARCEL_LAYER}/query`, { where: `CO_NO=${Number(countyNo)} AND PARCEL_ID='${String(parcelId).replace(/'/g, "''")}'`, outFields: ROLL_FIELDS, returnGeometry: 'false', f: 'json' });
            if (data.error) throw new Error(`Parcel service error: ${data.error.message}`);
            return data.features?.[0]?.attributes || null;
        });
    }

    /**
     * @returns {Promise<{found:boolean, reason?:string, parcel?:object}>}
     */
    static resolve({ line1, city, state = 'FL', zip }) {
        return throttled(() => this._resolve({ line1, city, state, zip }));
    }

    static async _resolve({ line1, city, state, zip }) {
        if (!line1 || !/^\d+/.test(line1.trim())) return { found: false, reason: 'The address has no street number.' };
        const address = [line1, city, state, zip].filter(Boolean).join(', ');
        let geo;
        try {
            geo = await getJson(GEOCODER, { address, benchmark: 'Public_AR_Current', format: 'json' });
        } catch (e) {
            return { found: false, reason: `Geocoder unavailable: ${e.message}`, retry: true };
        }
        const match = geo?.result?.addressMatches?.[0];
        if (!match) return { found: false, reason: 'The address could not be located.' };
        const { x, y } = match.coordinates;
        const pad = 0.0009; // about 100 metres, enough to cover geocoder interpolation along a block
        let data;
        try {
            data = await getJson(`${PARCEL_LAYER}/query`, {
                geometry: `${x - pad},${y - pad},${x + pad},${y + pad}`, geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects',
                outFields: ROLL_FIELDS,
                returnGeometry: 'false', f: 'json'
            });
        } catch (e) {
            return { found: false, reason: `Parcel service unavailable: ${e.message}`, retry: true };
        }
        if (data.error) return { found: false, reason: `Parcel service error: ${data.error.message}`, retry: true };
        const candidates = (data.features || []).map(f => f.attributes).filter(a => DOR_COUNTY_TO_CODE[a.CO_NO] && sameStreetAddress(line1, a.PHY_ADDR1));
        if (!candidates.length) return { found: false, reason: 'No parcel near this address has a matching recorded street address.' };
        const distinct = [...new Map(candidates.map(c => [c.PARCEL_ID, c])).values()];
        if (distinct.length > 1) return { found: false, reason: `${distinct.length} parcels share this address (units or lots); choose one by hand.`, ambiguous: distinct.map(d => d.PARCEL_ID) };
        const a = distinct[0];
        return {
            found: true,
            parcel: {
                parcelId: String(a.PARCEL_ID).trim(),
                countyCode: DOR_COUNTY_TO_CODE[a.CO_NO],
                situsAddress: a.PHY_ADDR1, situsCity: a.PHY_CITY, situsZip: a.PHY_ZIPCD ? String(a.PHY_ZIPCD) : null,
                owner: a.OWN_NAME || null,
                propertyType: USE_CODE[String(a.DOR_UC || '').padStart(3, '0')] || null,
                landUseCode: a.DOR_UC || null,
                justValue: a.JV ?? null, yearBuilt: a.ACT_YR_BLT || null, livingAreaSqFt: a.TOT_LVG_AR || null, landSqFt: a.LND_SQFOOT || null,
                legalDescription: a.S_LEGAL || null, assessmentYear: a.ASMNT_YR || null,
                source: 'Florida DOR statewide cadastral (county property appraiser roll)', verification: 'Street number and street name match the parcel record',
                raw: a
            }
        };
    }
}
