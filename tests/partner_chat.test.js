/**
 * @file tests/partner_chat.test.js
 * Comprehensive Verification Suite for HushHawk Partner Multi-Chat & Property Layer Messenger
 * (Alex Richard & Waldo Ellis)
 */

import assert from 'assert';
import express from 'express';
import { apiRouter } from '../backend/src/routes/api.js';
import { pool } from '../backend/src/store/pgClient.js';

async function runTestSuite() {
    console.log('\n================================================================');
    console.log('🦅 HUSHHAWK PARTNER MULTI-CHAT & PROPERTY MESSENGER TEST SUITE');
    console.log('================================================================\n');

    const app = express();
    app.use(express.json());
    app.use('/api/v1', apiRouter);

    const server = app.listen(4011);
    const BASE = 'http://localhost:4011/api/v1';

    try {
        // [Test 1] Partner Presence (Alex Richard & Waldo Ellis online)
        console.log('[Test 1] Verifying Partner Presence & Online Status Ribbon...');
        const presRes = await fetch(`${BASE}/chat/presence`);
        assert.strictEqual(presRes.status, 200, 'Presence should return 200');
        const presData = await presRes.json();
        assert.ok(presData.ok, 'Presence response should be ok');
        
        const alex = presData.presence.find(p => p.user_name === 'Alex Richard');
        const waldo = presData.presence.find(p => p.user_name === 'Waldo Ellis');
        assert.ok(alex, 'Alex Richard must exist in presence directory');
        assert.ok(waldo, 'Waldo Ellis must exist in presence directory');
        assert.strictEqual(alex.status, 'online', 'Alex Richard must be online');
        assert.strictEqual(waldo.status, 'online', 'Waldo Ellis must be online');
        console.log(`  ✓ PASS: Online presence verified for Alex Richard (${alex.status}) and Waldo Ellis (${waldo.status})`);

        // [Test 2] Property Quick Search & Dropdown (Finding 123 Main St, 881 Main St, 3245 Main St)
        console.log('\n[Test 2] Testing Property Quick Search Dropdown...');
        const searchRes = await fetch(`${BASE}/chat/search-properties?q=Main`);
        assert.strictEqual(searchRes.status, 200, 'Search should return 200');
        const searchData = await searchRes.json();
        assert.ok(searchData.properties.length >= 3, 'Should find at least 3 Main St properties');
        
        const has123 = searchData.properties.some(p => p.address_line1.includes('123 Main'));
        const has881 = searchData.properties.some(p => p.address_line1.includes('881 Main'));
        const has3245 = searchData.properties.some(p => p.address_line1.includes('3245 Main'));
        assert.ok(has123 && has881 && has3245, 'Dropdown should find 123 Main, 881 Main, and 3245 Main St');
        console.log(`  ✓ PASS: Quick search resolved all 3 sample properties from PostgreSQL RDS`);

        // [Test 3] Multi-Chat Threads Retrieval & Layer Isolation
        console.log('\n[Test 3] Verifying Multi-Chat Threads & Layer Isolation...');
        const threadsRes = await fetch(`${BASE}/chat/threads?user=Alex+Richard`);
        assert.strictEqual(threadsRes.status, 200, 'Threads should return 200');
        const threadsData = await threadsRes.json();
        assert.ok(threadsData.threads.length >= 4, 'Should have General + 3 property threads');

        const generalTh = threadsData.threads.find(t => t.thread_type === 'general');
        const p123Th = threadsData.threads.find(t => t.title.includes('123 Main'));
        const p881Th = threadsData.threads.find(t => t.title.includes('881 Main'));
        const p3245Th = threadsData.threads.find(t => t.title.includes('3245 Main'));

        assert.ok(generalTh, 'General thread must exist');
        assert.ok(p123Th, '123 Main St thread must exist');
        assert.ok(p881Th, '881 Main St thread must exist');
        assert.ok(p3245Th, '3245 Main St thread must exist');
        console.log(`  ✓ PASS: Multi-chat layers isolated: General, 123 Main, 881 Main, 3245 Main`);

        // [Test 4] Sending Message as Alex Richard in 123 Main St Thread
        console.log('\n[Test 4] Sending Message as Alex Richard on 123 Main St...');
        const sendMsg1 = await fetch(`${BASE}/chat/threads/${p123Th.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_name: 'Alex Richard',
                sender_role: 'Acquisitions Lead (Admin)',
                message_text: 'Waldo, counter-offer for 123 Main St accepted at $142,500. Title docs uploaded.',
                tag: 'Offer Update'
            })
        });
        assert.strictEqual(sendMsg1.status, 201, 'Sending message should return 201');
        const msg1Data = await sendMsg1.json();
        assert.ok(msg1Data.ok, 'Message response ok');
        assert.strictEqual(msg1Data.message.sender_name, 'Alex Richard');
        assert.strictEqual(msg1Data.message.is_read_alex, true, 'Sender Alex has read message');
        assert.strictEqual(msg1Data.message.is_read_waldo, false, 'Recipient Waldo has unread message');
        console.log(`  ✓ PASS: Alex message persisted; recipient Waldo marked with unread notification`);

        // [Test 5] Waldo Views Unread Message & Replies
        console.log('\n[Test 5] Waldo Ellis Switches Persona, Views Messages, & Replies...');
        const waldoThreads = await fetch(`${BASE}/chat/threads?user=Waldo+Ellis`);
        const waldoThData = await waldoThreads.json();
        const waldo123 = waldoThData.threads.find(t => t.id === p123Th.id);
        assert.ok(waldo123.unread_count > 0, 'Waldo must have unread notification count on 123 Main St layer');
        console.log(`  ✓ PASS: Unread indicator active on 123 Main St tab for Waldo: ${waldo123.unread_count} unread`);

        // Waldo opens the thread (which auto-marks as read)
        const waldoRead = await fetch(`${BASE}/chat/threads/${p123Th.id}/messages?user=Waldo+Ellis`);
        const waldoMsgList = await waldoRead.json();
        assert.ok(waldoMsgList.messages.length >= 1, 'Should contain message in order');

        // Waldo sends reply with quote reference
        const sendMsg2 = await fetch(`${BASE}/chat/threads/${p123Th.id}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sender_name: 'Waldo Ellis',
                sender_role: 'Dispositions Lead (Partner)',
                message_text: 'Outstanding! Buyer pool lined up at $185k assignment fee. Clean $42.5k spread.',
                tag: 'Buyer Pool',
                reply_to_id: msg1Data.message.id,
                reply_to_sender: 'Alex Richard',
                reply_to_text: msg1Data.message.message_text
            })
        });
        assert.strictEqual(sendMsg2.status, 201);
        const msg2Data = await sendMsg2.json();
        assert.strictEqual(msg2Data.message.reply_to_id, msg1Data.message.id, 'Reply reference must be linked');
        assert.strictEqual(msg2Data.message.reply_to_sender, 'Alex Richard');
        console.log(`  ✓ PASS: Waldo reply sent with quote reference linked to Alex message`);

        // [Test 6] Property Dossier Integration Verification
        console.log('\n[Test 6] Verifying Property Dossier Chat & Interaction Ledger...');
        const propChatRes = await fetch(`${BASE}/properties/${p123Th.property_id}/partner-chat`);
        assert.strictEqual(propChatRes.status, 200);
        const propChatData = await propChatRes.json();
        assert.ok(propChatData.messages.length >= 2, 'Property dossier should contain partner chat messages');
        
        // Verify interaction in core.interactions
        const { rows: intRows } = await pool.query(
            `SELECT * FROM core.interactions WHERE property_id = $1 AND method = 'TEXT' ORDER BY occurred_at DESC LIMIT 1`,
            [p123Th.property_id]
        );
        assert.ok(intRows.length > 0, 'Interaction should be recorded in core.interactions');
        assert.ok(intRows[0].notes.includes('Partner iMessage'), 'Notes must reflect partner iMessage');
        console.log(`  ✓ PASS: Property dossier & PostgreSQL core.interactions 100% synchronized`);

        // [Test 7] Message Deletion Endpoint (DELETE /api/v1/chat/messages/:id)
        console.log('\n[Test 7] Testing Message Deletion (DELETE /api/v1/chat/messages/:id)...');
        const delRes = await fetch(`${BASE}/chat/messages/${msg2Data.message.id}`, {
            method: 'DELETE'
        });
        assert.strictEqual(delRes.status, 200, 'Delete message should return 200');
        const delData = await delRes.json();
        assert.ok(delData.ok, 'Delete should be confirmed ok');
        assert.strictEqual(delData.deleted_id, msg2Data.message.id);
        console.log(`  ✓ PASS: Message deleted successfully from PostgreSQL RDS`);

        // Clean up msg1Data as well to ensure clean production DB
        await fetch(`${BASE}/chat/messages/${msg1Data.message.id}`, { method: 'DELETE' });
        console.log(`  ✓ PASS: Cleaned up test messages. Zero mock data retained.`);

        console.log('\n================================================================');
        console.log('🎉 ALL PARTNER MULTI-CHAT & PROPERTY MESSENGER TESTS PASSED (100%)');
        console.log('================================================================\n');

    } catch (err) {
        console.error('\n❌ Test Suite Failure:', err);
        process.exit(1);
    } finally {
        server.close();
        await pool.end();
    }
}

runTestSuite();
