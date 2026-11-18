/**
 * @file backend/src/store/pgClient.js
 * Production PostgreSQL Connection Pool for AWS RDS
 */

import pg from 'pg';
import dns from 'dns';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

const customLookup = (hostname, options, callback) => {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    dns.resolve4(hostname, (err, addrs) => {
        if (!err && addrs && addrs.length > 0) {
            return callback(null, addrs[0], 4);
        }
        dns.lookup(hostname, options, callback);
    });
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');

// TLS: verify the server certificate when DATABASE_SSL_CA (path to the CA bundle, e.g. the AWS RDS bundle)
// is provided. Without it the connection is encrypted but not verified; a warning is logged at startup.
const caPath = process.env.DATABASE_SSL_CA;
let ssl;
if (/sslmode=disable/.test(connectionString) || process.env.DATABASE_SSL === 'off') {
    ssl = false;
} else if (caPath) {
    ssl = { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
} else {
    ssl = { rejectUnauthorized: false };
    console.warn('[PostgreSQL] DATABASE_SSL_CA is not set: the database certificate is not being verified.');
}

export const pool = new Pool({
    connectionString,
    ssl,
    lookup: customLookup,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err);
});

export async function query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
        console.log('[SQL Query]', { text: text.slice(0, 100), duration, rows: res.rowCount });
    }
    return res;
}

export async function checkDatabaseHealth() {
    try {
        const res = await pool.query('SELECT NOW() as current_time, current_database() as database;');
        return {
            status: 'ONLINE',
            time: res.rows[0].current_time,
            database: res.rows[0].database,
        };
    } catch (err) {
        return {
            status: 'OFFLINE',
            error: err.message,
        };
    }
}


/** Runs work(client) in one transaction. Rolls back on any error. */
export async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        client.release();
    }
}

/** Appends an audit row using the supplied client so it commits atomically with the change it describes. */
export async function audit(client, { actor, action, entityType, entityId, diff = {}, requestId = null }) {
    await client.query(
        `INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, request_id, redacted_diff)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [actor || 'SYSTEM', action, entityType, entityId, requestId, JSON.stringify(diff)]
    );
}

/** Adds an outbox message in the same transaction as the change that produced it. */
export async function emitOutbox(client, { aggregateType, aggregateId, eventType, payload }) {
    await client.query(
        `INSERT INTO ops.outbox_events (aggregate_type, aggregate_id, event_type, payload) VALUES ($1, $2, $3, $4)`,
        [aggregateType, aggregateId, eventType, JSON.stringify(payload)]
    );
}
