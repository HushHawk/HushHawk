/**
 * @file tests/notifications.test.js
 * Comprehensive Operational Notifications Test Suite
 */

import { pool } from '../backend/src/store/pgClient.js';
import crypto from 'crypto';

async function runNotificationTests() {
    console.log('🦅 Running HushHawk Operational Notifications Test Suite...\n');

    let allPass = true;
    function assert(condition, message) {
        if (!condition) {
            console.error(`  ❌ FAIL: ${message}`);
            allPass = false;
        } else {
            console.log(`  ✓ PASS: ${message}`);
        }
    }

    try {
        // Test 1: Verify PostgreSQL Table Existence
        console.log('[Test 1] PostgreSQL ops.notifications Table Existence & Schema');
        const tableCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'ops' AND table_name = 'notifications'
        `);
        const colMap = Object.fromEntries(tableCheck.rows.map(r => [r.column_name, r.data_type]));
        assert(colMap.notification_id === 'uuid', 'notification_id is UUID');
        assert(colMap.title !== undefined, 'title column exists');
        assert(colMap.body !== undefined, 'body column exists');
        assert(colMap.is_read === 'boolean', 'is_read column is boolean');
        assert(colMap.category !== undefined, 'category column exists');

        // Test 2: Create a Notification
        console.log('\n[Test 2] Real-time Operational Notification Creation');
        const testId = crypto.randomUUID();
        const testTitle = `Escrow Funded: ${Date.now()}`;
        const testBody = '$45,000 assignment fee received from First American Title';

        await pool.query(`
            INSERT INTO ops.notifications 
            (notification_id, title, body, category, priority, color, icon, action_url, is_read, created_at)
            VALUES ($1, $2, $3, 'ESCROW', 'HIGH', 'green', 'check', '/acquisitions', false, NOW())
        `, [testId, testTitle, testBody]);

        const fetchNew = await pool.query('SELECT * FROM ops.notifications WHERE notification_id = $1', [testId]);
        assert(fetchNew.rows.length === 1, 'Notification persisted in ops.notifications');
        assert(fetchNew.rows[0].title === testTitle, 'Notification title matched exactly');
        assert(fetchNew.rows[0].is_read === false, 'Notification created as unread (is_read = false)');

        // Test 3: Mark Notification as Read
        console.log('\n[Test 3] Mark Notification as Read');
        await pool.query(`
            UPDATE ops.notifications 
            SET is_read = true, read_at = NOW() 
            WHERE notification_id = $1
        `, [testId]);

        const fetchRead = await pool.query('SELECT * FROM ops.notifications WHERE notification_id = $1', [testId]);
        assert(fetchRead.rows[0].is_read === true, 'Notification is_read updated to true');
        assert(fetchRead.rows[0].read_at !== null, 'Notification read_at timestamp recorded');

        // Test 4: Batch Mark-All-Read
        console.log('\n[Test 4] Batch Mark All as Read');
        const tempId1 = crypto.randomUUID();
        const tempId2 = crypto.randomUUID();
        await pool.query(`
            INSERT INTO ops.notifications (notification_id, title, body, is_read) 
            VALUES ($1, 'Batch Test 1', 'Desc', false), ($2, 'Batch Test 2', 'Desc', false)
        `, [tempId1, tempId2]);

        await pool.query(`UPDATE ops.notifications SET is_read = true, read_at = NOW() WHERE notification_id = ANY($1)`, [[tempId1, tempId2]]);
        const unreadCount = await pool.query('SELECT count(*) FROM ops.notifications WHERE notification_id = ANY($1) AND is_read = false', [[tempId1, tempId2]]);
        assert(Number(unreadCount.rows[0].count) === 0, 'Batch unread notifications marked as read (unread count = 0)');

        // Test 5: Cleanup Test Records
        console.log('\n[Test 5] Clean up test records');
        await pool.query('DELETE FROM ops.notifications WHERE notification_id = ANY($1)', [[testId, tempId1, tempId2]]);
        const checkPurged = await pool.query('SELECT count(*) FROM ops.notifications WHERE notification_id = $1', [testId]);
        assert(Number(checkPurged.rows[0].count) === 0, 'Test notifications safely purged from database');

        console.log('\n================================================================');
        if (allPass) {
            console.log('🎉 ALL OPERATIONAL NOTIFICATION TESTS PASSED WITH 100% SUCCESS!');
        } else {
            console.error('❌ SOME NOTIFICATION TESTS FAILED.');
            process.exit(1);
        }
        console.log('================================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('Fatal Notification Test Error:', err);
        process.exit(1);
    }
}

runNotificationTests();

