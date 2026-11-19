/**
 * In-house mailing. We print and pack our own mail, so there is no mail vendor here.
 * - Each touch (1 first outreach, 2 follow-up, 3 final courtesy) has one uploaded letter and one matching envelope.
 * - The audience is checked (owner of record, deliverable mailing address, response, opt-out, returned mail, duplicates, touch order).
 * - A run gives every piece a unique mailpiece ID and response token, then produces a ZIP: a sorted mailing list (CSV),
 *   the letters (PDF) and the envelopes (PDF) in the same order, so each letter meets its envelope at the packing machine.
 */
import crypto from 'crypto';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { zipSync, strToU8 } from 'fflate';
import { pool, withTransaction, audit } from '../store/pgClient.js';
import { StorageService } from './storageService.js';
import { HttpError } from './eventService.js';

export const TOUCHES = { 1: 'First outreach', 2: 'Follow-up', 3: 'Final courtesy' };
export const MAX_PIECES_PER_RUN = 1500;
// The pillar that decides how a property is filed when it has more than one signal (most urgent first).
const PILLAR_PRIORITY = ['FC', 'PFC', 'TAX', 'TCERT', 'TDEED', 'PRB', 'INH', 'CODE', 'ML', 'EVI', 'VAC', 'OOS', 'ABS'];
const PILLAR_LABELS = { FC: 'Foreclosure', PFC: 'Pre-Foreclosure', TAX: 'Tax Delinquency', TCERT: 'Tax Certificate', TDEED: 'Tax Deed', CODE: 'Code Violation', PRB: 'Probate / Estate',
    INH: 'Inherited', VAC: 'Vacant Property', ML: 'Municipal Lien', EVI: 'Eviction', ABS: 'Absentee Owner', OOS: 'Out-of-State Owner' };
const IN = 72; // PDF points per inch
const DEFAULT_ENVELOPE = { widthIn: 9.5, heightIn: 4.125 };
const LETTER_PAGE = { widthIn: 8.5, heightIn: 11 };
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const pillarLabel = code => PILLAR_LABELS[code] || code;

/** Replaces this when testing, so templates can come from memory. */
export const templateStore = {
    load: objectKey => StorageService.getObjectBuffer({ objectKey })
};

// ---------- addresses ----------
export function parseMailingAddress(raw) {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    const parts = text.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length >= 3) {
        const zip = parts[parts.length - 1];
        const state = parts[parts.length - 2];
        if (/^\d{5}(-\d{4})?$/.test(zip) && /^[A-Za-z]{2}$/.test(state)) {
            const city = parts[parts.length - 3];
            const street = parts.slice(0, -3).join(', ');
            if (street && city) return { street, city, state: state.toUpperCase(), zip, lines: [street, `${city}, ${state.toUpperCase()} ${zip}`] };
        }
    }
    return null; // not a deliverable address we can print in the standard layout
}

// ---------- audience ----------
function primaryPillar(codes) {
    for (const code of PILLAR_PRIORITY) if (codes.includes(code)) return code;
    return codes[0] || null;
}

/**
 * Who can receive this touch right now, and why everyone else cannot.
 * Touch 1: never mailed. Touch 2 / 3: the previous touch was mailed at least `gapDays` ago.
 * Anyone who is already a lead, opted out, had mail returned, or was already sent this touch is left out.
 */
export async function buildAudience({ touch, pillars = [], gapDays = 14, includePossible = false } = {}) {
    touch = Number(touch);
    if (![1, 2, 3].includes(touch)) throw new HttpError(400, 'touch must be 1, 2 or 3.');
    gapDays = Math.max(0, Math.min(365, Number(gapDays) || 0));
    const statuses = includePossible ? ['CONFIRMED', 'POSSIBLE'] : ['CONFIRMED'];

    const { rows } = await pool.query(
        `SELECT p.property_id, p.parcel_raw, p.address_line1, p.city, p.state_code, p.postal_code, p.metadata, c.county_code,
                coalesce((SELECT array_agg(e.pillar_code ORDER BY e.pillar_code) FROM core.pillar_events e
                          WHERE e.property_id = p.property_id AND e.verification_status = ANY($1) AND e.event_status <> 'HISTORICAL'), '{}') AS pillars,
                (SELECT e.event_number FROM core.pillar_events e WHERE e.property_id = p.property_id AND e.verification_status = ANY($1) ORDER BY e.event_date DESC NULLS LAST, e.event_number DESC LIMIT 1) AS latest_event,
                EXISTS (SELECT 1 FROM core.leads l WHERE l.property_id = p.property_id AND l.status <> 'QUEUED_FOR_SKIP_TRACE') AS is_lead,
                EXISTS (SELECT 1 FROM core.direct_mail_pieces m JOIN core.direct_mail_scans s USING (piece_id) WHERE m.property_id = p.property_id AND s.cta_converted) AS responded,
                EXISTS (SELECT 1 FROM core.direct_mail_pieces m WHERE m.property_id = p.property_id AND m.status IN ('RETURNED', 'OPTED_OUT')) AS blocked,
                (SELECT status FROM core.direct_mail_pieces m WHERE m.property_id = p.property_id AND m.touch = $2) AS this_touch_status,
                (SELECT m.status || '|' || coalesce(m.mailed_at::text, '') FROM core.direct_mail_pieces m WHERE m.property_id = p.property_id AND m.touch = $2 - 1) AS previous_touch
         FROM core.properties p JOIN ref.counties c ON c.county_id = p.county_id
         ORDER BY c.county_code, p.parcel_raw`, [statuses, touch]);

    const reasons = {};
    const skip = reason => { reasons[reason] = (reasons[reason] || 0) + 1; };
    const eligible = [];
    const seenOwnerAddress = new Set();
    const cutoff = Date.now() - gapDays * 86400000;
    const wanted = new Set((pillars || []).map(s => String(s).toUpperCase()).filter(Boolean));

    for (const r of rows) {
        const meta = r.metadata || {};
        const codes = r.pillars || [];
        if (!codes.length) { skip('No recorded event (signal) on this property'); continue; }
        const pillar = wanted.size ? PILLAR_PRIORITY.concat(codes).find(code => wanted.has(code) && codes.includes(code)) : primaryPillar(codes);
        if (!pillar) { skip('Outside the pillars chosen'); continue; }
        const owner = String(meta.county_owner_of_record || '').trim();
        if (!owner) { skip('Owner not matched to the parcel (no county owner of record)'); continue; }
        const mailing = parseMailingAddress(meta.owner_mailing);
        if (!mailing) { skip('No deliverable mailing address'); continue; }
        if (r.blocked) { skip('Opted out or mail was returned'); continue; }
        if (r.is_lead) { skip('Already a lead in the pipeline'); continue; }
        if (r.responded) { skip('Responded to earlier mail'); continue; }
        if (r.this_touch_status) { skip(`Already sent this touch`); continue; }
        if (touch > 1) {
            const [prevStatus, prevAt] = String(r.previous_touch || '|').split('|');
            if (!prevStatus) { skip(`Touch ${touch - 1} has not been sent`); continue; }
            if (prevStatus !== 'MAILED') { skip(`Touch ${touch - 1} is printed but not marked as mailed`); continue; }
            if (prevAt && new Date(prevAt).getTime() > cutoff) { skip(`Waiting ${gapDays} days after touch ${touch - 1}`); continue; }
        }
        const dupKey = `${owner.toUpperCase()}|${mailing.lines.join('|').toUpperCase()}`;
        if (seenOwnerAddress.has(dupKey)) { skip('Same owner and address as another property (mailed once)'); continue; }
        seenOwnerAddress.add(dupKey);
        eligible.push({
            propertyId: r.property_id, countyCode: r.county_code, parcel: r.parcel_raw, pillar, pillarName: pillarLabel(pillar),
            crownKey: `${r.county_code}-${r.parcel_raw}-${pillar}-${String(r.latest_event || 1).padStart(3, '0')}`,
            ownerName: owner, mailing, propertyAddress: [r.address_line1, r.city, r.state_code, r.postal_code].filter(Boolean).join(', ')
        });
    }
    eligible.sort((a, b) => PILLAR_PRIORITY.indexOf(a.pillar) - PILLAR_PRIORITY.indexOf(b.pillar) || a.crownKey.localeCompare(b.crownKey));

    const byPillar = {};
    eligible.forEach(e => { byPillar[e.pillar] = (byPillar[e.pillar] || 0) + 1; });
    const checks = [
        { key: 'owner', label: 'Owner ↔ parcel', detail: 'County ownership record matches the parcel', total: rows.length, failed: rows.length - rows.filter(r => (r.metadata || {}).county_owner_of_record).length },
        { key: 'address', label: 'Mailing address', detail: 'Street, city, state and ZIP are present', total: rows.length, failed: rows.filter(r => !parseMailingAddress((r.metadata || {}).owner_mailing)).length },
        { key: 'suppression', label: 'Suppression review', detail: 'Response, opt-out, duplicate, returned mail', total: rows.length, failed: (reasons['Opted out or mail was returned'] || 0) + (reasons['Responded to earlier mail'] || 0) + (reasons['Already a lead in the pipeline'] || 0) + (reasons['Same owner and address as another property (mailed once)'] || 0) }
    ];
    return { touch, touchName: TOUCHES[touch], gapDays, includePossible, registered: rows.length, eligibleCount: eligible.length, byPillar, reasons, checks, eligible };
}

// ---------- templates ----------
const isPdf = buf => buf.length > 4 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
const isPng = buf => buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
const isJpg = buf => buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

export async function inspectTemplate(buf) {
    if (isPdf(buf)) {
        const doc = await PDFDocument.load(buf, { ignoreEncryption: false });
        const page = doc.getPage(0);
        return { type: 'application/pdf', pages: doc.getPageCount(), widthPt: page.getWidth(), heightPt: page.getHeight() };
    }
    if (isPng(buf) || isJpg(buf)) return { type: isPng(buf) ? 'image/png' : 'image/jpeg', pages: 1 };
    throw new HttpError(400, 'The file must be a PDF, PNG or JPG.');
}

export async function registerTemplate({ touch, kind, objectKey, filename, size, actor }) {
    touch = Number(touch); kind = String(kind || '').toUpperCase();
    if (![1, 2, 3].includes(touch) || !['LETTER', 'ENVELOPE'].includes(kind)) throw new HttpError(400, 'Choose a touch (1-3) and letter or envelope.');
    if (!objectKey || !String(objectKey).startsWith('mail-templates/')) throw new HttpError(400, 'The file was not uploaded to the template area.');
    let buf;
    try { buf = await templateStore.load(objectKey); } catch (error) { throw new HttpError(400, `The uploaded file could not be read: ${error.message}`); }
    const info = await inspectTemplate(buf).catch(error => { throw error instanceof HttpError ? error : new HttpError(400, `That PDF could not be opened (${error.message}). If it is password-protected, remove the password and upload it again.`); });
    return withTransaction(async client => {
        await client.query('UPDATE crm.mail_templates SET active = FALSE WHERE touch = $1 AND kind = $2 AND active', [touch, kind]);
        const { rows: [row] } = await client.query(
            `INSERT INTO crm.mail_templates (touch, kind, filename, content_type, object_key, size_bytes, pages, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`, [touch, kind, String(filename || 'file').slice(0, 200), info.type, objectKey, Number(size) || buf.length, info.pages, actor || null]);
        await audit(client, { actor, action: 'MAIL_TEMPLATE_UPLOADED', entityType: 'MAIL_TEMPLATE', entityId: row.template_id, diff: { touch, kind, filename: row.filename, pages: info.pages } });
        return row;
    });
}

export async function listTemplates() {
    const { rows } = await pool.query('SELECT template_id, touch, kind, filename, content_type, pages, placement, uploaded_by, created_at FROM crm.mail_templates WHERE active ORDER BY touch, kind');
    return rows;
}

const clampIn = (v, max) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(max, Math.round(n * 100) / 100)) : null; };
export function cleanPlacement(kind, body = {}) {
    if (kind === 'ENVELOPE') {
        return { addressXIn: clampIn(body.addressXIn, 20), addressYIn: clampIn(body.addressYIn, 20), fontPt: Math.max(7, Math.min(16, Number(body.fontPt) || 11)), returnNote: false };
    }
    return {
        printName: Boolean(body.printName), nameXIn: clampIn(body.nameXIn, 12), nameYIn: clampIn(body.nameYIn, 20), fontPt: Math.max(7, Math.min(16, Number(body.fontPt) || 11)),
        qr: body.qr === undefined ? true : Boolean(body.qr)
    };
}

export async function savePlacement(templateId, body, actor) {
    const { rows: [t] } = await pool.query('SELECT template_id, kind FROM crm.mail_templates WHERE template_id = $1 AND active', [templateId]);
    if (!t) throw new HttpError(404, 'Template not found.');
    const placement = cleanPlacement(t.kind, body);
    await pool.query('UPDATE crm.mail_templates SET placement = $2 WHERE template_id = $1', [templateId, JSON.stringify(placement)]);
    await audit(pool, { actor, action: 'MAIL_TEMPLATE_PLACEMENT', entityType: 'MAIL_TEMPLATE', entityId: templateId, diff: placement });
    return placement;
}

// ---------- PDFs ----------
async function safeText(font, text) {
    let out = '';
    for (const ch of String(text)) { try { font.widthOfTextAtSize(ch, 10); out += ch; } catch { out += '?'; } }
    return out;
}

async function embedArt(doc, buf, info) {
    if (info.type === 'application/pdf') {
        const indices = Array.from({ length: info.pages }, (_, i) => i);
        const pages = await doc.embedPdf(buf, indices);
        return { kind: 'pdf', pages };
    }
    const image = info.type === 'image/png' ? await doc.embedPng(buf) : await doc.embedJpg(buf);
    return { kind: 'image', image };
}

function drawArt(page, art, index, width, height) {
    if (art.kind === 'pdf') {
        const src = art.pages[index];
        page.drawPage(src, { x: 0, y: 0, width, height });
    } else {
        const scale = Math.min(width / art.image.width, height / art.image.height);
        const w = art.image.width * scale, h = art.image.height * scale;
        page.drawImage(art.image, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h });
    }
}

function artSize(info, fallbackIn) {
    return info.type === 'application/pdf' ? { width: info.widthPt, height: info.heightPt } : { width: fallbackIn.widthIn * IN, height: fallbackIn.heightIn * IN };
}

/** Default spot for the address on a standard #10 envelope (a little right of centre, lower half). */
function envelopeSpot(width, height, placement) {
    const x = placement.addressXIn ?? Math.round((width / IN) * 0.42 * 100) / 100;
    const y = placement.addressYIn ?? Math.round((height / IN) * 0.46 * 100) / 100;
    return { x: x * IN, topY: y * IN };
}

export async function buildEnvelopesPdf(pieces, envelope) {
    const info = await inspectTemplate(envelope.bytes);
    const size = artSize(info, DEFAULT_ENVELOPE);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const art = await embedArt(doc, envelope.bytes, info);
    const placement = envelope.placement || {};
    const fontPt = placement.fontPt || 11;
    const spot = envelopeSpot(size.width, size.height, placement);
    for (const piece of pieces) {
        const page = doc.addPage([size.width, size.height]);
        drawArt(page, art, 0, size.width, size.height);
        const lines = [piece.ownerName, ...piece.mailing.lines];
        let y = size.height - spot.topY;
        for (const line of lines) {
            page.drawText(await safeText(font, line.toUpperCase()), { x: spot.x, y, size: fontPt, font, color: rgb(0.05, 0.05, 0.05) });
            y -= fontPt * 1.25;
        }
        page.drawText(await safeText(font, piece.mailpieceId), { x: 14, y: 10, size: 6, font, color: rgb(0.45, 0.45, 0.45) });
    }
    return doc.save();
}

export async function buildLettersPdf(pieces, letter) {
    const info = await inspectTemplate(letter.bytes);
    const size = artSize(info, LETTER_PAGE);
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const art = await embedArt(doc, letter.bytes, info);
    const placement = letter.placement || {};
    const fontPt = placement.fontPt || 11;
    for (const piece of pieces) {
        for (let i = 0; i < info.pages; i++) {
            const page = doc.addPage([size.width, size.height]);
            drawArt(page, art, i, size.width, size.height);
            if (i !== 0) continue;
            if (placement.printName && placement.nameXIn != null && placement.nameYIn != null) {
                let y = size.height - placement.nameYIn * IN;
                for (const line of [piece.ownerName, `Re: ${piece.propertyAddress}`]) {
                    page.drawText(await safeText(font, line), { x: placement.nameXIn * IN, y, size: fontPt, font, color: rgb(0.1, 0.1, 0.1) });
                    y -= fontPt * 1.3;
                }
            }
            // Response code in the bottom margin: the mailpiece ID, the token the owner can quote, and a QR that records the scan.
            page.drawText(await safeText(font, `${piece.mailpieceId}   ·   ${piece.token}`), { x: 0.5 * IN, y: 0.3 * IN, size: 7, font: bold, color: rgb(0.4, 0.4, 0.4) });
            if (placement.qr !== false && piece.trackingUrl) {
                const png = await QRCode.toBuffer(piece.trackingUrl, { margin: 0, width: 240, errorCorrectionLevel: 'M' });
                const image = await doc.embedPng(png);
                const qr = 0.62 * IN;
                page.drawImage(image, { x: size.width - 0.5 * IN - qr, y: 0.3 * IN, width: qr, height: qr });
            }
        }
    }
    return doc.save();
}

const csvCell = value => {
    if (value === null || value === undefined) return '';
    let text = String(value);
    if (/^(?:[=@\t\r]|[+-](?![\d.]))/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
};

export function buildMailingListCsv(pieces) {
    const header = ['Mailpiece ID', 'Touch', 'Pillar', 'CrownKey', 'County', 'Parcel', 'Owner Name', 'Mailing Street', 'Mailing City', 'Mailing State', 'Mailing ZIP', 'Property Address', 'Response Token', 'Tracking URL'];
    const rows = pieces.map(p => [p.mailpieceId, p.touch, `${p.pillar} - ${p.pillarName}`, p.crownKey, p.countyCode, p.parcel, p.ownerName, p.mailing.street, p.mailing.city, p.mailing.state, p.mailing.zip, p.propertyAddress, p.token, p.trackingUrl]);
    return '﻿' + [header, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

/** The whole package for one run: list + letters + envelopes, all in the same order. */
export async function buildPackage({ run, pieces, letter, envelope }) {
    const [lettersPdf, envelopesPdf] = await Promise.all([buildLettersPdf(pieces, letter), buildEnvelopesPdf(pieces, envelope)]);
    const folder = `${run.run_code}_T${run.touch}`;
    const readme = [
        `HushHawk mailing run ${run.run_code}`,
        `Touch ${run.touch}: ${TOUCHES[run.touch]}`,
        `Pieces: ${pieces.length}`,
        '',
        'letters.pdf and envelopes.pdf are in the same order as mailing_list.csv (by pillar, then CrownKey),',
        'so page N of the envelopes belongs with letter N. Every piece has a mailpiece ID and a response token.',
        'After the pieces go out, open the run in HushHawk and choose "Mark as mailed" so the next touch can be planned.'
    ].join('\n');
    return zipSync({
        [`${folder}/mailing_list.csv`]: strToU8(buildMailingListCsv(pieces)),
        [`${folder}/letters.pdf`]: lettersPdf,
        [`${folder}/envelopes.pdf`]: envelopesPdf,
        [`${folder}/README.txt`]: strToU8(readme)
    }, { level: 1 });
}

// ---------- runs ----------
function newToken(touch) {
    let s = '';
    for (const b of crypto.randomBytes(4)) s += ID_ALPHABET[b % ID_ALPHABET.length];
    return `T${touch}-${s}`;
}

export function trackingOrigin() {
    return String(process.env.PUBLIC_APP_ORIGIN || 'https://hushhawk-kohl.vercel.app').split(',')[0].trim().replace(/\/$/, '');
}

export async function activeTemplates(touch) {
    const { rows } = await pool.query('SELECT * FROM crm.mail_templates WHERE touch = $1 AND active', [touch]);
    return { letter: rows.find(r => r.kind === 'LETTER') || null, envelope: rows.find(r => r.kind === 'ENVELOPE') || null };
}

export async function createRun({ touch, pillars = [], gapDays = 14, includePossible = false, limit = MAX_PIECES_PER_RUN, propertyIds = null, label = '', actor }) {
    touch = Number(touch);
    const templates = await activeTemplates(touch);
    if (!templates.letter || !templates.envelope) {
        throw new HttpError(409, `Upload the ${TOUCHES[touch] || 'touch'} letter and its matching envelope first.`);
    }
    const audience = await buildAudience({ touch, pillars, gapDays, includePossible });
    let chosen = audience.eligible;
    if (Array.isArray(propertyIds) && propertyIds.length) { const ids = new Set(propertyIds); chosen = chosen.filter(e => ids.has(e.propertyId)); }
    const cap = Math.max(1, Math.min(MAX_PIECES_PER_RUN, Number(limit) || MAX_PIECES_PER_RUN));
    chosen = chosen.slice(0, cap);
    if (!chosen.length) throw new HttpError(409, 'Nobody is eligible for this touch right now.');

    const origin = trackingOrigin();
    return withTransaction(async client => {
        const runId = crypto.randomUUID();
        const runCode = `RUN-${new Date().getUTCFullYear()}${String(new Date().getUTCMonth() + 1).padStart(2, '0')}${String(new Date().getUTCDate()).padStart(2, '0')}-${runId.slice(0, 4).toUpperCase()}`;
        await client.query(
            `INSERT INTO crm.mail_runs (run_id, run_code, touch, label, letter_template_id, envelope_template_id, piece_count, options, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [runId, runCode, touch, String(label || '').slice(0, 120) || null, templates.letter.template_id, templates.envelope.template_id, chosen.length,
                JSON.stringify({ pillars, gapDays, includePossible }), actor || null]);
        for (const piece of chosen) {
            const { rows: [{ n }] } = await client.query("SELECT nextval('crm.mail_piece_seq') AS n");
            const mailpieceId = `HH-${String(n).padStart(9, '0')}`;
            const pieceId = crypto.randomUUID();
            const trackingUrl = `${origin}/api/v1/track/qr/${encodeURIComponent(piece.crownKey)}?piece=${pieceId}`;
            let token = newToken(touch);
            for (let attempt = 0; attempt < 5; attempt++) {
                const { rowCount } = await client.query('SELECT 1 FROM core.direct_mail_pieces WHERE token = $1', [token]);
                if (!rowCount) break;
                token = newToken(touch);
            }
            await client.query(
                `INSERT INTO core.direct_mail_pieces (piece_id, batch_code, crown_key, county_code, pillar_code, property_id, address, owner_name, qr_tracking_url, status,
                                                      run_id, touch, mailpiece_id, token, mailing_address, parcel)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PRINTED', $10, $11, $12, $13, $14, $15)`,
                [pieceId, runCode, piece.crownKey, piece.countyCode, piece.pillar, piece.propertyId, piece.propertyAddress || 'Address unavailable', piece.ownerName, trackingUrl,
                    runId, touch, mailpieceId, token, piece.mailing.lines.join(', '), piece.parcel]);
        }
        await audit(client, { actor, action: 'MAIL_RUN_CREATED', entityType: 'MAIL_RUN', entityId: runId, diff: { runCode, touch, pieces: chosen.length, pillars, gapDays } });
        return { runId, runCode, touch, pieceCount: chosen.length };
    });
}

/** Pieces of a run as the producers need them, in packing order. */
export async function loadRunPieces(runId) {
    const { rows } = await pool.query(
        `SELECT m.piece_id, m.mailpiece_id, m.token, m.touch, m.crown_key, m.county_code, m.pillar_code, m.parcel, m.owner_name, m.mailing_address, m.address, m.qr_tracking_url
         FROM core.direct_mail_pieces m WHERE m.run_id = $1`, [runId]);
    const order = code => { const i = PILLAR_PRIORITY.indexOf(code); return i < 0 ? 99 : i; };
    return rows.map(r => {
        const mailing = parseMailingAddress(r.mailing_address) || { street: r.mailing_address, city: '', state: '', zip: '', lines: [r.mailing_address] };
        return { pieceId: r.piece_id, mailpieceId: r.mailpiece_id, token: r.token, touch: r.touch, crownKey: r.crown_key, countyCode: r.county_code, pillar: r.pillar_code, pillarName: pillarLabel(r.pillar_code),
            parcel: r.parcel, ownerName: r.owner_name, mailing, propertyAddress: r.address, trackingUrl: r.qr_tracking_url };
    }).sort((a, b) => order(a.pillar) - order(b.pillar) || a.crownKey.localeCompare(b.crownKey) || a.mailpieceId.localeCompare(b.mailpieceId));
}

export async function loadRunTemplates(run) {
    const { rows } = await pool.query('SELECT * FROM crm.mail_templates WHERE template_id = ANY($1::uuid[])', [[run.letter_template_id, run.envelope_template_id]]);
    const letterRow = rows.find(r => r.template_id === run.letter_template_id), envelopeRow = rows.find(r => r.template_id === run.envelope_template_id);
    if (!letterRow || !envelopeRow) throw new HttpError(409, 'The templates for this run are missing.');
    const [letterBytes, envelopeBytes] = await Promise.all([templateStore.load(letterRow.object_key), templateStore.load(envelopeRow.object_key)]);
    return { letter: { bytes: letterBytes, placement: letterRow.placement }, envelope: { bytes: envelopeBytes, placement: envelopeRow.placement } };
}

export async function markMailed(runId, actor) {
    return withTransaction(async client => {
        const { rows: [run] } = await client.query('SELECT run_id, status FROM crm.mail_runs WHERE run_id = $1 FOR UPDATE', [runId]);
        if (!run) throw new HttpError(404, 'Run not found.');
        const { rowCount } = await client.query("UPDATE core.direct_mail_pieces SET status = 'MAILED', mailed_at = now() WHERE run_id = $1 AND status = 'PRINTED'", [runId]);
        await client.query("UPDATE crm.mail_runs SET status = 'MAILED', mailed_at = coalesce(mailed_at, now()) WHERE run_id = $1", [runId]);
        await audit(client, { actor, action: 'MAIL_RUN_MARKED_MAILED', entityType: 'MAIL_RUN', entityId: runId, diff: { pieces: rowCount } });
        return { marked: rowCount };
    });
}

export async function setPieceStatus({ mailpieceId, status, actor }) {
    if (!['RETURNED', 'OPTED_OUT'].includes(status)) throw new HttpError(400, 'status must be RETURNED or OPTED_OUT.');
    const { rows: [piece] } = await pool.query("UPDATE core.direct_mail_pieces SET status = $2 WHERE mailpiece_id = $1 RETURNING piece_id, property_id", [String(mailpieceId || '').trim().toUpperCase(), status]);
    if (!piece) throw new HttpError(404, 'No mail piece has that ID.');
    await audit(pool, { actor, action: `MAIL_PIECE_${status}`, entityType: 'MAIL_PIECE', entityId: piece.piece_id, diff: { mailpieceId, status } });
    return { ok: true };
}

export async function listRuns() {
    const { rows } = await pool.query(
        `SELECT r.run_id, r.run_code, r.touch, r.label, r.piece_count, r.status, r.created_by, r.created_at, r.mailed_at,
                (SELECT count(*)::int FROM core.direct_mail_pieces m WHERE m.run_id = r.run_id AND m.status IN ('RETURNED', 'OPTED_OUT')) AS problems,
                (SELECT count(*)::int FROM core.direct_mail_scans s JOIN core.direct_mail_pieces m USING (piece_id) WHERE m.run_id = r.run_id) AS scans,
                (SELECT count(*)::int FROM core.direct_mail_scans s JOIN core.direct_mail_pieces m USING (piece_id) WHERE m.run_id = r.run_id AND s.cta_converted) AS responses
         FROM crm.mail_runs r ORDER BY r.created_at DESC LIMIT 100`);
    return rows;
}

export async function trackingSummary() {
    const { rows } = await pool.query(
        `SELECT m.touch, count(*)::int AS pieces,
                count(*) FILTER (WHERE m.status = 'MAILED')::int AS mailed,
                count(*) FILTER (WHERE m.status IN ('RETURNED', 'OPTED_OUT'))::int AS problems,
                (SELECT count(*)::int FROM core.direct_mail_scans s JOIN core.direct_mail_pieces x USING (piece_id) WHERE x.touch = m.touch) AS scans,
                (SELECT count(*)::int FROM core.direct_mail_scans s JOIN core.direct_mail_pieces x USING (piece_id) WHERE x.touch = m.touch AND s.cta_converted) AS responses
         FROM core.direct_mail_pieces m WHERE m.touch IS NOT NULL GROUP BY m.touch ORDER BY m.touch`);
    const { rows: pillars } = await pool.query(
        `SELECT pillar_code, touch, count(*)::int AS pieces FROM core.direct_mail_pieces WHERE touch IS NOT NULL GROUP BY pillar_code, touch ORDER BY pillar_code, touch`);
    const touches = [1, 2, 3].map(t => ({ touch: t, name: TOUCHES[t], ...(rows.find(r => r.touch === t) || { pieces: 0, mailed: 0, problems: 0, scans: 0, responses: 0 }) }));
    return { touches, totalPieces: touches.reduce((n, t) => n + t.pieces, 0), pillars: pillars.map(p => ({ ...p, pillarName: pillarLabel(p.pillar_code) })) };
}

/** One sample page so the placement can be checked before a real run. Uses the first eligible owner, or clearly marked placeholder text. */
export async function buildPreview({ touch, kind }) {
    const templates = await activeTemplates(Number(touch));
    const row = kind === 'ENVELOPE' ? templates.envelope : templates.letter;
    if (!row) throw new HttpError(404, 'Upload that template first.');
    const bytes = await templateStore.load(row.object_key);
    const audience = await buildAudience({ touch }).catch(() => null);
    const first = audience?.eligible?.[0];
    const sample = first
        ? { ...first, mailpieceId: 'PREVIEW', token: `T${touch}-PREV`, touch: Number(touch), trackingUrl: `${trackingOrigin()}/api/v1/track/qr/${encodeURIComponent(first.crownKey)}` }
        : { ownerName: 'OWNER NAME', mailing: { street: 'MAILING STREET', city: 'CITY', state: 'ST', zip: '00000', lines: ['MAILING STREET', 'CITY, ST 00000'] }, propertyAddress: 'PROPERTY ADDRESS', crownKey: 'COUNTY-PARCEL-PILLAR-001', countyCode: 'CTY', parcel: 'PARCEL', pillar: 'ABS', pillarName: 'Absentee Owner', mailpieceId: 'PREVIEW', token: `T${touch}-PREV`, touch: Number(touch), trackingUrl: `${trackingOrigin()}/api/v1/track/qr/PREVIEW` };
    return kind === 'ENVELOPE'
        ? buildEnvelopesPdf([sample], { bytes, placement: row.placement })
        : buildLettersPdf([sample], { bytes, placement: row.placement });
}
