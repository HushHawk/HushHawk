/**
 * Restores a HushHawk logical backup (the .json.gz written by the backup service, or an older .json) into an EMPTY database that has
 * already been migrated (npm run db:migrate). Rows are inserted table by table in foreign key order using the table's own column types.
 *
 *   DATABASE_URL=... node database/restore_backup.js backup.json.gz
 *
 * Seed rows that the migrations already created (dictionaries, roles, platforms) are kept as they are. Refuses to run when core.leads already has
 * rows, so a live database is never overwritten.
 */
import fs from 'fs';
import zlib from 'zlib';
import { pool } from '../backend/src/store/pgClient.js';

const file = process.argv[2];
if (!file) { console.error('Usage: node database/restore_backup.js <backup.json.gz>'); process.exit(1); }
const raw = fs.readFileSync(file);
const backup = JSON.parse((file.endsWith('.gz') ? zlib.gunzipSync(raw) : raw).toString('utf8'));
const tables = backup.tables;
const rowsOf = name => Array.isArray(tables[name]) ? tables[name] : (tables[name]?.rows || []);

const { rows: [{ n: existing }] } = await pool.query('SELECT count(*)::int n FROM core.leads');
if (existing > 0) { console.error('core.leads already has rows. Restore only into an empty, freshly migrated database.'); process.exit(1); }

// foreign key order: parents before children
const { rows: fks } = await pool.query(`
    SELECT tc.table_schema || '.' || tc.table_name AS child, ccu.table_schema || '.' || ccu.table_name AS parent
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu USING (constraint_name, constraint_schema)
    WHERE tc.constraint_type = 'FOREIGN KEY'`);
const names = Object.keys(tables).filter(n => rowsOf(n).length);
const deps = new Map(names.map(n => [n, new Set()]));
for (const { child, parent } of fks) if (deps.has(child) && deps.has(parent) && child !== parent) deps.get(child).add(parent);
const ordered = []; const done = new Set();
while (ordered.length < names.length) {
    const ready = names.filter(n => !done.has(n) && [...deps.get(n)].every(p => done.has(p)));
    if (!ready.length) { ready.push(...names.filter(n => !done.has(n))); } // cycle: insert the rest and let constraints speak
    for (const n of ready) { ordered.push(n); done.add(n); }
}

const client = await pool.connect();
try {
    await client.query('BEGIN');
    let total = 0;
    for (const name of ordered) {
        const rows = rowsOf(name);
        const [schema, table] = name.split('.');
        const sample = rows[0]; const cols = Object.keys(sample).map(c => `"${c}"`).join(', ');
        for (let i = 0; i < rows.length; i += 500) {
            await client.query(`INSERT INTO "${schema}"."${table}" (${cols}) SELECT ${cols} FROM jsonb_populate_recordset(NULL::"${schema}"."${table}", $1::jsonb) ON CONFLICT DO NOTHING`, [JSON.stringify(rows.slice(i, i + 500))]);
        }
        total += rows.length;
        console.log(`  restored ${name}: ${rows.length}`);
    }
    await client.query('COMMIT');
    console.log(`\nRestore complete: ${ordered.length} tables, ${total} rows.`);
} catch (error) {
    await client.query('ROLLBACK');
    console.error('Restore failed and was rolled back:', error.message);
    process.exitCode = 1;
} finally { client.release(); await pool.end(); }
