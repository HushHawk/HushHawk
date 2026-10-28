/**
 * @file packages/crownkey/index.js
 * CrownKey Display Reference Generator & Validator
 * Conforms to HushHawk Blueprint Section 5 and Visual Architecture Page 12.
 * 
 * NON-NEGOTIABLE RULES:
 * 1. Never use CrownKey as a primary key, foreign key or API join key.
 * 2. Never parse CrownKey by splitting on hyphens. Always assemble from structured fields.
 * 3. Store parcel_raw as TEXT; preserve leading zeros and punctuation.
 * 4. Event numbers are 1-based, zero-padded to 3 digits (e.g. 001, 002).
 */

/**
 * Format an event number to zero-padded 3-digit string (e.g. 1 -> "001", 12 -> "012")
 * @param {number|string} num 
 * @returns {string}
 */
export function formatEventNumber(num) {
    if (!num) return '001';
    const n = parseInt(num, 10);
    if (isNaN(n) || n <= 0) return '001';
    return String(n).padStart(3, '0');
}

/**
 * Normalizes parcel string for candidate matching while keeping original raw text intact.
 * @param {string} parcelRaw 
 * @returns {string}
 */
export function normalizeParcelMatch(parcelRaw) {
    if (!parcelRaw) return '';
    // Strip hyphens and spaces for the county match key, but keep alphanumeric casing intact
    return String(parcelRaw).trim().toUpperCase().replace(/[\s-]/g, '');
}

/**
 * Generates the canonical CrownKey display string from structured fields.
 * 
 * Case 1: Property known, no event          -> COUNTY-PARCEL
 * Case 2: Source known, no event            -> COUNTY-PARCEL · SOURCE
 * Case 3: Event and source known            -> COUNTY-PARCEL-PILLAR-NNN · SOURCE
 * Case 4: Event, source unknown             -> COUNTY-PARCEL-PILLAR-NNN
 * Case 5: Parcel unknown (property pending) -> Property pending
 * 
 * @param {Object} params
 * @param {string} [params.countyCode] - e.g. "DUV"
 * @param {string} [params.parcelRaw] - e.g. "091823-0000" (preserved as TEXT)
 * @param {string} [params.pillarCode] - e.g. "FC"
 * @param {number|string} [params.eventNumber] - e.g. 1
 * @param {string} [params.firstSourceCode] - e.g. "MAIL"
 * @returns {string}
 */
export function renderCrownKey({
    countyCode,
    parcelRaw,
    pillarCode,
    eventNumber,
    firstSourceCode,
} = {}) {
    // Case 5: Parcel unknown
    if (!parcelRaw || !countyCode) {
        return 'Property pending';
    }

    const cleanCounty = String(countyCode).trim().toUpperCase();
    const cleanParcel = String(parcelRaw).trim(); // Keep raw punctuation & leading zeros!
    const base = `${cleanCounty}-${cleanParcel}`;

    const hasEvent = Boolean(pillarCode && eventNumber);
    const hasSource = Boolean(firstSourceCode && String(firstSourceCode).trim().length > 0);

    if (hasEvent && hasSource) {
        // Case 3: Event and source known -> COUNTY-PARCEL-PILLAR-NNN · SOURCE
        const pCode = String(pillarCode).trim().toUpperCase();
        const evNum = formatEventNumber(eventNumber);
        const src = String(firstSourceCode).trim().toUpperCase();
        return `${base}-${pCode}-${evNum} · ${src}`;
    }

    if (hasEvent && !hasSource) {
        // Case 4: Event, source unknown -> COUNTY-PARCEL-PILLAR-NNN
        const pCode = String(pillarCode).trim().toUpperCase();
        const evNum = formatEventNumber(eventNumber);
        return `${base}-${pCode}-${evNum}`;
    }

    if (!hasEvent && hasSource) {
        // Case 2: Source known, no event -> COUNTY-PARCEL · SOURCE
        const src = String(firstSourceCode).trim().toUpperCase();
        return `${base} · ${src}`;
    }

    // Case 1: Property known, no event -> COUNTY-PARCEL
    return base;
}

/**
 * Validates whether a CrownKey matches the canonical HushHawk format.
 * (Used for linting / UI input sanity check, NOT for database joins).
 * @param {string} key 
 * @returns {{ valid: boolean, caseType: number, error?: string }}
 */
export function validateCrownKeyFormat(key) {
    if (!key || typeof key !== 'string') {
        return { valid: false, caseType: 0, error: 'Empty CrownKey' };
    }

    const trimmed = key.trim();

    if (trimmed === 'Property pending') {
        return { valid: true, caseType: 5 };
    }

    // Check for source separator ' · '
    const parts = trimmed.split(' · ');
    const mainPart = parts[0];
    const sourcePart = parts[1] || null;

    // Must start with 3-character county code followed by hyphen
    const countyMatch = mainPart.match(/^([A-Z]{3})-(.+)$/);
    if (!countyMatch) {
        return { valid: false, caseType: 0, error: 'Must begin with 3-letter county code, e.g. DUV-' };
    }

    // Check if ends with -PILLAR-NNN
    const eventMatch = mainPart.match(/^([A-Z]{3})-(.+)-([A-Z]{2,8})-(\d{3})$/);

    if (eventMatch && sourcePart) {
        return { valid: true, caseType: 3 };
    }
    if (eventMatch && !sourcePart) {
        return { valid: true, caseType: 4 };
    }
    if (!eventMatch && sourcePart) {
        return { valid: true, caseType: 2 };
    }
    return { valid: true, caseType: 1 };
}
