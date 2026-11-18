import crypto from 'crypto';
import { pool, withTransaction, audit } from '../store/pgClient.js';
import { db } from '../store/database.js';
import { CrownKeyService } from './crownkeyService.js';
import { HttpError } from './eventService.js';

const digits = v => String(v || '').replace(/\D/g, '');
const formatDuration = sec => (sec > 0 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : null);

export class SmrtPhoneService {
    static activeCall = null;

    static getActiveCall() { return this.activeCall; }

    static dismissActiveCall() {
        this.activeCall = null;
        return { ok: true, dismissed: true };
    }

    /**
     * Records a smrtPhone call or SMS webhook. The caller is matched to a stored person by phone number;
     * when nobody matches, the interaction is stored against the number alone. Nothing is guessed:
     * missing durations, bodies and names stay empty.
     */
    static async handleWebhook(payload = {}) {
        const eventType = String(payload.event || payload.type || (payload.call_id ? 'call.completed' : 'sms.received')).toLowerCase();
        const isCall = eventType.includes('call') || Boolean(payload.call_id || payload.call_duration);
        const direction = String(payload.direction || (eventType.includes('outbound') ? 'OUTBOUND' : 'INBOUND')).toUpperCase();
        if (!['INBOUND', 'OUTBOUND'].includes(direction)) throw new HttpError(400, 'direction must be INBOUND or OUTBOUND.');

        // The external party is the sender for inbound events and the recipient for outbound ones.
        const external = direction === 'INBOUND'
            ? (payload.from || payload.caller_id || payload.from_number)
            : (payload.to || payload.to_number);
        if (digits(external).length < 7) throw new HttpError(400, 'The webhook did not include the contact phone number.');

        const body = payload.body || payload.message || payload.text || null;
        if (!isCall && !body) throw new HttpError(400, 'SMS webhooks must include the message body.');
        const durationSec = Number(payload.call_duration || payload.duration) || 0;
        const duration = formatDuration(durationSec);
        const recordingUrl = payload.recording_url || payload.recording || null;
        const callStatus = String(payload.status || payload.disposition || 'UNKNOWN').toUpperCase();
        const note = body || (isCall ? `Call ${callStatus.toLowerCase()}${duration ? ` (${duration})` : ''}` : '');
        const now = new Date().toISOString();

        const tail = digits(external).slice(-10);
        const { rows: [match] } = await pool.query(
            `SELECT pe.person_id, pe.full_name, l.lead_id, l.property_id
             FROM core.people pe
             LEFT JOIN LATERAL (SELECT lead_id, property_id FROM core.leads WHERE person_id = pe.person_id ORDER BY created_at DESC LIMIT 1) l ON TRUE
             WHERE right(regexp_replace(coalesce(pe.primary_phone, ''), '\\D', '', 'g'), 10) = $1
                OR EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(pe.phones, '[]'::jsonb)) ph WHERE right(regexp_replace(coalesce(ph->>'raw', ''), '\\D', '', 'g'), 10) = $1)
             ORDER BY pe.updated_at DESC LIMIT 1`, [tail]);

        let property = null; let crownKey = null;
        if (match?.property_id) {
            const [p] = await CrownKeyService.loadProperties('WHERE p.property_id = $1', [match.property_id]);
            property = p || null;
            crownKey = p ? (await CrownKeyService.enrichProperty(p)).crownKeyBase : null;
        }
        const contactName = match?.full_name || payload.contact_name || payload.seller_name || String(external);
        const address = property?.address_line1 || payload.property_address || '';

        const interaction = await withTransaction(async client => {
            const { rows: [row] } = await client.query(
                `INSERT INTO core.interactions (lead_id, person_id, property_id, method, direction, actor_id, result, notes, occurred_at)
                 VALUES ($1,$2,$3,$4,$5,'smrtPhone',$6,$7,now()) RETURNING interaction_id`,
                [match?.lead_id || null, match?.person_id || null, match?.property_id || null, isCall ? 'CALL' : 'TEXT', direction,
                 isCall ? `${callStatus}${duration ? ` (${duration})` : ''}` : 'DELIVERED',
                 `smrtPhone ${isCall ? 'call' : 'SMS'} ${direction === 'INBOUND' ? 'from' : 'to'} ${external}. ${note}${recordingUrl ? ` Recording: ${recordingUrl}` : ''}`]);
            await audit(client, { actor: 'smrtPhone', action: isCall ? 'SMRTPHONE_CALL_LOGGED' : 'SMRTPHONE_SMS_LOGGED', entityType: 'INTERACTION', entityId: row.interaction_id, diff: { matchedPerson: Boolean(match), isCall } });
            await client.query(
                `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
                 VALUES (gen_random_uuid(), $1, $2, 'COMMUNICATIONS', 'HIGH', $3, $4, false, now())`,
                [`${isCall ? 'Call' : 'SMS'} ${direction === 'INBOUND' ? 'from' : 'to'} ${contactName}`, isCall ? `${note} · ${external}` : `"${String(body).slice(0, 80)}" · ${external}`,
                 isCall ? 'blue' : 'green', isCall ? 'phone' : 'mail']);
            return row;
        });

        // Communications workspace thread
        const phoneDigits = digits(external);
        let thread = db.data.crm.communications.find(t => t.phone && digits(t.phone) === phoneDigits);
        const message = { sender: direction === 'INBOUND' ? 'contact' : 'rep', name: direction === 'INBOUND' ? contactName : (payload.agent_name || 'smrtPhone'),
            text: note, timestamp: now, isCall, duration, recordingUrl, source: 'smrtPhone' };
        if (thread) {
            thread.messages = [...(thread.messages || []), message];
            thread.lastMessage = note; thread.time = now; thread.unread = direction === 'INBOUND';
        } else {
            thread = { id: crypto.randomUUID(), contact: contactName, phone: String(external), address, type: isCall ? 'Calls' : 'SMS', role: '', rep: '', repInitials: '',
                lastMessage: note, time: now, unread: direction === 'INBOUND', source: 'smrtPhone', podioItemId: payload.podio_item_id || payload.item_id || null, messages: [message] };
            db.data.crm.communications.unshift(thread);
        }
        db.persist();

        if (isCall) {
            this.activeCall = { callId: payload.call_id || interaction.interaction_id, interactionId: interaction.interaction_id, fromNumber: String(external), contactName,
                propertyAddress: address, propertyId: match?.property_id || null, duration, recordingUrl, status: callStatus, signal: payload.crown_key || crownKey, receivedAt: now };
        }
        return { ok: true, interactionId: interaction.interaction_id, eventType: isCall ? 'CALL' : 'SMS', contactName, matchedContact: Boolean(match), propertyAddress: address, phone: String(external), duration, recordingUrl, threadId: thread.id };
    }
}
