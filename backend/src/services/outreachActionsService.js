import { DeliveryService } from './deliveryService.js';
/**
 * @file backend/src/services/outreachActionsService.js
 * Canonical PostgreSQL Service for Executive Outreach Action Boxes:
 * 1. SEND MAILERS (34 selected properties • Foreclosure / Default / Cash)
 * 2. CALL (12 seller follow-ups • Priority: Overdue / High)
 * 3. TEXT (18 opted-in contacts • Send follow-ups & replies)
 * 4. EMAIL (9 title/buyer follow-ups • Updates, docs & next steps)
 */

import crypto from 'crypto';
import { pool } from '../store/pgClient.js';
import { db } from '../store/database.js';
import { CarrierDispatchService } from './carrierDispatchService.js';
import { PodioSyncService } from './podioSyncService.js';

export class OutreachActionsService {
    /**
     * Get live summary counts and preview for all 4 action cards
     */
    static async getSummary() {
        try {
            const [mailersRes, callsRes, textsRes, emailsRes] = await Promise.all([
                pool.query(`
                    SELECT 
                        COUNT(*)::int as total,
                        COUNT(*) FILTER (WHERE distress_category = 'Foreclosure')::int as foreclosure_count,
                        COUNT(*) FILTER (WHERE distress_category = 'Default')::int as default_count,
                        COUNT(*) FILTER (WHERE distress_category = 'Cash')::int as cash_count
                    FROM core.outreach_mailers
                    WHERE status = 'READY'
                `),
                pool.query(`
                    SELECT 
                        COUNT(*)::int as total,
                        COUNT(*) FILTER (WHERE priority = 'Overdue')::int as overdue_count,
                        COUNT(*) FILTER (WHERE priority = 'High')::int as high_count
                    FROM core.outreach_calls
                    WHERE status = 'PENDING'
                `),
                pool.query(`
                    SELECT COUNT(*)::int as total
                    FROM core.outreach_texts
                    WHERE status = 'QUEUED'
                `),
                pool.query(`
                    SELECT COUNT(*)::int as total
                    FROM core.outreach_emails
                    WHERE status = 'QUEUED'
                `)
            ]);

            const mailersTotal = mailersRes.rows[0]?.total ?? 0;
            const callsTotal = callsRes.rows[0]?.total ?? 0;
            const textsTotal = textsRes.rows[0]?.total ?? 0;
            const emailsTotal = emailsRes.rows[0]?.total ?? 0;

            if (mailersTotal === 0 && callsTotal === 0 && textsTotal === 0 && emailsTotal === 0) {
                const [m2, c2, t2, e2] = await Promise.all([
                    pool.query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE distress_category = 'Foreclosure')::int as foreclosure_count, COUNT(*) FILTER (WHERE distress_category = 'Default')::int as default_count, COUNT(*) FILTER (WHERE distress_category = 'Cash')::int as cash_count FROM core.outreach_mailers WHERE status = 'READY'`),
                    pool.query(`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE priority = 'Overdue')::int as overdue_count, COUNT(*) FILTER (WHERE priority = 'High')::int as high_count FROM core.outreach_calls WHERE status = 'PENDING'`),
                    pool.query(`SELECT COUNT(*)::int as total FROM core.outreach_texts WHERE status = 'QUEUED'`),
                    pool.query(`SELECT COUNT(*)::int as total FROM core.outreach_emails WHERE status = 'QUEUED'`)
                ]);
                return {
                    mailers: {
                        title: 'SEND MAILERS',
                        count: m2.rows[0]?.total ?? 0,
                        subtitle: `${m2.rows[0]?.total ?? 0} selected properties`,
                        tags: ['Foreclosure', 'Default', 'Cash'],
                        distressBreakdown: { foreclosure: m2.rows[0]?.foreclosure_count || 0, default: m2.rows[0]?.default_count || 0, cash: m2.rows[0]?.cash_count || 0 },
                        actionLabel: 'Create Batch ↗'
                    },
                    calls: {
                        title: 'CALL',
                        count: c2.rows[0]?.total ?? 0,
                        subtitle: `${c2.rows[0]?.total ?? 0} seller follow-ups`,
                        description: 'Priority ordered (Overdue → High)',
                        overdueCount: c2.rows[0]?.overdue_count || 0,
                        highCount: c2.rows[0]?.high_count || 0,
                        actionLabel: 'Open Call List ↗'
                    },
                    texts: {
                        title: 'TEXT',
                        count: t2.rows[0]?.total ?? 0,
                        subtitle: `${t2.rows[0]?.total ?? 0} opted-in contacts`,
                        description: 'Send follow-up & reply to responses',
                        actionLabel: 'Open Text Queue ↗'
                    },
                    emails: {
                        title: 'EMAIL',
                        count: e2.rows[0]?.total ?? 0,
                        subtitle: `${e2.rows[0]?.total ?? 0} title/buyer follow-ups`,
                        description: 'Updates, docs & next steps',
                        actionLabel: 'Open Email Queue ↗'
                    }
                };
            }

            return {
                mailers: {
                    title: 'SEND MAILERS',
                    count: mailersTotal,
                    subtitle: mailersTotal > 0 ? `${mailersTotal} selected properties` : '0 selected properties',
                    tags: ['Foreclosure', 'Default', 'Cash'],
                    distressBreakdown: {
                        foreclosure: mailersRes.rows[0]?.foreclosure_count || 0,
                        default: mailersRes.rows[0]?.default_count || 0,
                        cash: mailersRes.rows[0]?.cash_count || 0
                    },
                    actionLabel: mailersTotal > 0 ? 'Create Batch ↗' : '+ Queue Mailers ↗'
                },
                calls: {
                    title: 'CALL',
                    count: callsTotal,
                    subtitle: callsTotal > 0 ? `${callsTotal} seller follow-ups` : '0 seller follow-ups',
                    description: callsTotal > 0 ? 'Priority ordered (Overdue → High)' : 'No pending calls',
                    overdueCount: callsRes.rows[0]?.overdue_count || 0,
                    highCount: callsRes.rows[0]?.high_count || 0,
                    actionLabel: callsTotal > 0 ? 'Open Call List ↗' : '+ Schedule Call ↗'
                },
                texts: {
                    title: 'TEXT',
                    count: textsTotal,
                    subtitle: textsTotal > 0 ? `${textsTotal} opted-in contacts` : '0 opted-in contacts',
                    description: textsTotal > 0 ? 'Send follow-up & reply to responses' : 'No queued SMS',
                    actionLabel: textsTotal > 0 ? 'Open Text Queue ↗' : '+ Compose Text ↗'
                },
                emails: {
                    title: 'EMAIL',
                    count: emailsTotal,
                    subtitle: emailsTotal > 0 ? `${emailsTotal} title/buyer follow-ups` : '0 title/buyer follow-ups',
                    description: emailsTotal > 0 ? 'Updates, docs & next steps' : 'No queued emails',
                    actionLabel: emailsTotal > 0 ? 'Open Email Queue ↗' : '+ Compose Email ↗'
                }
            };
        } catch (err) {
            console.warn('[OutreachActionsService] getSummary DB error, fallback to defaults:', err.message);
            return {
                mailers: { title: 'SEND MAILERS', count: 0, subtitle: '0 selected properties', tags: ['Foreclosure', 'Default', 'Cash'], actionLabel: '+ Queue Mailers ↗' },
                calls: { title: 'CALL', count: 0, subtitle: '0 seller follow-ups', description: 'No pending calls', actionLabel: '+ Schedule Call ↗' },
                texts: { title: 'TEXT', count: 0, subtitle: '0 opted-in contacts', description: 'No queued SMS', actionLabel: '+ Compose Text ↗' },
                emails: { title: 'EMAIL', count: 0, subtitle: '0 title/buyer follow-ups', description: 'No queued emails', actionLabel: '+ Compose Email ↗' }
            };
        }
    }

    /**
     * Get Mailers Queue
     */
    static async getMailersQueue() {
        const res = await pool.query(`
            SELECT m.*, p.assessed_value, p.property_type
            FROM core.outreach_mailers m
            LEFT JOIN core.properties p ON m.property_id = p.property_id
            ORDER BY m.created_at ASC
        `);
        return res.rows;
    }

    /**
     * Create & Dispatch Mailer Batch
     */
    static async createMailerBatch({ actor, template = 'Yellow Letter Cash Offer', postage = '', propertyIds = [] }) {
        const batchCode = `DM-${new Date().getUTCFullYear()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        
        let updateSql = `
            UPDATE core.outreach_mailers
            SET status = 'DISPATCHED', batch_id = $1, template_type = $2, updated_at = now()
        `;
        const params = [batchCode, template];

        if (Array.isArray(propertyIds) && propertyIds.length > 0) {
            updateSql += ` WHERE id = ANY($3::text[])`;
            params.push(propertyIds);
        } else {
            updateSql += ` WHERE status = 'READY'`;
        }

        const res = await pool.query(updateSql + ' RETURNING *', params);

        // Audit log
        db.logAudit({
            actor,
            action: 'DIRECT_MAIL_BATCH_DISPATCHED',
            entityType: 'MAILER_BATCH',
            entityId: batchCode,
            redactedDiff: { count: res.rows.length, template, postage }
        });

        return {
            batchCode,
            dispatchedCount: res.rows.length,
            template,
            postage,
            dispatchedAt: new Date().toISOString()
        };
    }

    /**
     * Get Calls Queue
     */
    static async getCallsQueue() {
        const res = await pool.query(`
            SELECT * FROM core.outreach_calls
            WHERE status = 'PENDING'
            ORDER BY 
                CASE priority WHEN 'Overdue' THEN 1 WHEN 'High' THEN 2 ELSE 3 END,
                created_at ASC
        `);
        return res.rows;
    }

    /**
     * Log Call Outcome
     */
    static async logCall({ actor, callId, contactName, phone, propertyAddress, propertyId, result = 'Connected', notes = '', nextStep = '' }) {
        let call = null;
        if (callId) {
            const callRes = await pool.query(`
                UPDATE core.outreach_calls
                SET status = 'COMPLETED', notes = COALESCE(notes, '') || ' | ' || $1, last_call_at = now(), updated_at = now()
                WHERE id = $2
                RETURNING *
            `, [notes, callId]);
            if (callRes.rows.length > 0) {
                call = callRes.rows[0];
            }
        }

        if (!call) {
            if (!contactName || !phone) throw new Error('contactName and phone are required to log a call.');
            const targetId = (callId && !callId.startsWith('new-')) ? callId : 'call-' + Date.now();
            const insRes = await pool.query(`
                INSERT INTO core.outreach_calls (
                    id, contact_name, phone, property_address, property_id, priority, cadence_stage, notes, last_call_at, status, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, 'Normal', 'Follow-up', $6, now(), 'COMPLETED', now(), now())
                RETURNING *
            `, [
                targetId,
                contactName,
                phone,
                propertyAddress || null,
                propertyId || null,
                notes || null
            ]);
            call = insRes.rows[0];
        }

        // Record interaction in core.interactions
        await pool.query(`
            INSERT INTO core.interactions (
                interaction_id, property_id, method, direction, actor_id, result, notes, occurred_at
            ) VALUES (
                gen_random_uuid(), $1, 'CALL', 'OUTBOUND', $4, $2, $3, now()
            )
        `, [call.property_id, result, `Call to ${call.contact_name}: ${notes}`, actor]);

        // Also dispatch to Podio Feeds
        try {
            await PodioSyncService.sendOutboundCommunication({
                type: 'CALL',
                to: call.phone,
                body: `${result}: ${notes || 'Call logged'}${nextStep ? ` (Next Step: ${nextStep})` : ''}`,
                propertyAddress: call.property_address,
                leadName: call.contact_name
            });
        } catch (pErr) {
            console.warn('[OutreachActions] Podio call sync note:', pErr.message);
        }

        return call;
    }

    /**
     * Get Texts Queue
     */
    static async getTextsQueue() {
        const res = await pool.query(`
            SELECT * FROM core.outreach_texts
            WHERE status = 'QUEUED'
            ORDER BY created_at ASC
        `);
        return res.rows;
    }

    /**
     * Send a text. The carrier is called first; the queue entry becomes SENT and an interaction is logged only when
     * the carrier accepted the message. If no carrier is configured or it fails, nothing is recorded as sent.
     */
    static async sendText({ actor, textId, phone, recipientPhone, contactName, message, propertyId }) {
        if (!message || !String(message).trim()) throw Object.assign(new Error('A message is required.'), { status: 400 });
        let record = null;
        if (textId) {
            const { rows: [queued] } = await pool.query('SELECT * FROM core.outreach_texts WHERE id = $1', [textId]);
            record = queued || null;
        }
        const targetPhone = record?.phone || phone || recipientPhone;
        if (!targetPhone) throw Object.assign(new Error('A recipient phone number is required.'), { status: 400 });

        const carrierResult = await DeliveryService.text({ to: targetPhone, message, leadName: record?.contact_name || contactName, propertyAddress: record?.property_address });
        if (!carrierResult.success) {
            throw Object.assign(new Error(carrierResult.error || 'The text could not be sent.'), { status: 503, carrier: carrierResult });
        }

        if (record) {
            const { rows: [updated] } = await pool.query(
                `UPDATE core.outreach_texts SET status = 'SENT', last_inbound_snippet = $1, updated_at = now() WHERE id = $2 RETURNING *`, [message, record.id]);
            record = updated;
        } else {
            const { rows: [created] } = await pool.query(
                `INSERT INTO core.outreach_texts (id, contact_name, phone, property_address, property_id, opt_in_date, recommended_template, last_inbound_snippet, status, created_at, updated_at)
                 VALUES ($1, $2, $3, NULL, $4, NULL, NULL, $5, 'SENT', now(), now()) RETURNING *`,
                ['txt-' + crypto.randomUUID(), contactName || null, targetPhone, propertyId || null, message]);
            record = created;
        }

        await pool.query(
            `INSERT INTO core.interactions (interaction_id, property_id, method, direction, actor_id, result, notes, occurred_at)
             VALUES (gen_random_uuid(), $1, 'TEXT', 'OUTBOUND', $3, 'SENT', $2, now())`,
            [record.property_id, `SMS to ${record.contact_name || record.phone} (${record.phone}): "${message}" [${carrierResult.provider} ${carrierResult.messageSid || carrierResult.itemId || ''}]`, actor]);

        return { ...record, carrier: carrierResult };
    }

    /**
     * Get Emails Queue
     */
    static async getEmailsQueue() {
        const res = await pool.query(`
            SELECT * FROM core.outreach_emails
            WHERE status = 'QUEUED'
            ORDER BY created_at ASC
        `);
        return res.rows;
    }

    /**
     * Send an email. Same rule as texts: the transport is called first and nothing is marked sent unless it accepted the message.
     */
    static async sendEmail({ actor, emailId, recipientName, email, subject, body, propertyAddress, propertyId }) {
        let record = null;
        if (emailId) {
            const { rows: [queued] } = await pool.query('SELECT * FROM core.outreach_emails WHERE id = $1', [emailId]);
            record = queued || null;
        }
        const to = record?.email || email;
        const finalSubject = subject || record?.subject;
        const finalBody = body || record?.body_snippet;
        if (!to) throw Object.assign(new Error('A recipient email address is required.'), { status: 400 });
        if (!finalSubject || !finalBody) throw Object.assign(new Error('A subject and body are required.'), { status: 400 });

        const carrierResult = await DeliveryService.email({ to, subject: finalSubject, text: finalBody, leadName: record?.recipient_name || recipientName, propertyAddress: record?.property_address || propertyAddress });
        if (!carrierResult.success) {
            throw Object.assign(new Error(carrierResult.error || 'The email could not be sent.'), { status: 503, carrier: carrierResult });
        }

        if (record) {
            const { rows: [updated] } = await pool.query(
                `UPDATE core.outreach_emails SET status = 'SENT', subject = $1, body_snippet = $2, updated_at = now() WHERE id = $3 RETURNING *`, [finalSubject, finalBody, record.id]);
            record = updated;
        } else {
            const { rows: [created] } = await pool.query(
                `INSERT INTO core.outreach_emails (id, recipient_name, recipient_role, email, subject, property_address, property_id, body_snippet, status, created_at, updated_at)
                 VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, 'SENT', now(), now()) RETURNING *`,
                ['em-' + crypto.randomUUID(), recipientName || null, to, finalSubject, propertyAddress || null, propertyId || null, finalBody]);
            record = created;
        }

        await pool.query(
            `INSERT INTO core.interactions (interaction_id, property_id, method, direction, actor_id, result, notes, occurred_at)
             VALUES (gen_random_uuid(), $1, 'EMAIL', 'OUTBOUND', $3, 'SENT', $2, now())`,
            [record.property_id, `Email to ${record.recipient_name || to} (${to}) - Subject: ${finalSubject} [${carrierResult.provider}]`, actor]);

        return { ...record, carrier: carrierResult };
    }

    /**
     * Queue real properties into core.outreach_mailers
     */
    static async queueProperties({ propertyIds = [], limit = 5 }) {
        let rows = [];
        if (propertyIds && propertyIds.length > 0) {
            const res = await pool.query(`
                SELECT p.property_id, p.address_line1, p.city, p.state_code, p.postal_code, p.assessed_value, p.property_type,
                       COALESCE(pe.full_name, 'Property Owner') as owner_name
                FROM core.properties p
                LEFT JOIN core.leads l ON p.property_id = l.property_id
                LEFT JOIN core.people pe ON l.person_id = pe.person_id
                WHERE p.property_id = ANY($1::uuid[])
            `, [propertyIds]);
            rows = res.rows;
        } else {
            const res = await pool.query(`
                SELECT p.property_id, p.address_line1, p.city, p.state_code, p.postal_code, p.assessed_value, p.property_type,
                       COALESCE(pe.full_name, 'Property Owner') as owner_name
                FROM core.properties p
                LEFT JOIN core.leads l ON p.property_id = l.property_id
                LEFT JOIN core.people pe ON l.person_id = pe.person_id
                WHERE p.property_id NOT IN (SELECT property_id FROM core.outreach_mailers WHERE property_id IS NOT NULL)
                ORDER BY p.assessed_value DESC NULLS LAST
                LIMIT $1
            `, [limit]);
            rows = res.rows;
        }

        const queued = [];
        for (const r of rows) {
            const id = 'om-' + Date.now() + '-' + crypto.randomInt(100, 999);
            const ins = await pool.query(`
                INSERT INTO core.outreach_mailers (
                    id, property_id, owner_name, property_address, city, state, zip, equity_estimate, distress_category, status, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'READY', now(), now())
                RETURNING *
            `, [
                id,
                r.property_id,
                r.owner_name,
                r.address_line1,
                r.city || null,
                r.state_code || null,
                r.postal_code || '',
                null,
                null
            ]);
            queued.push(ins.rows[0]);
        }
        return queued;
    }

    /**
     * Queue a call into core.outreach_calls
     */
    static async queueCall({ contactName, phone, propertyAddress, propertyId, priority = 'High', cadenceStage = 'Follow-Up Call', notes = '' }) {
        const id = 'call-' + Date.now();
        const ins = await pool.query(`
            INSERT INTO core.outreach_calls (
                id, contact_name, phone, property_address, property_id, priority, cadence_stage, notes, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', now(), now())
            RETURNING *
        `, [id, contactName, phone, propertyAddress, propertyId || null, priority, cadenceStage, notes]);
        return ins.rows[0];
    }

    /**
     * Queue a text into core.outreach_texts
     */
    static async queueText({ contactName, phone, propertyAddress, propertyId, recommendedTemplate = 'Follow-up on purchase offer' }) {
        const id = 'txt-' + Date.now();
        const ins = await pool.query(`
            INSERT INTO core.outreach_texts (
                id, contact_name, phone, property_address, property_id, recommended_template, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'QUEUED', now(), now())
            RETURNING *
        `, [id, contactName, phone, propertyAddress, propertyId || null, recommendedTemplate]);
        return ins.rows[0];
    }

    /**
     * Queue an email into core.outreach_emails
     */
    static async queueEmail({ recipientName, email, subject, bodySnippet, propertyAddress, propertyId, recipientRole = 'Cash Buyer' }) {
        const id = 'em-' + Date.now();
        const ins = await pool.query(`
            INSERT INTO core.outreach_emails (
                id, recipient_name, recipient_role, email, subject, property_address, property_id, body_snippet, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'QUEUED', now(), now())
            RETURNING *
        `, [id, recipientName, recipientRole, email, subject, propertyAddress, propertyId || null, bodySnippet]);
        return ins.rows[0];
    }
}
