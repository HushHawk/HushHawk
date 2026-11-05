/**
 * @file backend/src/store/pgClient.js
 * Production PostgreSQL Connection Pool for AWS RDS
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://hushhawk:HushHawk2026!DB@hushhawk-postgres.cxsqkk2qulh9.us-east-2.rds.amazonaws.com:5432/hushhawk';

export const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false,
    },
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

