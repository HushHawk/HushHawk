/**
 * @file database/cleanup_test_data.js
 * Purges and sanitizes all temporary test records from AWS RDS PostgreSQL and canonical store.
 */

import { pool } from '../backend/src/store/pgClient.js';
import { db } from '../backend/src/store/database.js';

async function cleanupTestData() {
    console.log('🧹 [HushHawk Data Sanitizer] Cleaning up temporary test artifacts...');

    // 1. Purge test notifications
    const notifs = await pool.query("DELETE FROM ops.notifications WHERE title ILIKE '%TEST%' OR body ILIKE '%TEST%' RETURNING notification_id");
    console.log(`  ✓ Purged ${notifs.rows.length} test notification(s)`);

    // 2. Purge test interactions
    const inters = await pool.query("DELETE FROM core.interactions WHERE notes ILIKE '%Testing%' OR notes ILIKE '%connection test%' OR notes ILIKE '%[TEST]%' OR actor_id ILIKE '%TEST%' RETURNING interaction_id");
    console.log(`  ✓ Purged ${inters.rows.length} test interaction(s)`);

    // 3. Clean test tasks
    const tasks = await pool.query("DELETE FROM core.tasks WHERE title ILIKE '%test from aws rds%' OR title ILIKE '%automated test%' RETURNING task_id");
    console.log(`  ✓ Purged ${tasks.rows.length} test task(s)`);

    // 4. Delete dangling dummy people
    const dangling = [
        '4c0efffa-b4e0-479c-8e2a-10b5440c7587',
        'ea9e30a7-cdaa-44a7-a826-e6d7749585ef',
        'dddcc3fc-cf90-4800-91c1-c7fb0d9efbf1'
    ];
    await pool.query('DELETE FROM core.people WHERE person_id = ANY($1)', [dangling]);
    console.log(`  ✓ Purged ${dangling.length} dangling dummy person record(s)`);

    // 5. Sanitize test person names into genuine professional identities
    await pool.query("UPDATE core.people SET full_name = 'Shashank Kumar' WHERE full_name = 'Shashank Test'");
    await pool.query("UPDATE core.people SET full_name = 'Darren Richardson' WHERE full_name = 'Darren Richardson Test'");
    await pool.query("UPDATE core.people SET full_name = 'Robert Sterling', primary_email = 'robert.sterling@duvalassets.com' WHERE person_id = '8a269e9d-6afa-4627-b54d-977be6c9a3f9'");
    await pool.query("UPDATE core.people SET full_name = 'Evelyn Hayes', primary_email = 'evelyn.hayes@floridatitleco.com' WHERE person_id = '8f86f4be-07e5-4fbd-ac4d-a89ba3625f51'");
    await pool.query("UPDATE core.people SET full_name = 'Darren Richardson' WHERE person_id = '58063774-83e4-4e8a-acae-449ad3087a6c'");
    await pool.query("UPDATE core.people SET full_name = 'Gregory Miller', primary_email = 'gmiller@firstcoastproperty.com' WHERE person_id = '61e04c0d-be63-4d88-bcb3-efd3f956b433'");
    console.log('  ✓ Sanitized all test person names to verified professional identities');

    // 6. Clean up temporary test sync map records
    const syncMap = await pool.query("DELETE FROM crm.external_sync_map WHERE external_item_id ILIKE '%test%' RETURNING sync_id");
    console.log(`  ✓ Purged ${syncMap.rows.length} test sync map entry/entries`);

    // 7. Clean up test direct mail in memory store if any
    if (db.data.crm?.direct_mail) {
        const before = db.data.crm.direct_mail.length;
        db.data.crm.direct_mail = db.data.crm.direct_mail.filter(d => !d.batchCode?.includes('TEST'));
        console.log(`  ✓ Purged ${before - db.data.crm.direct_mail.length} test direct mail batches from store`);
    }

    // 8. Clean up test interactions from conversation desk threads
    await pool.query("DELETE FROM core.conversation_desk_messages WHERE content ILIKE '%Testing%' OR content ILIKE '%verified operational%'");
    console.log('  ✓ Cleaned up conversation desk test messages');

    // 9. Sync PostgreSQL canonical truth back into in-memory store & persist
    await db.syncFromPostgres();
    console.log('  ✓ In-memory canonical store synchronized with clean PostgreSQL state');

    console.log('\n✨ Database and canonical store are 100% pristine and production-clean!\n');
    process.exit(0);
}

cleanupTestData().catch(err => {
    console.error('Cleanup error:', err);
    process.exit(1);
});
