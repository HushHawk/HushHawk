import { pool } from '../store/pgClient.js';

/**
 * The questions an uptime monitor cannot ask by itself: is the database up, did the Podio sync run recently, is there a recent backup.
 * Only yes or no answers leave the server; details stay in the log and the notifications.
 */
export class HealthService {
    static async recordSync(name, ok, error = null) {
        await pool.query(`INSERT INTO ops.kv_store (key, value, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
            [`sync:${name}`, JSON.stringify({ ok, at: new Date().toISOString(), error: ok ? null : String(error?.message || error).slice(0, 300) })]);
    }

    static async checks() {
        const minutes = Number.parseInt(process.env.PODIO_SYNC_INTERVAL_MIN || '', 10) || 0;
        const podioConfigured = Boolean(process.env.PODIO_CLIENT_ID && process.env.PODIO_APP_TOKEN && minutes);
        const awsConfigured = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
        const { rows } = await pool.query("SELECT key, value, updated_at FROM ops.kv_store WHERE key IN ('sync:podio', 'backup:last')");
        const get = key => rows.find(r => r.key === key);
        const podio = get('sync:podio'); const backup = get('backup:last');
        const out = {};
        if (!podioConfigured) out.podioSync = 'NOT_CONFIGURED';
        else if (!podio) out.podioSync = 'WAITING';
        else if (!podio.value.ok) out.podioSync = 'FAILING';
        else out.podioSync = Date.now() - new Date(podio.value.at).getTime() > Math.max(30, minutes * 3) * 60e3 ? 'STALE' : 'OK';
        if (!awsConfigured) out.backup = 'NOT_CONFIGURED';
        else if (!backup) out.backup = 'WAITING';
        else out.backup = Date.now() - new Date(backup.value.at).getTime() > 36 * 3600e3 ? 'OVERDUE' : 'OK';
        out.degraded = Object.values(out).some(v => ['FAILING', 'STALE', 'OVERDUE'].includes(v));
        return out;
    }
}
