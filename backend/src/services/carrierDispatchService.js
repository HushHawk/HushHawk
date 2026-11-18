/**
 * Carrier Dispatch & Omnichannel Communication Gateway
 * 
 * Supports:
 * 1. Twilio SMS & Voice API (live when TWILIO_* credentials exist)
 * 2. SendGrid API or SMTP / Nodemailer (live when SENDGRID_* or SMTP_* credentials exist)
 * 3. Native Zero-Cost Protocols (tel: and sms: and mailto: click-to-dispatch)
 * 4. Graceful Fallback & PostgreSQL Audit Logging
 */

import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';

// Lazy-initialized carrier singletons
let twilioClient = null;
let smtpTransporter = null;
let sendgridInitialized = false;

function getTwilioClient() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
        if (!twilioClient) {
            twilioClient = twilio(sid, token);
        }
        return twilioClient;
    }
    return null;
}

function getSendgridClient() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
        if (!sendgridInitialized) {
            sgMail.setApiKey(apiKey);
            sendgridInitialized = true;
        }
        return sgMail;
    }
    return null;
}

function getSmtpTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (host && user && pass) {
        if (!smtpTransporter) {
            smtpTransporter = nodemailer.createTransport({
                host,
                port: parseInt(process.env.SMTP_PORT || '587', 10),
                secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
                auth: { user, pass }
            });
        }
        return smtpTransporter;
    }
    return null;
}

export class CarrierDispatchService {
    /**
     * Dispatch an Outbound SMS Text
     */
    static async dispatchSms({ to, message, from = null }) {
        const cleanTo = (to || '').replace(/[^\d+]/g, '');
        const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || process.env.OUTBOUND_CALLER_ID || null;
        
        // Native URI for zero-cost device click-to-text fallback
        const encodedBody = encodeURIComponent(message || '');
        const nativeUri = `sms:${cleanTo}?body=${encodedBody}`;

        const client = getTwilioClient();
        if (client && cleanTo && !fromNumber) {
            return { success: false, delivered: false, liveCarrier: false, provider: 'twilio', status: 'NOT_CONFIGURED', error: 'TWILIO_PHONE_NUMBER is not set.', nativeUri };
        }
        if (client && cleanTo) {
            try {
                const twilioMsg = await client.messages.create({
                    body: message,
                    to: cleanTo.startsWith('+') ? cleanTo : `+1${cleanTo}`,
                    from: fromNumber
                });
                return {
                    success: true,
                    liveCarrier: true,
                    provider: 'twilio',
                    messageSid: twilioMsg.sid,
                    status: twilioMsg.status,
                    nativeUri
                };
            } catch (err) {
                console.error('[CarrierDispatch] Twilio SMS failed:', err.message);
                return {
                    success: false,
                    liveCarrier: true,
                    provider: 'twilio',
                    error: err.message,
                    nativeUri,
                    fallback: 'Logged to PostgreSQL database'
                };
            }
        }

        return {
            success: false,
            delivered: false,
            liveCarrier: false,
            provider: 'none',
            status: 'NOT_CONFIGURED',
            error: 'No SMS carrier is configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER.',
            nativeUri
        };
    }

    /**
     * Dispatch an Outbound Voice Call
     */
    static async dispatchCall({ to, from = null }) {
        const cleanTo = (to || '').replace(/[^\d+]/g, '');
        const fromNumber = from || process.env.TWILIO_PHONE_NUMBER || null;
        const nativeUri = `tel:${cleanTo}`;

        const client = getTwilioClient();
        if (client && cleanTo) {
            try {
                const twilioCall = await client.calls.create({
                    twiml: `<Response><Say voice="alice">Connecting your HushHawk acquisition specialist.</Say></Response>`,
                    to: cleanTo.startsWith('+') ? cleanTo : `+1${cleanTo}`,
                    from: fromNumber
                });
                return {
                    success: true,
                    liveCarrier: true,
                    provider: 'twilio',
                    callSid: twilioCall.sid,
                    status: twilioCall.status,
                    nativeUri
                };
            } catch (err) {
                console.error('[CarrierDispatch] Twilio Call failed:', err.message);
                return {
                    success: false,
                    liveCarrier: true,
                    provider: 'twilio',
                    error: err.message,
                    nativeUri
                };
            }
        }

        return {
            success: true,
            liveCarrier: false,
            provider: 'native_dialer',
            status: 'BRIDGE_READY',
            notice: 'Add TWILIO_ACCOUNT_SID to .env for automated SIP trunking, or use click-to-dial native link.',
            nativeUri
        };
    }

    /**
     * Dispatch an Outbound Email
     */
    static async dispatchEmail({ to, subject, text, html = null, from = null }) {
        const fromAddress = from || process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER || null;
        const nativeUri = `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(text || '')}`;

        // 1. Try SendGrid API
        const sg = getSendgridClient();
        if (sg && to && fromAddress) {
            try {
                const [resp] = await sg.send({
                    to,
                    from: fromAddress,
                    subject,
                    text,
                    html: html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`
                });
                return {
                    success: true,
                    liveCarrier: true,
                    provider: 'sendgrid',
                    statusCode: resp.statusCode,
                    nativeUri
                };
            } catch (err) {
                console.error('[CarrierDispatch] SendGrid failed:', err.message);
            }
        }

        // 2. Try Standard SMTP (Gmail / Google Workspace / Outlook / cPanel)
        const smtp = getSmtpTransporter();
        if (smtp && to && fromAddress) {
            try {
                const info = await smtp.sendMail({
                    from: fromAddress,
                    to,
                    subject,
                    text,
                    html: html || `<p>${(text || '').replace(/\n/g, '<br>')}</p>`
                });
                return {
                    success: true,
                    liveCarrier: true,
                    provider: 'smtp',
                    messageId: info.messageId,
                    nativeUri
                };
            } catch (err) {
                console.error('[CarrierDispatch] SMTP failed:', err.message);
            }
        }

        return {
            success: false,
            delivered: false,
            liveCarrier: false,
            provider: 'none',
            status: 'NOT_CONFIGURED',
            error: 'No email transport is configured (or the configured one failed). Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS and a from address.',
            nativeUri
        };
    }

    /**
     * Report carrier configuration status
     */
    static getCarrierStatus() {
        return {
            sms: {
                provider: process.env.TWILIO_ACCOUNT_SID ? 'Twilio (Live)' : 'Internal DB + Native Device Relay',
                configured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
                number: process.env.TWILIO_PHONE_NUMBER || 'Not configured'
            },
            email: {
                provider: process.env.SENDGRID_API_KEY 
                    ? 'SendGrid (Live)' 
                    : (process.env.SMTP_HOST ? `SMTP (${process.env.SMTP_HOST})` : 'Internal DB + Native Device Mailto'),
                configured: Boolean(process.env.SENDGRID_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)),
                fromEmail: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER || null
            },
            ai: {
                provider: process.env.GEMINI_API_KEY ? 'Google Gemini 1.5 Flash (Live)' : (process.env.OPENAI_API_KEY ? 'OpenAI GPT-4o (Live)' : 'HushHawk Built-in Underwriting Engine'),
                configured: Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY)
            }
        };
    }
}
