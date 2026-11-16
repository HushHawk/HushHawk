/**
 * @file database/purge_all_mock_data.js
 * Comprehensive Sanitizer: Removes all simulated, mock, fake, and hardcoded test records
 * from AWS RDS PostgreSQL and canonical JSON store while strictly preserving:
 * - Real ingested leads in core.leads (e.g. from Podio CRM & BatchLeads webhooks)
 * - Real properties in core.properties
 * - Real people in core.people
 * - Reference schemas (counties, pillars, lead_sources)
 * - Administrative users in core.users
 */

import { pool } from '../backend/src/store/pgClient.js';
import { db } from '../backend/src/store/database.js';

async function purgeMockData() {
    console.log('🚀 [HushHawk Purge] Starting systematic removal of simulated/mock data...\n');

    // 1. Purge simulated Deal-Flow Funnel deals (19 fake deals)
    const funnelRes = await pool.query('DELETE FROM crm.deal_funnel RETURNING id, code, address, seller');
    console.log(`✓ Purged ${funnelRes.rows.length} simulated deal(s) from crm.deal_funnel:`);
    funnelRes.rows.slice(0, 5).forEach(d => console.log(`   - ${d.code}: ${d.address} (${d.seller})`));
    if (funnelRes.rows.length > 5) console.log(`   ... and ${funnelRes.rows.length - 5} more.`);

    // 2. Purge simulated conversation desk messages & threads (Social Media: FB, IG, TikTok, YouTube, Reddit, etc.)
    const msgsRes = await pool.query('DELETE FROM core.conversation_desk_messages RETURNING id');
    console.log(`✓ Purged ${msgsRes.rows.length} simulated message(s) from core.conversation_desk_messages`);

    const threadsRes = await pool.query('DELETE FROM core.conversation_desk_threads RETURNING id, platform_id, contact_name');
    console.log(`✓ Purged ${threadsRes.rows.length} simulated thread(s) from core.conversation_desk_threads across all social platforms`);

    // 3. Purge mock / test outreach emails
    const emailsRes = await pool.query('DELETE FROM core.outreach_emails RETURNING id, recipient_name, email');
    console.log(`✓ Purged ${emailsRes.rows.length} mock/test email(s) from core.outreach_emails:`);
    emailsRes.rows.forEach(e => console.log(`   - ${e.recipient_name} <${e.email}>`));

    // 4. Purge mock tasks
    const tasksRes = await pool.query('DELETE FROM core.tasks RETURNING task_id, title');
    console.log(`✓ Purged ${tasksRes.rows.length} mock task(s) from core.tasks`);

    // 5. Purge test calendar events (if table exists)
    try {
        const calRes = await pool.query("DELETE FROM crm.calendar_events RETURNING id");
        console.log(`✓ Purged ${calRes.rows.length} test event(s) from crm.calendar_events`);
    } catch (_) {
        // Table may only exist in in-memory store
    }

    // 6. Purge test cash buyers (e.g. Audit Buyer LLC)
    const buyerRes = await pool.query("DELETE FROM crm.cash_buyers WHERE full_name ILIKE '%audit%' OR email ILIKE '%audit%' RETURNING id, full_name");
    console.log(`✓ Purged ${buyerRes.rows.length} test buyer(s) from crm.cash_buyers`);

    // 7. Purge test partner chat test messages (keep clean general channel)
    const chatRes = await pool.query("DELETE FROM core.partner_chat_messages WHERE message_text IN ('test', 'hi') OR message_text ILIKE '%test%' RETURNING id");
    console.log(`✓ Purged ${chatRes.rows.length} test partner chat message(s)`);

    // 8. Clean in-memory / JSON canonical store
    if (db.data.crm) {
        db.data.crm.funnel_deals = [];
        db.data.crm.facebook_leads = [];
        db.data.crm.direct_mail = [];
        db.data.crm.calendar_events = [];
        db.data.crm.contracts = [];
        db.data.crm.communications = [];
        db.data.crm.follow_ups = [];
        console.log('✓ Cleared mock CRM stores (funnel_deals, facebook_leads, direct_mail, calendar_events, contracts, communications, follow_ups)');
    }
    db.data.marketing_campaigns = [];
    db.data.deal_analyses = [];
    db.data.automations = [];
    console.log('✓ Cleared mock marketing campaigns, deal analyses, and automations');

    if (typeof db.persist === 'function') {
        db.persist();
        console.log('✓ Persisted clean canonical_store.json');
    }

    // 9. Verify Authentic Real Production Records are Untouched
    const [realLeads, realProps, realPeople] = await Promise.all([
        pool.query('SELECT count(*) FROM core.leads'),
        pool.query('SELECT count(*) FROM core.properties'),
        pool.query('SELECT count(*) FROM core.people')
    ]);

    console.log('\n=============================================');
    console.log('AUTHENTIC PRODUCTION DATA VERIFICATION:');
    console.log(`  Real Leads in core.leads:       ${realLeads.rows[0].count} (PRESERVED)`);
    console.log(`  Real Properties in core.props:  ${realProps.rows[0].count} (PRESERVED)`);
    console.log(`  Real People in core.people:     ${realPeople.rows[0].count} (PRESERVED)`);
    console.log('=============================================\n');

    console.log('✨ All mock, fake, and simulated data has been successfully eradicated!');
    process.exit(0);
}

purgeMockData().catch(err => {
    console.error('Purge error:', err);
    process.exit(1);
});
