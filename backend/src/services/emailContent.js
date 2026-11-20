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
    let text = isHtml ? htmlToText(raw) : decodeEntities(raw).replace(/\r\n?/g, '\n').trim();
    // Emails that arrive as text often carry markdown: **bold**, [label](address), [address](address), or a label and its
    // address split over two lines. The address is kept once without brackets (so it can be clicked) and a real label
    // becomes the link's wording. Links that the sender's import replaced with a placeholder ("(link)", "[Dropbox link]")
    // have no address left; they are recorded as missing so the screen can say so instead of showing a dead link.
    let missing = 0;
    const noteMissing = label => { missing += 1; const name = collapse(label || 'Link').slice(0, 120); if (links.length < 25) links.push({ text: name, url: null, missing: true }); return name; };
    text = text
        .replace(/\*\*([^*\n]{1,300})\*\*/g, '$1')
        .replace(/\[([^\]\n]{1,300})\]\s*\((https?:\/\/[^\s)]+)\)/gi, (whole, label, href) => {
            const url = safeUrl(href);
            if (!url) return label;
            if (/^https?:\/\//i.test(label.trim())) return url;
            add(collapse(label).slice(0, 120), url);
            return label;
        })
        .replace(/\[([^\]\n]{1,300})\]\s*\((?!https?:)[^)\s]{0,40}\)/gi, (whole, label) => noteMissing(label))
        .replace(/\[(https?:\/\/[^\s\]]+)\]/gi, '$1')
        .replace(/\[([A-Za-z][A-Za-z ]{0,30}\blink)\]/gi, (whole, label) => noteMissing(label));
    // Inline-image references ([cid:...]), social-icon placeholders ([facebook icon]) and the import's own list of
    // attachment names carry nothing readable; the real files are shown separately as attachments.
    text = text
        .replace(/\[cid:[^\]\n]{1,200}\]/gi, '')
        .replace(/\[[A-Za-z][A-Za-z0-9 ._-]{0,40}\s(?:icon|logo)\]/gi, '')
        .replace(/(?:^|\n)\s*Attachments:\s*(?:\n\s*[^\n]{1,120}\.[A-Za-z0-9]{2,5}\s*)+$/i, '')
        .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    // Bare addresses: use the words just before the address on the same line ("View Property Photos:") as the label.
    const bare = /https?:\/\/[^\s<>"')\]]+/gi;
    let found;
    while ((found = bare.exec(text))) {
        const url = safeUrl(found[0].replace(/[.,;:!?]+$/, ''));
        if (!url) continue;
        const before = text.slice(Math.max(0, found.index - 80), found.index).split('\n').pop();
        const phrase = /([A-Za-z][A-Za-z0-9 '&/-]{2,60}?)\s*[:\-–]\s*$/.exec(before);
        add(phrase ? phrase[1].trim() : anchorLabel('', url), url);
    }
    return { text, links, missing };
}
