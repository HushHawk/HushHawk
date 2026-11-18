import crypto from 'crypto';
import { pool, audit } from '../store/pgClient.js';

/**
 * Decides, from evidence on the lead itself, whether a lead is a seller. Anything the evidence cannot settle is NEEDS_REVIEW, never
 * guessed. A person's own choice (lead_kind_set_by is a user name) is never overwritten.
 *
 *   INTERNAL     the team's own email domain, or a record named as a test
 *   AUTOMATED    notification, signing, newsletter and government system senders
 *   SELLER       the team has worked it (contacted, qualified, offer, contract...), it has a property, or it came from a seller
 *                channel with a phone number
 *   BUSINESS     an email-only contact on a company domain (wholesaler, buyer, title company, agent, lender)
 *   NEEDS_REVIEW everything else, for example a personal email address with no other information
 */
const FREE_MAIL = new Set(['gmail.com', 'icloud.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'msn.com', 'live.com', 'me.com', 'comcast.net', 'att.net', 'bellsouth.net']);
const AUTOMATED_LOCAL = /^(no-?reply\w*|do-?not-?reply|donotreply|notifications?|notify|mailer(-daemon)?|automated?|alerts?|reply|billing|postmaster|bounce\w*|newsletter|membershipdatarequest|publicrecords)$/i;
const AUTOMATED_DOMAINS = /(^|\.)(docusign\.net|signnow\.com|signwell\.com|qualia\.com|mycusthelp\.net|govqa\.us|ccsend\.com|constantcontact\.com|mailchimp\.com|sendgrid\.net|automation\.podio\.com|deals\.findmyflip\.ai|floridabar\.org|dos\.fl\.gov|dos\.myflorida\.com|myflorida\.com)$/i;
const WORKED = new Set(['CONTACTED', 'QUALIFIED', 'APPOINTMENT', 'OFFER', 'CONTRACT', 'CLOSED', 'FOLLOW_UP']);

export function classifyLead({ email, name, phone, source, status, hasProperty, internalDomains = [] }) {
    const mail = String(email || '').toLowerCase();
    const [local, domain] = mail.includes('@') ? mail.split('@') : ['', ''];
    if (domain && internalDomains.includes(domain)) return { kind: 'INTERNAL', reason: `Uses the team's own email domain (${domain}).` };
    if (/\btest\b/i.test(String(name || ''))) return { kind: 'INTERNAL', reason: 'The name marks it as a test record.' };
    if (domain && (AUTOMATED_LOCAL.test(local) || AUTOMATED_DOMAINS.test(domain))) return { kind: 'AUTOMATED', reason: `Sent by a system or notification address (${mail}).` };
    if (WORKED.has(String(status || '').toUpperCase())) return { kind: 'SELLER', reason: `The team has worked it (status ${status}).` };
    if (hasProperty) return { kind: 'SELLER', reason: 'It is linked to a property.' };
    const emailOnly = String(source || '').toUpperCase() === 'EML';
    if (!emailOnly && phone) return { kind: 'SELLER', reason: 'It came from a seller channel and has a phone number.' };
    if (emailOnly && !phone && domain && !FREE_MAIL.has(domain)) return { kind: 'BUSINESS', reason: `An email sender on a company domain (${domain}) with no phone or property.` };
    return { kind: 'NEEDS_REVIEW', reason: emailOnly ? 'An email sender with no phone or property; a person must say whether this is a seller.' : 'Not enough information to say.' };
}

export class LeadClassifierService {
    static async internalDomains() {
        const { rows } = await pool.query(`SELECT DISTINCT lower(split_part(email, '@', 2)) AS d FROM core.users WHERE email LIKE '%@%'`);
        const configured = (process.env.INTERNAL_EMAIL_DOMAINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        return [...new Set([...rows.map(r => r.d).filter(d => d && !FREE_MAIL.has(d)), ...configured])];
    }

    static async classifyAll() {
        const internalDomains = await this.internalDomains();
        const { rows } = await pool.query(
            `SELECT l.lead_id, l.lead_kind, l.lead_kind_reason, l.status, l.first_source_code, l.property_id, p.full_name, p.primary_email, p.primary_phone
             FROM core.leads l LEFT JOIN core.people p USING (person_id)
             WHERE l.lead_kind_set_by IS NULL OR l.lead_kind_set_by = 'rule'`);
        const counts = { SELLER: 0, NEEDS_REVIEW: 0, BUSINESS: 0, AUTOMATED: 0, INTERNAL: 0 }; let changed = 0;
        for (const r of rows) {
            const { kind, reason } = classifyLead({ email: r.primary_email, name: r.full_name, phone: r.primary_phone, source: r.first_source_code, status: r.status, hasProperty: Boolean(r.property_id), internalDomains });
            counts[kind]++;
            if (kind !== r.lead_kind || reason !== r.lead_kind_reason) {
                await pool.query(`UPDATE core.leads SET lead_kind = $2, lead_kind_reason = $3, lead_kind_set_by = 'rule', lead_kind_set_at = now() WHERE lead_id = $1`, [r.lead_id, kind, reason]);
                changed++;
            }
        }
        if (changed) await audit(pool, { actor: 'Lead classifier', action: 'LEADS_CLASSIFIED', entityType: 'LEAD', entityId: crypto.randomUUID(), diff: { changed, counts } });
        return { evaluated: rows.length, changed, counts };
    }

    /** A person's decision. It sticks: rules never touch it again until the person clears it. */
    static async setKind({ leadId, kind, reason, actor }) {
        if (!['SELLER', 'NEEDS_REVIEW', 'BUSINESS', 'AUTOMATED', 'INTERNAL'].includes(kind)) throw Object.assign(new Error('Unknown lead kind.'), { status: 400 });
        const { rows: [row] } = await pool.query(
            `UPDATE core.leads SET lead_kind = $2, lead_kind_reason = $3, lead_kind_set_by = $4, lead_kind_set_at = now(), updated_at = now() WHERE lead_id = $1 RETURNING lead_id`,
            [leadId, kind, reason || `Set by ${actor}.`, actor]);
        if (!row) throw Object.assign(new Error('Lead not found.'), { status: 404 });
        await audit(pool, { actor, action: 'LEAD_KIND_SET', entityType: 'LEAD', entityId: leadId, diff: { kind, reason: reason || null } });
        return { leadId, kind };
    }
}
