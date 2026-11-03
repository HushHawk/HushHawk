-- database/seeds/003_initial_notifications.sql
-- Seed operational and pipeline notifications

INSERT INTO ops.notifications (notification_id, title, body, category, priority, color, icon, action_url, is_read, created_at)
VALUES 
  (
    'a1000000-0000-0000-0000-000000000001',
    'First American Title: Wire Disbursed',
    '$32,500 assignment fee funded for 4812 Moncrief Rd.',
    'ESCROW',
    'HIGH',
    'green',
    'check',
    '/acquisitions',
    FALSE,
    NOW() - INTERVAL '12 minutes'
  ),
  (
    'a2000000-0000-0000-0000-000000000002',
    'DocuSign PSA Executed',
    'Ronald Campbell signed PSA for $110,000 cash.',
    'PIPELINE',
    'HIGH',
    'gold',
    'file',
    '/acquisitions',
    FALSE,
    NOW() - INTERVAL '1 hour'
  ),
  (
    'a3000000-0000-0000-0000-000000000003',
    'Hot Seller Lead Ingested',
    'Travis Holloway (Duval Probate) score 94/100.',
    'LEAD',
    'URGENT',
    'cyan',
    'phone',
    '/seller-leads',
    FALSE,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'a4000000-0000-0000-0000-000000000004',
    'Outbound Compliance Cleared',
    '1,420 direct mail records screened; 18 DNC suppressions quarantined.',
    'COMPLIANCE',
    'NORMAL',
    'blue',
    'alert',
    '/property-intelligence',
    FALSE,
    NOW() - INTERVAL '5 hours'
  ),
  (
    'a5000000-0000-0000-0000-000000000005',
    'Title Commitment Arrived',
    'Clear title confirmed for 10725 Meadowlea Dr; closing set for Friday.',
    'ESCROW',
    'HIGH',
    'green',
    'check',
    '/acquisitions',
    FALSE,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (notification_id) DO NOTHING;

