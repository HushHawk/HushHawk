/**
 * @file tests/s3_storage.test.js
 * Verification Test Suite for AWS S3 Private Vault & Document Management
 */

import assert from 'assert';
import crypto from 'crypto';
import { StorageService } from '../backend/src/services/storageService.js';
import { pool } from '../backend/src/store/pgClient.js';

const API_BASE = 'http://localhost:3001/api/v1';

async function runTests() {
    console.log('\n=============================================================');
    console.log('   HUSHHAWK AWS S3 PRIVATE VAULT VERIFICATION SUITE');
    console.log('=============================================================\n');

    const testPropId = crypto.randomUUID();
    let testPhotoId = null;
    let testDocId = null;

    try {
        // Step 0: Ensure a test property exists in PostgreSQL RDS
        console.log('[Test 0] Creating test property record in core.properties...');
        const testParcelRaw = `99-99-99-S3-${Date.now().toString().slice(-6)}`;
        const testParcelMatch = testParcelRaw.replace(/[^A-Za-z0-9]/g, '');
        await pool.query(`DELETE FROM core.properties WHERE parcel_raw LIKE '99-99-99-S3%' OR parcel_match = '999999TESTS3001'`);
        await pool.query(
            `INSERT INTO core.properties (property_id, county_id, parcel_raw, parcel_match, address_line1, city, state_code, postal_code)
             VALUES ($1, 'c1111111-1111-1111-1111-111111111111', $2, $3, '123 Vault Drive', 'Jacksonville', 'FL', '32202')
             ON CONFLICT (county_id, parcel_match) DO UPDATE SET property_id = EXCLUDED.property_id`,
            [testPropId, testParcelRaw, testParcelMatch]
        );
        console.log('✔ Test property initialized in database.');

        // Test 1: S3 Config Endpoint
        console.log('\n[Test 1] Testing GET /api/v1/storage/config...');
        const configRes = await fetch(`${API_BASE}/storage/config`);
        assert.strictEqual(configRes.status, 200, 'Config endpoint should return 200');
        const config = await configRes.json();
        assert.strictEqual(config.provider, 'AWS_S3', 'Provider must be AWS_S3');
        assert.strictEqual(config.encryption, 'AES256', 'Encryption must be AES256');
        assert.ok(config.bucket, 'Bucket name should be defined');
        console.log(`✔ S3 Storage Config verified: Bucket="${config.bucket}", Region="${config.region}", Encryption="${config.encryption}".`);

        // Test 2: Photo Presigned Upload URL
        console.log('\n[Test 2] Testing POST /api/v1/properties/:id/photos/upload-url...');
        const photoUploadRes = await fetch(`${API_BASE}/properties/${testPropId}/photos/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: 'front_elevation_inspection.jpg',
                content_type: 'image/jpeg',
                file_size_bytes: 2450000
            })
        });
        assert.strictEqual(photoUploadRes.status, 200, 'Photo upload-url should return 200');
        const photoUpload = await photoUploadRes.json();
        assert.strictEqual(photoUpload.success, true);
        assert.strictEqual(photoUpload.storage_provider, 'S3');
        assert.ok(photoUpload.upload_url, 'Should provide an upload_url');
        assert.ok(photoUpload.object_key.includes(`properties/${testPropId}/photos/`), 'Object key should follow standard path');
        assert.strictEqual(photoUpload.headers['x-amz-server-side-encryption'], 'AES256', 'Must enforce AES256 server-side encryption');
        console.log(`✔ Photo presigned upload authorization generated: ObjectKey="${photoUpload.object_key}".`);

        // Test 3: Document Presigned Upload URL
        console.log('\n[Test 3] Testing POST /api/v1/properties/:id/documents/upload-url...');
        const docUploadRes = await fetch(`${API_BASE}/properties/${testPropId}/documents/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: 'probate_court_petition.pdf',
                content_type: 'application/pdf',
                file_size_bytes: 5200000
            })
        });
        assert.strictEqual(docUploadRes.status, 200, 'Document upload-url should return 200');
        const docUpload = await docUploadRes.json();
        assert.strictEqual(docUpload.success, true);
        assert.strictEqual(docUpload.storage_provider, 'S3');
        assert.ok(docUpload.upload_url, 'Should provide an upload_url');
        assert.ok(docUpload.object_key.includes(`properties/${testPropId}/documents/`), 'Object key should follow document path');
        console.log(`✔ Document presigned upload authorization generated: ObjectKey="${docUpload.object_key}".`);

        // Test 4: General Storage Upload URL
        console.log('\n[Test 4] Testing POST /api/v1/storage/upload-url (General Attachments)...');
        const generalUploadRes = await fetch(`${API_BASE}/storage/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entity_type: 'leads',
                entity_id: crypto.randomUUID(),
                category: 'contracts',
                filename: 'purchase_and_sale_agreement.pdf',
                content_type: 'application/pdf'
            })
        });
        assert.strictEqual(generalUploadRes.status, 200, 'General upload-url should return 200');
        const generalUpload = await generalUploadRes.json();
        assert.strictEqual(generalUpload.success, true);
        assert.ok(generalUpload.object_key.includes('leads/'), 'General object key formatted properly');
        console.log(`✔ General S3 presigned URL generated: ObjectKey="${generalUpload.object_key}".`);

        // Test 5: Persist S3 Photo Record in PostgreSQL
        console.log('\n[Test 5] Persisting photo record in PostgreSQL core.property_photos...');
        const savePhotoRes = await fetch(`${API_BASE}/properties/${testPropId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: 'front_elevation_inspection.jpg',
                original_filename: 'IMG_4021.jpg',
                file_size_bytes: 2450000,
                mime_type: 'image/jpeg',
                tag: 'Exterior',
                caption: 'Front facade showing roof condition',
                object_key: photoUpload.object_key,
                storage_provider: 'S3',
                uploaded_by: 'Staff Appraiser'
            })
        });
        assert.strictEqual(savePhotoRes.status, 201, 'Saving photo should return 201 Created');
        const savedPhoto = await savePhotoRes.json();
        assert.ok(savedPhoto.id, 'Photo record should have UUID id');
        assert.strictEqual(savedPhoto.storage_provider, 'S3');
        assert.strictEqual(savedPhoto.object_key, photoUpload.object_key);
        testPhotoId = savedPhoto.id;
        console.log(`✔ S3 Photo persisted in PostgreSQL RDS: ID="${testPhotoId}", ObjectKey="${savedPhoto.object_key}".`);

        // Test 6: Persist S3 Document Record in PostgreSQL
        console.log('\n[Test 6] Persisting document record in PostgreSQL core.property_documents...');
        const saveDocRes = await fetch(`${API_BASE}/properties/${testPropId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Probate Court Petition',
                category: 'Legal',
                filename: 'probate_court_petition.pdf',
                file_size_bytes: 5200000,
                mime_type: 'application/pdf',
                object_key: docUpload.object_key,
                storage_provider: 'S3',
                uploaded_by: 'Title Attorney'
            })
        });
        assert.strictEqual(saveDocRes.status, 201, 'Saving document should return 201 Created');
        const savedDoc = await saveDocRes.json();
        assert.ok(savedDoc.id, 'Document record should have UUID id');
        assert.strictEqual(savedDoc.storage_provider, 'S3');
        assert.strictEqual(savedDoc.object_key, docUpload.object_key);
        testDocId = savedDoc.id;
        console.log(`✔ S3 Document persisted in PostgreSQL RDS: ID="${testDocId}", ObjectKey="${savedDoc.object_key}".`);

        // Test 7: Presigned Download/View URLs (Authenticated temporary access)
        console.log('\n[Test 7] Testing secure temporary download URL generation...');
        const photoDownloadRes = await fetch(`${API_BASE}/properties/${testPropId}/photos/${testPhotoId}/download-url`);
        assert.strictEqual(photoDownloadRes.status, 200, 'Photo download URL should return 200');
        const photoDownload = await photoDownloadRes.json();
        assert.strictEqual(photoDownload.success, true);
        assert.ok(photoDownload.download_url, 'Must provide authenticated temporary download URL');

        const docDownloadRes = await fetch(`${API_BASE}/properties/${testPropId}/documents/${testDocId}/download-url`);
        assert.strictEqual(docDownloadRes.status, 200, 'Doc download URL should return 200');
        const docDownload = await docDownloadRes.json();
        assert.strictEqual(docDownload.success, true);
        assert.ok(docDownload.download_url, 'Must provide authenticated temporary download URL');
        console.log(`✔ Presigned download URLs generated securely for Photo and Document.`);

        // Test 8: Verify Audit Trail
        console.log('\n[Test 8] Verifying immutable audit trail in audit.audit_events...');
        const auditRes = await pool.query(
            `SELECT action, entity_type, entity_id FROM audit.audit_events
             WHERE entity_id IN ($1, $2)
             ORDER BY created_at DESC`,
            [testPhotoId, testDocId]
        );
        assert.ok(auditRes.rows.length >= 2, 'Both S3 upload actions should be recorded in audit log');
        const actions = auditRes.rows.map(r => r.action);
        assert.ok(actions.includes('PHOTO_UPLOADED_S3'), 'Audit log must record PHOTO_UPLOADED_S3');
        assert.ok(actions.includes('DOCUMENT_UPLOADED_S3'), 'Audit log must record DOCUMENT_UPLOADED_S3');
        console.log('✔ Audit logging verified: PHOTO_UPLOADED_S3 and DOCUMENT_UPLOADED_S3 recorded.');

        // Test 9: Clean up test artifacts
        console.log('\n[Test 9] Deleting test records and verifying S3 deletion handler...');
        const delPhotoRes = await fetch(`${API_BASE}/properties/${testPropId}/photos/${testPhotoId}`, { method: 'DELETE' });
        assert.strictEqual(delPhotoRes.status, 200, 'Photo delete should return 200');

        const delDocRes = await fetch(`${API_BASE}/properties/${testPropId}/documents/${testDocId}`, { method: 'DELETE' });
        assert.strictEqual(delDocRes.status, 200, 'Doc delete should return 200');

        await pool.query(`DELETE FROM core.properties WHERE property_id = $1`, [testPropId]);
        console.log('✔ Cleanup completed cleanly.');

        console.log('\n=============================================================');
        console.log('✔ ALL S3 PRIVATE VAULT TESTS PASSED (100% SUCCESS)');
        console.log('=============================================================\n');

    } catch (err) {
        console.error('\n❌ Test Suite Failure:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTests();
