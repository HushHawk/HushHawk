import crypto from 'crypto';
import { pool } from '../store/pgClient.js';
import { DeliveryService } from './deliveryService.js';

/**
 * Tells people when something that should run on its own has stopped. An alert appears in the app's notifications and, when ALERT_EMAIL
 * is set, goes out by the normal delivery route. The same problem is reported at most once every six hours.
 */
const SIX_HOURS = 6 * 3600e3;
const failures = new Map();

export class AlertService {
    static async raise({ key, title, body }) {
        const { rows: [prev] } = await pool.query('SELECT updated_at FROM ops.kv_store WHERE key = $1', [`alert:${key}`]);
        if (prev && Date.now() - new Date(prev.updated_at).getTime() < SIX_HOURS) return false;
        await pool.query(`INSERT INTO ops.kv_store (key, value, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [`alert:${key}`, JSON.stringify({ title, body })]);
        await pool.query(
            `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
             VALUES ($1, $2, $3, 'SYSTEM', 'HIGH', 'red', 'database', false, now())`, [crypto.randomUUID(), title, body]);
        const to = process.env.ALERT_EMAIL;
        if (to) await DeliveryService.email({ to, subject: `[HushHawk] ${title}`, text: body }).catch(error => console.error('[Alert] email failed:', error.message));
        console.error(`[Alert] ${title}: ${body}`);
        return true;
    }

    /** A scheduled job reports each run; the third failure in a row raises an alert, and a success clears the count. */
    static async jobResult(name, error) {
        if (!error) { failures.delete(name); return; }
        const count = (failures.get(name) || 0) + 1; failures.set(name, count);
        if (count >= 3) await this.raise({ key: `job:${name}`, title: `Automatic task failing: ${name}`, body: `${name} has failed ${count} times in a row. Latest error: ${String(error.message || error).slice(0, 300)}` });
    }
}
