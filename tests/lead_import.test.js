/**
 * @file tests/lead_import.test.js
 * Verification test suite for HushHawk Bulk Lead Ingestion & Skip-Trace Processing
 * Tests real-world 28-record Florida skip-traced lead list provided by user.
 * Conforms to HushHawk Milestone 1 Blueprint and user requirement:
 * "use them test the system and if all okay remove them"
 */

import assert from 'assert';
import { pool } from '../backend/src/store/pgClient.js';
import { LeadImportService } from '../backend/src/services/leadImportService.js';
import { validateCrownKeyFormat } from '../packages/crownkey/index.js';

// The 28 real skip-traced records provided by the user for testing
const RAW_USER_TEST_DATA = `Lead Status	First Name	Last Name	Mailing City	Mailing State	Mailing Zip	Mailing County	Property City	Property State	Property Zip	Property County	Email	Email 2	Apn	Phone 1	Phone 1 TYPE	Phone 2	Phone 2 TYPE	Phone 3	Phone 3 TYPE	Phone 4	Phone 4 TYPE	Phone 5	Phone 5 TYPE	List
New	Nancy	Kramer	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-8668	Clay	skippy105@hotmail.com	pgarcia83@tampabay.rr.com	46-05-26-010301-005-70	7403985619	Mobile	7403979353	Landline	7403261437	Landline	7403973947	Landline	5087670339	Landline	july 2025
New	Kristina	Byrd	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-9557	Clay	isaiahbyrd@outlook.com	kristinaskitchen@hotmail.com	38-05-25-010036-000-00	8432602538	Mobile	9043842052	Landline	9315519930	Landline	9042727222	Landline	9044069043	Landline	july 2025
New		TAH MS BORROWER LLC	Santa Ana	CA	92705-5426	Orange	Middleburg	FL	32068-4155	Clay	taryn_moss@yahoo.com	ddhollimon@yahoo.com	04-05-25-009008-001-29	8135029453	Mobile	8139077719	Mobile	8137758076	Mobile	8139919609	Landline	3195502279	Mobile	july 2025
New	DEBORAH	CARPENTER	Middleburg	FL	32068	Clay	Middleburg	FL	32068-4324	Clay	dcarpenter4503@yahoo.com	dcarpenter1842@comcast.net	04-05-25-009001-002-15	9045361484	Mobile	9044069462	Landline	9043898715	Landline	9047446532	Landline	9043849307	Landline	july 2025
New	Kareem J	Byfield	Orange Park	FL	32065	Clay	Orange Park	FL	32065-2686	Clay	valetprowaste@gmail.com	byfield81@yahoo.com	13-04-24-005542-012-21	9044126182	Mobile	9045401079	Mobile	9048811418	Mobile	6506052521	Landline	9042915618	Landline	july 2025
New	Ashlyn Dawn	Hutton	Middleburg	FL	32068	Clay	Middleburg	FL	32068-4485	Clay	ashlyn.hutton@icloud.com	ashlyndawn97@gmail.com	18-04-25-007953-057-33	9042937182	Mobile											july 2025
New	John	French	Middleburg	FL	32068	Clay	Middleburg	FL	32068-6121	Clay	enviroinno@aol.com	cloudbubub@aol.com	35-05-24-006699-784-00	9044836181	Mobile	9042720827	Landline	9042152056	Landline	9042980573	Landline					july 2025
New	David	Church	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-7051	Clay	elvisrosendo43@yahoo.com	crestrondave73@gmail.com	27-05-25-010109-014-18	2039817688	Mobile	9044838192	Mobile	9043239593	Mobile	9049823335	Mobile	2038550538	Landline	july 2025
New	Brian	Waltrip	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-7048	Clay	waltripmegan@yahoo.com	bw_742@yahoo.com	22-05-25-010109-011-29	9047088058	Mobile	9047088059	Mobile	9043277937	Mobile	4045740810	Mobile	9042037657	Landline	july 2025
New	Xin	Hao	Orange Park	FL	32065	Clay	Orange Park	FL	32065-5286	Clay	shangrilajudy@gmail.com		05-04-25-007868-020-51	4159881314	Mobile											july 2025
New	Jake	Updegraff	Middleburg	FL	32068	Clay	Middleburg	FL	32068-3528	Clay	upde@gmail.com	upde32@yahoo.com	01-05-23-000475-002-00	9046253803	Mobile	6093469068	Mobile	9042828519	Landline	9044137935	Landline	8502654552	Landline	july 2025
New	Michael	Carter	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-7287	Clay	savannah3773@yahoo.com	savannah@mccormackspainting.com	27-05-25-010109-017-23	9048813948	Mobile	9043862816	Mobile	9042300469	Landline	9042600880	Landline					july 2025
New	Barbara	Lewis	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-7052	Clay	madeinmurica@gmail.com	teekodog@gmail.com	22-05-25-010109-012-16	8656604695	Mobile	8652545288	Mobile	8652545841	Mobile	8656914353	Landline					july 2025
New	Matthew	Eriquez	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-8043	Clay	eriquez123@gmail.com	thestarsfall925@aim.com	04-06-26-015231-007-03	8026968152	Mobile	2037896172	Landline	2038269610	Mobile	9787313816	Landline	2033647315	Mobile	july 2025
New	Kollin P	Clinton	Orange Park	FL	32065	Clay	Orange Park	FL	32065-3520	Clay	kollinclinton46@gmail.com		12-04-24-007869-026-60	9044657545	Mobile	9047130422	Landline									july 2025
New	Germaine	Burd	Orange Park	FL	32065	Clay	Orange Park	FL	32065-2525	Clay	gvburd@att.net	julianburd4@gmail.com	07-04-25-007869-006-12	9043141412	Mobile	9045056865	Mobile	9042828234	Landline	9044064682	Landline	9044428376	Landline	july 2025
New	Tracy H	Holmes	Middleburg	FL	32068	Clay	Middleburg	FL	32068-3205	Clay	tonimellison@yahoo.com	ttthao@hotmail.com	26-04-24-005606-166-00	9046166688	Mobile	9045455116	Mobile	9046478339	Landline	9043742599	Landline	9042143287	Landline	july 2025
New	James	Washington	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-8271	Clay	pitbosspvgjw@gmail.com	washingtonjames904@gmail.com	32-05-26-014462-005-86	3865381655	Mobile	9045026992	Mobile													july 2025
New		ESTATE OF JILL LESLIE ADAMS	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-8288	Clay	jill.adams@orhs.org	jill.adams@usa.net	39-05-25-010097-010-30	4079021977	Mobile	9542610199	Mobile	4074533396	Mobile	4072610199	Landline	3219729160	Landline	july 2025
New	William	Howard	Middleburg	FL	32068	Clay	Middleburg	FL	32068-7166	Clay	wthomashoward@gmail.com	sirhoward23@yahoo.com	19-05-25-010087-001-00	9043438093	Mobile	9045145592	Mobile	9046627076	Mobile							july 2025
New	Jonathan	Sendelbach	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-8672	Clay	jsend1720@gmail.com	sendel1720@yahoo.com	46-05-26-010301-006-60	4197876556	Mobile	5136978460	Mobile	4192551509	Landline							july 2025
New	Claude	Fleurimond	Middleburg	FL	32068	Clay	Middleburg	FL	32068-9117	Clay	cpuffj@yahoo.com	araines03@gmail.com	18-04-25-007953-060-44	6462350156	Mobile	7182724900	Landline	7182724909	Landline	7186490501	Landline	7182572631	Landline	july 2025
New	Mary	Free	Middleburg	FL	32068	Clay	Middleburg	FL	32068-3711	Clay	blueangelcat@yahoo.com	mfree2469@gmail.com	35-04-24-005821-014-00	3526817989	Mobile	9046779069	Mobile	9044228359	Mobile	9042822354	Landline	9042820992	Landline	july 2025
New		ESTATE OF ARTHUR C SMITH	Middleburg	FL	32068	Clay	Middleburg	FL	32068-4669	Clay	grawulf@msn.com	grawulf@gmail.com	04-05-24-005931-007-00	9043381742	Mobile	9046547820	Mobile	9042149812	Landline	9047308626	Landline	9047315037	Landline	july 2025
New	ANGELA	BAKER	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-8035	Clay	yovano_girl@yahoo.com	angela.crumpler@comcast.net	04-06-26-015231-003-77	9045916928	Mobile	9045517576	Landline	9045517575	Landline	9047308812	Landline	9047831899	Landline	july 2025
New	Pamela	Wilson	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-6221	Clay	pammie19@hotmail.com	pammie614@yahoo.com	22-05-25-010109-004-67	6145573889	Mobile	6149004895	Mobile	6145840808	Mobile	6145512001	Mobile	6145070745	Mobile	july 2025
New	Ginger Dianne	Herrington	Green Cove Springs	FL	32043	Clay	Green Cove Springs	FL	32043-8265	Clay	ishiakai75@gmail.com	jonesishia@yahoo.com	32-05-26-014462-005-49	7177798703	Mobile	7178874580	Mobile	7176506529	Landline	7178451641	Landline	7178438455	Landline	july 2025
New	DAVID	TONAN	Fernandina Beach	FL	32034	Clay	Green Cove Springs	FL	32043-7051	Clay	leetonan@aol.com	dtonan@gmail.com	27-05-25-010109-014-93	7027684167	Mobile	7027684168	Mobile	3059929200	Mobile	7026459881	Landline	7026426431	Landline	july 2025`;

async function runTestSuite() {
    console.log('================================================================');
    console.log('🦅 HUSHHAWK BULK LEAD INGESTION & SKIP-TRACE PROCESSING TEST');
    console.log('================================================================\n');

    let importResult = null;

    try {
        // [Test 1] Parse Tabular Data (TSV)
        console.log('[Test 1] Parsing Tabular Skip-Trace Data');
        const parsedRows = LeadImportService.parseRawTabular(RAW_USER_TEST_DATA);
        assert.strictEqual(parsedRows.length, 28, 'Should parse exactly 28 lead records');
        assert.strictEqual(parsedRows[0]['First Name'], 'Nancy', 'Row 1 first name Nancy');
        assert.strictEqual(parsedRows[0]['Apn'], '46-05-26-010301-005-70', 'Row 1 APN raw punctuated text');
        assert.strictEqual(parsedRows[2]['Last Name'], 'TAH MS BORROWER LLC', 'Row 3 LLC entity');
        console.log(`  ✓ PASS: Successfully parsed 28 rows with headers and raw APNs`);

        // [Test 2] Execute Bulk Ingestion into AWS RDS PostgreSQL
        console.log('\n[Test 2] Bulk Ingestion into AWS RDS PostgreSQL (core.leads, core.properties, core.people)');
        importResult = await LeadImportService.processImport({
            data: RAW_USER_TEST_DATA,
            sourceCode: 'MAIL',
            actor: 'Test Ingestion Suite',
            defaultListName: 'july 2025'
        });

        assert.strictEqual(importResult.success, true, 'Import should report success');
        assert.strictEqual(importResult.count, 28, 'Imported count should be 28');
        assert.strictEqual(importResult.ids.lead_ids.length, 28, '28 canonical lead UUIDs created');
        assert.strictEqual(importResult.ids.property_ids.length, 28, '28 canonical property UUIDs created');
        assert.strictEqual(importResult.ids.person_ids.length, 28, '28 canonical person UUIDs created');
        console.log(`  ✓ PASS: Successfully ingested 28 records into AWS RDS PostgreSQL`);

        // [Test 3] Verify CrownKey Formatting & Raw Parcel Preservation
        console.log('\n[Test 3] CrownKey Formatting & Parcel Punctuation Verification');
        const firstLead = importResult.leads[0];
        assert.strictEqual(firstLead.parcel_raw, '46-05-26-010301-005-70', 'Parcel raw punctuation preserved intact');
        assert.strictEqual(firstLead.crownKey, 'CLY-46-05-26-010301-005-70 · MAIL', 'CrownKey rendered with county and source');
        const validation = validateCrownKeyFormat(firstLead.crownKey);
        assert.strictEqual(validation.valid, true, 'CrownKey must be valid canonical format');
        assert.strictEqual(validation.caseType, 2, 'CrownKey caseType 2 (County-Parcel · Source)');
        console.log(`  ✓ PASS: CrownKey conforms: ${firstLead.crownKey}`);

        // [Test 4] Verify Multi-Phone Ladder & Email Ladder in PostgreSQL
        console.log('\n[Test 4] Verifying Contact Ladders (Phones & Emails) in PostgreSQL');
        const personCheck = await pool.query(`
            SELECT full_name, primary_phone, primary_email, phones, emails
            FROM core.people
            WHERE person_id = $1
        `, [importResult.ids.person_ids[0]]);

        assert.strictEqual(personCheck.rows.length, 1, 'Person record exists in core.people');
        const p = personCheck.rows[0];
        assert.strictEqual(p.full_name, 'Nancy Kramer');
        assert.strictEqual(p.primary_phone, '(740) 398-5619');
        assert.strictEqual(p.primary_email, 'skippy105@hotmail.com');
        assert.strictEqual(p.phones.length, 5, 'All 5 phones preserved in structured ladder');
        assert.strictEqual(p.phones[0].type, 'Mobile', 'Phone 1 is Mobile');
        assert.strictEqual(p.phones[1].type, 'Landline', 'Phone 2 is Landline');
        assert.strictEqual(p.emails.length, 2, 'Both primary and secondary email preserved');
        console.log(`  ✓ PASS: Contact ladder verified: ${p.phones.length} phones, ${p.emails.length} emails`);

        // [Test 5] Verify Audit Event & Operational Notification
        console.log('\n[Test 5] Verifying Immutable Audit Trail & Real-Time Notification in RDS');
        const auditCheck = await pool.query(`
            SELECT action, actor, entity_type FROM audit.audit_events
            WHERE action = 'LEADS_BULK_IMPORTED'
            ORDER BY created_at DESC LIMIT 1
        `);
        assert.strictEqual(auditCheck.rows.length, 1, 'Audit event recorded');
        assert.strictEqual(auditCheck.rows[0].action, 'LEADS_BULK_IMPORTED');

        const notifCheck = await pool.query(`
            SELECT title, category, color, is_read FROM ops.notifications
            WHERE notification_id = $1
        `, [importResult.notification_id]);
        assert.strictEqual(notifCheck.rows.length, 1, 'Notification recorded in ops.notifications');
        assert.strictEqual(notifCheck.rows[0].category, 'LEAD');
        assert.strictEqual(notifCheck.rows[0].is_read, false);
        console.log(`  ✓ PASS: Audit event and live operational notification verified in RDS`);

        // [Test 6] Clean up test records (restoring canonical truth)
        console.log('\n[Test 6] User Requirement: "use them test the system and if all okay remove them"');
        const purgeResult = await LeadImportService.purgeBatch({
            leadIds: importResult.ids.lead_ids,
            propertyIds: importResult.ids.property_ids,
            personIds: importResult.ids.person_ids
        });
        assert.strictEqual(purgeResult.purged_leads, 28, 'All 28 test leads purged');
        assert.strictEqual(purgeResult.purged_properties, 28, 'All 28 test properties purged');
        assert.strictEqual(purgeResult.purged_people, 28, 'All 28 test people purged');

        // Clean up test notification
        await pool.query('DELETE FROM ops.notifications WHERE notification_id = $1', [importResult.notification_id]);
        console.log(`  ✓ PASS: All 28 test records safely removed from AWS RDS; database is pristine!`);

        console.log('\n================================================================');
        console.log('🎉 ALL BULK LEAD INGESTION TESTS PASSED AT 100%!');
        console.log('================================================================\n');
        process.exit(0);
    } catch (err) {
        console.error('\n❌ TEST FAILURE:', err);
        // Attempt emergency cleanup if error occurred
        if (importResult?.ids) {
            try {
                await LeadImportService.purgeBatch({
                    leadIds: importResult.ids.lead_ids,
                    propertyIds: importResult.ids.property_ids,
                    personIds: importResult.ids.person_ids
                });
            } catch (cleanupErr) {
                console.error('Cleanup error:', cleanupErr);
            }
        }
        process.exit(1);
    }
}

runTestSuite();
