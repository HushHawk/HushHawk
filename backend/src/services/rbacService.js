import { pool } from '../store/pgClient.js';
import crypto from 'crypto';

export const ALL_SECTIONS = [
    { key: 'dashboard', path: '/home', name: 'Dashboard', category: 'Executive', icon: 'house' },
    { key: 'properties', path: '/properties', name: 'Properties', category: 'Core Portfolio', icon: 'house' },
    { key: 'vault', path: '/vault', name: 'Media Vault', category: 'Assets & Files', icon: 'file' },
    { key: 'seller-leads', path: '/seller-leads', name: 'Seller Leads', category: 'Acquisitions', icon: 'users' },
    { key: 'acquisitions', path: '/acquisitions', name: 'Acquisitions', category: 'Acquisitions', icon: 'handshake' },
    { key: 'dispositions', path: '/dispositions', name: 'Dispositions', category: 'Dispositions', icon: 'badgeDollar' },
    { key: 'cash-buyers', path: '/cash-buyers', name: 'Cash Buyers', category: 'Dispositions', icon: 'users' },
    { key: 'marketing', path: '/marketing', name: 'Marketing', category: 'Campaigns', icon: 'megaphone' },
    { key: 'county-data', path: '/county-data', name: 'County Data', category: 'Market Intel', icon: 'database' },
    { key: 'skip-tracing', path: '/skip-tracing', name: 'Skip Tracing', category: 'Market Intel', icon: 'search' },
    { key: 'contracts', path: '/contracts', name: 'Contracts', category: 'Transactions', icon: 'file' },
    { key: 'follow-ups', path: '/follow-ups', name: 'Follow Ups', category: 'Operations', icon: 'tasks' },
    { key: 'analytics', path: '/analytics', name: 'Analytics', category: 'Executive', icon: 'chart' },
    { key: 'team', path: '/team', name: 'Team & RBAC', category: 'Administration', icon: 'users' },
    { key: 'settings', path: '/settings', name: 'Settings', category: 'Administration', icon: 'settings' },
    { key: 'communications', path: '/communications', name: 'Communications', category: 'Operations', icon: 'mail' },
    { key: 'tasks', path: '/tasks', name: 'Tasks', category: 'Operations', icon: 'tasks' },
    { key: 'calendar', path: '/calendar', name: 'Calendar', category: 'Operations', icon: 'calendar' },
    { key: 'contacts', path: '/contacts', name: 'Contacts', category: 'Operations', icon: 'user' },
    { key: 'automations', path: '/automations', name: 'Automations', category: 'Administration', icon: 'zap' },
    { key: 'facebook-leads', path: '/facebook-leads', name: 'Facebook Leads', category: 'Campaigns', icon: 'megaphone' },
    { key: 'direct-mail', path: '/direct-mail', name: 'Direct Mail', category: 'Campaigns', icon: 'mail' },
    { key: 'deal-analyzer', path: '/deal-analyzer', name: 'Deal Analyzer', category: 'Underwriting', icon: 'calculator' }
];

const ADMIN_ROLE = 'SUPER_ADMIN';
const SECTION_PATHS = ALL_SECTIONS.map(section => section.path);
const ROLE_PATHS = SECTION_PATHS.filter(path => path !== '/team');
const AUDIT_CATEGORIES = ['SECURITY', 'DELETION', 'CREATION', 'MODIFICATION', 'OUTREACH', 'GENERAL'];
const auditCategorySql = `CASE
    WHEN a.action ~* 'LOGIN|LOGOUT|AUTH|PASSWORD' THEN 'SECURITY'
    WHEN a.action ~* 'DELETE|DROP|REMOVE' THEN 'DELETION'
    WHEN a.action ~* 'CREATE|INSERT|ADD|INGEST' THEN 'CREATION'
    WHEN a.action ~* 'UPDATE|EDIT|CHANGE|SUSPEND' THEN 'MODIFICATION'
    WHEN a.action ~* 'MAIL|SMS|CALL|DISPATCH' THEN 'OUTREACH'
    ELSE 'GENERAL' END`;
const auditBadgeClasses = {
    SECURITY: 'badge-purple',
    DELETION: 'badge-danger',
    CREATION: 'badge-success',
    MODIFICATION: 'badge-warning',
    OUTREACH: 'badge-cyan',
    GENERAL: 'badge-info'
};

const roleJoin = 'LEFT JOIN core.roles r ON r.role_key = u.role';
const memberColumns = 'u.user_id, u.email, u.full_name, u.phone, u.role, u.status, u.last_login_at, u.created_at, r.name AS role_name, r.permissions AS role_permissions';
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

function effectivePermissions(role, permissions) {
    if (role === ADMIN_ROLE) return [...SECTION_PATHS];
    return Array.isArray(permissions) ? ROLE_PATHS.filter(path => permissions.includes(path)) : [];
}

function memberDto(row) {
    const permissions = effectivePermissions(row.role, row.role_permissions);
    return {
        id: row.user_id,
        user_id: row.user_id,
        name: row.full_name,
        initials: row.full_name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase(),
        email: row.email,
        phone: row.phone || '',
        role: row.role,
        roleName: row.role_name || row.role,
        isAdmin: row.role === ADMIN_ROLE,
        status: row.status === 'ACTIVE' ? 'Active' : 'Suspended',
        statusClass: row.status === 'ACTIVE' ? 'status-active' : 'status-suspended',
        permissions,
        allowedCount: permissions.length,
        lastLoginAt: row.last_login_at,
        createdAt: row.created_at
    };
}

function text(value, label, maxLength) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
        throw new Error(`${label} is required and must be at most ${maxLength} characters.`);
    }
    return value.trim();
}

function emailAddress(value) {
    const email = text(value, 'Email', 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
    return email;
}

function newPassword(value) {
    if (typeof value !== 'string' || value.trim().length < 12 || Buffer.byteLength(value.trim()) > 72) {
        throw new Error('Use a password of at least 12 characters and at most 72 bytes.');
    }
    return value.trim();
}

function rolePermissions(permissions) {
    if (!Array.isArray(permissions) || permissions.some(path => !ROLE_PATHS.includes(path))) {
        throw new Error('Choose valid workspaces. Team access is reserved for administrators.');
    }
    return [...new Set(permissions)];
}

async function lookupRole(client, role) {
    const { rows: [row] } = await client.query('SELECT role_id, role_key FROM core.roles WHERE role_key = $1 OR role_id::text = $1', [role]);
    if (!row) throw new Error('Choose an existing role.');
    return row;
}

async function lookupMember(client, userId) {
    const { rows: [row] } = await client.query(`SELECT ${memberColumns} FROM core.users u ${roleJoin} WHERE u.user_id = $1`, [userId]);
    if (!row) throw new Error('Team member not found.');
    return memberDto(row);
}

async function transaction(work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function recordAudit(client, { actor, action, entityType, entityId, diff }) {
    await client.query(
        `INSERT INTO audit.audit_events (actor, action, entity_type, entity_id, request_id, redacted_diff)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [actor.name, action, entityType, entityId, crypto.randomUUID(), JSON.stringify({
            ...diff, actorId: actor.id, actorEmail: actor.email, actorRole: actor.role
        })]
    );
}

async function manage(actor, work) {
    return transaction(async client => {
        await client.query('SELECT pg_advisory_xact_lock(628192019)');
        const actorId = actor?.id;
        if (!actorId) throw new Error('Administrator access is required.');
        const current = await lookupMember(client, actorId);
        if (!current.isAdmin || current.status !== 'Active') throw new Error('Administrator access is required.');
        return work(client, current);
    });
}

export class RbacService {
    static async getRoles() {
        const { rows } = await pool.query(`
            SELECT r.*, count(u.user_id)::int AS user_count
            FROM core.roles r LEFT JOIN core.users u ON u.role = r.role_key
            GROUP BY r.role_id ORDER BY (r.role_key = 'SUPER_ADMIN') DESC, r.name
        `);
        return rows.map(role => ({ ...role, permissions: effectivePermissions(role.role_key, role.permissions) }));
    }

    static async createRole({ name, description, permissions = [], actor }) {
        name = text(name, 'Role name', 100);
        permissions = rolePermissions(permissions);
        const key = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (!key || key === ADMIN_ROLE) throw new Error('Choose a different role name.');
        return manage(actor, async (client, current) => {
            const { rows: [role] } = await client.query(
                `INSERT INTO core.roles (role_key, name, description, permissions)
                 VALUES ($1, $2, $3, $4) ON CONFLICT (role_key) DO NOTHING RETURNING *`,
                [key, name, description || '', JSON.stringify(permissions)]
            );
            if (!role) throw new Error('A role with this name already exists.');
            await recordAudit(client, { actor: current, action: 'ROLE_CREATED', entityType: 'ROLE', entityId: role.role_id, diff: { name, permissions } });
            return role;
        });
    }

    static async updateRole(roleId, { name, description, permissions, actor }) {
        return manage(actor, async (client, current) => {
            const { rows: [before] } = await client.query('SELECT * FROM core.roles WHERE role_id = $1', [roleId]);
            if (!before) throw new Error('Role not found.');
            if (before.is_system || before.role_key === ADMIN_ROLE) throw new Error('System roles are fixed. Create a custom role to choose permissions.');
            name = name === undefined ? before.name : text(name, 'Role name', 100);
            permissions = rolePermissions(permissions ?? before.permissions);
            const { rows: [role] } = await client.query(
                'UPDATE core.roles SET name = $1, description = $2, permissions = $3, updated_at = now() WHERE role_id = $4 RETURNING *',
                [name, description ?? before.description, JSON.stringify(permissions), roleId]
            );
            await recordAudit(client, { actor: current, action: 'ROLE_UPDATED', entityType: 'ROLE', entityId: roleId,
                diff: { before: { name: before.name, permissions: before.permissions }, after: { name, permissions } } });
            return role;
        });
    }

    static async deleteRole(roleId, actor) {
        return manage(actor, async (client, current) => {
            const { rows: [role] } = await client.query('SELECT * FROM core.roles WHERE role_id = $1', [roleId]);
            if (!role) throw new Error('Role not found.');
            if (role.is_system || role.role_key === ADMIN_ROLE) throw new Error('System roles cannot be deleted.');
            const assigned = await client.query('SELECT 1 FROM core.users WHERE role = $1 LIMIT 1', [role.role_key]);
            if (assigned.rowCount) throw new Error('Reassign all members using this role before deleting it.');
            await client.query('DELETE FROM core.roles WHERE role_id = $1', [roleId]);
            await recordAudit(client, { actor: current, action: 'ROLE_DELETED', entityType: 'ROLE', entityId: roleId, diff: { deletedRole: role.name } });
            return { success: true };
        });
    }

    static async getTeamMembers() {
        const { rows } = await pool.query(`SELECT ${memberColumns} FROM core.users u ${roleJoin} ORDER BY u.created_at, u.user_id`);
        return rows.map(memberDto);
    }

    static async createTeamMember({ name, email, phone, role, password, actor }) {
        name = text(name, 'Name', 160);
        email = emailAddress(email);
        password = newPassword(password);
        return manage(actor, async (client, current) => {
            const assigned = await lookupRole(client, role);
            const { rows: [member] } = await client.query(
                `INSERT INTO core.users (full_name, email, phone, role, password_hash, custom_role_id)
                 VALUES ($1, $2, $3, $4, crypt($5, gen_salt('bf', 10)), $6)
                 ON CONFLICT (email) DO NOTHING RETURNING user_id`,
                [name, email, phone?.trim() || null, assigned.role_key, password, assigned.role_id]
            );
            if (!member) throw new Error('An account already exists for this email.');
            await recordAudit(client, { actor: current, action: 'USER_CREATED', entityType: 'USER', entityId: member.user_id,
                diff: { name, email, role: assigned.role_key } });
            return lookupMember(client, member.user_id);
        });
    }

    static async updateTeamMember(userId, { name, email, phone, role, status, actor }) {
        return manage(actor, async (client, current) => {
            const before = await lookupMember(client, userId);
            const assigned = role === undefined ? null : await lookupRole(client, role);
            const after = {
                name: name === undefined ? before.name : text(name, 'Name', 160),
                email: email === undefined ? before.email : emailAddress(email),
                phone: phone === undefined ? before.phone : phone.trim(),
                role: assigned?.role_key ?? before.role,
                status: (status === undefined ? before.status : text(status, 'Status', 20)).toUpperCase()
            };
            if (!['ACTIVE', 'SUSPENDED'].includes(after.status)) throw new Error('Choose Active or Suspended.');
            if (userId === current.id && (after.role !== ADMIN_ROLE || after.status !== 'ACTIVE')) {
                throw new Error('You cannot remove your own administrator access.');
            }
            await client.query(
                `UPDATE core.users SET full_name = $1, email = $2, phone = $3, role = $4, status = $5,
                 custom_role_id = coalesce($6, custom_role_id) WHERE user_id = $7`,
                [after.name, after.email, after.phone, after.role, after.status, assigned?.role_id ?? null, userId]
            );
            if (after.status === 'SUSPENDED') await client.query('DELETE FROM core.user_sessions WHERE user_id = $1', [userId]);
            await recordAudit(client, { actor: current, action: 'USER_UPDATED', entityType: 'USER', entityId: userId,
                diff: { before: { name: before.name, email: before.email, phone: before.phone, role: before.role, status: before.status }, after } });
            return lookupMember(client, userId);
        });
    }

    static async updatePassword(userId, { password, autoGenerate = false, actor }) {
        const value = autoGenerate === true ? crypto.randomBytes(18).toString('base64url') : newPassword(password);
        return manage(actor, async (client, current) => {
            const member = await lookupMember(client, userId);
            await client.query("UPDATE core.users SET password_hash = crypt($1, gen_salt('bf', 10)), password_plain = NULL WHERE user_id = $2", [value, userId]);
            await client.query('DELETE FROM core.user_sessions WHERE user_id = $1', [userId]);
            await recordAudit(client, { actor: current, action: autoGenerate ? 'PASSWORD_RESET' : 'PASSWORD_CHANGED',
                entityType: 'USER', entityId: userId, diff: { targetUser: member.email } });
            return { success: true, ...(autoGenerate === true ? { password: value } : {}) };
        });
    }

    static async deleteTeamMember(userId, actor) {
        return manage(actor, async (client, current) => {
            if (userId === current.id) throw new Error('You cannot remove your own account.');
            const member = await lookupMember(client, userId);
            await client.query('DELETE FROM core.users WHERE user_id = $1', [userId]);
            await recordAudit(client, { actor: current, action: 'USER_DELETED', entityType: 'USER', entityId: userId,
                diff: { deletedUser: member.email, name: member.name, role: member.role } });
            return { success: true };
        });
    }

    static async authenticate({ email, password }) {
        const error = () => new Error('Invalid email or password.');
        if (typeof email !== 'string' || typeof password !== 'string' || !password.trim() || Buffer.byteLength(password.trim()) > 72) throw error();
        return transaction(async client => {
            const { rows: [row] } = await client.query(
                `SELECT ${memberColumns} FROM core.users u ${roleJoin}
                 WHERE lower(u.email) = $1 AND u.status = 'ACTIVE' AND u.password_hash = crypt($2, u.password_hash)
                 FOR UPDATE OF u`, [email.trim().toLowerCase(), password.trim()]
            );
            if (!row) throw error();
            const user = memberDto(row);
            const token = crypto.randomBytes(32).toString('hex');
            await client.query('UPDATE core.users SET last_login_at = now() WHERE user_id = $1', [user.id]);
            await client.query('DELETE FROM core.user_sessions WHERE user_id = $1 AND expires_at <= now()', [user.id]);
            const { rows: [session] } = await client.query(
                "INSERT INTO core.user_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '12 hours') RETURNING expires_at",
                [hashToken(token), user.id]
            );
            await recordAudit(client, { actor: user, action: 'USER_LOGIN', entityType: 'AUTH', entityId: user.id, diff: {} });
            return { user, token, expiresAt: session.expires_at };
        });
    }

    static async getSession(token) {
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
        const { rows: [row] } = await pool.query(
            `SELECT ${memberColumns}, s.expires_at
             FROM core.user_sessions s JOIN core.users u USING (user_id) ${roleJoin}
             WHERE s.token_hash = $1 AND s.expires_at > now() AND u.status = 'ACTIVE'`, [hashToken(token)]
        );
        return row ? { user: memberDto(row), expiresAt: row.expires_at } : null;
    }

    static async signOut(token, user) {
        return transaction(async client => {
            const deleted = await client.query('DELETE FROM core.user_sessions WHERE token_hash = $1 AND user_id = $2', [hashToken(token), user.id]);
            if (deleted.rowCount) await recordAudit(client, { actor: user, action: 'USER_LOGOUT', entityType: 'AUTH', entityId: user.id, diff: {} });
        });
    }

    static async getActivityLogs({
        search = '',
        actor = '',
        role = '',
        action = '',
        category = '',
        entityType = '',
        startDate = '',
        endDate = '',
        limit = 50,
        offset = 0
    } = {}) {
        try {
            const conditions = [];
            const values = [];
            let pIdx = 1;

            if (search && search.trim()) {
                conditions.push(`(
                    a.actor ILIKE $${pIdx} OR 
                    a.action ILIKE $${pIdx} OR 
                    a.entity_type ILIKE $${pIdx} OR
                    a.redacted_diff::text ILIKE $${pIdx}
                )`);
                values.push(`%${search.trim()}%`);
                pIdx++;
            }

            if (actor && actor.trim()) {
                conditions.push(`a.actor ILIKE $${pIdx}`);
                values.push(`%${actor.trim()}%`);
                pIdx++;
            }

            if (action && action.trim()) {
                conditions.push(`a.action ILIKE $${pIdx}`);
                values.push(`%${action.trim()}%`);
                pIdx++;
            }

            if (AUDIT_CATEGORIES.includes(category)) {
                conditions.push(`(${auditCategorySql}) = $${pIdx}`);
                values.push(category);
                pIdx++;
            }

            if (entityType && entityType.trim()) {
                conditions.push(`a.entity_type = $${pIdx}`);
                values.push(entityType.trim().toUpperCase());
                pIdx++;
            }

            if (startDate && startDate.trim()) {
                conditions.push(`a.created_at >= ($${pIdx}::date::timestamp AT TIME ZONE 'America/New_York')`);
                values.push(startDate.trim());
                pIdx++;
            }

            if (endDate && endDate.trim()) {
                conditions.push(`a.created_at < (($${pIdx}::date + 1)::timestamp AT TIME ZONE 'America/New_York')`);
                values.push(endDate.trim());
                pIdx++;
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Count total
            const countRes = await pool.query(`SELECT COUNT(*)::int as total FROM audit.audit_events a ${whereClause}`, values);
            const total = countRes.rows[0]?.total ?? 0;

            // Fetch records
            const queryValues = [...values, Math.min(Number(limit) || 50, 200), Math.max(Number(offset) || 0, 0)];
            const { rows } = await pool.query(`
                SELECT 
                    a.audit_id,
                    a.actor,
                    a.action,
                    ${auditCategorySql} AS category,
                    a.entity_type,
                    a.entity_id,
                    a.request_id,
                    a.redacted_diff,
                    a.created_at
                FROM audit.audit_events a
                ${whereClause}
                ORDER BY a.created_at DESC, a.audit_id DESC
                LIMIT $${pIdx} OFFSET $${pIdx + 1}
            `, queryValues);

            // Compute summary metrics
            const [todayRes, actorsRes, criticalRes, securityRes] = await Promise.all([
                pool.query(`SELECT COUNT(*)::int as count FROM audit.audit_events WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York')`),
                pool.query(`SELECT COUNT(DISTINCT actor)::int as count FROM audit.audit_events`),
                pool.query(`SELECT COUNT(*)::int as count FROM audit.audit_events WHERE action ILIKE '%DELETE%' OR action ILIKE '%DROP%' OR action ILIKE '%OVERRIDE%'`),
                pool.query(`SELECT COUNT(*)::int as count FROM audit.audit_events WHERE action ILIKE '%AUTH%' OR action ILIKE '%LOGIN%' OR action ILIKE '%PASS%' OR action ILIKE '%ROLE%'`)
            ]);

            return {
                total,
                limit: Number(limit) || 50,
                offset: Number(offset) || 0,
                metrics: {
                    todayCount: todayRes.rows[0]?.count ?? 0,
                    uniqueActors: actorsRes.rows[0]?.count ?? 0,
                    criticalChanges: criticalRes.rows[0]?.count ?? 0,
                    securityEvents: securityRes.rows[0]?.count ?? 0
                },
                logs: rows.map(r => {
                    const dateObj = new Date(r.created_at);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' });
                    const formattedTime = dateObj.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
                    
                    return {
                        id: r.audit_id,
                        auditId: r.audit_id,
                        actor: r.actor || 'System Automation',
                        action: r.action,
                        actionLabel: r.action.replace(/_/g, ' '),
                        category: r.category,
                        badgeClass: auditBadgeClasses[r.category],
                        entityType: r.entity_type || 'SYSTEM',
                        entityId: r.entity_id,
                        details: r.redacted_diff || {},
                        requestId: r.request_id,
                        createdAt: r.created_at,
                        dateStr: formattedDate,
                        timeStr: formattedTime,
                        fullTimestamp: `${formattedDate} at ${formattedTime}`
                    };
                })
            };
        } catch (err) {
            console.error('[RbacService.getActivityLogs Error]:', err.message);
            return { total: 0, limit: 50, offset: 0, metrics: { todayCount: 0, uniqueActors: 0, criticalChanges: 0, securityEvents: 0 }, logs: [] };
        }
    }

    static async logAudit({ actor = 'System', action = 'RECORD_MODIFIED', entityType = 'RECORD', entityId = null, diff = {} }) {
        try {
            const auditId = crypto.randomUUID();
            const requestId = 'req-' + Date.now();
            await pool.query(`
                INSERT INTO audit.audit_events (audit_id, actor, action, entity_type, entity_id, request_id, redacted_diff, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            `, [auditId, actor, action, entityType, entityId, requestId, JSON.stringify(diff)]);
        } catch (err) {
            console.warn('[RbacService.logAudit Warn]:', err.message);
        }
    }
}
