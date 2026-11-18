import crypto from 'node:crypto';

/**
 * Test-only: creates a throwaway administrator in the test database, signs in through the real login path and
 * makes global fetch send that session to the local test server. Tests must run against a disposable database.
 */
export async function installTestAuth() {
    const { pool } = await import('../../backend/src/store/pgClient.js');
    const { RbacService } = await import('../../backend/src/services/rbacService.js');
    const email = `test-admin-${crypto.randomUUID().slice(0, 8)}@example.test`;
    const password = `pw-${crypto.randomUUID()}`;
    const { rows: [role] } = await pool.query("SELECT role_id FROM core.roles WHERE role_key = 'SUPER_ADMIN'");
    await pool.query(
        `INSERT INTO core.users (full_name, email, role, status, custom_role_id, password_hash)
         VALUES ('Test Admin', $1, 'SUPER_ADMIN', 'ACTIVE', $2, crypt($3, gen_salt('bf', 10)))`, [email, role.role_id, password]);
    const { token } = await RbacService.authenticate({ email, password });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (resource, init = {}) => {
        const url = String(resource instanceof Request ? resource.url : resource);
        if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) return originalFetch(resource, init);
        const headers = new Headers(init.headers || {});
        if (!headers.has('authorization')) headers.set('authorization', `Bearer ${token}`);
        return originalFetch(resource, { ...init, headers });
    };
    return { token, email, cleanup: () => pool.query('DELETE FROM core.users WHERE email = $1', [email]) };
}

export function assertDisposableDatabase() {
    const url = new URL(process.env.DATABASE_URL || 'postgresql://missing.invalid');
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
        throw new Error('Refusing to run: tests write data and must use a local, disposable database (DATABASE_URL host must be localhost).');
    }
}
