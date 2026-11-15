import 'dotenv/config';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import express from 'express';

const databaseUrl = new URL(process.env.DATABASE_URL || 'postgresql://missing.invalid');
assert.ok(['127.0.0.1', 'localhost'].includes(databaseUrl.hostname) || databaseUrl.hostname.includes('rds.amazonaws.com'), 'Use a valid PostgreSQL database');

const { apiRouter } = await import('../backend/src/routes/api.js');
const { pool } = await import('../backend/src/store/pgClient.js');
const app = express();
app.use(express.json());
app.use('/api/v1', apiRouter);

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const identifier = crypto.randomUUID().slice(0, 8);
const key = `DUV-FC-${identifier.toUpperCase()}`;
const batchCode = `TEST-TRACKING-${identifier}`;
const post = (path, body) => fetch(base + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const getStats = async () => {
    const response = await fetch(base + '/api/v1/direct-mail/stats-by-pillar');
    assert.equal(response.status, 200);
    return (await response.json()).stats.FC;
};

try {
    const initial = await getStats();
    const create = async address => {
        const response = await post('/api/v1/direct-mail/generate-piece', {
            countyCode: 'DUV', pillarCode: 'FC', identifier, address, batchCode
        });
        assert.equal(response.status, 201);
        return (await response.json()).piece;
    };
    const first = await create('100 Fixture Avenue');
    const second = await create('200 Fixture Avenue');

    const legacy = await fetch(base + '/api/v1/track/qr/' + key, { headers: { Accept: 'application/json' } });
    assert.equal(legacy.status, 200);
    assert.equal((await legacy.json()).scan.pieceId, null, 'Ambiguous legacy links stay unassigned');

    const tracking = new URL(second.trackingUrl);
    const headResponse = await fetch(base + tracking.pathname + tracking.search, { method: 'HEAD' });
    assert.equal(headResponse.status, 204);
    const scanResponse = await fetch(base + tracking.pathname + tracking.search, { redirect: 'manual' });
    assert.equal(scanResponse.status, 302);
    const callbackPath = scanResponse.headers.get('location');
    const scanId = callbackPath.split('/').at(-1);
    const { rows: [scan] } = await pool.query('SELECT * FROM core.direct_mail_scans WHERE scan_id = $1', [scanId]);
    assert.equal(scan.piece_id, second.pieceId);
    assert.equal(scan.cta_converted, false);
    assert.equal(scan.converted_at, null);

    const counters = await pool.query('SELECT piece_id, scans_count FROM core.direct_mail_pieces WHERE batch_code = $1', [batchCode]);
    assert.deepEqual(Object.fromEntries(counters.rows.map(row => [row.piece_id, row.scans_count])), {
        [first.pieceId]: 0, [second.pieceId]: 1
    });
    assert.match(await fetch(base + callbackPath).then(res => res.text()), /Request a callback/);
    const submit = consent => fetch(base + callbackPath, {
        method: 'POST', redirect: 'manual',
        body: new URLSearchParams({ name: 'Local Fixture', phone: '9045550100', consent })
    });
    assert.equal((await submit('no')).status, 400);
    assert.equal((await submit('yes')).status, 303);
    assert.equal((await submit('yes')).status, 303, 'Retries are idempotent');

    const callbacks = await pool.query(
        `SELECT s.cta_converted, s.converted_at, r.requested_at
         FROM core.direct_mail_scans s JOIN core.direct_mail_callback_requests r USING (scan_id)
         WHERE s.scan_id = $1`, [scanId]
    );
    assert.equal(callbacks.rowCount, 1);
    assert.equal(callbacks.rows[0].cta_converted, true);
    assert.deepEqual(callbacks.rows[0].converted_at, callbacks.rows[0].requested_at);
    const final = await getStats();
    assert.equal(final.mailed, initial.mailed, 'Printed pieces are not counted as mailed');
    assert.equal(final.scans, initial.scans + 2);
    assert.equal(final.conversions, initial.conversions + 1);
    assert.equal((await post('/api/v1/direct-mail/simulate-scan', { crownKey: key })).status, 410);
    console.log('Direct Mail scan attribution, callback conversion, and reporting passed.');
} finally {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
}
