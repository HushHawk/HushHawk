import crypto from 'crypto';
import { pool } from '../store/pgClient.js';

export class DirectMailTrackerService {
    static PILLAR_MAP = {
        'FC': { name: 'Foreclosure', description: 'Judicial mortgage foreclosure filing', urgency: 'HIGH' },
        'PFC': { name: 'Pre-Foreclosure', description: 'Notice of default or lis pendens', urgency: 'HIGH' },
        'TAX': { name: 'Tax Delinquency', description: 'Ad valorem delinquent tax roll', urgency: 'HIGH' },
        'CODE': { name: 'Code Violation', description: 'Municipal code citation or building notice', urgency: 'MEDIUM' },
        'PRB': { name: 'Probate / Estate', description: 'Deceased owner estate administration', urgency: 'MEDIUM' },
        'VAC': { name: 'Vacant Property', description: 'Physically unoccupied structure', urgency: 'MEDIUM' },
        'ML': { name: 'Municipal Lien', description: 'Weed abatement, demolition, or city lien', urgency: 'HIGH' },
        'EVICT': { name: 'Eviction / Landlord', description: 'Civil removal proceeding / tired landlord', urgency: 'MEDIUM' },
        'ABS': { name: 'Absentee High Equity', description: 'Out of area owner with 50%+ equity', urgency: 'LOW' }
    };

    /**
     * Parse any CrownKey or mailer identifier string (e.g. "Duv-FC-32221", "DUV-TAX-091823", "DUV-3245MAIN-FC-001")
     */
    static parseCrownKey(rawCode) {
        if (!rawCode || typeof rawCode !== 'string') {
            return {
                raw: rawCode || '',
                cleanKey: 'DUV-FC-00000',
                countyCode: 'DUV',
                pillarCode: 'FC',
                pillarName: 'Foreclosure',
                identifier: '00000'
            };
        }

        const clean = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        const parts = clean.split('-');

        let countyCode = 'DUV';
        let pillarCode = 'FC';
        let identifier = 'GENERAL';

        if (parts.length >= 3) {
            countyCode = parts[0];
            // Check if parts[1] is a known pillar code
            if (this.PILLAR_MAP[parts[1]]) {
                pillarCode = parts[1];
                identifier = parts.slice(2).join('-');
            } else if (this.PILLAR_MAP[parts[2]]) {
                // E.g. DUV-PARCEL-FC-001
                pillarCode = parts[2];
                identifier = parts[1] + (parts[3] ? `-${parts[3]}` : '');
            } else {
                pillarCode = parts[1];
                identifier = parts.slice(2).join('-');
            }
        } else if (parts.length === 2) {
            countyCode = parts[0];
            if (this.PILLAR_MAP[parts[1]]) {
                pillarCode = parts[1];
            } else {
                identifier = parts[1];
            }
        }

        const pillarInfo = this.PILLAR_MAP[pillarCode] || { name: 'Foreclosure', urgency: 'HIGH' };

        return {
            raw: rawCode,
            cleanKey: `${countyCode}-${pillarCode}-${identifier}`,
            countyCode,
            pillarCode,
            pillarName: pillarInfo.name,
            urgency: pillarInfo.urgency,
            identifier
        };
    }

    static async recordScan(crownKey, { pieceId = null, ip, userAgent, city, region } = {}) {
        const parsed = this.parseCrownKey(crownKey);
        const { rows: [scan] } = await pool.query(
            `WITH candidates AS (
                SELECT piece_id, property_id, address
                FROM core.direct_mail_pieces
                WHERE (crown_key = $1 OR crown_key = $8) AND ($2::uuid IS NULL OR piece_id = $2)
                LIMIT 2
            ), matched AS (
                SELECT * FROM candidates WHERE (SELECT count(*) FROM candidates) = 1
            ), scan AS (
                INSERT INTO core.direct_mail_scans
                    (piece_id, crown_key, pillar_code, ip_address, user_agent, city, region)
                SELECT (SELECT piece_id FROM matched), $1, $3, $4, $5, $6, $7
                WHERE $2::uuid IS NULL OR EXISTS (SELECT 1 FROM matched)
                RETURNING scan_id, piece_id, scanned_at
            ), counter AS (
                UPDATE core.direct_mail_pieces p
                SET scans_count = coalesce(p.scans_count, 0) + 1, last_scanned_at = scan.scanned_at
                FROM scan WHERE p.piece_id = scan.piece_id
            ), interaction AS (
                INSERT INTO core.interactions (property_id, method, direction, actor_id, result, notes)
                SELECT prop.property_id, 'MAIL', 'INBOUND', 'Homeowner QR Scan', 'QR_SCANNED', $1
                FROM scan JOIN matched USING (piece_id)
                JOIN core.properties prop ON prop.property_id = matched.property_id
            ), notification AS (
                INSERT INTO ops.notifications (title, body, category, priority, color, icon)
                SELECT 'Direct Mail QR Scanned: ' || $1, 'Mail piece scanned for ' || matched.address,
                       'PIPELINE', 'HIGH', 'gold', 'mail'
                FROM scan JOIN matched USING (piece_id)
            ), audit AS (
                INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, request_id, redacted_diff)
                SELECT 'Homeowner Direct Mail Scanner', 'DIRECT_MAIL_QR_SCANNED', 'DIRECT_MAIL_SCAN',
                       scan_id, scan_id, jsonb_build_object('crownKey', $1::text, 'pieceId', piece_id)
                FROM scan
            )
            SELECT * FROM scan`,
            // $8: the key exactly as printed (e.g. DUV-0306180000R-ABS-001); parsing re-orders it, so both forms are matched
            [parsed.cleanKey, pieceId, parsed.pillarCode, ip, userAgent, city, region, String(crownKey || '').trim().toUpperCase()]
        );
        if (!scan) return null;

        return {
            ok: true,
            scanId: scan.scan_id,
            pieceId: scan.piece_id,
            crownKey: parsed.cleanKey,
            pillarCode: parsed.pillarCode,
            pillarName: parsed.pillarName,
            scannedAt: scan.scanned_at,
            ctaUrl: `/api/v1/track/offer/${scan.scan_id}`
        };
    }

    static async recordCallbackRequest(scanId, name, phone) {
        const { rowCount } = await pool.query(
            `WITH request AS (
                INSERT INTO core.direct_mail_callback_requests (scan_id, contact_name, phone)
                SELECT scan_id, $2, $3 FROM core.direct_mail_scans WHERE scan_id = $1
                ON CONFLICT (scan_id) DO NOTHING
                RETURNING scan_id, requested_at
            ), conversion AS (
                UPDATE core.direct_mail_scans s
                SET cta_converted = true, converted_at = request.requested_at
                FROM request WHERE s.scan_id = request.scan_id
            )
            INSERT INTO ops.notifications (title, body, category, priority, color, icon)
            SELECT 'Direct Mail Callback Requested', 'Callback request ' || scan_id::text,
                   'PIPELINE', 'HIGH', 'gold', 'mail'
            FROM request`,
            [scanId, name, phone]
        );
        if (rowCount) return true;
        const existing = await pool.query('SELECT 1 FROM core.direct_mail_callback_requests WHERE scan_id = $1', [scanId]);
        return existing.rowCount > 0;
    }

    static async getStatsByPillar() {
        const { rows } = await pool.query(
            `WITH pieces AS (
                SELECT pillar_code, count(*) FILTER (WHERE status IN ('MAILED', 'IN_TRANSIT', 'DELIVERED'))::int AS mailed
                FROM core.direct_mail_pieces GROUP BY pillar_code
            ), scans AS (
                SELECT pillar_code, count(*)::int AS scans,
                       count(*) FILTER (WHERE cta_converted AND converted_at IS NOT NULL)::int AS conversions
                FROM core.direct_mail_scans GROUP BY pillar_code
            )
            SELECT pillar_code, coalesce(mailed, 0) AS mailed, coalesce(scans.scans, 0) AS scans,
                   coalesce(conversions, 0) AS conversions
            FROM pieces FULL JOIN scans USING (pillar_code)`
        );
        const totals = new Map(rows.map(row => [row.pillar_code, row]));
        return Object.fromEntries(Object.entries(this.PILLAR_MAP).map(([code, { name }]) => {
            const { mailed, scans, conversions } = totals.get(code) || { mailed: 0, scans: 0, conversions: 0 };
            return [code, {
                name, mailed, scans, conversions,
                scanRate: mailed ? `${(scans / mailed * 100).toFixed(2)}%` : null,
                convRate: scans ? `${(conversions / scans * 100).toFixed(2)}%` : null
            }];
        }));
    }

    static async getBatchScanCounts() {
        const { rows } = await pool.query(
            `SELECT p.batch_code, count(*)::int AS scans,
                    count(*) FILTER (WHERE s.cta_converted AND s.converted_at IS NOT NULL)::int AS conversions
             FROM core.direct_mail_scans s JOIN core.direct_mail_pieces p USING (piece_id)
             GROUP BY p.batch_code`
        );
        return new Map(rows.map(row => [row.batch_code, row]));
    }

    /**
     * Generate an intelligent direct mail piece with CrownKey, QR code, and merge tags
     */
    static async generatePiece({
        countyCode,
        pillarCode,
        identifier,
        address,
        ownerName = null,
        trackingPhone = null,
        batchCode = 'UNASSIGNED',
        propertyId = null,
        origin
    } = {}) {
        const pieceId = crypto.randomUUID();
        const parsed = this.parseCrownKey(`${countyCode}-${pillarCode}-${identifier}`);
        const cleanKey = parsed.cleanKey;
        const trackingUrl = `${origin}/api/v1/track/qr/${encodeURIComponent(cleanKey)}?piece=${pieceId}`;

        await pool.query(
            `INSERT INTO core.direct_mail_pieces
                (piece_id, batch_code, crown_key, county_code, pillar_code, address,
                 owner_name, tracking_phone, qr_tracking_url, property_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PRINTED')`,
            [pieceId, batchCode, cleanKey, parsed.countyCode, parsed.pillarCode, address,
                ownerName, trackingPhone, trackingUrl, propertyId]
        );

        return {
            pieceId,
            batchCode,
            crownKey: cleanKey,
            countyCode: parsed.countyCode,
            pillarCode: parsed.pillarCode,
            pillarName: parsed.pillarName,
            address,
            ownerName,
            trackingPhone,
            trackingUrl,
            audienceLabId: `ALAB-${cleanKey}`,
            envelopeMarkup: {
                returnAddress: process.env.MAIL_RETURN_ADDRESS || '',
                recipientAddress: [ownerName, address].filter(Boolean).join('\n'),
                identifierStamp: cleanKey,
                qrCodeUrl: trackingUrl
            },
            letterLetterhead: {
                headline: `Interested in discussing ${address}?`,
                body: `Scan the QR code or visit ${trackingUrl} to request a callback from HushHawk. Reference: ${cleanKey}.`
            }
        };
    }
}
