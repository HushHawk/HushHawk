/**
 * @file backend/src/store/database.js
 * Durable store for the CRM workspaces that are kept as documents (contracts, contacts, follow-ups,
 * communications, direct mail, campaigns, deal analyses, ...).
 *
 * Everything lives in Postgres (ops.kv_store). Nothing is written to disk and nothing is seeded:
 * a new installation starts empty. The CrownKey registry (properties, events, leads, people, evidence,
 * review, audit, outbox) is read and written directly in Postgres by the services, never through here.
 */
import crypto from 'crypto';
import { pool } from './pgClient.js';

const STORE_KEY = 'crm_documents';
const FLUSH_DELAY_MS = 300;

/** Collections persisted in ops.kv_store. */
const PERSISTED = {
    crm: ['buyers', 'contracts', 'contacts', 'facebook_leads', 'follow_ups', 'direct_mail', 'communications', 'calendar_events', 'skip_traces', 'county_records', 'funnel_deals'],
    root: ['marketing_campaigns', 'deal_analyses', 'automations', 'partner_chat_messages']
};

function emptyData() {
    const data = {
        // Legacy namespaces kept empty so older call sites read "no data" instead of failing.
        ref: {}, raw: {}, core: {}, rel: {}, ops: {}, audit: {},
        crm: {},
        settings: {}
    };
    for (const name of PERSISTED.crm) data.crm[name] = [];
    for (const name of PERSISTED.root) data[name] = [];
    return data;
}

class DocumentStore {
    constructor() {
        this.data = emptyData();
        this.timer = null;
        this.saving = Promise.resolve();
        this.loaded = false;
    }

    /** Loads persisted collections. Must complete before the server starts accepting requests. */
    async load() {
        const { rows: [row] } = await pool.query('SELECT value FROM ops.kv_store WHERE key = $1', [STORE_KEY]);
        const stored = row?.value || {};
        for (const name of PERSISTED.crm) if (Array.isArray(stored.crm?.[name])) this.data.crm[name] = stored.crm[name];
        for (const name of PERSISTED.root) if (Array.isArray(stored[name])) this.data[name] = stored[name];
        this.loaded = true;
    }

    snapshot() {
        const out = { crm: {} };
        for (const name of PERSISTED.crm) out.crm[name] = this.data.crm[name];
        for (const name of PERSISTED.root) out[name] = this.data[name];
        return out;
    }

    /** Debounced write-through to Postgres. Failures are logged loudly, never ignored. */
    persist() {
        if (!this.loaded) throw new Error('Document store used before load() completed.');
        clearTimeout(this.timer);
        this.timer = setTimeout(() => { this.flush().catch(() => {}); }, FLUSH_DELAY_MS);
    }

    flush() {
        clearTimeout(this.timer);
        const payload = JSON.stringify(this.snapshot());
        this.saving = this.saving.then(() => pool.query(
            `INSERT INTO ops.kv_store (key, value, updated_at) VALUES ($1, $2::jsonb, now())
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [STORE_KEY, payload]
        )).catch(error => {
            console.error('[DocumentStore] FAILED to persist to Postgres:', error.message);
            throw error;
        });
        return this.saving;
    }

    /** Audit rows go straight to the append-only Postgres table. */
    logAudit({ actor = 'SYSTEM', action, entityType, entityId = null, requestId = crypto.randomUUID(), redactedDiff = {} }) {
        return pool.query(
            `INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, request_id, redacted_diff)
             VALUES ($1, $2, $3, coalesce($4::uuid, gen_random_uuid()), $5, $6)`,
            [actor, action, entityType, /^[0-9a-f-]{36}$/i.test(String(entityId)) ? entityId : null, requestId, JSON.stringify(redactedDiff)]
        ).catch(error => console.error('[Audit] FAILED to record', action, error.message));
    }
}

export const db = new DocumentStore();

/** Flush pending writes on shutdown. */
for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, async () => {
        try { if (db.loaded) await db.flush(); } finally { process.exit(0); }
    });
}
