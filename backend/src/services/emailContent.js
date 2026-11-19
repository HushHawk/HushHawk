/**
 * Turns the HTML (or plain text) of an incoming email into readable text plus the links it contained.
 * Links are kept with their visible wording ("View property photos") and only http/https addresses are kept,
 * so a javascript:, data: or file: link can never reach the screen.
 */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•', copy: '©' };

// Some senders encode twice (&amp;amp;), so decode until nothing changes (at most three passes).
export function decodeEntities(text) {
    let current = String(text);
    for (let i = 0; i < 3; i++) {
        const next = decodeOnce(current);
        if (next === current) break;
        current = next;
    }
    return current;
}

function decodeOnce(text) {
    return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
        if (code[0] === '#') {
            const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
            return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
        }
        return NAMED[code.toLowerCase()] ?? match;
    });
}

/** Returns a safe absolute http(s) address, or null. */
export function safeUrl(raw) {
    const candidate = decodeEntities(String(raw || '')).trim().replace(/[\u0000-\u001f\u007f\s]+/g, '');
    if (!candidate || candidate.length > 2048) return null;
    try {
        const url = new URL(candidate);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
}

const collapse = s => decodeEntities(s).replace(/[ \t ]+/g, ' ').trim();

function htmlToText(html) {
    return decodeEntities(html
        .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6]|table|blockquote)>/gi, '\n')
        .replace(/<li[^>]*>/gi, '• ')
        .replace(/<[^>]+>/g, ' '))
        .replace(/[ \t ]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function anchorLabel(inner, url) {
    const withoutImages = inner.replace(/<img\b[^>]*>/gi, ' ');
    let label = collapse(withoutImages.replace(/<[^>]+>/g, ' '));
    if (!label) {
        const alt = /<img\b[^>]*\balt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(inner);
        label = collapse(alt ? (alt[2] ?? alt[3] ?? '') : '');
    }
    if (!label || /^https?:\/\//i.test(label)) {
        try { label = new URL(url).hostname.replace(/^www\./, ''); } catch { label = 'Link'; }
    }
    return label.length > 120 ? label.slice(0, 117) + '…' : label;
}

/** @returns {{ text: string, links: Array<{ text: string, url: string }> }} */
export function extractEmail(body) {
    const raw = typeof body === 'string' ? body : '';
    const isHtml = /<\/?[a-z][\s\S]*?>/i.test(raw);
    const links = [];
    const seen = new Set();
    const add = (text, url) => {
        if (!url || seen.has(url) || links.length >= 25) return;
        seen.add(url);
        links.push({ text, url });
    };

    if (isHtml) {
        const anchor = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
        let m;
        while ((m = anchor.exec(raw))) {
            const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1]);
            const url = safeUrl(href && (href[1] ?? href[2] ?? href[3]));
            if (url) add(anchorLabel(m[2], url), url);
        }
    }
    const text = isHtml ? htmlToText(raw) : decodeEntities(raw).replace(/\r\n?/g, '\n').trim();
    // Plain-text emails (and addresses written out in HTML text) carry bare links too.
    for (const found of text.match(/https?:\/\/[^\s<>"')\]]+/gi) || []) {
        const url = safeUrl(found.replace(/[.,;:!?]+$/, ''));
        if (url) add(anchorLabel('', url), url);
    }
    return { text, links };
}
