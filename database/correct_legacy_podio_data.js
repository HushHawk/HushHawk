/**
 * One-time clean-up for data written by the old Podio sync, which labelled every lead's first source as MAIL,
 * linked leads to properties round-robin, and registered Podio properties under invented parcel numbers.
 *
 *   node database/correct_legacy_podio_data.js            # dry run: reports what would change
 *   node database/correct_legacy_podio_data.js --apply    # applies the corrections inside one audited transaction
 *
 * What --apply does:
 *   1. Re-derives first_source_code from the Podio "Source" text kept in source_detail (an audited correction:
 *      the immutability guard is opened for this transaction only, and every change is written to the audit log).
 *   2. Clears property links that point at properties with invented parcels (PODIO-<id> or FL-<zip>-<digits>).
 * Properties with invented parcels are only listed, never deleted. Review them and re-enter real parcels in Podio;
 * the next sync registers them correctly.
 */
import { pool } from '../backend/src/store/pgClient.js';

const apply = process.argv.includes('--apply');

const SOURCE_CASE = `CASE
    WHEN source_detail ~* 'face\\s*book|fb\\M' THEN 'FB'
    WHEN source_detail ~* 'instagram' THEN 'IG'
    WHEN source_detail ~* 'direct\\s*mail|postcard|yellow letter|mailer' THEN 'MAIL'
    WHEN source_detail ~* 'web\\s*site|website|web form|landing' THEN 'WEB'
    WHEN source_detail ~* 'sms|text' THEN 'SMS'
    WHEN source_detail ~* 'email|emailing' THEN 'EML'
    WHEN source_detail ~* 'referr' THEN 'REF'
    WHEN source_detail ~* 'cold\\s*call|outbound call' THEN 'COLD'
    WHEN source_detail ~* 'sign' THEN 'SIGN'
    WHEN source_detail ~* 'google|ppc|adwords' THEN 'PPC'
    WHEN source_detail ~* 'door|knock' THEN 'DOOR'
    WHEN source_detail ~* 'call' THEN 'CALL'
    WHEN source_detail ~* 'Podio:\\s*$' OR source_detail = 'Podio' THEN 'UNKNOWN'
    ELSE 'OTHER' END`;

const client = await pool.connect();
try {
    await client.query('BEGIN');
    if (apply) await client.query("SET LOCAL hushhawk.attribution_correction = 'on'");

    const { rows: sourceChanges } = await client.query(`
        SELECT first_source_code AS current, ${SOURCE_CASE} AS corrected, count(*)::int AS leads
        FROM core.leads
        WHERE first_source_code = 'MAIL' AND source_detail ILIKE 'Podio:%'
        GROUP BY 1, 2 ORDER BY leads DESC`);
    const { rows: [links] } = await client.query(`
        SELECT count(*)::int AS leads FROM core.leads l JOIN core.properties p USING (property_id)
        WHERE l.source_detail ILIKE 'Podio%' AND (p.parcel_raw ~ '^PODIO-' OR p.parcel_raw ~ '^FL-[0-9]{5}-[0-9]+$')
          AND NOT EXISTS (SELECT 1 FROM core.lead_property_links lp WHERE lp.lead_id = l.lead_id AND lp.property_id = l.property_id)`);
    const { rows: [invented] } = await client.query(
        `SELECT count(*)::int AS properties FROM core.properties WHERE parcel_raw ~ '^PODIO-' OR parcel_raw ~ '^FL-[0-9]{5}-[0-9]+$'`);

    console.log('First-source corrections (Podio leads currently labelled MAIL):');
    console.table(sourceChanges);
    console.log(`Leads linked to properties with invented parcels: ${links.leads}`);
    console.log(`Properties with invented parcels (reported only): ${invented.properties}`);

    if (apply) {
        const updated = await client.query(`
            UPDATE core.leads SET first_source_code = ${SOURCE_CASE}, attribution_confidence = 'REPORTED',
                first_attribution_evidence = coalesce(first_attribution_evidence, 'Corrected from Podio Source text')
            WHERE first_source_code = 'MAIL' AND source_detail ILIKE 'Podio:%'`);
        const unlinked = await client.query(`
            UPDATE core.leads l SET property_id = NULL, updated_at = now()
            FROM core.properties p
            WHERE p.property_id = l.property_id AND l.source_detail ILIKE 'Podio%'
              AND (p.parcel_raw ~ '^PODIO-' OR p.parcel_raw ~ '^FL-[0-9]{5}-[0-9]+$')
              AND NOT EXISTS (SELECT 1 FROM core.lead_property_links lp WHERE lp.lead_id = l.lead_id AND lp.property_id = l.property_id)`);
        await client.query(
            `INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, redacted_diff)
             VALUES ('correct_legacy_podio_data script', 'LEGACY_PODIO_DATA_CORRECTED', 'MAINTENANCE', gen_random_uuid(), $1)`,
            [JSON.stringify({ sourcesCorrected: updated.rowCount, propertyLinksCleared: unlinked.rowCount, changes: sourceChanges })]);
        await client.query('COMMIT');
        console.log(`Applied: ${updated.rowCount} first sources corrected, ${unlinked.rowCount} property links cleared.`);
    } else {
        await client.query('ROLLBACK');
        console.log('Dry run only. Re-run with --apply to make these changes.');
    }
} catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed:', error.message);
    process.exitCode = 1;
} finally {
    client.release();
    await pool.end();
}
