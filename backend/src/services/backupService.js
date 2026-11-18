import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { pool, audit } from '../store/pgClient.js';
import { StorageService } from './storageService.js';

const gzip = promisify(zlib.gzip);
const PREFIX = 'backups/db/';
const SCHEMAS = ['core', 'crm', 'audit', 'ops', 'ref', 'rel', 'raw'];
// Sign-in tokens are not worth keeping and are the most sensitive rows in the database.
const SKIP = new Set(['core.user_sessions']);
const KEEP_NEWEST = 7;
const RETENTION_DAYS = () => Math.max(7, Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '', 10) || 30);
const EVERY_HOURS = () => Math.max(1, Number.parseInt(process.env.BACKUP_EVERY_HOURS || '', 10) || 24);

/**
 * A full logical backup of every table, compressed and stored in the private S3 bucket (AES256), once a day, with the last N days kept.
 * It is in addition to, not instead of, the database provider's own automated backups. Restore with: node database/restore_backup.js <file.json.gz>
 */
export class BackupService {
    static async exportAll() {
        const { rows: tables } = await pool.query(
            `SELECT table_schema AS s, table_name AS n FROM information_schema.tables WHERE table_schema = ANY($1) AND table_type = 'BASE TABLE' ORDER BY 1, 2`, [SCHEMAS]);
        const data = { metadata: { createdAt: new Date().toISOString(), format: 'hushhawk-logical-v1', schemas: SCHEMAS }, tables: {} };
        let rows = 0;
        for (const t of tables) {
            const name = `${t.s}.${t.n}`;
            if (SKIP.has(name)) continue;
            const { rows: r } = await pool.query(`SELECT * FROM "${t.s}"."${t.n}"`);
            data.tables[name] = r; rows += r.length;
        }
        return { data, tableCount: Object.keys(data.tables).length, rowCount: rows };
    }

    static async run({ actor = 'Scheduler' } = {}) {
        const { data, tableCount, rowCount } = await this.exportAll();
        const buffer = await gzip(Buffer.from(JSON.stringify(data)));
        const now = new Date(); const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
        const key = `${PREFIX}${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/hushhawk-${stamp}.json.gz`;
        await StorageService.uploadBuffer({ objectKey: key, buffer, contentType: 'application/gzip', metadata: { tables: String(tableCount), rows: String(rowCount) }, requireStorage: true });
        await pool.query(`INSERT INTO ops.kv_store (key, value, updated_at) VALUES ('backup:last', $1::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
            [JSON.stringify({ key, at: now.toISOString(), bytes: buffer.length, tables: tableCount, rows: rowCount })]);
        const pruned = await this.prune();
        await audit(pool, { actor, action: 'DATABASE_BACKUP', entityType: 'DATABASE', entityId: crypto.randomUUID(), diff: { key, bytes: buffer.length, tables: tableCount, rows: rowCount, pruned } });
        return { key, bytes: buffer.length, tables: tableCount, rows: rowCount, pruned };
    }

    /** Runs a backup only when the last one is older than the interval. Safe to call often. */
    static async runIfDue() {
        const { rows: [last] } = await pool.query("SELECT value FROM ops.kv_store WHERE key = 'backup:last'");
        if (last && Date.now() - new Date(last.value.at).getTime() < EVERY_HOURS() * 3600e3) return null;
        return this.run();
    }

    static async prune() {
        const all = await StorageService.listObjects({ prefix: PREFIX });
        const cutoff = Date.now() - RETENTION_DAYS() * 86400e3;
        const candidates = all.slice(0, Math.max(0, all.length - KEEP_NEWEST)).filter(o => o.lastModified.getTime() < cutoff);
        for (const o of candidates) await StorageService.deleteObject({ objectKey: o.key });
        return candidates.length;
    }

    static async status() {
        const { rows: [last] } = await pool.query("SELECT value FROM ops.kv_store WHERE key = 'backup:last'");
        const objects = await StorageService.listObjects({ prefix: PREFIX }).catch(() => []);
        return { last: last?.value || null, storedBackups: objects.length, retentionDays: RETENTION_DAYS(), everyHours: EVERY_HOURS(), bucket: StorageService.getConfig().bucket };
    }
}
