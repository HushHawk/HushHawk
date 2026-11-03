/**
 * @file database/migrate.js
 * Versioned Migration & Seed Runner for HushHawk PostgreSQL (AWS RDS)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../backend/src/store/pgClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    console.log('🦅 [HushHawk Migration Engine] Starting database migrations...');
    const client = await pool.connect();

    try {
        // Ensure schema tracking table exists
        await client.query(`
            CREATE SCHEMA IF NOT EXISTS ref;
            CREATE TABLE IF NOT EXISTS ref.schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        `);

        // Fetch already applied migrations
        const appliedRes = await client.query('SELECT version FROM ref.schema_migrations');
        const applied = new Set(appliedRes.rows.map(r => r.version));

        // Scan directories: migrations/ and seeds/
        const dirs = [
            { dir: path.join(__dirname, 'migrations'), type: 'MIGRATION' },
            { dir: path.join(__dirname, 'seeds'), type: 'SEED' }
        ];

        let newlyAppliedCount = 0;

        for (const { dir, type } of dirs) {
            if (!fs.existsSync(dir)) continue;

            const files = fs.readdirSync(dir)
                .filter(f => f.endsWith('.sql'))
                .sort();

            for (const file of files) {
                const versionKey = `${type}:${file}`;
                if (applied.has(versionKey)) {
                    console.log(`  - [SKIP] Already applied: ${versionKey}`);
                    continue;
                }

                console.log(`  + [APPLYING] ${versionKey}...`);
                const sqlPath = path.join(dir, file);
                const sqlContent = fs.readFileSync(sqlPath, 'utf8');

                await client.query('BEGIN');
                try {
                    await client.query(sqlContent);
                    await client.query(
                        'INSERT INTO ref.schema_migrations (version, applied_at) VALUES ($1, now())',
                        [versionKey]
                    );
                    await client.query('COMMIT');
                    console.log(`    ✓ Successfully applied ${versionKey}`);
                    newlyAppliedCount++;
                } catch (sqlErr) {
                    await client.query('ROLLBACK');
                    console.error(`    ✗ FAILED applying ${versionKey}:`, sqlErr.message);
                    throw sqlErr;
                }
            }
        }

        console.log(`\n🎉 [HushHawk Migration Engine] Complete! ${newlyAppliedCount} new migration(s)/seed(s) applied.\n`);
    } finally {
        client.release();
    }
}

runMigrations()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[Migration Error]', err);
        process.exit(1);
    });

