/**
 * Finds pillar events that record the same case twice for one property (the old counters could do this), keeps the
 * earliest, moves the later ones' evidence onto it, marks the later ones REJECTED (they stay on record, numbers are
 * never reused) and then enables the database rule that stops it happening again.
 *
 *   node database/resolve_duplicate_events.js            # dry run
 *   node database/resolve_duplicate_events.js --apply
 */
import { pool } from '../backend/src/store/pgClient.js';

const apply = process.argv.includes('--apply');
const client = await pool.connect();
try {
    await client.query('BEGIN');
    const { rows: groups } = await client.query(`
        SELECT property_id, pillar_code, upper(btrim(coalesce(case_reference, external_event_id))) AS ref,
               array_agg(event_id ORDER BY event_number) AS ids, array_agg(event_number ORDER BY event_number) AS numbers
        FROM core.pillar_events
        WHERE verification_status <> 'REJECTED' AND coalesce(btrim(case_reference), btrim(external_event_id), '') <> ''
        GROUP BY 1, 2, 3 HAVING count(*) > 1`);
    console.log(`Duplicate groups: ${groups.length}`);
    for (const g of groups) console.log(`  ${g.pillar_code} ${g.ref}: keep #${g.numbers[0]}, reject #${g.numbers.slice(1).join(', #')}`);

    if (apply) {
        for (const g of groups) {
            const [keeper, ...losers] = g.ids;
            await client.query(
                `INSERT INTO rel.event_evidence (event_id, source_record_id, verification_status, notes)
                 SELECT $1, source_record_id, verification_status, notes FROM rel.event_evidence WHERE event_id = ANY($2::uuid[])
                 ON CONFLICT (event_id, source_record_id) DO NOTHING`, [keeper, losers]);
            await client.query(`UPDATE core.pillar_events SET verification_status = 'REJECTED' WHERE event_id = ANY($1::uuid[])`, [losers]);
            await client.query(
                `INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, redacted_diff)
                 VALUES ('resolve_duplicate_events script', 'DUPLICATE_EVENT_REJECTED', 'PILLAR_EVENT', $1, $2)`,
                [keeper, JSON.stringify({ kept: keeper, rejected: losers, reference: g.ref })]);
        }
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_pillar_events_case
            ON core.pillar_events (property_id, pillar_code, upper(btrim(case_reference)))
            WHERE case_reference IS NOT NULL AND btrim(case_reference) <> '' AND verification_status <> 'REJECTED'`);
        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_pillar_events_external
            ON core.pillar_events (property_id, pillar_code, upper(btrim(external_event_id)))
            WHERE external_event_id IS NOT NULL AND btrim(external_event_id) <> '' AND verification_status <> 'REJECTED'`);
        await client.query('COMMIT');
        console.log(`Applied. ${groups.length} duplicate group(s) resolved and the unique-case rule is enabled.`);
    } else {
        await client.query('ROLLBACK');
        console.log('Dry run only. Re-run with --apply to resolve them and enable the rule.');
    }
} catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed:', error.message);
    process.exitCode = 1;
} finally {
    client.release();
    await pool.end();
}
