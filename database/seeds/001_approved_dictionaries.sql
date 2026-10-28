-- HUSHHAWK Reference Dictionaries & Approved Seeds
-- Conforms to Blueprint Section 4.3, 6, 21 and Visual Architecture Page 7, 14, 26

-- 1. Counties
INSERT INTO ref.counties (county_id, state_code, county_name, county_code, status)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'FL', 'Duval County', 'DUV', 'APPROVED'),
    ('c2222222-2222-2222-2222-222222222222', 'FL', 'St. Johns County', 'STJ', 'PROPOSED'),
    ('c3333333-3333-3333-3333-333333333333', 'FL', 'Clay County', 'CLY', 'PROPOSED'),
    ('c4444444-4444-4444-4444-444444444444', 'FL', 'Nassau County', 'NAS', 'PROPOSED')
ON CONFLICT (county_code) DO NOTHING;

-- 2. 29 Pillars Dictionary (Controlled activation per Section 6 & 21)
INSERT INTO ref.pillars (pillar_code, pillar_name, definition, distinct_event_rule, evidence_required, review_status, production_enabled, dictionary_version)
VALUES
    ('FC', 'Foreclosure', 'Formal mortgage or lien foreclosure proceedings initiated', 'Jurisdiction + full court case number', 'Clerk/court case and active case status docket', 'APPROVED', TRUE, 'v1.0'),
    ('TAX', 'Tax Delinquency', 'Past due ad valorem property taxes or certificates', 'Tax account + tax year', 'Delinquent balance, tax year and verification date', 'APPROVED', TRUE, 'v1.0'),
    ('ML', 'Municipal Lien', 'City or municipal liens recorded against parcel', 'Recording jurisdiction + lien instrument number', 'Recorded lien and release/satisfaction search', 'APPROVED', TRUE, 'v1.0'),
    ('PRB', 'Probate / Decedent', 'Property involved in estate administration or deceased owner', 'Jurisdiction + probate case reference', 'Probate record and verified property deed link', 'APPROVED', TRUE, 'v1.0'),
    ('VAC', 'Vacancy / Abandonment', 'Documented vacant structure or abandoned utility service', 'Approved episode definition + observation date', 'Dated, attributable inspection or utility shutoff record', 'APPROVED', TRUE, 'v1.0'),
    ('CODE', 'Code Violation', 'Municipal code enforcement citation or warning', 'Citation/case number + year', 'Notice of violation with officer ID and inspection date', 'NEEDS_REVIEW', FALSE, 'v1.0'),
    ('CONDEMN', 'Condemnation Notice', 'Property condemned or scheduled for demolition', 'Order number + municipal authority', 'Official condemnation notice from city building official', 'NEEDS_REVIEW', FALSE, 'v1.0'),
    ('TCERT', 'Tax Certificate', 'County tax sale certificate issued against property', 'Certificate number + tax sale year', 'County tax collector certificate issuance receipt', 'NEEDS_REVIEW', FALSE, 'v1.0'),
    ('TDEED', 'Tax Deed Application', 'Application for tax deed foreclosure auction filed', 'Tax deed file number + year', 'Notice of tax deed application and auction schedule', 'NEEDS_REVIEW', FALSE, 'v1.0'),
    ('ABS', 'Absentee Owner', 'Owner mailing address differs from property address', 'Owner mailing ZIP != site ZIP', 'Property appraiser tax roll deed address comparison', 'PROPOSED', FALSE, 'v1.0'),
    ('OOS', 'Out of State Owner', 'Owner mailing address outside state of Florida', 'Owner mailing State != FL', 'Property appraiser certified tax roll registration', 'PROPOSED', FALSE, 'v1.0'),
    ('PFC', 'Pre-Foreclosure Notice', 'Notice of default or lis pendens recorded', 'Lis pendens instrument number', 'Recorded lis pendens filing with county clerk', 'PROPOSED', FALSE, 'v1.0'),
    ('BANKR', 'Bankruptcy Case', 'Property owner named in federal bankruptcy petition', 'Federal court + case number', 'PACER docket or bankruptcy petition certificate', 'PROPOSED', FALSE, 'v1.0'),
    ('EVICT', 'Eviction Action', 'Landlord-tenant removal filing or writ', 'County court case number + filing date', 'Clerk county civil eviction docket and summons', 'PROPOSED', FALSE, 'v1.0'),
    ('DIV', 'Divorce / Domestic', 'Dissolution of marriage involving real property', 'Family court case reference', 'Petition for dissolution referencing real property assets', 'PROPOSED', FALSE, 'v1.0'),
    ('HOA', 'HOA / COA Lien', 'Homeowners association assessment lien or intent', 'Association name + recorded instrument', 'Recorded assessment lien in official public records', 'PROPOSED', FALSE, 'v1.0'),
    ('MECH', 'Mechanic Lien', 'Contractor or materialman claim of lien recorded', 'Claimant + recording instrument number', 'Recorded claim of lien within statutory window', 'PROPOSED', FALSE, 'v1.0'),
    ('UTIL', 'Utility Shutoff', 'Electric or water disconnection for non-payment', 'Account ID + disconnect work order', 'Municipal utility service cut-off confirmation', 'PROPOSED', FALSE, 'v1.0'),
    ('FIRE', 'Fire Damage', 'Structure damage from reported fire incident', 'Fire incident report number', 'Fire department run report and damage assessment', 'PROPOSED', FALSE, 'v1.0'),
    ('STR', 'STR Non-Compliance', 'Unlicensed short-term rental citation', 'Citation ID + inspection date', 'City short-term rental ordinance citation record', 'PROPOSED', FALSE, 'v1.0'),
    ('INSPECT', 'Failed Inspection', 'Failed structural or occupancy safety inspection', 'Inspection report ID + code reference', 'Certified building inspector non-compliance report', 'PROPOSED', FALSE, 'v1.0'),
    ('DEMO', 'Demolition Order', 'Emergency demolition order issued by municipality', 'Demolition docket number', 'Official order to demolish from building director', 'PROPOSED', FALSE, 'v1.0'),
    ('ZONING', 'Zoning Violation', 'Illegal use or unauthorized zoning alteration', 'Zoning enforcement file number', 'Planning & Development enforcement notice', 'PROPOSED', FALSE, 'v1.0'),
    ('ESTATE', 'Intestate Estate', 'Owner deceased without formal will or probate filed', 'Death certificate + vital records cross-ref', 'Florida Department of Health vital statistics record', 'PROPOSED', FALSE, 'v1.0'),
    ('PROPDAM', 'Property Damage', 'Major storm or flood casualty claim recorded', 'Insurance / FEMA claim tracking reference', 'FEMA damage inspection or county flood report', 'PROPOSED', FALSE, 'v1.0'),
    ('SQUAT', 'Squatter / Trespass', 'Unlawful occupancy or police trespass warning', 'Police incident CAD report number', 'JSO police dispatch record and trespass notice', 'PROPOSED', FALSE, 'v1.0'),
    ('ABAND', 'Abandoned Vehicle/Junk', 'Overgrown vegetation, junk or abandoned property', 'Citation ID + inspector badge number', 'Municipal code enforcement junk citation notice', 'PROPOSED', FALSE, 'v1.0'),
    ('ROOF', 'Dangerous Roof', 'Severe tarped or collapsed roof violation', 'Building citation number', 'Municipal visual inspection report with timestamped photo', 'PROPOSED', FALSE, 'v1.0'),
    ('UNSAFE', 'Unsafe Structure', 'Unsafe building placard posted on property', 'Notice of condemnation or placard ID', 'City placard posting confirmation with officer log', 'PROPOSED', FALSE, 'v1.0')
ON CONFLICT (pillar_code) DO NOTHING;

-- 3. Lead Sources (Attribution: First-source code is locked at creation)
INSERT INTO ref.lead_sources (source_code, source_name, source_group, definition, assignment_rule, review_status, production_enabled, dictionary_version)
VALUES
    ('MAIL', 'Direct Mail Campaign', 'OUTBOUND_DIRECT', 'Physical letter, postcard, or yellow letter sent to owner', 'Assigned from barcode/mail ID on response', 'APPROVED', TRUE, 'v1.0'),
    ('CLERK', 'Court Clerk Feed', 'PUBLIC_RECORD', 'County clerk public court records ingestion', 'Automated intake from clerk court scraper', 'APPROVED', TRUE, 'v1.0'),
    ('COUNTY', 'County Appraiser Feed', 'PUBLIC_RECORD', 'Duval County property appraiser tax rolls', 'Batch synchronization from county open data', 'APPROVED', TRUE, 'v1.0'),
    ('INBOUND_WEB', 'Inbound Website Form', 'ORGANIC', 'Direct seller submission on company landing page', 'Real-time webhook intake to new lead queue', 'APPROVED', TRUE, 'v1.0'),
    ('INBOUND_CALL', 'Inbound Phone Call', 'VOICE', 'Live seller phone call to tracked direct marketing number', 'Call tracking integration attribution', 'APPROVED', TRUE, 'v1.0'),
    ('FB_AD', 'Facebook Lead Ad', 'PAID_SOCIAL', 'Form submission via Meta Facebook lead ads', 'Facebook Graph API webhook receiver', 'APPROVED', TRUE, 'v1.0'),
    ('SMS_CAMPAIGN', 'SMS Inbound Response', 'MESSAGING', 'Inbound seller text message in response to approved campaign', 'A2P 10DLC compliant messaging inbox', 'APPROVED', TRUE, 'v1.0'),
    ('REFERRAL', 'Industry Referral', 'NETWORK', 'Bird dog, attorney, title agent, or wholesaler referral', 'Manual intake with referrer contact metadata', 'APPROVED', TRUE, 'v1.0'),
    ('OTHER', 'Other (Detail Required)', 'MISC', 'Unclassified source; requires source_detail explanation', 'Manual verification required', 'APPROVED', TRUE, 'v1.0')
ON CONFLICT (source_code) DO NOTHING;

-- 4. Pipeline Stages
INSERT INTO crm.pipeline_stages (stage_key, stage_name, display_order, description)
VALUES
    ('NEW', 'New Inbound Lead', 1, 'Fresh lead created; initial research and triage required'),
    ('CONTACTED', 'Initial Contact Made', 2, 'Successful two-way interaction with property owner or representative'),
    ('QUALIFIED', 'Motivation & Equity Qualified', 3, 'Seller motivation confirmed, condition assessed, MAO estimated'),
    ('OFFER', 'Offer Submitted', 4, 'Written purchase agreement or verbal offer presented to seller'),
    ('CONTRACT', 'Under Contract', 5, 'Executed contract signed; title search and disposition marketing active'),
    ('CLOSED', 'Closed & Funded', 6, 'Transaction completed at title company; wholesale assignment fee collected'),
    ('FOLLOW_UP', 'Nurture & Follow-Up', 7, 'Long-term follow-up; seller not ready today but remains active opportunity'),
    ('LOST', 'Disqualified / Lost', 8, 'Deal dead, listed with realtor, unmotivated, or sold to third party')
ON CONFLICT (stage_key) DO NOTHING;
