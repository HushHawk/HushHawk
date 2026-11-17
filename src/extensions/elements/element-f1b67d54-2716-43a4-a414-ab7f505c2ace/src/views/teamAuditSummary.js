const fieldLabels = {
    name: 'Name',
    email: 'Email',
    role: 'Role',
    status: 'Status',
    phone: 'Phone',
    permissions: 'Workspace access',
    description: 'Description',
    owner: 'Lead owner',
    address: 'Property address',
    source: 'Source',
    tags: 'Tags',
    batchCode: 'Batch code',
    quantity: 'Quantity',
    cost: 'Cost',
    deletedRole: 'Removed role',
    deletedUser: 'Removed account',
    targetUser: 'Account',
    client: 'Client',
};

const readable = value => value.replace(/^\//, '').replace(/[_-]+/g, ' ').toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());

function fieldValue(key, value) {
    if (value == null || value === '') return 'None';
    if (Array.isArray(value)) {
        const values = value.filter(item => typeof item === 'string');
        return values.map(item => key === 'permissions' ? readable(item) : item).join(', ') || 'None';
    }
    if (key === 'role' || key === 'status') return readable(String(value));
    return typeof value === 'object' ? '' : String(value);
}

export function auditDetailFields(log) {
    const details = log?.details || {};
    return Object.entries(fieldLabels).flatMap(([key, label]) => {
        if (details.before && details.after && Object.hasOwn(details.before, key) && Object.hasOwn(details.after, key)) {
            const before = fieldValue(key, details.before[key]);
            const after = fieldValue(key, details.after[key]);
            return before !== after ? [{ label, value: `${before} → ${after}` }] : [];
        }
        if (!Object.hasOwn(details, key)) return [];
        const value = fieldValue(key, details[key]);
        return value ? [{ label, value }] : [];
    });
}

export function formatDiffSummary(log) {
    if (!log) return '';
    const details = log.details || {};
    const subject = details.name || details.after?.name;
    switch (log.action) {
        case 'USER_LOGIN': return 'Signed in to HushHawk.';
        case 'USER_LOGOUT': return 'Signed out of HushHawk.';
        case 'USER_CREATED': return `Created an account for ${subject || details.email || 'a team member'}.`;
        case 'USER_DELETED': return `Removed the account for ${subject || details.deletedUser || 'a team member'}.`;
        case 'PASSWORD_RESET': return `Reset the password for ${details.targetName || details.targetUser || 'a team member'}.`;
        case 'PASSWORD_CHANGED': return `Changed the password for ${details.targetName || details.targetUser || 'a team member'}.`;
        case 'ROLE_CREATED': return `Created the ${subject || 'custom'} role.`;
        case 'ROLE_DELETED': return `Removed the ${details.deletedRole || subject || 'custom'} role.`;
        case 'ROLE_UPDATED':
        case 'USER_UPDATED': {
            const target = subject || (log.action === 'ROLE_UPDATED' ? 'the role' : 'the team member');
            const fields = auditDetailFields(log).map(field => field.label.toLowerCase());
            return fields.length ? `Updated ${target} (${fields.join(', ')}).` : `Saved changes for ${target}.`;
        }
        case 'BATCHLEADS_LEAD_INGESTED': {
            const owner = details.owner || subject;
            const property = details.address ? ` at ${details.address}` : '';
            return `Imported ${owner ? `a lead for ${owner}` : 'a lead'}${property} from BatchLeads.`;
        }
        case 'LEAD_CREATED': return `Created a lead${subject ? ` for ${subject}` : ''}.`;
        case 'DIRECT_MAIL_BATCH_CREATED': return `Created direct mail batch ${details.batchCode || subject || ''}`.trim() + '.';
        default:
            return `${readable(log.actionLabel || log.action || 'Activity')} was recorded.`;
    }
}
