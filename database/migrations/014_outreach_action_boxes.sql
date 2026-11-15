-- Migration 014: Canonical PostgreSQL Tables for Executive Outreach Action Boxes
-- Supports: SEND MAILERS (34 selected properties), CALL (12 seller follow-ups), TEXT (18 opted-in contacts), EMAIL (9 title/buyer follow-ups)

-- 1. Outreach Mailer Selected Queue
CREATE TABLE IF NOT EXISTS core.outreach_mailers (
    id TEXT PRIMARY KEY,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    owner_name TEXT NOT NULL,
    property_address TEXT NOT NULL,
    city TEXT DEFAULT 'Jacksonville',
    state TEXT DEFAULT 'FL',
    zip TEXT NOT NULL,
    equity_estimate NUMERIC DEFAULT 85000,
    distress_category TEXT NOT NULL DEFAULT 'Foreclosure', -- 'Foreclosure', 'Default', 'Cash'
    template_type TEXT NOT NULL DEFAULT 'Yellow Letter Cash Offer',
    status TEXT NOT NULL DEFAULT 'READY', -- 'READY', 'BATCHED', 'DISPATCHED'
    batch_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Outreach Call Queue (Seller Follow-ups)
CREATE TABLE IF NOT EXISTS core.outreach_calls (
    id TEXT PRIMARY KEY,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    property_address TEXT NOT NULL,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'High', -- 'High', 'Overdue', 'Normal'
    cadence_stage TEXT NOT NULL DEFAULT 'Post-Offer Follow-Up',
    notes TEXT,
    last_call_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'RESCHEDULED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Outreach Text Queue (Opted-in SMS Contacts)
CREATE TABLE IF NOT EXISTS core.outreach_texts (
    id TEXT PRIMARY KEY,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    property_address TEXT NOT NULL,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    opt_in_date TIMESTAMPTZ NOT NULL DEFAULT now() - INTERVAL '2 days',
    last_inbound_snippet TEXT,
    recommended_template TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'SENT', 'REPLIED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Outreach Email Queue (Title / Buyer Follow-ups)
CREATE TABLE IF NOT EXISTS core.outreach_emails (
    id TEXT PRIMARY KEY,
    recipient_name TEXT NOT NULL,
    recipient_role TEXT NOT NULL DEFAULT 'Title Officer', -- 'Title Officer', 'Cash Buyer', 'Escrow Agent', 'Acquisitions'
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    property_address TEXT NOT NULL,
    property_id UUID REFERENCES core.properties(property_id) ON DELETE SET NULL,
    body_snippet TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED', -- 'QUEUED', 'SENT'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outreach_mailers_status ON core.outreach_mailers(status);
CREATE INDEX IF NOT EXISTS idx_outreach_calls_status ON core.outreach_calls(status, priority);
CREATE INDEX IF NOT EXISTS idx_outreach_texts_status ON core.outreach_texts(status);
CREATE INDEX IF NOT EXISTS idx_outreach_emails_status ON core.outreach_emails(status);

-- Seed Seed 34 selected mailer properties (Foreclosure / Default / Cash)
INSERT INTO core.outreach_mailers (id, property_id, owner_name, property_address, city, state, zip, equity_estimate, distress_category)
VALUES
('om-01', 'b0d10000-0000-0000-0000-0000bf09b593', 'James R. Carter', '2748 W 45th St', 'Jacksonville', 'FL', '32209', 65000, 'Foreclosure'),
('om-02', 'b0d10000-0000-0000-0000-000000123001', 'Arthur Pendelton', '123 Main St', 'Jacksonville', 'FL', '32204', 98000, 'Default'),
('om-03', 'b0d10000-0000-0000-0000-000000881002', 'Beatrice Montgomery', '881 Main St', 'Jacksonville', 'FL', '32206', 112000, 'Cash'),
('om-04', 'b0d10000-0000-0000-0000-000003245003', 'James C. Halpert', '3245 Main St', 'Jacksonville', 'FL', '32208', 140000, 'Foreclosure'),
('om-05', 'b0d10000-0000-0000-0000-0000c6d9491b', 'Maria L. Gonzalez', '1450 W 16th St', 'Jacksonville', 'FL', '32204', 49500, 'Default'),
('om-06', 'b0d10000-0000-0000-0000-0000c6d93e77', 'Robert Henderson', '9606 Devonshire Blvd', 'Jacksonville', 'FL', '32208', 102000, 'Cash'),
('om-07', 'b0d10000-0000-0000-0000-0000c6adfdfe', 'Devon Brooks', '1416 Kings Rd', 'Jacksonville', 'FL', '32209', 48000, 'Foreclosure'),
('om-08', 'b0d10000-0000-0000-0000-0000c6adf3eb', 'Logan Vance', '1411 Wilcox St', 'Jacksonville', 'FL', '32209', 30750, 'Default'),
('om-09', 'b0d10000-0000-0000-0000-0000c6adddad', 'Brenda Morales', '5757 Marigold Rd', 'Jacksonville', 'FL', '32209', 52500, 'Cash'),
('om-10', 'b0d10000-0000-0000-0000-0000c66194fe', 'Nina Patel', '3251 W Montcalm Dr', 'Jacksonville', 'FL', '32208', 90000, 'Foreclosure'),
('om-11', 'b0d10000-0000-0000-0000-0000c5f49010', 'David Mills', '7120 Northland St', 'Jacksonville', 'FL', '32208', 45000, 'Default'),
('om-12', 'b0d10000-0000-0000-0000-0000c5e8a6eb', 'Chloe Vance', '1636 W 36th St', 'Jacksonville', 'FL', '32209', 30000, 'Cash'),
('om-13', 'b0d10000-0000-0000-0000-0000c55f8da0', 'Jordan Hayes', '1549 W 35th St', 'Jacksonville', 'FL', '32209', 36000, 'Foreclosure'),
('om-14', 'b0d10000-0000-0000-0000-0000c55d03c8', 'Tyler Ross', '2660 W 23rd St', 'Jacksonville', 'FL', '32209', 49500, 'Default'),
('om-15', 'b0d10000-0000-0000-0000-0000c55bfe84', 'Amanda White', '270 E 46th St', 'Jacksonville', 'FL', '32208', 85500, 'Cash'),
('om-16', 'b0d10000-0000-0000-0000-0000c04861e0', 'Carlos Mendez', '10702 Arnez Rd', 'Jacksonville', 'FL', '32218', 47250, 'Foreclosure'),
('om-17', 'b0d10000-0000-0000-0000-0000bf09ac7f', 'Patrick Moore', '3037 Broadway Ave', 'Jacksonville', 'FL', '32254', 88000, 'Default'),
('om-18', 'b0d10000-0000-0000-0000-0000c7f77394', 'Rachel Foster', '10725 Meadowlea Dr', 'Jacksonville', 'FL', '32218', 135000, 'Cash'),
('om-19', NULL, 'Tara Johnson', '11863 Lemon Bluff Rd', 'Jacksonville', 'FL', '32218', 98000, 'Foreclosure'),
('om-20', NULL, 'Marcus Reed', '7420 Commonwealth Ave', 'Jacksonville', 'FL', '32220', 112000, 'Default'),
('om-21', NULL, 'Denise M. Harris', '3456 Cedar Point Dr', 'Jacksonville', 'FL', '32226', 125000, 'Cash'),
('om-22', NULL, 'Anthony K. Brooks', '7890 Loneleaf Rd', 'Jacksonville', 'FL', '32277', 85000, 'Foreclosure'),
('om-23', NULL, 'Sarah Jenkins', '7720 Baymeadows Rd', 'Jacksonville', 'FL', '32256', 320000, 'Cash'),
('om-24', NULL, 'Elena Rostova', '3819 San Jose Forest Dr', 'Jacksonville', 'FL', '32217', 160000, 'Foreclosure'),
('om-25', NULL, 'Keith Sullivan', '10815 Atlantic Blvd', 'Jacksonville', 'FL', '32225', 79000, 'Default'),
('om-26', NULL, 'Victoria Sterling', '3600 Ortega Blvd', 'Jacksonville', 'FL', '32210', 410000, 'Cash'),
('om-27', NULL, 'Colby Duncan', '4521 Lenox Ave', 'Jacksonville', 'FL', '32205', 72000, 'Foreclosure'),
('om-28', NULL, 'Stephanie Day', '6612 Arlington Rd', 'Jacksonville', 'FL', '32211', 58000, 'Default'),
('om-29', NULL, 'Summer Brady', '5128 Timuquana Rd', 'Jacksonville', 'FL', '32210', 68000, 'Cash'),
('om-30', NULL, 'Felicia Armstrong', '2840 University Blvd N', 'Jacksonville', 'FL', '32211', 72000, 'Foreclosure'),
('om-31', NULL, 'Marvin Johnson', '1124 King St', 'Jacksonville', 'FL', '32204', 118000, 'Default'),
('om-32', NULL, 'Darren Richardson', '9330 103rd St', 'Jacksonville', 'FL', '32210', 92000, 'Cash'),
('om-33', NULL, 'Phaedra Smith', '4501 San Juan Ave', 'Jacksonville', 'FL', '32210', 86000, 'Foreclosure'),
('om-34', NULL, 'Joseph Gullett', '1421 Edgewood Ave S', 'Jacksonville', 'FL', '32205', 82000, 'Default')
ON CONFLICT (id) DO UPDATE SET
    property_address = EXCLUDED.property_address,
    updated_at = now();

-- Seed 12 Seller Calls (High/Overdue priority follow-ups)
INSERT INTO core.outreach_calls (id, contact_name, phone, property_address, priority, cadence_stage, notes)
VALUES
('call-01', 'James R. Carter', '(904) 555-0198', '2748 W 45th St, Jacksonville, FL 32209', 'High', 'Foreclosure Review', 'Awaiting counter-offer response; tenant moving out.'),
('call-02', 'Maria L. Gonzalez', '(904) 555-2234', '1450 W 16th St, Jacksonville, FL 32204', 'High', 'Proof of Funds Sent', 'Requested 14-day cash closing without appraisal.'),
('call-03', 'Robert Wilson', '(904) 555-6678', '9102 Baymeadows Rd, Jacksonville, FL 32256', 'High', 'Appointment Confirmation', 'Walkthrough scheduled for Friday morning.'),
('call-04', 'Denise M. Harris', '(904) 555-7789', '3456 Cedar Point Dr, Jacksonville, FL 32226', 'High', 'Contract Execution', 'Agreement drafted; needs e-signature confirmation.'),
('call-05', 'Anthony K. Brooks', '(904) 555-1122', '7890 Loneleaf Rd, Jacksonville, FL 32277', 'Overdue', 'Initial Offer Review', 'Offer of $145k submitted; 24h follow-up due.'),
('call-06', 'Arthur Pendelton', '(904) 555-0182', '123 Main St, Jacksonville, FL 32204', 'High', 'Escrow Status', 'Preliminary title clear; ready to fund earnest money deposit.'),
('call-07', 'Beatrice Montgomery', '(904) 555-0391', '881 Main St, Jacksonville, FL 32206', 'Overdue', 'Title Clearing', 'Heirship affidavit received by First Title Co.'),
('call-08', 'James C. Halpert', '(904) 555-0744', '3245 Main St, Jacksonville, FL 32208', 'High', 'Inspection Contingency', 'Duplex tenant lease review requested.'),
('call-09', 'Tara Johnson', '(904) 555-0142', '11863 Lemon Bluff Rd, Jacksonville, FL 32218', 'High', 'Showing Confirmation', 'Thursday afternoon showing requested via Facebook.'),
('call-10', 'Marcus Reed', '(904) 555-7319', '7420 Commonwealth Ave, Jacksonville, FL 32220', 'High', 'Proof of Funds', 'Ready to wire deposit once roof age verified.'),
('call-11', 'Nina Patel', '(904) 555-9184', '10451 Normandy Blvd, Jacksonville, FL 32221', 'Overdue', 'Cash Offer Re-evaluation', 'Wants net $150k cash with zero realtor commissions.'),
('call-12', 'David Mills', '(904) 555-1298', '6424 San Juan Ave, Jacksonville, FL 32210', 'High', 'Disposition Package', 'Cash buyer pool interested at $185k.')
ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    notes = EXCLUDED.notes,
    updated_at = now();

-- Seed 18 Opted-In Text Contacts
INSERT INTO core.outreach_texts (id, contact_name, phone, property_address, last_inbound_snippet, recommended_template)
VALUES
('txt-01', 'Tara Johnson', '(904) 555-0142', '11863 Lemon Bluff Rd', 'Can you do a showing Thursday afternoon?', 'Hi Tara! Confirming Thursday at 2:00 PM for Lemon Bluff. Does that time work?'),
('txt-02', 'Marcus Reed', '(904) 555-7319', '7420 Commonwealth Ave', 'Ready to submit proof of funds.', 'Hi Marcus! Inspection package sent to your email. Closing target is the 28th.'),
('txt-03', 'Chloe Vance', '(904) 555-4019', '3112 Post St', 'Can I get the video walkthrough?', 'Hi Chloe! Walkthrough video is live at hushhawk.io/v/post-st. Let me know what you think!'),
('txt-04', 'Jordan Hayes', '(904) 555-8832', '5542 Norwood Ave', 'Do you guys buy properties that need a complete new roof?', 'Hi Jordan, yes! We buy 100% as-is with zero repairs needed. Can we call at 3 PM?'),
('txt-05', 'Robert Henderson', '(904) 555-8321', '8236 Merrill Rd', 'Would like to discuss a cash offer on Merrill Rd.', 'Hi Robert, our cash offer pays all title fees with 0 commission. What day works for a quick visit?'),
('txt-06', 'Elena Rostova', '(904) 555-3819', '3819 San Jose Forest Dr', 'Title commitment has arrived.', 'Hi Elena! First Title Co confirms receipt of deposit. We are clear to close on Friday.'),
('txt-07', 'Devon Brooks', '(904) 555-6621', '1421 Edgewood Ave S', 'Do you have any off-market multi-families?', 'Hi Devon! We have 2 Murray Hill duplexes off-market right now. Sending deal flyer now.'),
('txt-08', 'Sarah Jenkins', '(904) 555-7734', '7720 Baymeadows Rd', 'Connecting regarding commercial debt placement.', 'Hi Sarah, let''s connect on our Baymeadows commercial inventory. Are you free this afternoon?'),
('txt-09', 'Logan Vance', '(904) 555-9921', '4105 St Johns Ave', 'DMing proof of funds.', 'Hi Logan, received! ARV on St. Johns is $485k. Sending assignment agreement today.'),
('txt-10', 'Brenda Morales', '(904) 555-3341', '2840 University Blvd N', 'We need to sell our mother''s house as-is.', 'Hello Brenda! We can do an all-cash purchase with no cleanout required. Can we view tomorrow?'),
('txt-11', 'Tyler Ross', '(904) 555-4412', '1124 King St', 'Looking for duplex opportunities in Riverside under $250k.', 'Hi Tyler, King St duplex has current $2,600/mo gross rent. Sending pro-forma now!'),
('txt-12', 'Amanda White', '(904) 555-2287', '5128 Timuquana Rd', 'Is the seller open to a 14-day close?', 'Hi Amanda! Yes, clear title is in hand. We can close in 14 days or less.'),
('txt-13', 'Carlos Mendez', '(904) 555-5590', '6612 Arlington Rd', 'Need an honest cash offer on inherited property.', 'Hi Carlos, we specialize in estate probate sales. We pay 100% of closing costs.'),
('txt-14', 'Patrick Moore', '(904) 555-8819', '9330 103rd St', 'Submitted inquiry for probate property assistance.', 'Hi Patrick, offer draft is ready for review. When is a convenient time to go over numbers?'),
('txt-15', 'Rachel Foster', '(904) 555-1178', '4501 San Juan Ave', 'Is this contract assignable for cash buyers?', 'Hi Rachel! Yes, standard assignable wholesale contract. Inspection is tomorrow at 3 PM.'),
('txt-16', 'Victoria Sterling', '(904) 555-3390', '3600 Ortega Blvd', 'Inquiring about high-end renovation spread.', 'Hi Victoria, sending architect blueprints and historical comp spreads for Ortega Blvd.'),
('txt-17', 'Keith Sullivan', '(904) 555-7711', '10815 Atlantic Blvd', 'Can we do a 10-day inspection period?', 'Hi Keith! 10-day inspection period approved. Title docs will follow via DocuSign.'),
('txt-18', 'Colby Duncan', '(904) 555-4789', '4521 Lenox Ave', 'Buyer wire for EMD completed.', 'Hi Colby, deposit confirmed at First Title Co. Ready for final contract schedule.')
ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    recommended_template = EXCLUDED.recommended_template,
    updated_at = now();

-- Seed 9 Title / Buyer Emails
INSERT INTO core.outreach_emails (id, recipient_name, recipient_role, email, subject, property_address, body_snippet)
VALUES
('em-01', 'First Title Co.', 'Title Officer', 'closings@firsttitlefl.com', 'EMD Wire Confirmation & Title Commitment - 11863 Lemon Bluff Rd', '11863 Lemon Bluff Rd', 'Please find attached the signed purchase agreement and wire receipt for the $2,500 earnest money deposit.'),
('em-02', 'Riverstone REI Capital', 'Cash Buyer', 'dispo@riverstonerei.com', 'Off-Market Assignment Opportunity: 6424 San Juan Ave (32210)', '6424 San Juan Ave', 'Exclusive contract assignment in West Jax. ARV: $210,000, Buy Price: $125,000. Closing on or before Nov 28.'),
('em-03', 'Jax RE Sources', 'Title Officer', 'title@jaxresources.com', 'Title Search & Municipal Lien Check: 7420 Commonwealth Ave', '7420 Commonwealth Ave', 'Requesting preliminary title commitment and Duval County municipal code / utility lien search.'),
('em-04', 'Apex Private Holdings', 'Cash Buyer', 'acquisitions@apexholdings.com', 'Due Diligence Package: 9102 Baymeadows Rd Commercial Flex', '9102 Baymeadows Rd', 'Attached find phase 1 environmental summary, rent roll pro-forma, and survey for the Baymeadows parcel.'),
('em-05', 'Title America LLC', 'Escrow Agent', 'settlement@titleamerica.us', 'Final Settlement Statement HUD-1 / ALTA Review - 123 Main St', '123 Main St', 'Please forward the updated ALTA statement reflecting the seller tax proration and wire distribution instructions.'),
('em-06', 'Premier First Coast Investments', 'Cash Buyer', 'invest@firstcoastpremier.com', 'Assignment Contract & Property Inspection Video: 3112 Post St', '3112 Post St', 'Historic Riverside bungalow under contract. Walkthrough video and 4-point inspection PDF attached.'),
('em-07', 'Atlantic Title Group', 'Title Officer', 'processing@atlantictitlegroup.com', 'Payoff Demand Letter Request: 2748 W 45th St Mortgage Payoff', '2748 W 45th St', 'Requesting formal payoff demand statement from senior lienholder for closing scheduled next Wednesday.'),
('em-08', 'Blackstone Capital REI', 'Cash Buyer', 'equity@blackstonejax.com', 'Turnkey Rental Portfolio Opportunity: 10451 Normandy Blvd Duplex', '10451 Normandy Blvd', 'Fully occupied duplex generating $2,450/month in gross rental income. Immediate 9.4% net cap rate.'),
('em-09', 'First Coast Escrow Services', 'Escrow Agent', 'escrow@firstcoastescrow.com', 'Escrow Funding Authorization & Disbursement Schedule - 8236 Merrill Rd', '8236 Merrill Rd', 'Confirming receipt of cash buyer wire. Please proceed with document execution and county recording.')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    subject = EXCLUDED.subject,
    updated_at = now();
