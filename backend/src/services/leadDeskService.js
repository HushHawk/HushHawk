import { DeliveryService } from './deliveryService.js';
import { MetaService, META_PLATFORMS } from './metaService.js';
/**
 * @file backend/src/services/leadDeskService.js
 * Canonical PostgreSQL Service for Lead Conversation Desk (v2)
 * Handles real-time messaging, multi-platform sync, AI reply suggestions, and property context.
 */

import crypto from 'crypto';
import { pool } from '../store/pgClient.js';
import { db } from '../store/database.js';
import { CarrierDispatchService } from './carrierDispatchService.js';

const PODIO_CHANNELS = new Set(['email', 'podio', 'smrtphone']);
const META_STATUS_KEY = { messenger: 'messenger', instagram: 'instagram', whatsapp: 'whatsapp', facebook: 'leadAds' };

export class LeadDeskService {
    /**
     * Whether messages can really arrive on a channel right now, so an empty tab is never mistaken for a quiet inbox.
     *  CONNECTED     messages flow in (Podio Feeds for email, calls and texts; Meta for its channels once configured)
     *  NOT_CONNECTED the channel is supported but its credentials are not set yet
     *  NOT_AVAILABLE no messaging connection exists for this platform
     */
    static connectionFor(platformId) {
        if (PODIO_CHANNELS.has(platformId)) {
            const ready = ['PODIO_CLIENT_ID', 'PODIO_APP_TOKEN', 'PODIO_FEEDS_APP_ID'].every(n => Boolean(process.env[n]));
            return ready
                ? { status: 'CONNECTED', note: 'Messages arrive from Podio Feeds.' }
                : { status: 'NOT_CONNECTED', note: 'Podio is not connected on this server.' };
        }
        if (META_STATUS_KEY[platformId]) {
            const ready = MetaService.status()[META_STATUS_KEY[platformId]] === 'READY';
            const note = platformId === 'facebook' ? 'Facebook Lead Ad forms arrive here once the Meta app is connected.' : `${META_PLATFORMS[platformId].name} messages arrive here once the Meta app is connected.`;
            return ready ? { status: 'CONNECTED', note } : { status: 'NOT_CONNECTED', note: `Not connected yet. ${note}` };
        }
        if (platformId === 'sms') return { status: 'NOT_AVAILABLE', note: 'Texts appear under Podio and smrtPhone.' };
        return { status: 'NOT_AVAILABLE', note: 'This platform has no messaging connection. Its lead emails arrive under Email through Podio.' };
    }

    /**
     * Get all 16 platforms with live lead counts and unread tallies dynamically computed from PostgreSQL
     */
    static async getPlatforms() {
        try {
            const res = await pool.query(`
                SELECT 
                    p.platform_id, 
                    p.name, 
                    p.color, 
                    COALESCE(COUNT(t.id), 0)::int as lead_count,
                    COALESCE(SUM(t.unread_count), 0)::int as unread_count,
                    p.updated_at
                FROM core.conversation_desk_platforms p
                LEFT JOIN core.conversation_desk_threads t ON p.platform_id = t.platform_id
                GROUP BY p.platform_id, p.name, p.color, p.updated_at
                ORDER BY COUNT(t.id) DESC, p.name ASC;
            `);
            return res.rows.map(row => ({ ...row, connection: this.connectionFor(row.platform_id) }));
        } catch (err) {
            console.warn('[LeadDeskService] getPlatforms DB fallback:', err.message);
            return [];
        }
    }

    /**
     * Get threads for a specific platform with optional priority filtering
     */
    static async getThreads({ platformId = 'facebook', priority = null }) {
        try {
            let sql = `
                SELECT t.*, p.assessed_value, p.legal_description
                FROM core.conversation_desk_threads t
                LEFT JOIN core.properties p ON t.property_id = p.property_id
                WHERE t.platform_id = $1
            `;
            const params = [platformId];

            if (priority && priority !== 'All') {
                sql += ` AND t.priority = $2`;
                params.push(priority);
            }

            sql += ` ORDER BY t.last_message_at DESC`;

            const res = await pool.query(sql, params);
            return res.rows.map(row => ({
                id: row.id,
                platformId: row.platform_id,
                contactName: row.contact_name,
                contactPhone: row.contact_phone,
                contactEmail: row.contact_email,
                avatarUrl: row.avatar_url,
                propertyId: row.property_id,
                propertyAddress: row.property_address,
                propertyCity: row.property_city,
                propertyState: row.property_state,
                propertyZip: row.property_zip,
                propertySpecs: row.property_specs,
                propertyImage: row.property_image,
                leadScore: row.lead_score,
                priority: row.priority,
                status: row.status,
                unreadCount: row.unread_count,
                aiSuggestion: row.ai_suggestion,
                lastMessagePreview: row.last_message_preview,
                lastMessageAt: row.last_message_at
            }));
        } catch (err) {
            console.warn('[LeadDeskService] getThreads DB fallback:', err.message);
            return [];
        }
    }

    /**
     * Get complete thread details including full message history
     */
    /** Facts about the linked property that are really on record (county roll), joined with dots. Empty when the thread has no linked property. */
    static propertyFacts(row) {
        if (!row.property_id) return '';
        const meta = row.linked_meta || {};
        const parts = [];
        if (row.linked_type) parts.push(row.linked_type);
        if (Number(meta.living_area_sqft) > 0) parts.push(`${Number(meta.living_area_sqft).toLocaleString('en-US')} sqft`);
        if (Number(meta.year_built) > 0) parts.push(`Built ${meta.year_built}`);
        if (Number(row.assessed_value) > 0) parts.push(`County value $${Math.round(Number(row.assessed_value)).toLocaleString('en-US')}`);
        return parts.join(' • ');
    }

    static async getThreadDetail(threadId) {
        try {
            const threadRes = await pool.query(`
                SELECT t.*, p.assessed_value, p.legal_description, p.property_type AS linked_type, p.metadata AS linked_meta
                FROM core.conversation_desk_threads t
                LEFT JOIN core.properties p ON t.property_id = p.property_id
                WHERE t.id = $1
            `, [threadId]);

            if (threadRes.rows.length === 0) {
                throw new Error(`Thread ${threadId} not found`);
            }

            const thread = threadRes.rows[0];

            // Fetch messages in chronological order
            const msgRes = await pool.query(`
                SELECT id, sender_type, sender_name, content, links, attachments, sent_at
                FROM core.conversation_desk_messages
                WHERE thread_id = $1
                ORDER BY sent_at ASC
            `, [threadId]);

            // Mark thread as read
            if (thread.unread_count > 0) {
                await pool.query(`
                    UPDATE core.conversation_desk_threads
                    SET unread_count = 0, updated_at = now()
                    WHERE id = $1
                `, [threadId]);

                await pool.query(`
                    UPDATE core.conversation_desk_platforms
                    SET unread_count = GREATEST(0, unread_count - $1), updated_at = now()
                    WHERE platform_id = $2
                `, [thread.unread_count, thread.platform_id]);
            }

            return {
                id: thread.id,
                platformId: thread.platform_id,
                contactName: thread.contact_name,
                contactPhone: thread.contact_phone,
                contactEmail: thread.contact_email,
                avatarUrl: thread.avatar_url,
                propertyId: thread.property_id,
                propertyAddress: thread.property_address,
                propertyCity: thread.property_city,
                propertyState: thread.property_state,
                propertyZip: thread.property_zip,
                propertySpecs: thread.property_specs,
                propertyFacts: this.propertyFacts(thread),
                propertyImage: thread.property_image,
                leadScore: thread.lead_score,
                priority: thread.priority,
                status: thread.status,
                unreadCount: 0,
                aiSuggestion: thread.ai_suggestion,
                lastMessagePreview: thread.last_message_preview,
                lastMessageAt: thread.last_message_at,
                messages: msgRes.rows.map(m => ({
                    id: m.id,
                    senderType: m.sender_type,
                    senderName: m.sender_name,
                    content: m.content,
                    links: Array.isArray(m.links) ? m.links : [],
                    attachments: Array.isArray(m.attachments) ? m.attachments : [],
                    sentAt: m.sent_at,
                    time: new Date(m.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                }))
            };
        } catch (err) {
            console.warn('[LeadDeskService] getThreadDetail error:', err.message);
            throw err;
        }
    }

    /**
     * Send a message to a thread (outbound rep reply)
     */
    static async sendMessage({ threadId, content, senderName, senderType = 'rep' }) {
        if (!content || !content.trim()) throw new Error('Message content is required');
        if (!senderName) throw new Error('A sender name is required');

        const messageId = 'msg-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex');
        try {
            const msgRes = await pool.query(`
                INSERT INTO core.conversation_desk_messages (
                    id, thread_id, sender_type, sender_name, content, sent_at
                ) VALUES ($1, $2, $3, $4, $5, now())
                RETURNING *
            `, [messageId, threadId, senderType, senderName, content.trim()]);

            const newMsg = msgRes.rows[0];

            // Update thread with latest message preview
            await pool.query(`
                UPDATE core.conversation_desk_threads
                SET last_message_preview = $1, last_message_at = now(), updated_at = now()
                WHERE id = $2
            `, [content.trim().slice(0, 140), threadId]);

            // Real Carrier Live Transmission (Twilio SMS or SendGrid Email)
            try {
                const threadDetails = await pool.query(
                    `SELECT contact_name, contact_phone, contact_email, property_id, property_address, platform_id 
                     FROM core.conversation_desk_threads WHERE id = $1`,
                    [threadId]
                );
                if (threadDetails.rows.length) {
                    const td = threadDetails.rows[0];
                    const trimmed = content.trim();
                    let carrierResult = null;
                    if (META_PLATFORMS[td.platform_id]) {
                        carrierResult = await MetaService.sendToThread(threadId, trimmed);
                    } else if (td.platform_id === 'email' && td.contact_email) {
                        carrierResult = await DeliveryService.email({
                            to: td.contact_email,
                            subject: `HushHawk Lead Outreach: Re ${td.property_address || 'Property'}`,
                            text: trimmed, leadName: td.contact_name, propertyAddress: td.property_address
                        });
                    } else if (td.contact_phone) {
                        carrierResult = await DeliveryService.text({
                            to: td.contact_phone,
                            message: trimmed, leadName: td.contact_name, propertyAddress: td.property_address
                        });
                    }

                    const method = td.platform_id === 'whatsapp' ? 'WHATSAPP' : META_PLATFORMS[td.platform_id] ? 'DM' : td.platform_id === 'email' ? 'EMAIL' : 'TEXT';
                    const delivered = Boolean(carrierResult?.success);
                    const carrierNote = delivered
                        ? `[${carrierResult.provider.toUpperCase()} ${carrierResult.messageSid || carrierResult.messageId || carrierResult.itemId || 'OK'}]`
                        : `[NOT DELIVERED: ${carrierResult?.status || 'NO_ADDRESS'}]`;

                    await pool.query(
                        `INSERT INTO core.interactions (interaction_id, property_id, method, direction, actor_id, result, notes, occurred_at)
                         VALUES ($1, $2, $3, 'OUTBOUND', $4, $6, $5, now())`,
                        [
                            crypto.randomUUID(),
                            td.property_id || null,
                            method,
                            senderName,
                            `Outbound message on ${td.platform_id} to ${td.contact_name}: "${trimmed.slice(0, 100)}" ${carrierNote}`,
                            delivered ? 'SENT' : 'NOT_DELIVERED'
                        ]
                    );
                }
            } catch (carrierErr) {
                console.warn('[LeadDesk Carrier Dispatch Warn]:', carrierErr.message);
            }

            // Sync with audit log
            db.logAudit({
                actor: senderName,
                action: 'LEAD_MESSAGE_SENT',
                entityType: 'CONVERSATION',
                entityId: threadId,
                redactedDiff: { length: content.length, threadId }
            });

            return {
                id: newMsg.id,
                senderType: newMsg.sender_type,
                senderName: newMsg.sender_name,
                content: newMsg.content,
                sentAt: newMsg.sent_at,
                time: new Date(newMsg.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            };
        } catch (err) {
            console.error('[LeadDeskService] sendMessage DB error:', err.message);
            throw err;
        }
    }

    /**
     * Assign lead thread to team member in PostgreSQL
     */
    static async assignThread({ threadId, assignedTo }) {
        if (!assignedTo) throw new Error('A team member is required');
        const res = await pool.query(`
            UPDATE core.conversation_desk_threads
            SET status = $1, updated_at = now()
            WHERE id = $2
            RETURNING *
        `, [`Assigned to ${assignedTo}`, threadId]);

        if (res.rows.length === 0) throw new Error(`Thread ${threadId} not found`);

        db.logAudit({
            actor: assignedTo,
            action: 'LEAD_ASSIGNED',
            entityType: 'CONVERSATION',
            entityId: threadId,
            redactedDiff: { assignedTo }
        });

        return res.rows[0];
    }

    /**
     * Schedule follow-up in PostgreSQL core.outreach_calls
     */
    static async scheduleFollowUp({ threadId, dueDate = 'Tomorrow', notes = 'Follow-up scheduled from Conversation Desk' }) {
        const threadRes = await pool.query(`SELECT * FROM core.conversation_desk_threads WHERE id = $1`, [threadId]);
        if (threadRes.rows.length === 0) throw new Error(`Thread ${threadId} not found`);
        const thread = threadRes.rows[0];

        if (!thread.contact_phone) throw new Error('This conversation has no phone number to schedule a call with.');
        const callId = 'call-' + Date.now() + '-' + crypto.randomBytes(2).toString('hex');
        await pool.query(`
            INSERT INTO core.outreach_calls (id, contact_name, phone, property_address, property_id, priority, cadence_stage, notes, status, created_at)
            VALUES ($1, $2, $3, $4, $5, 'High', $6, $7, 'PENDING', now())
            ON CONFLICT (id) DO UPDATE SET notes = EXCLUDED.notes, updated_at = now()
        `, [
            callId,
            thread.contact_name,
            thread.contact_phone,
            thread.property_address || null,
            thread.property_id || null,
            'Desk Cadence (' + dueDate + ')',
            notes
        ]);

        return {
            callId,
            contactName: thread.contact_name,
            dueDate,
            notes,
            status: 'PENDING'
        };
    }

    /**
     * Realtime Sync Check: returns newly arrived messages and updated platform counts
     */
    static async sync({ since, platformId = 'facebook' }) {
        const sinceDate = since ? new Date(since) : new Date(Date.now() - 30000);
        try {
            const newMessages = await pool.query(`
                SELECT m.*, t.contact_name, t.property_address
                FROM core.conversation_desk_messages m
                JOIN core.conversation_desk_threads t ON m.thread_id = t.id
                WHERE m.sent_at > $1 AND t.platform_id = $2
                ORDER BY m.sent_at ASC
            `, [sinceDate, platformId]);

            const platforms = await this.getPlatforms();

            return {
                serverTime: new Date().toISOString(),
                newMessagesCount: newMessages.rows.length,
                messages: newMessages.rows.map(m => ({
                    id: m.id,
                    threadId: m.thread_id,
                    senderType: m.sender_type,
                    senderName: m.sender_name,
                    content: m.content,
                    links: Array.isArray(m.links) ? m.links : [],
                    attachments: Array.isArray(m.attachments) ? m.attachments : [],
                    sentAt: m.sent_at,
                    time: new Date(m.sent_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                })),
                platforms
            };
        } catch (err) {
            console.warn('[LeadDeskService] sync fallback:', err.message);
            return {
                serverTime: new Date().toISOString(),
                newMessagesCount: 0,
                messages: [],
                platforms: await this.getPlatforms()
            };
        }
    }
}

