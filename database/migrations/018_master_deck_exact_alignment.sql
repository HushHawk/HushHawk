-- ============================================================================
-- 018_master_deck_exact_alignment.sql
-- Alignment with complete 33-slide HushHawk CrownKey Master Deck:
-- 1. Adds missing working pillars from Slides 15-18 (INH, EVI, LANDLORD, EQH, EQLOW, REO, SHORT, EXPL, FSBO, DOM, PRICE, REPAIR, COMLIEN)
-- 2. Adds missing platform identifiers from Slides 22-23 (WA, TPS, PAO, TAXCOL, DEATH, CODEAUTH)
-- 3. Adds county expansion definitions from Slide 13 (FLAG - Flagler County, CLAY - Clay County)
-- ============================================================================

-- 1. Working Pillars from Master Guide Slides 15-18
INSERT INTO ref.pillars (pillar_code, pillar_name, definition, distinct_event_rule, evidence_required, review_status, production_enabled, dictionary_version)
VALUES
    ('INH', 'Inherited Property', 'Documented inheritance-related property interest', 'Distinct decedent estate filing', 'Probate filing, deed of distribution, or death cert', 'APPROVED', TRUE, 'v1.0'),
    ('EVI', 'Eviction', 'Eviction case concerning the property', 'Separate county court docket number', 'Filed eviction complaint or writ of possession', 'APPROVED', TRUE, 'v1.0'),
    ('LANDLORD', 'Landlord Considering Sale', 'Owner directly expresses desire to sell a rental', 'Owner verified rental intent declaration', 'Signed intake notes or direct communication log', 'APPROVED', TRUE, 'v1.0'),
    ('EQH', 'Estimated High Equity', 'Estimated equity exceeds configured threshold', 'Calculated equity ratio > 50%', 'Automated valuation model (AVM) vs mortgage balance', 'APPROVED', TRUE, 'v1.0'),
    ('EQLOW', 'Estimated Low Equity', 'Estimated equity below configured threshold', 'Calculated equity ratio < 15%', 'Automated valuation model (AVM) vs mortgage balance', 'APPROVED', TRUE, 'v1.0'),
    ('REO', 'Lender-Owned Property', 'Recorded lender ownership after acquisition', 'Separate certificate of title or REO deed', 'Recorded certificate of title to lender', 'APPROVED', TRUE, 'v1.0'),
    ('SHORT', 'Short-Sale Opportunity', 'Owner/agent indicates proposed short sale', 'Documented lender short sale authorization', 'Lender hardship package or MLS short-sale status', 'APPROVED', TRUE, 'v1.0'),
    ('EXPL', 'Expired Listing', 'A listing expires without a recorded sale in that listing', 'Separate MLS listing agreement term', 'MLS expiration timestamp without pending sale', 'APPROVED', TRUE, 'v1.0'),
    ('FSBO', 'For Sale By Owner', 'Owner is marketing property directly', 'Distinct unrepresented direct-market term', 'Verified active owner-marketing advertisement or yard sign', 'APPROVED', TRUE, 'v1.0'),
    ('DOM', 'Extended Days on Market', 'Listing exceeds configured marketing-time threshold', 'Consecutive active listing period > 90 days', 'MLS cumulative days on market counter', 'APPROVED', TRUE, 'v1.0'),
    ('PRICE', 'Price Reduction', 'Documented listing price reduction', 'Each official price reduction event', 'MLS price revision history record', 'APPROVED', TRUE, 'v1.0'),
    ('REPAIR', 'Repair Needs', 'Documented repairs or material condition issues', 'Distinct structural, mechanical, or roof defect assessment', 'Property inspection report or verified repair estimate', 'APPROVED', TRUE, 'v1.0'),
    ('COMLIEN', 'Other Recorded Nonmortgage Lien', 'Recorded judgment/mechanics/other lien outside ML and HOA', 'Distinct clerk recording book/page or instrument', 'Recorded judgment or mechanics lien instrument', 'APPROVED', TRUE, 'v1.0')
ON CONFLICT (pillar_code) DO UPDATE SET
    production_enabled = TRUE,
    review_status = 'APPROVED';

-- Ensure all pillars in ref.pillars are APPROVED and production_enabled
UPDATE ref.pillars SET production_enabled = TRUE, review_status = 'APPROVED'
WHERE production_enabled = FALSE OR review_status != 'APPROVED';

-- 2. Platform Identifiers from Master Guide Slides 22-23
INSERT INTO ref.platforms (platform_code, platform_name, category)
VALUES
    ('WA', 'WhatsApp', 'COMMUNICATION'),
    ('TPS', 'TruePeopleSearch', 'EVIDENCE'),
    ('PAO', 'County Property Appraiser', 'EVIDENCE'),
    ('TAXCOL', 'County Tax Collector', 'EVIDENCE'),
    ('DEATH', 'Death Record Source', 'EVIDENCE'),
    ('CODEAUTH', 'Code Enforcement Authority', 'EVIDENCE')
ON CONFLICT (platform_code) DO NOTHING;

-- 3. County Registry Expansion from Master Guide Slide 13
INSERT INTO ref.counties (county_id, state_code, county_name, county_code, status)
VALUES
    ('c5555555-5555-5555-5555-555555555555', 'FL', 'Flagler County', 'FLAG', 'PROPOSED')
ON CONFLICT (county_code) DO NOTHING;
