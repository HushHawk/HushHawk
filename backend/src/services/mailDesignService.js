/**
 * Premium mail designs: a matching envelope and letter for each touch, in the HushHawk navy and gold.
 * Nothing here is invented about the business: the company name, return address, phone and website come from the
 * "Mailing identity" the team saves, and anything left empty is simply not printed.
 * Art stays 0.25 in inside the paper edge, because office printers cannot print to the very edge.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EMBLEM = path.resolve(HERE, '../../../public/favicon-512x512.png');
const NAVY = rgb(0.039, 0.078, 0.149);
const NAVY_SOFT = rgb(0.075, 0.133, 0.231);
const IVORY = rgb(0.984, 0.969, 0.933);
const INK = rgb(0.106, 0.141, 0.2);
const MUTED = rgb(0.42, 0.463, 0.525);
const ACCENTS = { 1: rgb(0.929, 0.812, 0.486), 2: rgb(0.851, 0.643, 0.255), 3: rgb(0.718, 0.475, 0.169) };
const GOLD = rgb(0.788, 0.643, 0.282);
const IN = 72;

export const DESIGN_TOUCHES = {
    1: { name: 'First outreach', roman: 'I', band: 'A THOUGHTFUL INTRODUCTION', headline: 'A calm, no-pressure conversation',
        body: [
            'I am writing about the property shown above. We are a local team that buys homes in Jacksonville and the surrounding area, in any condition, and we take care of the details so the process stays simple.',
            'If selling is something you have considered, even loosely, I would welcome a short conversation. There is no obligation, no pressure, and nothing you need to prepare.',
            'You can reach me using the details below, or scan the code at the bottom of this page to ask for a call back at a time that suits you.'] },
    2: { name: 'Follow-up', roman: 'II', band: 'A FRIENDLY FOLLOW-UP', headline: 'Just following up',
        body: [
            'A little while ago I wrote to you about the property shown above. I wanted to follow up in case the timing was not right then, or the letter simply got set aside.',
            'If you would like to talk about your options, I am happy to answer questions with no obligation. A short call is all it takes, and you stay in control the whole way.',
            'You can reach me using the details below, or scan the code at the bottom of this page and I will call you back.'] },
    3: { name: 'Final courtesy', roman: 'III', band: 'A FINAL COURTESY NOTE', headline: 'A final note, with no pressure',
        body: [
            'This is my last note about the property shown above. I do not want to fill your mailbox, so I will leave it here.',
            'If your plans change, or you would simply like to know what a straightforward offer could look like, my details are below and the door stays open.',
            'Thank you for your time, and I wish you all the best with the property.'] }
};

const NEXT = {
    1: ['You get in touch', 'Call, or scan the code. Whatever is easiest for you.', 'We talk it through', 'A short, friendly conversation about the property and your plans.', 'You decide', 'There is never any obligation, and no pressure.'],
    2: ['One short call', 'A few minutes is all it takes to see whether it makes sense.', 'Your options, explained', 'We walk through them plainly and answer every question.', 'You stay in control', 'You decide whether to go further, or not.'],
    3: ['If your plans change', 'Reach out whenever the time feels right for you.', 'A straightforward conversation', 'No obligation, and no need to prepare anything.', 'Our details stay with you', 'They are printed at the bottom of this page.']
};

const clean = v => String(v ?? '').replace(/[\r\t]+/g, ' ').trim();

export function normalizeIdentity(raw = {}) {
    return {
        companyName: clean(raw.companyName || raw.company_name || 'Elite Homes USA Group').slice(0, 60),
        returnAddress: String(raw.returnAddress ?? raw.return_address ?? '').split(/\n/).map(clean).filter(Boolean).slice(0, 3).map(s => s.slice(0, 70)),
        phone: clean(raw.phone).slice(0, 30),
        website: clean(raw.website).replace(/^https?:\/\//i, '').slice(0, 60),
        signOff: clean(raw.signOff || raw.sign_off).slice(0, 50)
    };
}

// Standard fonts cover Latin text only; anything else is replaced so the file never fails to build.
const safe = (font, text) => { let out = ''; for (const ch of String(text)) { try { font.widthOfTextAtSize(ch, 10); out += ch; } catch { out += '?'; } } return out; };

function spaced(page, font, text, x, y, size, color, tracking = 1.6) {
    let cx = x;
    for (const ch of safe(font, text)) { page.drawText(ch, { x: cx, y, size, font, color }); cx += font.widthOfTextAtSize(ch, size) + tracking; }
    return cx - tracking;
}
const spacedWidth = (font, text, size, tracking) => [...safe(font, text)].reduce((w, ch) => w + font.widthOfTextAtSize(ch, size) + tracking, 0) - tracking;

function wrap(font, text, size, maxWidth) {
    const lines = []; let line = '';
    for (const word of safe(font, text).split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next; else { if (line) lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
}

async function emblem(doc) { return doc.embedPng(fs.readFileSync(EMBLEM)); }

export async function buildEnvelopeDesign({ touch, identity }) {
    const t = DESIGN_TOUCHES[touch]; if (!t) throw new Error('touch must be 1, 2 or 3');
    const id = normalizeIdentity(identity);
    const doc = await PDFDocument.create();
    const W = 9.5 * IN, H = 4.125 * IN;
    const page = doc.addPage([W, H]);
    const serifB = await doc.embedFont(StandardFonts.TimesRomanBold);
    const serif = await doc.embedFont(StandardFonts.TimesRoman);
    const sans = await doc.embedFont(StandardFonts.Helvetica);
    const sansB = await doc.embedFont(StandardFonts.HelveticaBold);
    const accent = ACCENTS[touch];
    const m = 18; // keep clear of the paper edge

    // ivory card with a double gold border
    page.drawRectangle({ x: m, y: m, width: W - 2 * m, height: H - 2 * m, color: IVORY });
    page.drawRectangle({ x: m, y: m, width: W - 2 * m, height: H - 2 * m, borderColor: GOLD, borderWidth: 1.1 });
    page.drawRectangle({ x: m + 4, y: m + 4, width: W - 2 * m - 8, height: H - 2 * m - 8, borderColor: accent, borderWidth: 0.4 });

    // navy band on the left with the emblem
    const bandW = 74, bx = m + 4, by = m + 4, bh = H - 2 * m - 8;
    page.drawRectangle({ x: bx, y: by, width: bandW, height: bh, color: NAVY });
    page.drawRectangle({ x: bx + bandW - 2.2, y: by, width: 2.2, height: bh, color: accent });
    const img = await emblem(doc);
    const es = 50;
    page.drawImage(img, { x: bx + (bandW - es) / 2, y: by + bh / 2 - es / 2 + 14, width: es, height: es });
    const roman = `No. ${t.roman}`;
    page.drawText(roman, { x: bx + (bandW - serifB.widthOfTextAtSize(roman, 11)) / 2, y: by + bh / 2 - es / 2 - 6, size: 11, font: serifB, color: accent });

    // wordmark and return address
    const lx = bx + bandW + 22;
    const wm = id.companyName.toUpperCase();
    const wmSize = Math.min(14, 300 / Math.max(10, wm.length) * 1.55);
    spaced(page, serifB, wm, lx, H - m - 40, wmSize, NAVY, 1.9);
    page.drawRectangle({ x: lx, y: H - m - 49, width: 150, height: 0.9, color: GOLD });
    let ry = H - m - 62;
    for (const line of id.returnAddress) { page.drawText(safe(sans, line), { x: lx, y: ry, size: 7.6, font: sans, color: MUTED }); ry -= 10.5; }

    // bottom label strip
    const sx = bx + bandW + 2.2, sw = W - m - 4 - sx, sh = 25;
    page.drawRectangle({ x: sx, y: by, width: sw, height: sh, color: NAVY });
    page.drawRectangle({ x: sx, y: by + sh - 1.2, width: sw, height: 1.2, color: accent });
    spaced(page, sansB, t.band, sx + 22, by + 9, 7.6, accent, 2.4);
    const right = id.website ? id.website.toUpperCase() : '';
    if (right) { const w = spacedWidth(sansB, right, 6.6, 1.5); spaced(page, sansB, right, sx + sw - 22 - w, by + 9.4, 6.6, rgb(0.78, 0.82, 0.88), 1.5); }
    page.drawRectangle({ x: sx, y: by, width: sw, height: 0.01, color: NAVY_SOFT });
    return doc.save();
}

export async function buildLetterDesign({ touch, identity }) {
    const t = DESIGN_TOUCHES[touch]; if (!t) throw new Error('touch must be 1, 2 or 3');
    const id = normalizeIdentity(identity);
    const doc = await PDFDocument.create();
    const W = 8.5 * IN, H = 11 * IN;
    const page = doc.addPage([W, H]);
    const serifB = await doc.embedFont(StandardFonts.TimesRomanBold);
    const serif = await doc.embedFont(StandardFonts.TimesRoman);
    const serifI = await doc.embedFont(StandardFonts.TimesRomanItalic);
    const sans = await doc.embedFont(StandardFonts.Helvetica);
    const sansB = await doc.embedFont(StandardFonts.HelveticaBold);
    const accent = ACCENTS[touch];
    const mx = 54;

    // letterhead
    page.drawRectangle({ x: mx, y: H - 40, width: W - 2 * mx, height: 3.2, color: NAVY });
    const img = await emblem(doc);
    page.drawImage(img, { x: mx, y: H - 112, width: 54, height: 54 });
    const wm = id.companyName.toUpperCase();
    spaced(page, serifB, wm, mx + 68, H - 82, Math.min(18, 330 / Math.max(10, wm.length) * 1.55), NAVY, 2.2);
    spaced(page, sansB, t.band, mx + 68, H - 98, 7.2, GOLD, 2.2);
    const contact = [id.phone, id.website].filter(Boolean);
    let cy = H - 76;
    for (const c of contact) { const w = sans.widthOfTextAtSize(safe(sans, c), 8.6); page.drawText(safe(sans, c), { x: W - mx - w, y: cy, size: 8.6, font: sans, color: MUTED }); cy -= 12; }
    page.drawRectangle({ x: mx, y: H - 124, width: W - 2 * mx, height: 1, color: GOLD });
    page.drawRectangle({ x: mx, y: H - 127.5, width: 90, height: 1.6, color: accent });

    // the owner's name and property line are printed here when "print owner name" is on (about 2.1 in from the top)
    // body
    let y = H - 232;
    page.drawText(safe(serifB, t.headline), { x: mx, y, size: 19, font: serifB, color: NAVY });
    y -= 16;
    page.drawRectangle({ x: mx, y, width: 48, height: 1.4, color: accent });
    y -= 28;
    page.drawText('Dear Property Owner,', { x: mx, y, size: 11.8, font: serif, color: INK });
    y -= 24;
    for (const para of t.body) {
        for (const line of wrap(serif, para, 11.8, W - 2 * mx)) { page.drawText(line, { x: mx, y, size: 11.8, font: serif, color: INK }); y -= 16.5; }
        y -= 9;
    }
    y -= 6;
    // what happens next: three short steps in a soft ivory panel
    const bh = 92, by = y - bh;
    page.drawRectangle({ x: mx, y: by, width: W - 2 * mx, height: bh, color: IVORY });
    page.drawRectangle({ x: mx, y: by, width: 3, height: bh, color: accent });
    spaced(page, sansB, 'WHAT HAPPENS NEXT', mx + 18, by + bh - 17, 7.2, GOLD, 2.2);
    const colW = (W - 2 * mx - 36 - 2 * 18) / 3;
    for (let i = 0; i < 3; i++) {
        const cx = mx + 18 + i * (colW + 18);
        page.drawText(String(i + 1), { x: cx, y: by + bh - 44, size: 19, font: serifB, color: accent });
        page.drawText(safe(sansB, NEXT[touch][i * 2]), { x: cx + 18, y: by + bh - 38, size: 8.6, font: sansB, color: NAVY });
        wrap(sans, NEXT[touch][i * 2 + 1], 7.8, colW - 18).forEach((line, k) => page.drawText(line, { x: cx + 18, y: by + bh - 51 - k * 10, size: 7.8, font: sans, color: MUTED }));
    }
    y = by - 30;
    page.drawText('Sincerely,', { x: mx, y, size: 11.8, font: serif, color: INK });
    y -= 28;
    page.drawText(safe(serifI, id.signOff || id.companyName), { x: mx, y, size: 14, font: serifI, color: NAVY });
    if (id.signOff) { y -= 15; page.drawText(safe(sans, id.companyName), { x: mx, y, size: 8.8, font: sans, color: MUTED }); }

    // footer, kept left of the response QR code
    const fy = 122;
    page.drawRectangle({ x: mx, y: fy, width: W - 2 * mx, height: 0.8, color: GOLD });
    let ty = fy - 13;
    const foot = [id.companyName, ...id.returnAddress, [id.phone, id.website].filter(Boolean).join('   |   ')].filter(Boolean);
    foot.forEach((line, i) => { page.drawText(safe(i === 0 ? sansB : sans, line), { x: mx, y: ty, size: i === 0 ? 8.2 : 7.8, font: i === 0 ? sansB : sans, color: i === 0 ? NAVY : MUTED }); ty -= 10.4; });
    const note = 'If your property is currently listed with a real estate broker, please disregard this letter. To stop receiving mail from us, contact us using the details above and we will remove you from our list.';
    const noteLines = wrap(sans, note, 6.6, 372);
    noteLines.forEach((line, i) => page.drawText(line, { x: mx, y: ty - 2 - i * 8.4, size: 6.6, font: sans, color: MUTED }));
    const cap = 'Scan to request a call back';
    const cw = sans.widthOfTextAtSize(cap, 7.2);
    page.drawText(cap, { x: W - 0.5 * IN - 0.62 * IN - 8 - cw, y: 0.3 * IN + 0.62 * IN / 2 - 3, size: 7.2, font: sans, color: MUTED });
    return doc.save();
}

/** What "Use the premium design" sets for the letter and envelope placement. */
export const DESIGN_PLACEMENT = {
    LETTER: { printName: true, nameXIn: 0.75, nameYIn: 2.0, fontPt: 11, qr: true },
    ENVELOPE: { addressXIn: 3.95, addressYIn: 1.7, fontPt: 11 }
};
