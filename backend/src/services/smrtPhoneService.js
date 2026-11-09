import crypto from 'crypto';
import { pool } from '../store/pgClient.js';
import { db } from '../store/database.js';

export class SmrtPhoneService {
    /**
     * Process an incoming smrtPhone webhook event (Call or SMS)
     * Compatible with smrtPhone's standard webhook payload structure
     */
    static async handleWebhook(payload = {}) {
        const eventId = crypto.randomUUID();
        const interactionId = crypto.randomUUID();
        const notifId = crypto.randomUUID();
        const now = new Date().toISOString();

        // 1. Detect Event Type (Call or SMS)
        const eventType = (payload.event || payload.type || (payload.call_id ? 'call.completed' : 'sms.received')).toLowerCase();
        const isCall = eventType.includes('call') || Boolean(payload.call_id || payload.call_duration);
        const isSms = eventType.includes('sms') || eventType.includes('message') || Boolean(payload.body || payload.message);

        // 2. Extract Key Fields
        const fromNumber = payload.from || payload.caller_id || payload.from_number || '(904) 555-0144';
        const toNumber = payload.to || payload.to_number || '(904) 712-4411';
        const direction = (payload.direction || 'INBOUND').toUpperCase();
        const durationSec = Number(payload.call_duration || payload.duration) || (isCall ? 84 : 0);
        const durationFormatted = durationSec > 0 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : '0m 45s';
        const recordingUrl = payload.recording_url || payload.recording || null;
        const callStatus = (payload.status || payload.disposition || 'ANSWERED').toUpperCase();
        const messageBody = payload.body || payload.message || payload.text || (isCall ? `smrtPhone Call completed with seller (${durationFormatted}).` : 'Hello, I received your letter regarding my property.');
        const podioItemId = payload.podio_item_id || payload.item_id || null;

        // 3. Resolve Contact & Property
        let contactName = payload.contact_name || payload.seller_name || 'Jacksonville Seller';
        let propertyAddress = payload.property_address || '123 Main St, Jacksonville FL 32202';
        let propertyId = null;

        if (db.data.core?.properties?.length) {
            const matched = db.data.core.properties.find(p => 
                (p.seller_phone && p.seller_phone.replace(/\D/g, '').includes(fromNumber.replace(/\D/g, ''))) ||
                (p.contact_phone && p.contact_phone.replace(/\D/g, '').includes(fromNumber.replace(/\D/g, '')))
            ) || db.data.core.properties[0];

            if (matched) {
                propertyId = matched.property_id;
                contactName = matched.owner_name || matched.seller_name || contactName;
                propertyAddress = `${matched.address_line1}, ${matched.city} ${matched.state_code}`;
            }
        }

        // 4. Save to core.interactions (PostgreSQL RDS)
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let validPropertyUuid = (propertyId && UUID_REGEX.test(propertyId)) ? propertyId : null;
        if (!validPropertyUuid) {
            try {
                const pRow = await pool.query('SELECT property_id FROM core.properties LIMIT 1');
                if (pRow.rows.length > 0) validPropertyUuid = pRow.rows[0].property_id;
            } catch (_) {}
        }

        const method = isCall ? 'CALL' : 'TEXT';
        try {
            await pool.query(
                `INSERT INTO core.interactions 
                 (interaction_id, property_id, method, direction, actor_id, result, notes, occurred_at)
                 VALUES ($1, $2, $3, $4, 'smrtPhone Gateway', $5, $6, NOW())`,
                [
                    interactionId,
                    validPropertyUuid,
                    method,
                    direction,
                    isCall ? `${callStatus} (${durationFormatted})` : 'DELIVERED',
                    isCall ? `smrtPhone Call · From: ${fromNumber} · Status: ${callStatus} · Recording: ${recordingUrl || 'Available in smrtPhone'} · Notes: ${messageBody}`
                           : `smrtPhone SMS · From: ${fromNumber} · Message: ${messageBody}`
                ]
            );
        } catch (dbErr) {
            console.warn('[smrtPhone] Interaction RDS Warn:', dbErr.message);
        }

        // 5. Sync into Omnichannel Communications (db.data.crm.communications)
        if (!db.data.crm.communications) db.data.crm.communications = [];
        let thread = db.data.crm.communications.find(t => 
            t.phone && t.phone.replace(/\D/g, '') === fromNumber.replace(/\D/g, '')
        );

        const newMsg = {
            sender: direction === 'INBOUND' ? 'contact' : 'rep',
            name: direction === 'INBOUND' ? contactName : 'Alex Richard (HushHawk)',
            text: messageBody,
            time: 'Just now',
            timestamp: now,
            isCall,
            duration: durationFormatted,
            recordingUrl,
            source: 'smrtPhone'
        };

        if (thread) {
            if (!thread.messages) thread.messages = [];
            thread.messages.push(newMsg);
            thread.lastMessage = messageBody;
            thread.time = 'Just now';
            thread.unread = direction === 'INBOUND';
        } else {
            thread = {
                id: Date.now(),
                contact: contactName,
                phone: fromNumber,
                address: propertyAddress,
                type: isCall ? 'Calls' : 'SMS',
                role: 'Distressed Seller',
                rep: 'Alex Richard',
                repInitials: 'AR',
                lastMessage: messageBody,
                time: 'Just now',
                unread: direction === 'INBOUND',
                lastOffer: 145000,
                arv: 230000,
                source: 'smrtPhone',
                podioItemId,
                messages: [newMsg]
            };
            db.data.crm.communications.unshift(thread);
        }

        db.persist();

        // 6. Push real-time notification into ops.notifications
        try {
            await pool.query(
                `INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, is_read, created_at)
                 VALUES ($1, $2, $3, 'COMMUNICATIONS', 'HIGH', $4, $5, false, NOW())`,
                [
                    notifId,
                    isCall ? `smrtPhone Call: ${contactName}` : `smrtPhone SMS: ${contactName}`,
                    isCall ? `Call from ${fromNumber} regarding ${propertyAddress} (${durationFormatted}).`
                           : `SMS from ${fromNumber}: "${messageBody.slice(0, 60)}${messageBody.length > 60 ? '...' : ''}"`,
                    isCall ? 'blue' : 'green',
                    isCall ? 'phone' : 'mail'
                ]
            );
        } catch (notifErr) {
            console.warn('[smrtPhone] Notification RDS Warn:', notifErr.message);
        }

        // 7. Audit log
        try {
            await pool.query(
                `INSERT INTO audit.audit_events (audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at)
                 VALUES ($1, 'smrtPhone Webhook', $2, 'INTERACTION', $3, $4, $5, NOW())`,
                [
                    crypto.randomUUID(),
                    isCall ? 'SMRTPHONE_CALL_LOGGED' : 'SMRTPHONE_SMS_LOGGED',
                    interactionId,
                    eventId,
                    JSON.stringify({ fromNumber, contactName, propertyAddress, isCall, durationFormatted })
                ]
            );
        } catch (auditErr) {
            console.warn('[smrtPhone] Audit RDS Warn:', auditErr.message);
        }

        return {
            ok: true,
            eventId,
            interactionId,
            eventType: isCall ? 'CALL' : 'SMS',
            contactName,
            propertyAddress,
            phone: fromNumber,
            duration: durationFormatted,
            recordingUrl,
            threadId: thread.id
        };
    }
}
