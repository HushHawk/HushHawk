import { pool } from '../src/store/pgClient.js';

try {
    if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL before listing callback requests.');
    const { rows } = await pool.query(
        `SELECT r.requested_at, r.contact_name, r.phone, s.crown_key, p.batch_code, r.scan_id
         FROM core.direct_mail_callback_requests r
         JOIN core.direct_mail_scans s USING (scan_id)
         LEFT JOIN core.direct_mail_pieces p USING (piece_id)
         ORDER BY r.requested_at DESC
         LIMIT 100`
    );
    console.table(rows);
} catch (err) {
    console.error('Could not list Direct Mail callback requests:', err.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
