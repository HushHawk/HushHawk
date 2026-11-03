-- HUSHHAWK Reference Dictionaries: Platforms and Contact Methods
-- Milestone 1 Reference Data

-- 1. Platforms
INSERT INTO ref.platforms (platform_code, platform_name, category)
VALUES
    ('PODIO', 'Citrix Podio CRM', 'CRM'),
    ('WEWEB', 'WeWeb Cloud Operations Center', 'FRONTEND'),
    ('POSTGRESQL', 'AWS RDS PostgreSQL Canonical Database', 'CANONICAL_DATABASE'),
    ('NEO4J', 'Neo4j Graph Database Projection', 'GRAPH_PROJECTION'),
    ('AWS_S3', 'Amazon Web Services S3 Document & Photo Vault', 'STORAGE'),
    ('USPS', 'USPS Address Standardization & Mail Tracking', 'DIRECT_MAIL'),
    ('META', 'Meta Facebook Lead Ads Webhook Receiver', 'PAID_SOCIAL'),
    ('TWILIO', 'Twilio A2P 10DLC Communications Gateway', 'VOICE_MESSAGING')
ON CONFLICT (platform_code) DO UPDATE
SET platform_name = EXCLUDED.platform_name,
    category = EXCLUDED.category;

-- 2. Contact Methods
INSERT INTO ref.contact_methods (method_code, method_name)
VALUES
    ('PHONE', 'Voice Phone Call'),
    ('SMS', 'SMS Text Message'),
    ('EMAIL', 'Electronic Mail'),
    ('DIRECT_MAIL', 'Physical Direct Mail / Yellow Letter / Postcard'),
    ('IN_PERSON', 'In-Person Property Walkthrough / Meeting'),
    ('WEB_FORM', 'Inbound Landing Page Form Submission'),
    ('FB_LEAD', 'Facebook Lead Ad Instant Form')
ON CONFLICT (method_code) DO UPDATE
SET method_name = EXCLUDED.method_name;
