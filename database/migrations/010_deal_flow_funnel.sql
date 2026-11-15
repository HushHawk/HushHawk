-- Migration 010: Canonical PostgreSQL Deal-Flow Funnel (12 Milestones)
-- Schema: crm.deal_funnel linked to core.properties and core.people

CREATE TABLE IF NOT EXISTS crm.deal_funnel (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    milestone_index INTEGER NOT NULL CHECK (milestone_index BETWEEN 0 AND 11),
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    person_id UUID REFERENCES core.people(person_id) ON DELETE SET NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Jacksonville',
    state TEXT NOT NULL DEFAULT 'FL',
    zip TEXT NOT NULL DEFAULT '32204',
    county TEXT NOT NULL DEFAULT 'Duval',
    seller TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    buyer TEXT DEFAULT '—',
    buy_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    arv NUMERIC(12, 2) NOT NULL DEFAULT 0,
    repairs NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    title_agency TEXT DEFAULT 'First American Title Jax',
    file_number TEXT,
    closing_date DATE,
    days_in_stage INTEGER NOT NULL DEFAULT 0,
    source TEXT DEFAULT 'Direct Mail',
    notes TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_funnel_milestone ON crm.deal_funnel(milestone_index);
CREATE INDEX IF NOT EXISTS idx_deal_funnel_property ON crm.deal_funnel(property_id);

-- Seed initial deals linking real properties in core.properties
INSERT INTO crm.deal_funnel (
    id, code, milestone_index, property_id, address, city, state, zip, county,
    seller, phone, email, buyer, buy_price, arv, repairs, fee,
    title_agency, file_number, closing_date, days_in_stage, source, notes
) VALUES
-- 01 Lead received
(
    'deal-01', 'HH-2026-01', 0, 'b0d10000-0000-0000-0000-0000c04861e0',
    '10702 Arnez Rd', 'Jacksonville', 'FL', '32218', 'Duval',
    'Tara Johnson', '(904) 555-0142', 'tara.j@gmail.com', '—',
    98000.00, 185000.00, 28000.00, 26000.00,
    'First American Title Jax', 'FAT-2026-1182', CURRENT_DATE + INTERVAL '30 days',
    1, 'Facebook Ad', 'Verified inbound inquiry requesting wholesale cash evaluation.'
),
(
    'deal-02', 'HH-2026-02', 0, 'b0d10000-0000-0000-0000-0000bf09b593',
    '2748 W 45th St', 'Jacksonville', 'FL', '32209', 'Duval',
    'George Higgins', '(904) 555-8821', 'ghiggins88@yahoo.com', '—',
    82000.00, 160000.00, 31000.00, 24000.00,
    'First American Title Jax', 'FAT-2026-1189', CURRENT_DATE + INTERVAL '35 days',
    2, 'Direct Mail', 'Owner responded to Duval pre-foreclosure notice postcard #HH-2026-08.'
),

-- 02 Contact made
(
    'deal-03', 'HH-2026-03', 1, 'b0d10000-0000-0000-0000-0000bf09ac7f',
    '3037 Broadway Ave', 'Jacksonville', 'FL', '32254', 'Duval',
    'Clarissa Montgomery', '(904) 555-3912', 'cmontgomery@att.net', '—',
    135000.00, 245000.00, 38000.00, 30000.00,
    'First American Title Jax', 'FAT-2026-1201', CURRENT_DATE + INTERVAL '25 days',
    3, 'Cold Calling', 'Discovery call completed. Seller relocating; needs fast 14-day close.'
),

-- 03 Appointment
(
    'deal-04', 'HH-2026-04', 2, 'b0d10000-0000-0000-0000-0000c5e8a6eb',
    '1636 W 36th St', 'Jacksonville', 'FL', '32209', 'Duval',
    'Nina Patel', '(904) 555-9184', 'nina.patel99@gmail.com', '—',
    75000.00, 155000.00, 24000.00, 22000.00,
    'First American Title Jax', 'FAT-2026-1215', CURRENT_DATE + INTERVAL '21 days',
    2, 'Website Inbound', 'Field walkthrough scheduled for Thursday 2:00 PM with acquisitions rep.'
),
(
    'deal-05', 'HH-2026-05', 2, 'b0d10000-0000-0000-0000-0000c6adf3eb',
    '1411 Wilcox St j', 'Jacksonville', 'FL', '32209', 'Duval',
    'Harold Vance', '(904) 555-4019', 'hvance@gmail.com', '—',
    68000.00, 140000.00, 22000.00, 20000.00,
    'First American Title Jax', 'FAT-2026-1220', CURRENT_DATE + INTERVAL '24 days',
    4, 'Driving for Dollars', 'Lockbox code confirmed; rehab scope sheet prepared for on-site inspection.'
),

-- 04 Offer sent
(
    'deal-06', 'HH-2026-06', 3, 'b0d10000-0000-0000-0000-0000c55f8da0',
    '1549 W 35th St', 'Jacksonville', 'FL', '32209', 'Duval',
    'David Mills', '(904) 555-1298', 'dmills6424@att.net', '—',
    89000.00, 175000.00, 27000.00, 25000.00,
    'First American Title Jax', 'FAT-2026-1228', CURRENT_DATE + INTERVAL '18 days',
    3, 'SMS Campaign', 'Formal MAO wholesale offer delivered via DocuSign at $89,000 net to seller.'
),

-- 05 Signed
(
    'deal-07', 'PSA-2026-088', 4, 'b0d10000-0000-0000-0000-0000c5f49010',
    '7120 Northland St', 'Jacksonville', 'FL', '32208', 'Duval',
    'Walter Henderson', '(904) 555-8321', 'w.henderson@gmail.com', '—',
    115000.00, 210000.00, 28000.00, 28000.00,
    'First American Title Jax', 'FAT-2026-1241', CURRENT_DATE + INTERVAL '16 days',
    1, 'Direct Mail', 'Purchase & Sale Agreement executed. 14-day inspection contingency active.'
),

-- 06 Sent to title
(
    'deal-08', 'PSA-2026-089', 5, 'b0d10000-0000-0000-0000-0000c6adfdfe',
    '1416 Kings Rd', 'Jacksonville', 'FL', '32209', 'Duval',
    'Franklin Cole', '(904) 555-1428', 'fcole1428@att.net', '—',
    128000.00, 235000.00, 32000.00, 30000.00,
    'First American Title Jax', 'FAT-2026-1255', CURRENT_DATE + INTERVAL '14 days',
    2, 'County Foreclosure Feed', 'Escrow opened at First American Title Jax (File #FAT-2026-1255). Title exam active.'
),

-- 07 EMD confirmed
(
    'deal-09', 'PSA-2026-090', 6, 'b0d10000-0000-0000-0000-0000c55d03c8',
    '2660 W 23rd St', 'Jacksonville', 'FL', '32209', 'Duval',
    'Sylvia Davenport', '(904) 555-3819', 'sdavenport@comcast.net', '—',
    138000.00, 255000.00, 34000.00, 32000.00,
    'First American Title Jax', 'FAT-2026-1262', CURRENT_DATE + INTERVAL '12 days',
    3, 'Direct Mail', '$2,500 wholesale earnest money wire confirmed and receipted by escrow officer.'
),

-- 08 Title cleared
(
    'deal-10', 'PSA-2026-091', 7, 'b0d10000-0000-0000-0000-0000c6adddad',
    '5757 Marigold Rd', 'Jacksonville', 'FL', '32209', 'Duval',
    'Terrence Washington', '(904) 555-0714', 'twashington@gmail.com', '—',
    145000.00, 268000.00, 35000.00, 34000.00,
    'First American Title Jax', 'FAT-2026-1270', CURRENT_DATE + INTERVAL '10 days',
    4, 'Code Violation Intake', 'Title commitment clean. Municipal lien search payoff zero. Clear to close approved.'
),

-- 09 Dispo launched
(
    'deal-11', 'PSA-2026-092', 8, 'b0d10000-0000-0000-0000-0000c55bfe84',
    '270 E 46th St', 'Jacksonville', 'FL', '32208', 'Duval',
    'Clarence Powell', '(904) 555-2194', 'cpowell@jaxnet.com', '—',
    168000.00, 298000.00, 38000.00, 36000.00,
    'First American Title Jax', 'FAT-2026-1278', CURRENT_DATE + INTERVAL '9 days',
    2, 'Direct Mail', 'Marketing package syndicated to 48 verified Duval cash buyers. 4 investor walkthroughs scheduled.'
),

-- 10 Buyer chosen
(
    'deal-12', 'PSA-2026-093', 9, 'b0d10000-0000-0000-0000-0000c66194fe',
    '3251 W Montcalm Dr', 'Jacksonville', 'FL', '32208', 'Duval',
    'Arthur Pendelton', '(904) 555-4812', 'apendelton@att.net', 'Apex Capital Partners LLC',
    182000.00, 325000.00, 40000.00, 38000.00,
    'First American Title Jax', 'FAT-2026-1285', CURRENT_DATE + INTERVAL '7 days',
    2, 'Driving for Dollars', 'Apex Capital Partners selected with highest net cash offer ($220,000 purchase consideration).'
),

-- 11 Assignment
(
    'deal-13', 'PSA-2026-094', 10, 'b0d10000-0000-0000-0000-0000c6d93e77',
    '9606 Devonshire Blvd', 'Jacksonville', 'FL', '32208', 'Duval',
    'Gladys Turner', '(904) 555-1604', 'gturner@gmail.com', 'First Coast REI Holdings',
    195000.00, 345000.00, 42000.00, 40000.00,
    'First American Title Jax', 'FAT-2026-1292', CURRENT_DATE + INTERVAL '5 days',
    3, 'Direct Mail', 'Assignment agreement executed. $5,000 non-refundable buyer deposit held in title escrow.'
),

-- 12 Closed + funded
(
    'deal-14', 'PSA-2026-095', 11, 'b0d10000-0000-0000-0000-0000c7f77394',
    '10725 Meadowlea Dr', 'Jacksonville', 'FL', '32218', 'Duval',
    'Vincent Moretti', '(904) 555-4201', 'vmoretti@jaxre.com', 'River City Flip Fund',
    215000.00, 380000.00, 45000.00, 42000.00,
    'First American Title Jax', 'FAT-2026-1300', CURRENT_DATE - INTERVAL '2 days',
    0, 'Website Inbound', 'Closed and funded. $42,000 wholesale assignment fee wired directly to HushHawk operating account.'
),
(
    'deal-15', 'PSA-2026-096', 11, 'b0d10000-0000-0000-0000-000000123001',
    '123 Main St', 'Jacksonville', 'FL', '32204', 'Duval',
    'Beatrice Montgomery', '(904) 555-0391', 'bmontgomery@gmail.com', 'St Johns Capital Partners',
    240000.00, 420000.00, 50000.00, 48000.00,
    'First American Title Jax', 'FAT-2026-1305', CURRENT_DATE - INTERVAL '5 days',
    0, 'Direct Mail', 'Closed and funded. $48,000 fee disbursed and verified.'
)
ON CONFLICT (id) DO UPDATE SET
    milestone_index = EXCLUDED.milestone_index,
    address = EXCLUDED.address,
    seller = EXCLUDED.seller,
    buyer = EXCLUDED.buyer,
    buy_price = EXCLUDED.buy_price,
    fee = EXCLUDED.fee,
    updated_at = now();

