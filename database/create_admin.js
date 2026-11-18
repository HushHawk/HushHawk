/**
 * Creates (or resets) the first administrator account. Credentials are read from the environment so the
 * password never appears in shell history or source control:
 *   ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='at least 12 characters' npm run db:create-admin
 */
import { pool } from '../backend/src/store/pgClient.js';

const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;
if (!ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD) {
    console.error('Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD.');
    process.exit(1);
}
if (ADMIN_PASSWORD.length < 12 || Buffer.byteLength(ADMIN_PASSWORD) > 72) {
    console.error('ADMIN_PASSWORD must be 12-72 bytes.');
    process.exit(1);
}

try {
    const { rows: [role] } = await pool.query("SELECT role_id FROM core.roles WHERE role_key = 'SUPER_ADMIN'");
    if (!role) throw new Error('SUPER_ADMIN role is missing. Run npm run db:migrate first.');
    const { rows: [user] } = await pool.query(
        `INSERT INTO core.users (full_name, email, role, status, custom_role_id, password_hash)
         VALUES ($1, lower($2), 'SUPER_ADMIN', 'ACTIVE', $3, crypt($4, gen_salt('bf', 10)))
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'SUPER_ADMIN', status = 'ACTIVE',
             custom_role_id = EXCLUDED.custom_role_id, password_hash = EXCLUDED.password_hash
         RETURNING user_id, email`,
        [ADMIN_NAME.trim(), ADMIN_EMAIL.trim(), role.role_id, ADMIN_PASSWORD]);
    await pool.query('DELETE FROM core.user_sessions WHERE user_id = $1', [user.user_id]);
    await pool.query(
        `INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, redacted_diff) VALUES ('create_admin script', 'ADMIN_ACCOUNT_SET', 'USER', $1, $2)`,
        [user.user_id, JSON.stringify({ email: user.email })]);
    console.log(`Administrator ready: ${user.email}`);
} finally {
    await pool.end();
}
