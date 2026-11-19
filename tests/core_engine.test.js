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
    app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
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

test('texts and emails hand off to Podio Feeds when no carrier is configured, and fail honestly when neither exists', async () => {
    const { DeliveryService } = await import('../backend/src/services/deliveryService.js');
    const { PodioSyncService } = await import('../backend/src/services/podioSyncService.js');
    const saved = {};
    const keys = ['PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_APP_ID', 'PODIO_FEEDS_APP_ID'];
    keys.forEach(k => { saved[k] = process.env[k]; delete process.env[k]; });
    const original = PodioSyncService.sendOutboundCommunication;
    try {
        const none = await DeliveryService.text({ to: '+15555550100', message: 'hi' });
        assert.equal(none.success, false);
        keys.forEach(k => { process.env[k] = 'x'; });
        const calls = [];
        PodioSyncService.sendOutboundCommunication = async args => { calls.push(args); return { itemId: 4242 }; };
        const text = await DeliveryService.text({ to: '+15555550100', message: 'hi' });
        assert.deepEqual([text.success, text.provider, text.status, text.itemId], [true, 'podio', 'HANDED_TO_PODIO', 4242]);
        const mail = await DeliveryService.email({ to: 'a@example.com', subject: 's', text: 'b' });
        assert.equal(mail.success, true);
        assert.deepEqual(calls.map(c => c.type), ['TEXT', 'EMAIL']);
        assert.ok(calls.every(c => c.recordLocally === false), 'the caller records the interaction, so Podio must not record a second one');
        PodioSyncService.sendOutboundCommunication = async () => { throw new Error('boom'); };
        const refused = await DeliveryService.text({ to: '+15555550100', message: 'hi' });
        assert.deepEqual([refused.success, refused.status], [false, 'PODIO_REFUSED']);
    } finally {
        PodioSyncService.sendOutboundCommunication = original;
        keys.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
    }
});

test('parcel lookup accepts only an address-verified parcel', async () => {
    const { sameStreetAddress, ParcelLookupService, DOR_COUNTY_TO_CODE } = await import('../backend/src/services/parcelLookupService.js');
    assert.ok(sameStreetAddress('1636 W 36th St', '1636 W 36TH ST'));
    assert.ok(sameStreetAddress('1411 Wilcox St j', '1411 WILCOX ST'), 'a trailing unit letter is tolerated');
    assert.ok(sameStreetAddress('270 East 46th Street', '270 E 46TH ST'));
    assert.ok(!sameStreetAddress('10725 Meadowlea Dr', '10725 MEADOW LEA CIR N'), 'a different street is never accepted');
    assert.ok(!sameStreetAddress('1636 W 36th St', '1638 W 36TH ST'), 'a different number is never accepted');
    assert.ok(!sameStreetAddress('Maple Ave', 'MAPLE AVE'), 'no street number, no match');

    const realFetch = globalThis.fetch;
    const respond = body => ({ ok: true, status: 200, json: async () => body });
    const attrs = (id, addr, co = 26) => ({ attributes: { CO_NO: co, PARCEL_ID: id, PHY_ADDR1: addr, PHY_CITY: 'JACKSONVILLE', OWN_NAME: 'OWNER', DOR_UC: '001', JV: 100000 } });
    try {
        let features = [attrs('A1', '12 OAK ST'), attrs('B2', '14 OAK ST')];
        globalThis.fetch = async url => String(url).includes('geocoding') ? respond({ result: { addressMatches: [{ coordinates: { x: -81.7, y: 30.3 } }] } }) : respond({ features });
        const hit = await ParcelLookupService._resolve({ line1: '12 Oak St', city: 'Jacksonville', state: 'FL', zip: '32209' });
        assert.deepEqual([hit.found, hit.parcel.parcelId, hit.parcel.countyCode, hit.parcel.propertyType], [true, 'A1', 'DUV', 'Single Family']);
        features = [attrs('B2', '14 OAK ST')];
        const wrong = await ParcelLookupService._resolve({ line1: '12 Oak St', city: 'Jacksonville', state: 'FL' });
        assert.equal(wrong.found, false, 'a neighbouring parcel is not used');
        features = [attrs('A1', '12 OAK ST'), attrs('A2', '12 OAK ST')];
        const ambiguous = await ParcelLookupService._resolve({ line1: '12 Oak St', city: 'Jacksonville', state: 'FL' });
        assert.equal(ambiguous.found, false);
        assert.equal(ambiguous.ambiguous.length, 2);
        features = [attrs('Z9', '12 OAK ST', 99)];
        assert.equal((await ParcelLookupService._resolve({ line1: '12 Oak St', city: 'X', state: 'FL' })).found, false, 'counties HushHawk does not cover are ignored');
        globalThis.fetch = async () => { throw new Error('offline'); };
        const down = await ParcelLookupService._resolve({ line1: '12 Oak St', city: 'X', state: 'FL' });
        assert.deepEqual([down.found, down.retry], [false, true]);
    } finally { globalThis.fetch = realFetch; }
    assert.equal(DOR_COUNTY_TO_CODE[26], 'DUV');
});

test('a lead is linked to a property through the address in its conversation, and only when the parcel is verified', async () => {
    const { LeadLinkService } = await import('../backend/src/services/leadLinkService.js');
    const { ParcelLookupService } = await import('../backend/src/services/parcelLookupService.js');
    assert.deepEqual(LeadLinkService.parseStreet('2323 Soutel Dr d, Jacksonville, FL 32208, USA'), { line1: '2323 Soutel Dr d', city: 'Jacksonville', state: 'FL', zip: '32208' });
    assert.equal(LeadLinkService.parseStreet('Jacksonville Metro, FL'), null, 'a place name is not a street address');

    const email = `link-${run}@example.test`;
    const personId = crypto.randomUUID(); const leadId = crypto.randomUUID(); const threadId = `thr-${run}`;
    const street = `${900000 + Math.floor(Math.random() * 99999)} Linker Test Rd`;
    await pool.query("INSERT INTO core.people (person_id, full_name, primary_email) VALUES ($1, 'Link Test', $2)", [personId, email]);
    await pool.query("INSERT INTO core.leads (lead_id, person_id, first_source_code, source_detail, status) VALUES ($1, $2, 'PODIO', 'Podio: test', 'NEW')", [leadId, personId]);
    await pool.query("INSERT INTO core.conversation_desk_platforms (platform_id, name, color) VALUES ('email', 'Email Center', '#f5cf72') ON CONFLICT (platform_id) DO NOTHING");
    await pool.query("INSERT INTO core.conversation_desk_threads (id, platform_id, contact_name, contact_email, property_address, status) VALUES ($1, 'email', 'Link Test', $2, $3, 'OPEN')", [threadId, email, `${street}, Jacksonville, FL 32209, USA`]);

    const original = ParcelLookupService.resolve;
    try {
        ParcelLookupService.resolve = async () => ({ found: false, reason: 'No parcel near this address has a matching recorded street address.' });
        const miss = await LeadLinkService.linkFromConversations();
        assert.ok(miss.notFound.some(n => n.address.startsWith(street)));
        assert.equal((await pool.query('SELECT property_id FROM core.leads WHERE lead_id = $1', [leadId])).rows[0].property_id, null, 'an unverified address links nothing');
        await pool.query('DELETE FROM ops.kv_store WHERE key LIKE $1', ['parcel-lookup:thread:%']);

        ParcelLookupService.resolve = async parts => ({ found: true, parcel: { parcelId: `LNK${run}`.slice(0, 18), countyCode: 'DUV', propertyType: 'Single Family', justValue: 90000, legalDescription: 'TEST LEGAL', owner: 'TEST OWNER', source: 'test', verification: 'test', raw: { PARCEL_ID: `LNK${run}` }, situsAddress: parts.line1 } });
        const hit = await LeadLinkService.linkFromConversations();
        assert.ok(hit.leadsLinked >= 1);
        const { rows: [lead] } = await pool.query('SELECT l.property_id, p.address_line1 FROM core.leads l JOIN core.properties p USING (property_id) WHERE l.lead_id = $1', [leadId]);
        assert.equal(lead.address_line1, street);
        const { rows: [src] } = await pool.query('SELECT first_source_code FROM core.leads WHERE lead_id = $1', [leadId]);
        assert.equal(src.first_source_code, 'PODIO', 'linking never changes the first source');
    } finally { ParcelLookupService.resolve = original; }
});

test('Meta channels: signed webhooks only, deduplicated, first source kept, replies honest', async () => {
    process.env.META_APP_SECRET = 'meta-test-secret'; process.env.META_VERIFY_TOKEN = 'meta-verify';
    delete process.env.META_PAGE_ACCESS_TOKEN; delete process.env.WHATSAPP_ACCESS_TOKEN; delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    const noAuth = { authorization: '' };
    const sign = raw => `sha256=${crypto.createHmac('sha256', process.env.META_APP_SECRET).update(raw).digest('hex')}`;
    const post = (payload, signature) => { const raw = JSON.stringify(payload); return fetch(`${base}/webhooks/meta`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...noAuth, ...(signature === undefined ? { 'x-hub-signature-256': sign(raw) } : signature ? { 'x-hub-signature-256': signature } : {}) }, body: raw }); };

    const good = await fetch(`${base}/webhooks/meta?hub.mode=subscribe&hub.verify_token=meta-verify&hub.challenge=12345`, { headers: noAuth });
    assert.deepEqual([good.status, await good.text()], [200, '12345']);
    assert.equal((await fetch(`${base}/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`, { headers: noAuth })).status, 403);

    const psid = `psid-${run}`; const mid = `mid-${run}`;
    const payload = { object: 'page', entry: [{ id: 'page', messaging: [{ sender: { id: psid }, recipient: { id: 'page' }, timestamp: Date.now(), message: { mid, text: 'Hi, do you buy houses?' } }] }] };
    assert.equal((await post(payload, 'sha256=bad')).status, 401, 'a wrong signature is refused');
    assert.equal((await post(payload, null)).status, 401, 'no signature is refused');
    const ok = await asJson(await post(payload));
    assert.deepEqual([ok.status, ok.body.messages], [200, 1]);
    const again = await asJson(await post(payload));
    assert.equal(again.body.messages, 0, 'the same message delivered twice is stored once');
    const echo = await asJson(await post({ object: 'page', entry: [{ messaging: [{ sender: { id: 'page' }, message: { mid: `e-${run}`, text: 'ours', is_echo: true } }] }] }));
    assert.equal(echo.body.messages, 0, 'our own echoed messages are not stored as inbound');

    const { rows: [thread] } = await pool.query('SELECT * FROM core.conversation_desk_threads WHERE id = $1', [`messenger:${psid}`]);
    assert.equal(thread.platform_id, 'messenger'); assert.equal(thread.unread_count, 1); assert.equal(thread.property_city, null, 'no invented city');
    const { rows: [lead] } = await pool.query("SELECT first_source_code FROM core.leads WHERE lead_id IN (SELECT lead_id FROM core.leads WHERE source_detail = 'Messenger message' AND metadata->>'externalId' = $1)", [psid]);
    assert.equal(lead.first_source_code, 'FB');

    // WhatsApp from a number that already belongs to a lead: the lead keeps its original first source
    const phone = `1904${Math.floor(1000000 + Math.random() * 8999999)}`;
    const pid = crypto.randomUUID(); const lid = crypto.randomUUID();
    await pool.query("INSERT INTO core.people (person_id, full_name, primary_phone) VALUES ($1, 'Existing Seller', $2)", [pid, `+${phone}`]);
    await pool.query("INSERT INTO core.leads (lead_id, person_id, first_source_code, source_detail, status) VALUES ($1, $2, 'PODIO', 'Podio: test', 'NEW')", [lid, pid]);
    const wa = await asJson(await post({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { contacts: [{ wa_id: phone, profile: { name: 'Existing Seller' } }], messages: [{ from: phone, id: `wamid-${run}`, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Is the offer still open?' } }] } }] }] }));
    assert.equal(wa.body.messages, 1);
    const { rows: leadsForPhone } = await pool.query("SELECT l.first_source_code FROM core.leads l JOIN core.people p USING (person_id) WHERE right(regexp_replace(p.primary_phone, '\\D', '', 'g'), 10) = right($1, 10)", [phone]);
    assert.deepEqual(leadsForPhone.map(r => r.first_source_code), ['PODIO'], 'no duplicate lead, first source unchanged');

    // replies
    const { MetaService } = await import('../backend/src/services/metaService.js');
    const none = await MetaService.sendToThread(`messenger:${psid}`, 'hello');
    assert.deepEqual([none.success, none.status], [false, 'NOT_CONFIGURED']);
    process.env.META_PAGE_ACCESS_TOKEN = 'page-token';
    const realFetch = globalThis.fetch; let sent;
    try {
        globalThis.fetch = async (url, init) => { sent = { url: String(url), body: JSON.parse(init.body) }; return { ok: true, status: 200, json: async () => ({ message_id: 'm_1' }) }; };
        const ok2 = await MetaService.sendToThread(`messenger:${psid}`, 'hello');
        assert.deepEqual([ok2.success, ok2.messageId, sent.body.recipient.id, sent.body.message.text], [true, 'm_1', psid, 'hello']);
        globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'Outside the allowed window' } }) });
        const refused = await MetaService.sendToThread(`messenger:${psid}`, 'hello');
        assert.deepEqual([refused.success, refused.error], [false, 'Outside the allowed window']);
    } finally { globalThis.fetch = realFetch; delete process.env.META_PAGE_ACCESS_TOKEN; }
    delete process.env.META_APP_SECRET;
    assert.equal((await post(payload, 'sha256=anything')).status, 503, 'without an app secret the webhook fails closed');
});

test('leads are classified from evidence, a person\'s choice sticks, and non-sellers stay out of the seller count', async () => {
    const { classifyLead, LeadClassifierService } = await import('../backend/src/services/leadClassifierService.js');
    const internalDomains = ['elitehomes1.com'];
    const k = o => classifyLead({ internalDomains, source: 'EML', ...o }).kind;
    assert.equal(k({ email: 'team@elitehomes1.com', name: 'Someone' }), 'INTERNAL');
    assert.equal(k({ email: 'a@gmail.com', name: 'Darren Test' }), 'INTERNAL', 'a test record');
    assert.equal(k({ email: 'noreply@mycusthelp.net' }), 'AUTOMATED');
    assert.equal(k({ email: 'dse_na4@docusign.net' }), 'AUTOMATED');
    assert.equal(k({ email: 'x@titleamerica.us' }), 'BUSINESS', 'company domain, email only');
    assert.equal(k({ email: 'person@gmail.com' }), 'NEEDS_REVIEW', 'a personal address proves nothing either way');
    assert.equal(k({ email: 'x@titleamerica.us', status: 'CONTRACT' }), 'SELLER', 'the team worked it');
    assert.equal(k({ email: 'x@titleamerica.us', hasProperty: true }), 'SELLER', 'it has a property');
    assert.equal(k({ email: 'x@y.com', source: 'COLD', phone: '+19045550123' }), 'SELLER');

    const mk = async (email, source) => {
        const personId = crypto.randomUUID(); const leadId = crypto.randomUUID();
        await pool.query('INSERT INTO core.people (person_id, full_name, primary_email) VALUES ($1, $2, $3)', [personId, 'Kind Probe', email]);
        await pool.query("INSERT INTO core.leads (lead_id, person_id, first_source_code, source_detail, status) VALUES ($1, $2, $3, 'test', 'NEW')", [leadId, personId, source]);
        return leadId;
    };
    const robot = await mk(`noreply-${run}@docusign.net`, 'EML');
    const unknown = await mk(`maybe-${run}@gmail.com`, 'EML');
    await LeadClassifierService.classifyAll();
    const kind = async id => (await pool.query('SELECT lead_kind, lead_kind_set_by FROM core.leads WHERE lead_id = $1', [id])).rows[0];
    assert.equal((await kind(robot)).lead_kind, 'AUTOMATED');
    assert.equal((await kind(unknown)).lead_kind, 'NEEDS_REVIEW');

    const before = (await asJson(await json('GET', '/dashboard/metrics', undefined, auth.headers))).body;
    await LeadClassifierService.setKind({ leadId: unknown, kind: 'BUSINESS', reason: 'A vendor, checked by hand', actor: 'Tester' });
    await LeadClassifierService.classifyAll();
    assert.deepEqual(await kind(unknown), { lead_kind: 'BUSINESS', lead_kind_set_by: 'Tester' }, 'rules never override a person');
    const bad = await asJson(await json('PATCH', `/leads/${unknown}/kind`, { kind: 'WIZARD' }, auth.headers));
    assert.equal(bad.status, 400);
    const { rows: [counted] } = await pool.query("SELECT count(*)::int n FROM core.leads WHERE lead_kind IN ('SELLER','NEEDS_REVIEW')");
    const { rows: [all] } = await pool.query('SELECT count(*)::int n FROM core.leads');
    assert.ok(counted.n < all.n, 'non-sellers exist and are excluded from the seller count');
    const sellerLeads = (await asJson(await json('GET', '/seller-leads', undefined, auth.headers))).body.leads;
    const row = sellerLeads.find(l => l.id === robot);
    assert.equal(row.leadKind, 'AUTOMATED', 'non-sellers are marked, not silently dropped');
});

test('county roll events: Absentee and Out-of-State follow the approved rules, link to the roll as evidence, and resolve when the roll changes', async () => {
    const { CountyRollService, rollConditions } = await import('../backend/src/services/countyRollService.js');
    const { ParcelLookupService } = await import('../backend/src/services/parcelLookupService.js');
    assert.deepEqual([rollConditions({ PHY_ZIPCD: 32209, OWN_ZIPCD: 32209, OWN_STATE: 'FL' }).ABS, rollConditions({ PHY_ZIPCD: 32209, OWN_ZIPCD: 32209, OWN_STATE: 'FL' }).OOS], [false, false]);
    assert.deepEqual([rollConditions({ PHY_ZIPCD: 32209, OWN_ZIPCD: 33101, OWN_STATE: 'FL' }).ABS, rollConditions({ PHY_ZIPCD: 32209, OWN_ZIPCD: 33101, OWN_STATE: 'FL' }).OOS], [true, false]);
    assert.deepEqual([rollConditions({ PHY_ZIPCD: 32209, OWN_ZIPCD: 10003, OWN_STATE: 'NY' }).ABS, rollConditions({ PHY_ZIPCD: 32209, OWN_ZIPCD: 10003, OWN_STATE: 'NY' }).OOS], [true, true]);
    assert.deepEqual([rollConditions({ PHY_ZIPCD: 32209 }).ABS, rollConditions({ PHY_ZIPCD: 32209 }).OOS], [false, false], 'a missing owner address proves nothing');

    const parcel = `ROLL${run}`;
    const { rows: [county] } = await pool.query("SELECT county_id FROM ref.counties WHERE county_code = 'DUV'");
    const { rows: [prop] } = await pool.query(
        `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, state_code, metadata) VALUES ($1, $2, $2, '1 Roll Test St', 'FL', '{"parcel_source":"test"}'::jsonb) RETURNING property_id`, [county.county_id, parcel]);
    const original = ParcelLookupService.fetchRollRecord;
    const status = async code => (await pool.query('SELECT event_status, verification_status FROM core.pillar_events WHERE property_id = $1 AND pillar_code = $2', [prop.property_id, code])).rows;
    try {
        ParcelLookupService.fetchRollRecord = async () => ({ PARCEL_ID: parcel, PHY_ZIPCD: 32209, OWN_NAME: 'ROLL OWNER', OWN_ADDR1: '25 UNION SQ', OWN_CITY: 'NEW YORK', OWN_STATE: 'NY', OWN_ZIPCD: 10003, JV: 50000, ASMNT_YR: 2026 });
        const first = await CountyRollService.refreshAll();
        assert.equal(first.eventsCreated >= 2, true);
        assert.deepEqual(await status('ABS'), [{ event_status: 'OPEN', verification_status: 'CONFIRMED' }]);
        assert.deepEqual(await status('OOS'), [{ event_status: 'OPEN', verification_status: 'CONFIRMED' }]);
        const { rows: [ev] } = await pool.query("SELECT count(*)::int n FROM rel.event_evidence ee JOIN core.pillar_events e USING (event_id) WHERE e.property_id = $1", [prop.property_id]);
        assert.ok(ev.n >= 2, 'each event links to the roll record');
        const again = await CountyRollService.refreshAll();
        assert.equal(again.eventsCreated, 0, 'running again creates nothing new');
        ParcelLookupService.fetchRollRecord = async () => ({ PARCEL_ID: parcel, PHY_ZIPCD: 32209, OWN_NAME: 'ROLL OWNER', OWN_ADDR1: '1 ROLL TEST ST', OWN_CITY: 'JACKSONVILLE', OWN_STATE: 'FL', OWN_ZIPCD: 32209, JV: 50000, ASMNT_YR: 2026 });
        const resolved = await CountyRollService.refreshAll();
        assert.equal(resolved.eventsResolved >= 2, true);
        assert.deepEqual(await status('ABS'), [{ event_status: 'RESOLVED', verification_status: 'CONFIRMED' }], 'the event is resolved, not deleted');
        const { rows: [numbers] } = await pool.query("SELECT count(*)::int n FROM core.pillar_events WHERE property_id = $1", [prop.property_id]);
        assert.equal(numbers.n, 2);
    } finally { ParcelLookupService.fetchRollRecord = original; }
});

test('a role can only use the parts of the API its sections allow; administrators can use all', async () => {
    const { RbacService } = await import('../backend/src/services/rbacService.js');
    const { sectionsFor } = await import('../backend/src/middleware/auth.js');
    const { rows: [role] } = await pool.query("SELECT role_id, permissions FROM core.roles WHERE role_key = 'DIRECT_MAIL_SPECIALIST'");
    assert.ok(role.permissions.includes('/direct-mail') && !role.permissions.includes('/seller-leads'), 'fixture: the role is narrow');
    const email = `dm-${run.toLowerCase()}@example.test`; const password = `pw-${crypto.randomUUID()}`;
    await pool.query(`INSERT INTO core.users (full_name, email, role, status, custom_role_id, password_hash) VALUES ('Mail Only', $1, 'DIRECT_MAIL_SPECIALIST', 'ACTIVE', $2, crypt($3, gen_salt('bf', 10)))`, [email, role.role_id, password]);
    const { token } = await RbacService.authenticate({ email, password });
    const as = path => fetch(`${base}${path}`, { headers: { authorization: `Bearer ${token}` } }).then(r => r.status);
    assert.equal(await as('/direct-mail'), 200);
    assert.equal(await as('/dashboard/metrics'), 200, 'shared pages stay open');
    assert.equal(await as('/health'), 200);
    for (const path of ['/vault/files', '/buyers', '/team', '/contracts', '/connectors', '/marketing', '/dispositions', '/skip-tracing', '/audit/logs', '/imports']) assert.equal(await as(path), 403, `${path} is closed to this role`);
    // The dashboard shows lead and property lists, so a role that has the Home section keeps those two areas.
    assert.ok(role.permissions.includes('/home') && sectionsFor('/seller-leads').includes('/home'));
    assert.equal((await fetch(`${base}/seller-leads`)).status, 200, 'the administrator (default test session) is not restricted');
    assert.equal(sectionsFor('/notifications'), null);
});

test('sign-in is locked per account after repeated failures, and security headers and log redaction are in place', async () => {
    const { clearLoginFailures } = await import('../backend/src/middleware/auth.js');
    const { redactUrl, securityHeaders, sanitizeServerErrors } = await import('../backend/src/middleware/hardening.js');
    const email = `lock-${run.toLowerCase()}@example.test`;
    const attempt = pw => fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', authorization: '' }, body: JSON.stringify({ email, password: pw }) }).then(r => r.status);
    for (let i = 0; i < 5; i++) assert.equal(await attempt('wrong'), 401);
    assert.equal(await attempt('wrong'), 429, 'the sixth attempt is locked out');
    clearLoginFailures(email);
    assert.equal(await attempt('wrong'), 401, 'a different account is not affected, and clearing releases the lock');
    clearLoginFailures(email);

    assert.equal(redactUrl('/api/v1/webhooks/podio?secret=abc123&x=1'), '/api/v1/webhooks/podio?secret=[redacted]&x=1');
    assert.equal(redactUrl('/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=zzz'), '/api/v1/webhooks/meta?hub.mode=subscribe&hub.verify_token=[redacted]');
    const headers = {}; securityHeaders({}, { set: h => Object.assign(headers, h) }, () => {});
    assert.equal(headers['X-Content-Type-Options'], 'nosniff'); assert.equal(headers['X-Frame-Options'], 'DENY');

    const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
    try {
        let sent; const res = { statusCode: 500, json: b => { sent = b; return res; } };
        sanitizeServerErrors({ method: 'GET', originalUrl: '/x?secret=s' }, res, () => {});
        res.json({ error: 'relation "core.secret_table" does not exist' });
        assert.match(sent.error, /^Something went wrong on the server\. Reference [0-9a-f]{8}\.$/);
        res.statusCode = 400; res.json({ error: 'Name is required' });
        assert.equal(sent.error, 'Name is required', 'deliberate messages are untouched');
    } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});

test('desk channels report whether messages can really arrive', async () => {
    const { LeadDeskService } = await import('../backend/src/services/leadDeskService.js');
    const keys = ['PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_FEEDS_APP_ID', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'META_PAGE_ACCESS_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]])); keys.forEach(k => delete process.env[k]);
    try {
        assert.equal(LeadDeskService.connectionFor('email').status, 'NOT_CONNECTED');
        assert.equal(LeadDeskService.connectionFor('messenger').status, 'NOT_CONNECTED');
        assert.equal(LeadDeskService.connectionFor('zillow').status, 'NOT_AVAILABLE');
        assert.equal(LeadDeskService.connectionFor('sms').status, 'NOT_AVAILABLE');
        ['PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_FEEDS_APP_ID'].forEach(k => { process.env[k] = 'x'; });
        assert.deepEqual(['email', 'podio', 'smrtphone'].map(p => LeadDeskService.connectionFor(p).status), ['CONNECTED', 'CONNECTED', 'CONNECTED']);
        Object.assign(process.env, { META_APP_SECRET: 's', META_VERIFY_TOKEN: 'v', META_PAGE_ACCESS_TOKEN: 't' });
        assert.deepEqual(['messenger', 'instagram', 'facebook', 'whatsapp'].map(p => LeadDeskService.connectionFor(p).status), ['CONNECTED', 'CONNECTED', 'CONNECTED', 'NOT_CONNECTED']);
        const { status, body } = await asJson(await json('GET', '/lead-desk/platforms'));
        assert.equal(status, 200);
        assert.ok(body.platforms.every(p => p.connection && ['CONNECTED', 'NOT_CONNECTED', 'NOT_AVAILABLE'].includes(p.connection.status)));
    } finally { keys.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }); }
});

test('the dashboard seller count explains itself against the total number of contacts', async () => {
    const { status, body } = await asJson(await json('GET', '/dashboard/metrics'));
    assert.equal(status, 200);
    const card = body.metrics.find(m => m.label === 'Total Seller Leads');
    const { rows: [n] } = await pool.query("SELECT count(*)::int everyone, count(*) FILTER (WHERE lead_kind IN ('SELLER','NEEDS_REVIEW'))::int sellers FROM core.leads");
    assert.equal(card.value, String(n.sellers));
    assert.equal(card.note, `of ${n.everyone} contacts · ${n.everyone - n.sellers} not sellers`);
    assert.match(card.help, /business contacts/);
});

test('health reports stale syncs and overdue backups, and repeated job failures raise one alert', async () => {
    const { HealthService } = await import('../backend/src/services/healthService.js');
    const { AlertService } = await import('../backend/src/services/alertService.js');
    const keys = ['PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_SYNC_INTERVAL_MIN', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
    const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
    try {
        keys.forEach(k => delete process.env[k]);
        let c = await HealthService.checks();
        assert.deepEqual([c.podioSync, c.backup, c.degraded], ['NOT_CONFIGURED', 'NOT_CONFIGURED', false]);
        Object.assign(process.env, { PODIO_CLIENT_ID: 'x', PODIO_APP_TOKEN: 'x', PODIO_SYNC_INTERVAL_MIN: '10', AWS_ACCESS_KEY_ID: 'x', AWS_SECRET_ACCESS_KEY: 'x' });
        await pool.query("DELETE FROM ops.kv_store WHERE key IN ('sync:podio', 'backup:last')");
        c = await HealthService.checks();
        assert.deepEqual([c.podioSync, c.backup, c.degraded], ['WAITING', 'WAITING', false]);
        await HealthService.recordSync('podio', true);
        await pool.query(`INSERT INTO ops.kv_store (key, value) VALUES ('backup:last', $1::jsonb)`, [JSON.stringify({ at: new Date().toISOString() })]);
        c = await HealthService.checks();
        assert.deepEqual([c.podioSync, c.backup, c.degraded], ['OK', 'OK', false]);
        await pool.query("UPDATE ops.kv_store SET value = jsonb_set(value, '{at}', to_jsonb(now() - interval '2 hours')::jsonb) WHERE key = 'sync:podio'");
        await pool.query("UPDATE ops.kv_store SET value = jsonb_set(value, '{at}', to_jsonb(now() - interval '2 days')::jsonb) WHERE key = 'backup:last'");
        c = await HealthService.checks();
        assert.deepEqual([c.podioSync, c.backup, c.degraded], ['STALE', 'OVERDUE', true]);
        await HealthService.recordSync('podio', false, new Error('token rejected'));
        assert.equal((await HealthService.checks()).podioSync, 'FAILING');
        const health = await asJson(await json('GET', '/health'));
        assert.equal(health.status, 200); assert.equal(typeof health.body.degraded, 'boolean'); assert.ok(health.body.checks);
    } finally {
        keys.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; });
        await pool.query("DELETE FROM ops.kv_store WHERE key IN ('sync:podio', 'backup:last')");
    }

    await pool.query("DELETE FROM ops.kv_store WHERE key = 'alert:job:probe'");
    const before = (await pool.query("SELECT count(*)::int n FROM ops.notifications WHERE title = 'Automatic task failing: probe'")).rows[0].n;
    await AlertService.jobResult('probe', new Error('one')); await AlertService.jobResult('probe', new Error('two'));
    assert.equal((await pool.query("SELECT count(*)::int n FROM ops.notifications WHERE title = 'Automatic task failing: probe'")).rows[0].n, before, 'two failures are not yet an alert');
    await AlertService.jobResult('probe', new Error('three')); await AlertService.jobResult('probe', new Error('four'));
    assert.equal((await pool.query("SELECT count(*)::int n FROM ops.notifications WHERE title = 'Automatic task failing: probe'")).rows[0].n, before + 1, 'the third failure alerts once, not on every failure');
    await AlertService.jobResult('probe', null);
});

test('opt-out replies and imported lists fill the do-not-contact list, and the outbound gate blocks those people', async () => {
    const { isOptOutMessage, ComplianceService } = await import('../backend/src/services/complianceService.js');
    for (const t of ['STOP', 'stop.', 'Unsubscribe', 'Please stop texting me', 'do not call me again', 'Remove me from your list', 'QUIT']) assert.equal(isOptOutMessage(t, 'TEXT'), true, t);
    for (const t of ['Can you stop by tomorrow?', 'What is the end date?', 'I want to cancel the appointment time and move it', 'Yes, interested', '']) assert.equal(isOptOutMessage(t, 'TEXT'), false, t);
    assert.equal(isOptOutMessage('STOP', 'EMAIL'), false, 'a bare keyword is only a text opt-out');
    assert.equal(isOptOutMessage('Footer: to unsubscribe click here. View in browser.', 'EMAIL'), false, 'a newsletter footer is not an opt-out');
    assert.equal(isOptOutMessage('Please unsubscribe me from this list', 'EMAIL'), true);

    const phone = `904${Math.floor(1000000 + Math.random() * 8999999)}`;
    assert.equal(await ComplianceService.recordOptOut({ phone: `+1${phone}`, text: 'STOP' }), 1);
    assert.equal(await ComplianceService.recordOptOut({ phone, text: 'STOP' }), 0, 'the same number is not listed twice');
    const gate = await ComplianceService.evaluateOutboundRequest({ channel: 'TEXT', recipientPhone: phone });
    assert.equal(gate.checks.find(c => c.step === 1).passed, false, 'a 10-digit number matches the stored +1 number');

    const listed = `904${Math.floor(1000000 + Math.random() * 8999999)}`;
    const result = await ComplianceService.importSuppression({ entries: [listed, `(${listed.slice(0, 3)}) ${listed.slice(3, 6)}-${listed.slice(6)}`, 'person@example.test', 'not a number', '123'], reason: 'National Do Not Call registry, test file', actor: 'Tester' });
    assert.deepEqual([result.added, result.alreadyListed, result.rejected.length], [2, 1, 2]);
    const viaApi = await asJson(await json('POST', '/compliance/suppression/import', { text: `${listed}\n905${listed.slice(3)}`, reason: 'second file' }));
    assert.equal(viaApi.status, 201); assert.deepEqual([viaApi.body.added, viaApi.body.alreadyListed], [1, 1]);
    assert.equal((await asJson(await json('POST', '/compliance/suppression/import', { entries: [listed] }))).status, 400, 'a reason is required');
});

test('comparable sales estimate an ARV only from enough similar recent qualified sales', async () => {
    const { ParcelLookupService } = await import('../backend/src/services/parcelLookupService.js');
    const realFetch = globalThis.fetch;
    const now = new Date(Date.UTC(2026, 10, 18));
    const sale = (id, price, sqft, extra = {}) => ({ attributes: { CO_NO: 26, PARCEL_ID: id, PHY_ADDR1: `${id} TEST ST`, PHY_ZIPCD: 32209, DOR_UC: '001', TOT_LVG_AR: sqft, ACT_YR_BLT: 1980, SALE_PRC1: price, SALE_YR1: 2026, SALE_MO1: '03', QUAL_CD1: '01', VI_CD1: 'I', ...extra } });
    try {
        let features = [sale('A', 100000, 1000), sale('B', 120000, 1000), sale('C', 140000, 1000), sale('D', 90000, 1000, { QUAL_CD1: '11' }), sale('E', 500000, 1000, { DOR_UC: '004' }),
            sale('F', 110000, 1000, { SALE_YR1: 2024 }), sale('G', 110000, 2500), sale('SELF', 120000, 1000), sale('H', 15000, 1000), sale('I', 110000, 1000, { VI_CD1: 'V' })];
        globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ features }) });
        const base = { lat: 30.3, lon: -81.7, countyCode: 'DUV', useCode: '001', sqft: 1000, parcelId: 'SELF', now };
        const result = await ParcelLookupService.fetchComps(base);
        assert.deepEqual(result.comps.map(c => c.parcelId).sort(), ['A', 'B', 'C'], 'unqualified, other use, old, wrong size, tiny, vacant and the subject itself are excluded');
        assert.equal(result.estimate.arv, 120000); assert.equal(result.estimate.count, 3); assert.equal(result.estimate.medianPricePerSqft, 120);
        features = features.slice(0, 2);
        const few = await ParcelLookupService.fetchComps(base);
        assert.equal(few.estimate, null, 'two comparables are not enough to estimate'); assert.match(few.reason, /at least 3/);
        const noSqft = await ParcelLookupService.fetchComps({ ...base, sqft: 0 });
        assert.equal(noSqft.estimate, null); assert.match(noSqft.reason, /living area/);
        assert.equal((await ParcelLookupService.fetchComps({ ...base, countyCode: 'XXX' })).estimate, null);
    } finally { globalThis.fetch = realFetch; }
});

test('desk threads carry no invented score or place, and the property card shows only recorded facts', async () => {
    const { LeadDeskService } = await import('../backend/src/services/leadDeskService.js');
    await pool.query("INSERT INTO core.conversation_desk_platforms (platform_id, name, color) VALUES ('podio', 'Podio', '#2686cc') ON CONFLICT (platform_id) DO NOTHING");
    const id = `thr-nodefault-${run}`;
    await pool.query("INSERT INTO core.conversation_desk_threads (id, platform_id, contact_name, property_address) VALUES ($1, 'podio', 'No Defaults', '')", [id]);
    const { rows: [t] } = await pool.query('SELECT lead_score, property_city, property_zip, status FROM core.conversation_desk_threads WHERE id = $1', [id]);
    assert.deepEqual([t.lead_score, t.property_city, t.property_zip, t.status].map(v => v ?? null), [null, null, null, 'Open']);
    const unlinked = await LeadDeskService.getThreadDetail(id);
    assert.equal(unlinked.propertyFacts, ''); assert.equal(unlinked.leadScore, null);

    const { rows: [county] } = await pool.query("SELECT county_id FROM ref.counties WHERE county_code = 'DUV'");
    const { rows: [prop] } = await pool.query(
        `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, state_code, property_type, assessed_value, metadata) VALUES ($1, $2, $2, '5 Facts St', 'FL', 'Single Family', 91234, '{"living_area_sqft":1063,"year_built":1950}'::jsonb) RETURNING property_id`, [county.county_id, `FACTS${run}`]);
    await pool.query('UPDATE core.conversation_desk_threads SET property_id = $2 WHERE id = $1', [id, prop.property_id]);
    const linked = await LeadDeskService.getThreadDetail(id);
    assert.equal(linked.propertyFacts, 'Single Family • 1,063 sqft • Built 1950 • County value $91,234');
    assert.equal(linked.propertyImage, null, 'no photo is invented');
});

test('county records show the county roll owner and only recorded distress, with no invented equity or fallbacks', async () => {
    const { rows: [county] } = await pool.query("SELECT county_id FROM ref.counties WHERE county_code = 'DUV'");
    const parcel = `CTY${run}`;
    const { rows: [prop] } = await pool.query(
        `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, city, postal_code, state_code, assessed_value, metadata)
         VALUES ($1, $2, $2, '9 County Rd', 'Jacksonville', '32209', 'FL', 80000, '{"county_owner_of_record":"ROLL OWNER","owner_mailing":"1 ELSEWHERE ST, TAMPA, FL, 33601"}'::jsonb) RETURNING property_id`, [county.county_id, parcel]);
    const { EventService } = await import('../backend/src/services/eventService.js');
    const { rows: [src] } = await pool.query("INSERT INTO raw.source_records (source_system, jurisdiction, source_external_id, payload, payload_hash, parser_version) VALUES ('TEST', 'Duval County', $1, '{}'::jsonb, $1, 't') RETURNING source_record_id", [parcel]);
    await EventService.recordPillarEvent({ propertyId: prop.property_id, pillarCode: 'ABS', externalEventId: `T:${parcel}`, verificationStatus: 'CONFIRMED', sourceRecordId: src.source_record_id, actor: 'Tester' });
    const { status, body } = await asJson(await json('GET', '/county-records'));
    assert.equal(status, 200);
    const rec = body.records.find(r => r.parcel === parcel);
    assert.deepEqual([rec.owner, rec.ownerType, rec.distress, rec.mailingAddress], ['ROLL OWNER', 'Absentee Owner', 'Absentee Owner', '1 ELSEWHERE ST, TAMPA, FL, 33601']);
    assert.deepEqual([rec.equity, rec.estimatedValue, rec.equityPercent], [null, null, null]);
    assert.ok(!body.records.some(r => (r.tags || []).includes('High Equity') || /High Equity/.test(r.distress || '')));
    const plain = body.records.find(r => r.owner === null);
    if (plain) assert.equal(plain.ownerType, null, 'no owner claim without a roll record');
});


test('CSV exports write missing values as empty, escape quotes and neutralise spreadsheet formulas', async () => {
    const { csvCell, toCsv } = await import('../src/extensions/elements/element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/csv.js');
    assert.equal(csvCell(null), ''); assert.equal(csvCell(undefined), '');
    assert.equal(csvCell('Jo "JJ" Smith'), '"Jo ""JJ"" Smith"');
    assert.equal(csvCell('=HYPERLINK("http://x")'), '"\'=HYPERLINK(""http://x"")"');
    assert.equal(csvCell('@cmd'), '"\'@cmd"');
    assert.equal(csvCell('-cmd'), '"\'-cmd"');
    assert.equal(csvCell('+19045550100'), '"+19045550100"', 'a phone number is left alone');
    assert.equal(csvCell('-5'), '"-5"', 'a negative number is left alone');
    assert.equal(csvCell(0), '"0"');
    assert.equal(toCsv(['A', 'B'], [['x', null], ['y', 'z']]), '"A","B"\r\n"x",\r\n"y","z"');
});

test('county records pushed to skip tracing are queued, exported for BatchLeads, and not counted as sellers', async () => {
    const { rows: [county] } = await pool.query("SELECT county_id FROM ref.counties WHERE county_code = 'DUV'");
    const parcel = `SKQ${run}`;
    const { rows: [prop] } = await pool.query(
        `INSERT INTO core.properties (county_id, parcel_raw, parcel_match, address_line1, city, postal_code, state_code) VALUES ($1, $2, $2, '7 Queue Ln', 'Jacksonville', '32210', 'FL') RETURNING property_id`, [county.county_id, parcel]);
    const pushed = await asJson(await json('POST', '/county-records/push-to-skip-trace', { recordIds: [prop.property_id] }));
    assert.equal(pushed.status, 200, JSON.stringify(pushed.body));
    const { status, body } = await asJson(await json('GET', '/skip-tracing/queue-export'));
    assert.equal(status, 200);
    const row = body.rows.find(r => r.parcel === parcel);
    assert.deepEqual([row.address, row.city, row.state, row.zip], ['7 Queue Ln', 'Jacksonville', 'FL', '32210']);
    assert.ok(row.county);
    assert.match(body.webhookUrl, /integrations\/batchleads\/webhook$/);
    const sellers = await asJson(await json('GET', '/seller-leads'));
    const queued = sellers.body.leads?.find?.(l => l.address === '7 Queue Ln') || (Array.isArray(sellers.body) ? sellers.body.find(l => l.address === '7 Queue Ln') : null);
    assert.ok(queued && queued.leadKind === 'AUTOMATED', 'a queued parcel is marked, so it is not counted as a seller lead');
    const batch = await json('POST', '/skip-tracing/batch');
    assert.equal(batch.status, 503);
});

test('incoming email: links are kept with their wording, text is complete, unsafe links are dropped', async () => {
    const { extractEmail, safeUrl } = await import('../backend/src/services/emailContent.js');

    // 1. plain text, no links
    assert.deepEqual(extractEmail('Hello there\nSecond line'), { text: 'Hello there\nSecond line', links: [] });
    // 2. one link in HTML, wording preserved
    let r = extractEmail('<p>Deal at <b>1382 Labelle St</b></p><p><a href="https://photos.example.com/deal/1">View property photos</a></p>');
    assert.deepEqual(r.links, [{ text: 'View property photos', url: 'https://photos.example.com/deal/1' }]);
    assert.match(r.text, /Deal at 1382 Labelle St\nView property photos/);
    // 3. several links, duplicates collapsed
    r = extractEmail('<a href="https://a.test/x">One</a> <a href=\'https://b.test/y\'>Two</a> <a href="https://a.test/x">One again</a>');
    assert.deepEqual(r.links.map(l => l.url), ['https://a.test/x', 'https://b.test/y']);
    // 4. a button made from a styled link, with nested markup
    r = extractEmail('<table><tr><td><a href="https://drive.test/f" style="padding:10px"><span><strong>VIEW PHOTOS</strong></span></a></td></tr></table>');
    assert.deepEqual(r.links, [{ text: 'VIEW PHOTOS', url: 'https://drive.test/f' }]);
    // 5. a linked image uses its alt text, or the site name when there is none
    r = extractEmail('<a href="https://img.test/a"><img src="x.png" alt="Front of house"></a><a href="https://www.img.test/b"><img src="y.png"></a>');
    assert.deepEqual(r.links.map(l => l.text), ['Front of house', 'img.test']);
    // 6. unsafe schemes are dropped, mail and phone links are not made clickable
    r = extractEmail('<a href="javascript:alert(1)">bad</a><a href="data:text/html,x">bad2</a><a href="file:///etc/passwd">bad3</a><a href="mailto:a@b.test">mail</a><a href="  JaVaScRiPt:alert(1)">bad4</a><a href="https://ok.test">ok</a>');
    assert.deepEqual(r.links.map(l => l.url), ['https://ok.test/']);
    assert.equal(safeUrl('java\nscript:alert(1)'), null);
    // scripts and styles never reach the text
    r = extractEmail('<style>.a{}</style><script>steal()</script><p>Visible</p>');
    assert.equal(r.text, 'Visible');
    // 7. a long tracking URL is kept whole
    const long = 'https://track.test/c?u=' + 'a'.repeat(300) + '&utm_source=email&x=1&amp;y=2';
    r = extractEmail(`<a href="${long}">Open listing</a>`);
    assert.equal(r.links[0].url, 'https://track.test/c?u=' + 'a'.repeat(300) + '&utm_source=email&x=1&y=2');
    assert.equal(r.links[0].text, 'Open listing');
    // 8. plain-text email with a written-out address
    r = extractEmail('Photos here: https://share.test/album/9.\nThanks');
    assert.deepEqual(r.links, [{ text: 'share.test', url: 'https://share.test/album/9' }]);
});

test('Podio email feed items keep the full body and links, and an older cut-off message is updated', async () => {
    const { PodioSyncService } = await import('../backend/src/services/podioSyncService.js');
    const { PodioService } = await import('../backend/src/services/podioService.js');
    const itemId = 990000000 + (Date.now() % 1000000);
    const email = `link-test-${Date.now()}@example.test`;
    const html = `<p>${'Deal details. '.repeat(40)}</p><p><a href="https://photos.test/p?utm=1&amp;x=2">View property photos</a></p><a href="javascript:alert(1)">bad</a>`;
    const field = (label, value) => ({ label, values: [{ value }] });
    const item = { item_id: itemId, app_item_id: itemId, title: 'Link Test', created_on: new Date().toISOString(),
        fields: [field('Mode', { text: 'Inbound' }), field('Type', { text: 'Email' }), field('From Email', email), field('Caller Name', 'Link Test'), field('Email Subject', 'Off-market deal'), field('Email Body', html)] };
    const originalFetch = globalThis.fetch, originalAuth = PodioService.authenticateApp;
    PodioService.authenticateApp = async () => ({ access_token: 'test' });
    globalThis.fetch = async (url, init) => String(url).startsWith('https://api.podio.com/item/app/')
        ? new Response(JSON.stringify({ items: [item] }), { status: 200, headers: { 'content-type': 'application/json' } })
        : originalFetch(url, init);
    try {
        // an older sync stored this email cut off at 180 characters with no links
        await PodioSyncService.syncCommunications(1);
        const { rows: [msg] } = await pool.query('SELECT thread_id, content, links FROM core.conversation_desk_messages WHERE id = $1', [`msg-podio-${itemId}`]);
        assert.ok(msg, 'the email was saved');
        assert.ok(msg.content.length > 400, 'the body is not cut at 180 characters');
        assert.deepEqual(msg.links, [{ text: 'View property photos', url: 'https://photos.test/p?utm=1&x=2' }]);
        await pool.query("UPDATE core.conversation_desk_messages SET content = 'Subject: Old — cut off', links = NULL WHERE id = $1", [`msg-podio-${itemId}`]);
        await PodioSyncService.syncCommunications(1);
        const detail = await asJson(await json('GET', `/lead-desk/threads/${msg.thread_id}`));
        const shown = detail.body.messages.find(m => m.id === `msg-podio-${itemId}`);
        assert.deepEqual(shown.links, [{ text: 'View property photos', url: 'https://photos.test/p?utm=1&x=2' }]);
        assert.ok(shown.content.length > 400);
    } finally {
        globalThis.fetch = originalFetch; PodioService.authenticateApp = originalAuth;
    }
});
