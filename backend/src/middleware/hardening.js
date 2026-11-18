import crypto from 'crypto';

/** Headers every API response carries. The API only serves JSON, so nothing may be framed, sniffed or sent with a referrer. */
export function securityHeaders(req, res, next) {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'Cross-Origin-Resource-Policy': 'same-site',
        'Permissions-Policy': 'geolocation=(), payment=()'
    });
    next();
}

/**
 * Unhandled server errors (HTTP 500) carry raw database or code messages. In production the caller gets a short reference instead and the
 * real message goes to the server log. Deliberate messages (400, 401, 403, 404, 409, 502, 503) are untouched.
 */
export function sanitizeServerErrors(req, res, next) {
    const json = res.json.bind(res);
    res.json = body => {
        if (process.env.NODE_ENV === 'production' && res.statusCode === 500 && body && typeof body === 'object' && typeof body.error === 'string') {
            const ref = crypto.randomUUID().slice(0, 8);
            console.error(`[Error ${ref}] ${req.method} ${redactUrl(req.originalUrl || req.url)}: ${body.error}`);
            body = { ...body, error: `Something went wrong on the server. Reference ${ref}.` };
        }
        return json(body);
    };
    next();
}

/** Webhook secrets and tokens travel in the query string; they must never reach the logs. */
export function redactUrl(url) {
    return String(url).replace(/([?&](?:secret|token|access_token|hub\.verify_token|hub\.challenge|api_key|key)=)[^&]*/gi, '$1[redacted]');
}
