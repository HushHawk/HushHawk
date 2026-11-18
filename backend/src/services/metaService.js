import crypto from 'crypto';
import { pool, withTransaction, audit } from '../store/pgClient.js';

/**
 * Meta channels for the Lead Conversation Desk: Facebook Messenger, Instagram direct messages, WhatsApp Business and Facebook Lead Ads.
 * Everything here talks to Meta's official Graph API. Nothing is stored unless Meta delivered it (signature checked), and a reply is
 * reported as sent only when Meta accepted it.
 *
 * Environment (all optional; a channel without its settings reports NOT_CONFIGURED):
 *   META_APP_SECRET, META_VERIFY_TOKEN            webhook security (both required to receive anything)
 *   META_PAGE_ACCESS_TOKEN, META_PAGE_ID          Messenger, Instagram (through the linked Page) and Lead Ads
 *   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID   WhatsApp Business Cloud API
 */
const GRAPH = 'https://graph.facebook.com/v21.0';

export const META_PLATFORMS = {
    messenger: { name: 'Messenger', color: '#0084ff', sourceCode: 'FB' },
    facebook: { name: 'Facebook', color: '#1877f2', sourceCode: 'FB' },
    instagram: { name: 'Instagram', color: '#e1306c', sourceCode: 'IG' },
    whatsapp: { name: 'WhatsApp', color: '#25d366', sourceCode: 'WHATSAPP' }
};

const uuidFrom = text => {
    const h = crypto.createHash('sha1').update(text).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const digits = v => String(v || '').replace(/\D/g, '');

export class MetaService {
    static status() {
        const has = (...names) => names.every(n => Boolean(process.env[n]));
        const webhook = has('META_APP_SECRET', 'META_VERIFY_TOKEN');
        return {
            webhook: webhook ? 'READY' : 'NOT_CONFIGURED',
            messenger: webhook && has('META_PAGE_ACCESS_TOKEN') ? 'READY' : 'NOT_CONFIGURED',
            instagram: webhook && has('META_PAGE_ACCESS_TOKEN') ? 'READY' : 'NOT_CONFIGURED',
            leadAds: webhook && has('META_PAGE_ACCESS_TOKEN') ? 'READY' : 'NOT_CONFIGURED',
            whatsapp: webhook && has('WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID') ? 'READY' : 'NOT_CONFIGURED'
        };
    }

    /** GET handshake Meta performs when the callback URL is saved. */
    static verifyHandshake(query) {
        const token = process.env.META_VERIFY_TOKEN;
        if (!token) return { ok: false, status: 503, error: 'META_VERIFY_TOKEN is not configured.' };
        if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === token) return { ok: true, challenge: String(query['hub.challenge'] ?? '') };
        return { ok: false, status: 403, error: 'Verification failed.' };
    }

    /** Every POST is signed with the app secret over the raw body (X-Hub-Signature-256). Fails closed. */
    static verifySignature(rawBody, header) {
        const secret = process.env.META_APP_SECRET;
        if (!secret) return { ok: false, status: 503, error: 'META_APP_SECRET is not configured.' };
        if (!rawBody || !header) return { ok: false, status: 401, error: 'Missing signature.' };
        const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
        const a = Buffer.from(expected); const b = Buffer.from(String(header));
        return a.length === b.length && crypto.timingSafeEqual(a, b) ? { ok: true } : { ok: false, status: 401, error: 'Invalid signature.' };
    }

    static async ensurePlatforms() {
        for (const [id, p] of Object.entries(META_PLATFORMS)) {
            await pool.query('INSERT INTO core.conversation_desk_platforms (platform_id, name, color) VALUES ($1,$2,$3) ON CONFLICT (platform_id) DO NOTHING', [id, p.name, p.color]);
        }
    }

    /** Dispatches a verified webhook body. Returns counts of what was stored. */
    static async handleWebhook(body) {
        const result = { messages: 0, leads: 0, ignored: 0 };
        await this.ensurePlatforms();
        for (const entry of body?.entry || []) {
            if (body.object === 'page' || body.object === 'instagram') {
                const platform = body.object === 'instagram' ? 'instagram' : 'messenger';
                for (const ev of entry.messaging || []) {
                    const m = ev.message;
                    if (!m || m.is_echo || !ev.sender?.id) { result.ignored++; continue; }
                    const text = m.text || (m.attachments?.length ? `[${m.attachments.map(a => a.type).join(', ')} attachment]` : '');
                    if (!text) { result.ignored++; continue; }
                    const stored = await this.storeInbound({ platform, externalId: ev.sender.id, messageId: m.mid, text, at: ev.timestamp ? new Date(ev.timestamp) : new Date() });
                    stored ? result.messages++ : result.ignored++;
                }
                for (const ch of entry.changes || []) {
                    if (ch.field === 'leadgen' && ch.value?.leadgen_id) {
                        (await this.storeLeadAd(ch.value)) ? result.leads++ : result.ignored++;
                    }
                }
            } else if (body.object === 'whatsapp_business_account') {
                for (const ch of entry.changes || []) {
                    const names = new Map((ch.value?.contacts || []).map(c => [c.wa_id, c.profile?.name]));
                    for (const m of ch.value?.messages || []) {
                        const text = m.text?.body || (m.type && m.type !== 'text' ? `[${m.type} message]` : '');
                        if (!m.from || !text) { result.ignored++; continue; }
                        const stored = await this.storeInbound({ platform: 'whatsapp', externalId: m.from, messageId: m.id, text, at: new Date(Number(m.timestamp) * 1000), name: names.get(m.from), phone: m.from });
                        stored ? result.messages++ : result.ignored++;
                    }
                }
            } else {
                result.ignored++;
            }
        }
        return result;
    }

    /** Finds the lead for a phone or email, or creates one with the platform as its permanent first source. */
    static async ensureLead(client, { sourceCode, sourceDetail, name, phone, email, key, metadata = {} }) {
        const cleanPhone = digits(phone);
        if (cleanPhone.length >= 10 || email) {
            const { rows: [found] } = await client.query(
                `SELECT l.lead_id FROM core.leads l JOIN core.people p USING (person_id)
                 WHERE (right(regexp_replace(coalesce(p.primary_phone,''), '\\D', '', 'g'), 10) = right($1, 10) AND length($1) >= 10) OR ($2::text IS NOT NULL AND lower(p.primary_email) = lower($2))
                 ORDER BY l.created_at LIMIT 1`, [cleanPhone, email || null]);
            if (found) return found.lead_id;
        }
        const personId = uuidFrom(`meta-person-${key}`); const leadId = uuidFrom(`meta-lead-${key}`);
        const label = name || 'Unknown sender';
        const parts = label.split(/\s+/);
        await client.query(
            `INSERT INTO core.people (person_id, full_name, first_name, last_name, primary_phone, primary_email)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (person_id) DO NOTHING`,
            [personId, label, parts[0], parts.slice(1).join(' ') || null, phone ? (phone.startsWith('+') ? phone : `+${cleanPhone}`) : null, email || null]);
        await client.query(
            `INSERT INTO core.leads (lead_id, person_id, first_source_code, source_detail, status, metadata)
             VALUES ($1,$2,$3,$4,'NEW',$5::jsonb) ON CONFLICT (lead_id) DO NOTHING`, [leadId, personId, sourceCode, sourceDetail, JSON.stringify(metadata)]);
        return leadId;
    }

    static async fetchName(platform, externalId) {
        const token = process.env.META_PAGE_ACCESS_TOKEN;
        if (!token || platform === 'whatsapp') return null;
        try {
            const res = await fetch(`${GRAPH}/${externalId}?fields=${platform === 'instagram' ? 'name,username' : 'name'}&access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) return null;
            const j = await res.json();
            return j.name || j.username || null;
        } catch { return null; }
    }

    static async storeInbound({ platform, externalId, messageId, text, at, name = null, phone = null }) {
        const threadId = `${platform}:${externalId}`;
        const msgId = `meta-${messageId || crypto.randomUUID()}`;
        const { rows: [seen] } = await pool.query('SELECT 1 FROM core.conversation_desk_messages WHERE id = $1', [msgId]);
        if (seen) return false;
        const { rows: [thread] } = await pool.query('SELECT id, contact_name FROM core.conversation_desk_threads WHERE id = $1', [threadId]);
        const contactName = thread?.contact_name || name || await this.fetchName(platform, externalId) || `${META_PLATFORMS[platform].name} contact`;
        await withTransaction(async client => {
            const leadId = await this.ensureLead(client, {
                sourceCode: META_PLATFORMS[platform].sourceCode, sourceDetail: `${META_PLATFORMS[platform].name} message`, name: name || (thread ? null : contactName.endsWith(' contact') ? null : contactName),
                phone, key: threadId, metadata: { channel: platform, externalId }
            });
            await client.query(
                `INSERT INTO core.conversation_desk_threads (id, platform_id, contact_name, contact_phone, property_address, property_city, property_state, property_zip, lead_score, priority, status, unread_count, last_message_preview, last_message_at)
                 VALUES ($1,$2,$3,$4,'',NULL,NULL,NULL,NULL,'Normal','New Lead',1,$5,$6)
                 ON CONFLICT (id) DO UPDATE SET unread_count = core.conversation_desk_threads.unread_count + 1, last_message_preview = EXCLUDED.last_message_preview,
                    last_message_at = EXCLUDED.last_message_at, updated_at = now()`,
                [threadId, platform, contactName, phone ? `+${digits(phone)}` : null, text.slice(0, 200), at]);
            await client.query(
                `INSERT INTO core.conversation_desk_messages (id, thread_id, sender_type, sender_name, content, sent_at) VALUES ($1,$2,'lead',$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
                [msgId, threadId, contactName, text, at]);
            await audit(client, { actor: 'Meta webhook', action: 'META_MESSAGE_RECEIVED', entityType: 'LEAD', entityId: leadId, diff: { platform, thread: threadId } });
        });
        return true;
    }

    /** A Facebook Lead Ad submission: Meta only sends an id, the answers are fetched with the page token. */
    static async storeLeadAd(value) {
        const token = process.env.META_PAGE_ACCESS_TOKEN;
        if (!token) return false;
        const res = await fetch(`${GRAPH}/${value.leadgen_id}?access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) throw new Error(`Meta lead fetch failed (HTTP ${res.status}): ${(await res.text()).slice(0, 200)}`);
        const lead = await res.json();
        const field = n => (lead.field_data || []).find(f => f.name === n)?.values?.[0] || null;
        const name = field('full_name') || [field('first_name'), field('last_name')].filter(Boolean).join(' ') || null;
        const phone = field('phone_number'); const email = field('email');
        if (!name && !phone && !email) return false;
        await withTransaction(async client => {
            const leadId = await this.ensureLead(client, {
                sourceCode: 'FB_AD', sourceDetail: `Facebook Lead Ad${value.form_id ? ` (form ${value.form_id})` : ''}`, name, phone, email, key: `leadad-${value.leadgen_id}`,
                metadata: { leadgenId: value.leadgen_id, formId: value.form_id || null, adId: value.ad_id || null, address: field('street_address'), city: field('city'), zip: field('zip_code') }
            });
            await audit(client, { actor: 'Meta webhook', action: 'META_LEAD_AD_RECEIVED', entityType: 'LEAD', entityId: leadId, diff: { leadgenId: value.leadgen_id } });
        });
        return true;
    }

    /** Sends a reply on the thread's own channel. Success means Meta accepted it, nothing less. */
    static async sendToThread(threadId, text) {
        const [platform, ...rest] = String(threadId).split(':');
        const externalId = rest.join(':');
        if (!META_PLATFORMS[platform] || !externalId) return { success: false, provider: 'meta', status: 'NOT_A_META_THREAD', error: 'This conversation is not on a Meta channel.' };
        let url; let body;
        if (platform === 'whatsapp') {
            const token = process.env.WHATSAPP_ACCESS_TOKEN; const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
            if (!token || !phoneId) return { success: false, provider: 'meta', status: 'NOT_CONFIGURED', error: 'WhatsApp is not configured (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID).' };
            url = `${GRAPH}/${phoneId}/messages?access_token=${encodeURIComponent(token)}`;
            body = { messaging_product: 'whatsapp', to: externalId, type: 'text', text: { body: text } };
        } else {
            const token = process.env.META_PAGE_ACCESS_TOKEN;
            if (!token) return { success: false, provider: 'meta', status: 'NOT_CONFIGURED', error: 'The Meta page token is not configured (META_PAGE_ACCESS_TOKEN).' };
            url = `${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`;
            body = { recipient: { id: externalId }, messaging_type: 'RESPONSE', message: { text } };
        }
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) return { success: false, provider: 'meta', status: 'META_REFUSED', error: json.error?.message || `Meta refused the message (HTTP ${res.status}).` };
            return { success: true, liveCarrier: true, provider: 'meta', status: 'SENT', messageId: json.message_id || json.messages?.[0]?.id || null };
        } catch (error) {
            return { success: false, provider: 'meta', status: 'META_UNREACHABLE', error: `Could not reach Meta: ${error.message}` };
        }
    }
}
