/**
 * @file database/backup.js
 * Automated Database Backup Utility for HushHawk Canonical PostgreSQL Store
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../backend/src/store/pgClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFilePath = path.join(backupDir, `hushhawk_backup_${timestamp}.json`);
    console.log(`🦅 [HushHawk Backup Engine] Starting backup to: ${backupFilePath}...`);

    const client = await pool.connect();
    try {
        const tablesQuery = `
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema IN ('core', 'crm', 'audit', 'ops', 'ref', 'rel', 'raw')
            ORDER BY table_schema, table_name
        `;
        const tablesRes = await client.query(tablesQuery);
        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                schemas: ['core', 'crm', 'audit', 'ops', 'ref', 'rel', 'raw'],
                tableCount: tablesRes.rows.length
            },
            tables: {}
        };

        let totalRowCount = 0;

        for (const row of tablesRes.rows) {
            const fullTableName = `"${row.table_schema}"."${row.table_name}"`;
            const dataRes = await client.query(`SELECT * FROM ${fullTableName}`);
            backupData.tables[`${row.table_schema}.${row.table_name}`] = {
                rowCount: dataRes.rows.length,
                rows: dataRes.rows
            };
            totalRowCount += dataRes.rows.length;
            if (dataRes.rows.length > 0) {
                console.log(`  - Exported ${row.table_schema}.${row.table_name}: ${dataRes.rows.length} rows`);
            }
        }

        fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
        const stats = fs.statSync(backupFilePath);
        console.log(`\n✓ Backup completed successfully!`);
        console.log(`  Total Tables: ${tablesRes.rows.length}`);
        console.log(`  Total Rows: ${totalRowCount}`);
        console.log(`  File Size: ${(stats.size / 1024).toFixed(2)} KB\n`);

        // Retain latest 10 backups
        const existingBackups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('hushhawk_backup_') && f.endsWith('.json'))
            .sort()
            .reverse();

        if (existingBackups.length > 10) {
            for (const oldFile of existingBackups.slice(10)) {
                fs.unlinkSync(path.join(backupDir, oldFile));
                console.log(`  - Pruned old backup: ${oldFile}`);
            }
        }
    } finally {
        client.release();
    }
}

runBackup()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('[Backup Error]', err);
        process.exit(1);
    });

