import { pool, withTransaction, audit } from '../store/pgClient.js';
import { HttpError } from './eventService.js';

const digits = value => String(value || '').replace(/\D/g, '');
const CHANNEL_SECTION = { CALL: '/communications', TEXT: '/communications', EMAIL: '/communications', MAIL: '/direct-mail' };

/** Hour (0-23) and weekday in the configured outreach timezone. */
function localHour(now = new Date()) {
    const tz = process.env.OUTREACH_TIMEZONE || 'America/New_York';
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now));
}

const intEnv = (name, fallback) => {
    const n = Number.parseInt(process.env[name] ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Whether an inbound message is a request to stop being contacted. Text replies are judged on the standard carrier keywords (the whole
 * message) and a few unmistakable phrases. Emails need an explicit phrase about the sender, because newsletters carry the word
 * "unsubscribe" in their footers and must not count.
 */
const STOP_KEYWORDS = /^\s*(stop|stopall|stop all|end|quit|cancel|unsubscribe|optout|opt out|revoke)\s*[.!]*\s*$/i;
const STOP_PHRASES = /\b(stop (texting|calling|emailing|contacting|messaging) me|do not (call|text|contact|email|message) me|don'?t (call|text|contact|email|message) me|remove me from (your|the|this) (list|lists|contacts)|take me off (your|the|this) (list|lists)|unsubscribe me|opt me out)\b/i;
export function isOptOutMessage(text, channel = 'TEXT') {
    const t = String(text || '').trim();
    if (!t) return false;
    if (channel !== 'EMAIL' && STOP_KEYWORDS.test(t)) return true;
    return STOP_PHRASES.test(t.slice(0, 600));
}

export class ComplianceService {
    /** Records an opt-out once per identifier. Safe to call for every inbound message. */
    static async recordOptOut({ phone = null, email = null, text, actor = 'Opt-out detector' }) {
        const quote = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120);
        const targets = [];
        if (digits(phone).length >= 10) targets.push(['PHONE', String(phone).startsWith('+') ? String(phone).trim() : `+${digits(phone)}`]);
        if (email && String(email).includes('@')) targets.push(['EMAIL', String(email).trim().toLowerCase()]);
        let added = 0;
        for (const [type, value] of targets) {
            const { rows: [exists] } = await pool.query(
                type === 'PHONE'
                    ? `SELECT 1 FROM crm.suppression_records WHERE identifier_type = 'PHONE' AND right(regexp_replace(identifier_value, '\\D', '', 'g'), 10) = right($1, 10) LIMIT 1`
                    : `SELECT 1 FROM crm.suppression_records WHERE identifier_type = 'EMAIL' AND lower(identifier_value) = lower($1) LIMIT 1`,
                [type === 'PHONE' ? digits(value) : value]);
            if (exists) continue;
            await this.addSuppression({ type, value, reason: `Asked to stop: "${quote}"`, source: 'INBOUND_OPT_OUT', actor });
            added++;
        }
        return added;
    }

    /**
     * Loads a do-not-contact list (for example the national Do Not Call registry download for your area codes, or a client's own list).
     * Accepts phone numbers or emails, skips ones already listed, and reports exactly what happened to each line.
     */
    static async importSuppression({ entries, reason, source = 'DNC_LIST_IMPORT', actor }) {
        if (!Array.isArray(entries) || !entries.length) throw new HttpError(400, 'entries must be a non-empty list.');
        if (entries.length > 100000) throw new HttpError(400, 'Import at most 100,000 entries at a time.');
        if (typeof reason !== 'string' || !reason.trim()) throw new HttpError(400, 'reason is required (for example "National Do Not Call registry, downloaded 2026-11-18").');
        const out = { added: 0, alreadyListed: 0, rejected: [] };
        for (const raw of entries) {
            const value = String(raw ?? '').trim();
            const isEmail = value.includes('@');
            const phoneDigits = digits(value);
            if (!isEmail && phoneDigits.length !== 10 && !(phoneDigits.length === 11 && phoneDigits.startsWith('1'))) { out.rejected.push(value.slice(0, 60)); continue; }
            const type = isEmail ? 'EMAIL' : 'PHONE';
            const stored = isEmail ? value.toLowerCase() : `+1${phoneDigits.slice(-10)}`;
            const { rows: [exists] } = await pool.query(
                isEmail
                    ? `SELECT 1 FROM crm.suppression_records WHERE identifier_type = 'EMAIL' AND lower(identifier_value) = $1 LIMIT 1`
                    : `SELECT 1 FROM crm.suppression_records WHERE identifier_type = 'PHONE' AND right(regexp_replace(identifier_value, '\\D', '', 'g'), 10) = $1 LIMIT 1`,
                [isEmail ? stored : phoneDigits.slice(-10)]);
            if (exists) { out.alreadyListed++; continue; }
            await this.addSuppression({ type, value: stored, reason, source, actor });
            out.added++;
        }
        return out;
    }

    /**
     * Six-step gate that runs before any outbound contact. Every step is evaluated against stored data
     * or configuration; a step that does not apply is reported as skipped, never as passed.
     */
    static async evaluateOutboundRequest({
        channel = 'CALL', recipientPhone = null, recipientEmail = null, recipientAddress = null,
        personId = null, campaignId = null, user = null, now = new Date()
    }) {
        if (!['CALL', 'TEXT', 'EMAIL', 'MAIL'].includes(channel)) throw new HttpError(400, 'Unknown channel.');
        const phone = digits(recipientPhone);
        const email = recipientEmail ? String(recipientEmail).trim().toLowerCase() : null;
        const checks = [];
        const push = (step, name, status, reason) => checks.push({ step, name, passed: status !== 'FAIL', skipped: status === 'SKIP', reason });

        // 1. Suppression / opt-out
        const { rows: suppressed } = await pool.query(
            `SELECT identifier_type, reason FROM crm.suppression_records
             WHERE (identifier_type = 'PHONE' AND length($1) >= 10 AND right(regexp_replace(identifier_value, '\\D', '', 'g'), 10) = right($1, 10))
                OR (identifier_type = 'EMAIL' AND $2::text IS NOT NULL AND lower(identifier_value) = $2)
                OR (identifier_type = 'MAILING_ADDRESS' AND $3::text IS NOT NULL AND lower(identifier_value) = lower($3))
             LIMIT 1`, [phone, email, recipientAddress || null]);
        const { rows: flagged } = await pool.query(
            `SELECT 1 FROM core.people WHERE is_suppressed
               AND (person_id = $1::uuid OR (length($2) >= 10 AND right(regexp_replace(coalesce(primary_phone,''), '\\D', '', 'g'), 10) = right($2, 10))
                    OR ($3::text IS NOT NULL AND lower(primary_email) = $3)) LIMIT 1`, [personId, phone, email]);
        if (suppressed.length) push(1, 'Suppression & opt-out', 'FAIL', `Recipient is on the suppression list (${suppressed[0].reason}).`);
        else if (flagged.length) push(1, 'Suppression & opt-out', 'FAIL', 'Recipient is flagged as suppressed.');
        else push(1, 'Suppression & opt-out', 'PASS', 'No suppression record found for this recipient.');

        // 2. Consent / legal basis (text messages need an inbound contact or recorded consent)
        if (channel === 'TEXT') {
            const { rows: basis } = await pool.query(
                `SELECT 1 FROM core.interactions i JOIN core.people p USING (person_id)
                   WHERE i.direction = 'INBOUND' AND i.method IN ('TEXT','CALL','WEBFORM','WHATSAPP')
                     AND (p.person_id = $1::uuid OR ($2 <> '' AND regexp_replace(coalesce(p.primary_phone,''), '\\D', '', 'g') = $2))
                   UNION ALL
                   SELECT 1 FROM core.people p WHERE (p.person_id = $1::uuid OR ($2 <> '' AND regexp_replace(coalesce(p.primary_phone,''), '\\D', '', 'g') = $2))
                     AND p.metadata->>'sms_consent' = 'true'
                   LIMIT 1`, [personId, phone]);
            push(2, 'Consent & legal basis', basis.length ? 'PASS' : 'FAIL',
                basis.length ? 'Recipient contacted us first or has recorded SMS consent.' : 'No inbound contact or recorded SMS consent for this recipient.');
        } else {
            push(2, 'Consent & legal basis', 'SKIP', `No consent record is required for ${channel} beyond the opt-out check.`);
        }

        // 3. Campaign rules
        if (campaignId) {
            const { rows: [campaign] } = await pool.query('SELECT status FROM core.campaigns WHERE campaign_id = $1', [campaignId]);
            push(3, 'Campaign rules', campaign && campaign.status === 'ACTIVE' ? 'PASS' : 'FAIL',
                campaign ? `Campaign status is ${campaign.status}.` : 'Campaign not found.');
        } else {
            push(3, 'Campaign rules', 'SKIP', 'One-to-one outreach with no campaign attached.');
        }

        // 4. User permission
        const section = CHANNEL_SECTION[channel];
        const allowed = user && (user.isAdmin || (user.permissions || []).includes(section) || (user.permissions || []).includes('/follow-ups'));
        push(4, 'User permission', allowed ? 'PASS' : 'FAIL',
            allowed ? `${user.name} may send ${channel} outreach.` : 'The signed-in user does not have access to this channel.');

        // 5. Rate limit
        const perDay = intEnv('OUTREACH_MAX_PER_DAY', 3);
        const perWeek = intEnv('OUTREACH_MAX_PER_WEEK', 10);
        const { rows: [counts] } = await pool.query(
            `SELECT count(*) FILTER (WHERE i.occurred_at > now() - interval '1 day')::int AS day,
                    count(*) FILTER (WHERE i.occurred_at > now() - interval '7 days')::int AS week
             FROM core.interactions i LEFT JOIN core.people p USING (person_id)
             WHERE i.direction = 'OUTBOUND' AND i.method = $1
               AND (i.person_id = $2::uuid OR ($3 <> '' AND regexp_replace(coalesce(p.primary_phone,''), '\\D', '', 'g') = $3))`,
            [channel, personId, phone]);
        push(5, 'Rate limit', counts.day >= perDay || counts.week >= perWeek ? 'FAIL' : 'PASS',
            `${counts.day}/${perDay} in the last 24 hours, ${counts.week}/${perWeek} in the last 7 days.`);

        // 6. Jurisdiction: permitted calling hours for calls and texts
        if (channel === 'CALL' || channel === 'TEXT') {
            const hour = localHour(now);
            const start = intEnv('OUTREACH_START_HOUR', 8);
            const end = intEnv('OUTREACH_END_HOUR', 20);
            const okHour = hour >= start && hour < end;
            push(6, 'Permitted contact hours', okHour ? 'PASS' : 'FAIL',
                `Local hour ${hour}:00 (${process.env.OUTREACH_TIMEZONE || 'America/New_York'}); permitted ${start}:00-${end}:00.`);
        } else {
            push(6, 'Permitted contact hours', 'SKIP', `Time-of-day limits do not apply to ${channel}.`);
        }

        const allPassed = checks.every(c => c.passed);
        await withTransaction(client => audit(client, {
            actor: user?.name || 'UNKNOWN', action: allPassed ? 'COMPLIANCE_GATE_PASSED' : 'COMPLIANCE_GATE_BLOCKED',
            entityType: 'OUTBOUND_DISPATCH', entityId: (personId || '00000000-0000-0000-0000-000000000000'),
            diff: { channel, checks }
        }));
        return { allowed: allPassed, channel, checks, status: allPassed ? 'APPROVED_FOR_DISPATCH' : 'BLOCKED_BY_COMPLIANCE_GATE', timestamp: new Date().toISOString() };
    }

    static async listSuppression() {
        const { rows } = await pool.query('SELECT * FROM crm.suppression_records ORDER BY created_at DESC LIMIT 1000');
        return rows;
    }

    static async addSuppression({ type, value, reason, source = 'USER_MANUAL', actor }) {
        if (!['PHONE', 'EMAIL', 'MAILING_ADDRESS'].includes(type)) throw new HttpError(400, 'type must be PHONE, EMAIL or MAILING_ADDRESS.');
        if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, 'value is required.');
        if (typeof reason !== 'string' || !reason.trim()) throw new HttpError(400, 'reason is required.');
        return withTransaction(async client => {
            const { rows: [record] } = await client.query(
                `INSERT INTO crm.suppression_records (identifier_type, identifier_value, reason, source) VALUES ($1,$2,$3,$4) RETURNING *`,
                [type, value.trim(), reason.trim(), source]);
            if (type === 'PHONE') {
                await client.query(`UPDATE core.people SET is_suppressed = TRUE WHERE regexp_replace(coalesce(primary_phone,''), '\\D', '', 'g') = $1`, [digits(value)]);
            } else if (type === 'EMAIL') {
                await client.query(`UPDATE core.people SET is_suppressed = TRUE WHERE lower(primary_email) = lower($1)`, [value.trim()]);
            }
            await audit(client, { actor, action: 'SUPPRESSION_ADDED', entityType: 'SUPPRESSION_RECORD', entityId: record.suppression_id, diff: { type, reason: reason.trim() } });
            return record;
        });
    }
}
