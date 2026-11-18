/**
 * Core CrownKey engine acceptance tests. They run against a disposable local Postgres database
 * (npm run db:migrate first) and exercise the real services and HTTP routes.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import express from 'express';
import 'dotenv/config';
import { installTestAuth, assertDisposableDatabase } from './helpers/auth.js';

assertDisposableDatabase();
// Never reach live integrations from tests.
for (const key of ['PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_APP_ID', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_BUCKET', 'TWILIO_ACCOUNT_SID', 'SENDGRID_API_KEY', 'SMTP_HOST']) process.env[key] = '';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';
process.env.PUBLIC_API_URL = 'https://api.example.test';

const { apiRouter } = await import('../backend/src/routes/api.js');
const { pool } = await import('../backend/src/store/pgClient.js');
const { db } = await import('../backend/src/store/database.js');
await db.load();

let server; let base; let auth;
const run = crypto.randomUUID().slice(0, 8).toUpperCase();
const json = (method, path, body, headers = {}) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body)
});
const asJson = async response => ({ status: response.status, body: await response.json().catch(() => null) });

before(async () => {
    auth = await installTestAuth();
    const app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
    await auth.cleanup();
    server.close();
    await pool.end();
});

async function makeProperty(parcel, county = 'DUV') {
    const { body } = await asJson(await json('POST', '/properties', { county_code: county, parcel_raw: parcel, address_line1: `${run} Test Street` }));
    return body;
}

test('every route requires a session, except health and login', async () => {
    const noAuth = path => fetch(base + path, { headers: { authorization: '' } });
    assert.equal((await noAuth('/health')).status, 200);
    for (const path of ['/properties', '/leads', '/contacts', '/settings', '/events', '/reports/overview']) {
        assert.equal((await fetch(base + path, { headers: { authorization: 'Bearer ' + 'a'.repeat(64) } })).status, 401, path);
    }
    assert.equal((await json('POST', '/admin/reset-database', {}, { authorization: 'Bearer ' + 'a'.repeat(64) })).status, 401);
});

test('webhooks need the shared secret', async () => {
    const bad = await fetch(`${base}/integrations/batchleads/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: '' }, body: '{}' });
    assert.equal(bad.status, 401);
    const wrong = await fetch(`${base}/webhooks/podio?secret=nope`, { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: '' }, body: '{}' });
    assert.equal(wrong.status, 401);
});

test('parcels stay text, county-scoped, and duplicates reuse the property', async () => {
    const parcel = `00${run}-123-000`;
    const first = await makeProperty(parcel);
    assert.equal(first.parcel_raw, parcel);
    assert.equal(first.crownKeyBase, `DUV-${parcel}`);
    const again = await makeProperty(parcel.replace(/-/g, ''));
    assert.equal(again.property_id, first.property_id);
    const otherCounty = await makeProperty(parcel, 'CLY');
    assert.notEqual(otherCounty.property_id, first.property_id, 'same parcel in another county is a different property');
});

test('event numbers: reuse for the same case, new number for a different case, unique under concurrency', async () => {
    const property = await makeProperty(`EVT-${run}-1`);
    const create = async caseReference => asJson(await json('POST', '/events', { propertyId: property.property_id, pillarCode: 'FC', caseReference }));
    const one = await create(`CASE-${run}-A`);
    assert.equal(one.body.isNew, true);
    assert.equal(Number(one.body.event.event_number), 1);
    const repeat = await create(` case-${run}-a `);
    assert.equal(repeat.body.isNew, false);
    assert.equal(Number(repeat.body.event.event_number), 1);
    const results = await Promise.all(Array.from({ length: 15 }, (_, i) => create(`CASE-${run}-P${i}`)));
    const numbers = results.map(r => Number(r.body.event.event_number));
    assert.equal(new Set(numbers).size, 15, 'no number issued twice');
    assert.equal(Math.min(...numbers), 2);
    const detail = await asJson(await json('GET', `/properties/${property.property_id}`));
    assert.equal(detail.body.property.events_count, 16, 'one property, sixteen events');
    assert.equal(detail.body.property.events[0].crownKey, `DUV-EVT-${run}-1-FC-001`);
});

test('verification and governance rules are enforced', async () => {
    const property = await makeProperty(`GOV-${run}-1`);
    const confirmed = await asJson(await json('POST', '/events', { propertyId: property.property_id, pillarCode: 'FC', caseReference: `C-${run}`, verificationStatus: 'CONFIRMED' }));
    assert.equal(confirmed.status, 400, 'CONFIRMED needs evidence');
    const unapproved = await asJson(await json('POST', '/events', { propertyId: property.property_id, pillarCode: 'BANKR', caseReference: `B-${run}` }));
    assert.equal(unapproved.status, 400, 'unapproved pillar is blocked');
    const { rows: [{ count }] } = await pool.query("SELECT count(*)::int FROM ref.pillars WHERE production_enabled");
    assert.equal(count, 29, 'exactly the 29 guide pillars are live');
});

test('a lead is saved before its property is known and keeps its first source', async () => {
    const created = await asJson(await json('POST', '/leads', { name: `Seller ${run}`, phone: '9045550100', address: '1 Pending Rd', source: 'Facebook' }));
    assert.equal(created.status, 201);
    assert.equal(created.body.source_code, 'FB', 'source is not collapsed to MAIL or OTHER');
    assert.equal(created.body.crownKey, 'Property pending');
    const leadId = created.body.lead_id;

    const touch = await asJson(await json('POST', `/leads/${leadId}/touchpoints`, { contactMethod: 'WHATSAPP', platformCode: 'WA' }));
    assert.equal(touch.status, 201);
    const { rows: [lead] } = await pool.query('SELECT first_source_code FROM core.leads WHERE lead_id = $1', [leadId]);
    assert.equal(lead.first_source_code, 'FB');
    const { rows: [{ count }] } = await pool.query('SELECT count(*)::int FROM core.attribution_touchpoints WHERE lead_id = $1', [leadId]);
    assert.equal(count, 2);
    await assert.rejects(() => pool.query("UPDATE core.leads SET first_source_code = 'MAIL' WHERE lead_id = $1", [leadId]), /immutable/);

    const bad = await asJson(await json('POST', '/leads', { name: 'X', source: 'not-a-source' }));
    assert.equal(bad.status, 400);
});

test('seller leads show no invented underwriting numbers', async () => {
    const { body } = await asJson(await json('GET', '/seller-leads'));
    const lead = body.leads.find(l => l.name === `Seller ${run}`);
    assert.ok(lead);
    assert.equal(lead.arv, null);
    assert.equal(lead.mao, null);
    assert.equal(lead.equity, null);
    assert.equal(lead.property_pending, true);
});

test('imports record per-row outcomes and reject bad rows without blocking good ones', async () => {
    const { status, body } = await asJson(await json('POST', '/imports', {
        countyCode: 'DUV', sourceSystem: `TEST-${run}`,
        records: [{ parcel: `IMP-${run}-1`, externalId: `TX-${run}-1`, pillarCode: 'TAX', amount: 1200 }, { parcel: '', externalId: 'missing-parcel' }]
    }));
    assert.equal(status, 201);
    assert.equal(body.created, 1);
    assert.equal(body.rejected, 1);
    const again = await asJson(await json('POST', '/imports', { countyCode: 'DUV', sourceSystem: `TEST-${run}`, records: [{ parcel: `IMP-${run}-1`, externalId: `TX-${run}-1`, pillarCode: 'TAX', amount: 1200 }] }));
    assert.equal(again.body.unchanged, 1, 'the same record imported twice is unchanged');
});

test('compliance gate evaluates real data and blocks suppressed contacts', async () => {
    const phone = `90455${Math.floor(10000 + Math.random() * 89999)}`;
    await json('POST', '/compliance/suppression', { type: 'PHONE', value: phone, reason: 'Owner requested no contact' });
    const { body } = await asJson(await json('POST', '/compliance/evaluate', { channel: 'CALL', recipientPhone: phone }));
    assert.equal(body.allowed, false);
    assert.equal(body.checks[0].passed, false);
    assert.match(body.checks[0].reason, /suppression/i);
    assert.ok(body.checks.every(c => c.passed === false || c.skipped || c.reason), 'every step carries a reason');
});

test('unconfigured carriers report failure instead of pretending to send', async () => {
    const { status, body } = await asJson(await json('POST', '/outreach-actions/emails/send', { email: 'someone@example.test', subject: 'Hi', body: 'Hello' }));
    assert.equal(status, 503);
    assert.equal(body.carrier.status, 'NOT_CONFIGURED');
});

test('settings and integration status are real, not canned', async () => {
    const { body } = await asJson(await json('GET', '/settings'));
    assert.equal(body.general.ein, '');
    assert.equal(body.underwriting.maoDiscount, null);
    const podio = body.integrations.find(i => /Podio/.test(i.name));
    assert.equal(podio.status, 'warn');
    assert.ok(!JSON.stringify(body).includes('rds.amazonaws.com'));
});

test('audit trail is append-only and attributed to the signed-in user', async () => {
    const { rows: [row] } = await pool.query("SELECT actor FROM audit.audit_events WHERE action = 'LEAD_CREATED' ORDER BY created_at DESC LIMIT 1");
    assert.equal(row.actor, 'Test Admin');
    await assert.rejects(() => pool.query("DELETE FROM audit.audit_events WHERE action = 'LEAD_CREATED'"), /append-only/);
});

test('contracts live in the deal funnel: create, assign a buyer, reject unknown ids, delete', async () => {
    const invalid = await asJson(await json('POST', '/contracts', { address: `${run} Oak`, seller: 'S' }));
    assert.equal(invalid.status, 400, 'a price is required');
    const created = await asJson(await json('POST', '/contracts', { address: `${run} Oak Ave`, seller: 'Seller A', buyPrice: 90000, city: 'Jacksonville', state: 'FL', zip: '32202' }));
    assert.equal(created.status, 201);
    const id = created.body.id;
    assert.equal((await asJson(await json('PATCH', `/contracts/${id}`, { buyer: 'Buyer B', status: 'Buyer Selected', fee: 15000 }))).status, 200);
    const list = await asJson(await json('GET', '/contracts'));
    const row = list.body.contracts.find(c => c.id === id);
    assert.equal(row.buyer, 'Buyer B');
    assert.equal(row.milestoneIndex, 9, 'selecting a buyer moves the deal to the buyer-chosen milestone');
    assert.ok(!row.titleAgency, 'no title company is invented');
    assert.equal((await json('PATCH', '/contracts/does-not-exist', {})).status, 404);
    assert.equal((await json('DELETE', `/contracts/${id}`)).status, 200);
});

test('a deal blast reports exactly what happened and never claims a send that did not occur', async () => {
    await pool.query("INSERT INTO crm.cash_buyers (id, full_name, email) VALUES ($1, 'Test Buyer', 'buyer@example.test') ON CONFLICT DO NOTHING", [`b-${run}`]);
    const { status, body } = await asJson(await json('POST', '/dispositions/blast', { address: `${run} Oak Ave` }));
    assert.equal(status, 502, 'no email transport is configured in tests');
    assert.equal(body.sent, 0);
    assert.ok(body.results.every(r => r.outcome !== 'SENT'));
    await pool.query('DELETE FROM crm.cash_buyers WHERE id = $1', [`b-${run}`]);
});

test('the unsigned-webhook transition switch is off by default, and a wrong secret is never accepted', async () => {
    const post = (url, headers = {}) => fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: '', ...headers }, body: '{}' });
    assert.equal((await post('/webhooks/smrtphone')).status, 401, 'unsigned is rejected by default');
    process.env.WEBHOOK_ALLOW_UNSIGNED = 'true';
    try {
        assert.notEqual((await post('/webhooks/smrtphone')).status, 401, 'unsigned allowed while migrating');
        assert.equal((await post('/webhooks/smrtphone?secret=wrong')).status, 401, 'a wrong secret still fails');
    } finally {
        delete process.env.WEBHOOK_ALLOW_UNSIGNED;
    }
});

test('a lead whose Podio item was deleted is marked LOST with a reason, and live ones are left alone', async () => {
    const { PodioSyncService } = await import('../backend/src/services/podioSyncService.js');
    const mk = async (item, status) => {
        const { rows: [lead] } = await pool.query("INSERT INTO core.leads (first_source_code, source_detail, status) VALUES ('PODIO', 'Podio: test', $1) RETURNING lead_id", [status]);
        await pool.query("INSERT INTO crm.external_sync_map (internal_entity_type, internal_uuid, external_system, external_app_id, external_item_id, status) VALUES ('LEAD', $1, 'PODIO', 'app', $2, 'SYNCED')", [lead.lead_id, item]);
        return lead.lead_id;
    };
    const gone = await mk(`gone-${run}`, 'NEW');
    const alive = await mk(`alive-${run}`, 'NEW');
    const alreadyLost = await mk(`lost-${run}`, 'LOST');
    const changed = await PodioSyncService.markRemovedLeads([`alive-${run}`]);
    assert.ok(changed >= 1);
    const status = async id => (await pool.query('SELECT status, lost_reason FROM core.leads WHERE lead_id = $1', [id])).rows[0];
    assert.deepEqual(await status(gone), { status: 'LOST', lost_reason: 'Removed in Podio' });
    assert.equal((await status(alive)).status, 'NEW');
    assert.equal((await status(alreadyLost)).lost_reason, null, 'a lead that was already LOST is not touched again');
    const { rows: [h] } = await pool.query("SELECT count(*)::int n FROM crm.lead_stage_history WHERE lead_id = $1 AND reason = 'Item deleted in Podio'", [gone]);
    assert.equal(h.n, 1);
});
