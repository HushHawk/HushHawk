/**
 * @file backend/scripts/setup_s3_bucket.js
 * Automated AWS S3 Private Vault Setup & Hardening Script for HushHawk
 *
 * Creates and configures the private S3 bucket with:
 * 1. Default SSE-S3 AES256 server-side encryption
 * 2. 100% Block Public Access (Zero public data leaks)
 * 3. Secure CORS configuration for direct browser-to-S3 uploads
 * 4. Cost-optimization lifecycle policies (transitioning cold archives)
 *
 * Usage:
 *   node backend/scripts/setup_s3_bucket.js
 */

import {
    S3Client,
    CreateBucketCommand,
    PutBucketEncryptionCommand,
    PutPublicAccessBlockCommand,
    PutBucketCorsCommand,
    PutBucketLifecycleConfigurationCommand,
    HeadBucketCommand
} from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const region = process.env.AWS_REGION || 'us-east-2';
const bucketName = process.env.AWS_S3_BUCKET || 'hushhawk-private-property-vault';

console.log('\n=============================================================');
console.log('   HUSHHAWK AWS S3 PRIVATE VAULT CONFIGURATION');
console.log('=============================================================');
console.log(`Target Bucket: ${bucketName}`);
console.log(`AWS Region:    ${region}`);

const s3Client = new S3Client({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});

async function runS3Setup() {
    try {
        // Step 1: Check if bucket exists
        console.log('\n[1/5] Checking bucket status...');
        let bucketExists = false;
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
            console.log(`✔ Bucket "${bucketName}" already exists and is accessible.`);
            bucketExists = true;
        } catch (err) {
            if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
                console.log(`Bucket "${bucketName}" does not exist yet. Creating...`);
            } else if (err.name === 'CredentialsProviderError' || !process.env.AWS_ACCESS_KEY_ID) {
                console.log('ℹ AWS credentials not provided in .env yet.');
                console.log('  Generating AWS CloudFormation / CLI preset template instead...');
                printCliInstructions();
                return;
            } else {
                console.warn(`Warning checking bucket: ${err.message}`);
            }
        }

        // Create bucket if it doesn't exist
        if (!bucketExists) {
            const createParams = {
                Bucket: bucketName,
                CreateBucketConfiguration: region === 'us-east-1' ? undefined : { LocationConstraint: region }
            };
            await s3Client.send(new CreateBucketCommand(createParams));
            console.log(`✔ Bucket "${bucketName}" created successfully in ${region}.`);
        }

        // Step 2: Apply 100% Block Public Access (Zero Public Access)
        console.log('\n[2/5] Enforcing 100% Block Public Access...');
        await s3Client.send(new PutPublicAccessBlockCommand({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                IgnorePublicAcls: true,
                BlockPublicPolicy: true,
                RestrictPublicBuckets: true
            }
        }));
        console.log('✔ Block Public Access fully enabled (all 4 flags true).');

        // Step 3: Enable Server-Side Encryption (AES256)
        console.log('\n[3/5] Enforcing AES-256 Server-Side Encryption...');
        await s3Client.send(new PutBucketEncryptionCommand({
            Bucket: bucketName,
            ServerSideEncryptionConfiguration: {
                Rules: [
                    {
                        ApplyServerSideEncryptionByDefault: {
                            SSEAlgorithm: 'AES256'
                        },
                        BucketKeyEnabled: true
                    }
                ]
            }
        }));
        console.log('✔ AES-256 server-side encryption enforced.');

        // Step 4: Configure CORS for Direct Browser Uploads
        console.log('\n[4/5] Configuring secure CORS policy...');
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: bucketName,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
                        AllowedOrigins: [
                            'http://localhost:8080',
                            'http://localhost:5173',
                            'http://localhost:3000',
                            'https://*.weweb.io',
                            'https://hushhawk.com',
                            'https://*.hushhawk.com'
                        ],
                        ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
                        MaxAgeSeconds: 3600
                    }
                ]
            }
        }));
        console.log('✔ CORS policy configured for HushHawk web application.');

        // Step 5: Configure Storage Lifecycle Policy
        console.log('\n[5/5] Configuring cost-optimization lifecycle rules...');
        await s3Client.send(new PutBucketLifecycleConfigurationCommand({
            Bucket: bucketName,
            LifecycleConfiguration: {
                Rules: [
                    {
                        ID: 'HushHawkArchiveOldAttachments',
                        Status: 'Enabled',
                        Filter: { Prefix: '' },
                        Transitions: [
                            {
                                Days: 90,
                                StorageClass: 'STANDARD_IA'
                            },
                            {
                                Days: 365,
                                StorageClass: 'GLACIER_IR'
                            }
                        ]
                    }
                ]
            }
        }));
        console.log('✔ Lifecycle rule configured (90d -> Standard-IA, 365d -> Glacier Instant Retrieval).');

        console.log('\n=============================================================');
        console.log('✔ S3 PRIVATE VAULT IS FULLY CONFIGURED & READY FOR PRODUCTION!');
        console.log('=============================================================\n');

    } catch (err) {
        console.error('\n❌ S3 Setup encountered an issue:', err.message);
        printCliInstructions();
    }
}

function printCliInstructions() {
    console.log('\n-------------------------------------------------------------');
    console.log('AWS CLI / Console Manual Setup Instructions:');
    console.log('-------------------------------------------------------------');
    console.log(`1. Create the private bucket:`);
    console.log(`   aws s3api create-bucket --bucket ${bucketName} --region ${region} --create-bucket-configuration LocationConstraint=${region}`);
    console.log(`\n2. Enforce Block Public Access:`);
    console.log(`   aws s3api put-public-access-block --bucket ${bucketName} --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"`);
    console.log(`\n3. Enable AES-256 Encryption:`);
    console.log(`   aws s3api put-bucket-encryption --bucket ${bucketName} --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]}'`);
    console.log(`\n4. Once created, paste your credentials into .env:`);
    console.log(`   AWS_S3_BUCKET=${bucketName}`);
    console.log(`   AWS_REGION=${region}`);
    console.log(`   AWS_ACCESS_KEY_ID=<your-key>`);
    console.log(`   AWS_SECRET_ACCESS_KEY=<your-secret>`);
    console.log('-------------------------------------------------------------\n');
}

runS3Setup();

