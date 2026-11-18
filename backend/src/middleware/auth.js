import crypto from 'crypto';
import { RbacService } from '../services/rbacService.js';

/**
 * Paths (relative to the /api or /api/v1 mount) that are reachable without a user session.
 * Webhook paths are NOT open: they are protected by verifyWebhook() below.
 */
const PUBLIC_EXACT = new Set(['/health', '/auth/login', '/auth/get-session']);
const PUBLIC_PREFIXES = ['/track/']; // mailer QR landing pages visited by property owners
const WEBHOOK_PATTERNS = [
    /^\/webhooks\/(podio|smrtphone|batchleads)$/,
    /^\/integrations\/batchleads\/webhook$/
];

/** Endpoints only a SUPER_ADMIN may call. */
const ADMIN_ONLY = [
    { method: 'POST', pattern: /^\/settings$/ },
    { method: 'POST', pattern: /^\/integrations\/(?!podio\/sync)/ }, // any signed-in user may trigger a Podio sync
    { method: 'POST', pattern: /^\/connectors\// },
    { method: 'ALL', pattern: /^\/admin\// }
];

export function bearerToken(req) {
    return req.get('authorization')?.match(/^Bearer (.+)$/i)?.[1] || null;
}

function safeEqual(a, b) {
    const left = Buffer.from(String(a || ''));
    const right = Buffer.from(String(b || ''));
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

/** Webhooks must present WEBHOOK_SECRET via header or ?secret=. Fails closed when the secret is not configured. */
export function verifyWebhook(req) {
    const secret = process.env.WEBHOOK_SECRET;
    const supplied = req.get('x-webhook-secret') || req.query.secret;
    // Transition switch: WEBHOOK_ALLOW_UNSIGNED=true accepts senders that cannot send the secret yet (existing Podio hooks, BatchLeads,
    // smrtPhone). A secret that IS supplied must still be correct. Turn this off once every sender uses the signed URL.
    if (process.env.WEBHOOK_ALLOW_UNSIGNED === 'true' && !supplied) {
        if (!unsignedWarned) { unsignedWarned = true; console.warn('[Webhooks] WEBHOOK_ALLOW_UNSIGNED=true: unsigned webhooks are being accepted. Update the senders and remove this setting.'); }
        return { ok: true, unsigned: true };
    }
    if (!secret) return { ok: false, status: 503, error: 'WEBHOOK_SECRET is not configured on the server.' };
    if (!safeEqual(supplied, secret)) return { ok: false, status: 401, error: 'Invalid webhook secret.' };
    return { ok: true };
}
let unsignedWarned = false;

export function webhookUrl(path) {
    const base = process.env.PUBLIC_API_URL;
    if (!base) throw new Error('PUBLIC_API_URL is not configured.');
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) throw new Error('WEBHOOK_SECRET is not configured.');
    return `${base.replace(/\/$/, '')}${path}?secret=${encodeURIComponent(secret)}`;
}

/** Router-level gate: every route requires a valid session unless explicitly public or a verified webhook. */
export async function requireSession(req, res, next) {
    const path = req.path;
    if (req.method === 'OPTIONS') return next();
    if (PUBLIC_EXACT.has(path) || PUBLIC_PREFIXES.some(p => path.startsWith(p))) return next();

    if (WEBHOOK_PATTERNS.some(p => p.test(path))) {
        const check = verifyWebhook(req);
        if (!check.ok) return res.status(check.status).json({ error: check.error });
        return next();
    }

    res.set('Cache-Control', 'no-store');
    try {
        const token = bearerToken(req);
        const session = await RbacService.getSession(token);
        if (!session) return res.status(401).json({ error: 'Sign in again to continue.' });
        req.user = session.user;
        req.sessionToken = token;
        // Attribution always comes from the session, never from a client-supplied name.
        if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
            for (const key of ['actor', 'reviewer', 'senderName', 'sender_name', 'created_by', 'user_name']) {
                if (key in req.body) req.body[key] = session.user.name;
            }
        }
        const adminRule = ADMIN_ONLY.find(r => (r.method === 'ALL' || r.method === req.method) && r.pattern.test(path));
        if (adminRule && !session.user.isAdmin) {
            return res.status(403).json({ error: 'Administrator access is required.' });
        }
        next();
    } catch (error) {
        next(error);
    }
}

/** Display name of the authenticated user, used for audit attribution instead of client-supplied actors. */
export const actorName = req => req.user?.name || 'Unknown user';

/** Webhook URL for display only: never includes the secret. Null when PUBLIC_API_URL is not configured. */
export function publicWebhookUrl(path) {
    const base = process.env.PUBLIC_API_URL;
    return base ? `${base.replace(/\/$/, '')}${path}` : null;
}

// Login attempts are limited per client address to slow down password guessing.
const attempts = new Map();
export function loginRateLimit(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const recent = (attempts.get(key) || []).filter(t => now - t < 15 * 60_000);
    if (recent.length >= 10) return res.status(429).json({ ok: false, error: 'Too many sign-in attempts. Try again in a few minutes.' });
    recent.push(now);
    attempts.set(key, recent);
    next();
}

