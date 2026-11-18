/**
 * One-time, opt-in import of the CRM workspaces that older deployments kept in backend/data/canonical_store.json
 * (direct-mail batches, marketing campaigns, deal analyses, calendar events, communications, follow-ups, ...).
 * The CrownKey registry itself (properties, events, leads, people) already lives in Postgres and is not touched.
 *
 *   node database/import_legacy_store.js backend/data/canonical_store.json
 *
 * Existing records in the new store win; nothing is overwritten.
 */
import fs from 'fs';
import { pool } from '../backend/src/store/pgClient.js';
import { db } from '../backend/src/store/database.js';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
    console.error('Usage: node database/import_legacy_store.js <path to canonical_store.json>');
    process.exit(1);
}

try {
    await db.load();
    const legacy = JSON.parse(fs.readFileSync(file, 'utf8'));
    const keyOf = r => String(r?.id ?? r?.batch_uuid ?? r?.name ?? JSON.stringify(r));
    let imported = 0;
    const merge = (target, source, label) => {
        const seen = new Set(target.map(keyOf));
        for (const record of Array.isArray(source) ? source : []) {
            if (!record || seen.has(keyOf(record))) continue;
            target.push(record);
            seen.add(keyOf(record));
            imported++;
        }
        console.log(`  ${label}: ${Array.isArray(source) ? source.length : 0} found`);
    };
    for (const name of ['contracts', 'contacts', 'facebook_leads', 'follow_ups', 'direct_mail', 'communications', 'calendar_events', 'skip_traces', 'county_records']) {
        merge(db.data.crm[name], legacy.crm?.[name], `crm.${name}`);
    }
    for (const name of ['marketing_campaigns', 'deal_analyses', 'automations', 'partner_chat_messages']) {
        merge(db.data[name], legacy[name], name);
    }
    await db.flush();
    console.log(`Imported ${imported} record(s).`);
} finally {
    await pool.end();
}
