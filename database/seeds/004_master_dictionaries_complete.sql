-- HUSHHAWK CROWNKEY MASTER DICTIONARIES COMPLETE SEED
-- Conforms to Blueprint Part 3, Sections 7, 9, 10, 11

-- 1. All 46 Lead Source Codes (Part 3, Section 7)
INSERT INTO ref.lead_sources (source_code, source_name, source_group, definition, assignment_rule, review_status, production_enabled, dictionary_version)
VALUES
    ('MAIL', 'Direct Mail', 'OFFLINE', 'Physical mail campaign', 'Barcode/mailer ID tracking', 'APPROVED', TRUE, 'v1.0'),
    ('WEB', 'Website', 'ORGANIC', 'General website visit/form', 'Direct website conversion', 'APPROVED', TRUE, 'v1.0'),
    ('REF', 'Referral', 'NETWORK', 'Word of mouth referral', 'Manual intake with referrer link', 'APPROVED', TRUE, 'v1.0'),
    ('EMAIL', 'Email, origin unknown', 'DIRECT', 'Inbound email from unknown source', 'Email parsing intake', 'APPROVED', TRUE, 'v1.0'),
    ('WHATSAPP', 'WhatsApp', 'MESSAGING', 'Inbound WhatsApp message', 'WhatsApp Business API webhook', 'APPROVED', TRUE, 'v1.0'),
    ('PPC', 'Paid Search', 'PAID_SEARCH', 'Google/Bing paid search ads', 'UTM tracking parameter', 'APPROVED', TRUE, 'v1.0'),
    ('DISPLAY', 'Display Ads', 'PAID_DISPLAY', 'Banner / Display network ads', 'Ad network click tag', 'APPROVED', TRUE, 'v1.0'),
    ('SMS', 'SMS Campaign', 'MESSAGING', 'Outbound SMS reply', '10DLC tracked number', 'APPROVED', TRUE, 'v1.0'),
    ('FB', 'Facebook', 'SOCIAL', 'Organic Facebook lead', 'Facebook Page messaging', 'APPROVED', TRUE, 'v1.0'),
    ('CALL', 'Call, origin unknown', 'VOICE', 'Inbound call without campaign ID', 'Voice call intake', 'APPROVED', TRUE, 'v1.0'),
    ('TEXT', 'Text, origin unknown', 'MESSAGING', 'Inbound text without campaign ID', 'SMS intake', 'APPROVED', TRUE, 'v1.0'),
    ('SEO', 'Organic Search', 'ORGANIC', 'Unpaid search engine result', 'Organic search referrer', 'APPROVED', TRUE, 'v1.0'),
    ('SOCIAL', 'Unknown Social Platform', 'SOCIAL', 'Social network referral', 'Social URL referrer', 'APPROVED', TRUE, 'v1.0'),
    ('SOCAD', 'Paid Social, platform unknown', 'PAID_SOCIAL', 'Paid social advertisement', 'Social campaign ID', 'APPROVED', TRUE, 'v1.0'),
    ('VIDEO', 'Video Advertising', 'PAID_VIDEO', 'YouTube / video pre-roll ad', 'Video tracking link', 'APPROVED', TRUE, 'v1.0'),
    ('EML', 'Email Campaign', 'OUTBOUND_DIRECT', 'Targeted marketing email blast', 'Email blast campaign ID', 'APPROVED', TRUE, 'v1.0'),
    ('COLD', 'Outbound Calling', 'OUTREACH', 'Cold outbound phone prospecting', 'Disposition call log', 'APPROVED', TRUE, 'v1.0'),
    ('DOOR', 'Door Knocking', 'OUTREACH', 'In-person field prospecting', 'Mobile app field entry', 'APPROVED', TRUE, 'v1.0'),
    ('SIGN', 'Sign or Outdoor Ads', 'OFFLINE', 'Bandit sign or billboard', 'Tracked phone number on sign', 'APPROVED', TRUE, 'v1.0'),
    ('EVENT', 'Event or Networking', 'OFFLINE', 'REIA or networking event', 'Event intake form', 'APPROVED', TRUE, 'v1.0'),
    ('PARTNER', 'Business Partner', 'NETWORK', 'Co-wholesaler or JV partner', 'Partner portal lead', 'APPROVED', TRUE, 'v1.0'),
    ('PORTAL', 'Property Portal', 'PORTAL', 'Real estate aggregator portal', 'Portal API feed', 'APPROVED', TRUE, 'v1.0'),
    ('MARKET', 'Marketplace', 'MARKETPLACE', 'Wholesale/buyer marketplace', 'Marketplace listing lead', 'APPROVED', TRUE, 'v1.0'),
    ('DIRECT', 'Direct Website Visit', 'DIRECT', 'Direct URL type-in', 'Direct session with no referrer', 'APPROVED', TRUE, 'v1.0'),
    ('REPEAT', 'Existing Relationship', 'NETWORK', 'Repeat seller or past client', 'Past client CRM link', 'APPROVED', TRUE, 'v1.0'),
    ('REACT', 'Reactivation Campaign', 'OUTBOUND_DIRECT', 'Re-engaging older dormant lead', 'Reactivation blast tag', 'APPROVED', TRUE, 'v1.0'),
    ('RADIO', 'Radio Advertising', 'OFFLINE', 'Broadcast radio ad', 'Tracked vanity phone number', 'APPROVED', TRUE, 'v1.0'),
    ('TV', 'Television Advertising', 'OFFLINE', 'Broadcast TV commercial', 'Tracked vanity number / URL', 'APPROVED', TRUE, 'v1.0'),
    ('PRINT', 'Print Advertising', 'OFFLINE', 'Newspaper / magazine ad', 'Tracked print coupon code', 'APPROVED', TRUE, 'v1.0'),
    ('PODCAST', 'Podcast', 'MEDIA', 'Podcast sponsorship mention', 'Podcast promo code', 'APPROVED', TRUE, 'v1.0'),
    ('DATA', 'Data Research', 'RESEARCH', 'Skip trace / public records pull', 'Internal data enrichment', 'APPROVED', TRUE, 'v1.0'),
    ('OTHER', 'Other Known Source', 'MISC', 'Other identified source', 'Manual detail entry', 'APPROVED', TRUE, 'v1.0'),
    ('UNKNOWN', 'Undetermined Origin', 'MISC', 'Source could not be determined', 'Default fallback', 'APPROVED', TRUE, 'v1.0'),
    ('IG', 'Instagram', 'SOCIAL', 'Instagram DM or profile link', 'Instagram bio tracking link', 'APPROVED', TRUE, 'v1.0'),
    ('YT', 'YouTube', 'SOCIAL', 'YouTube channel / video link', 'YouTube description link', 'APPROVED', TRUE, 'v1.0'),
    ('TT', 'TikTok', 'SOCIAL', 'TikTok profile or ad click', 'TikTok lead instant form', 'APPROVED', TRUE, 'v1.0'),
    ('LI', 'LinkedIn', 'SOCIAL', 'LinkedIn messaging / InMail', 'LinkedIn campaign manager', 'APPROVED', TRUE, 'v1.0'),
    ('X', 'X / Twitter', 'SOCIAL', 'X post or direct message', 'X profile link tracking', 'APPROVED', TRUE, 'v1.0'),
    ('REDDIT', 'Reddit', 'SOCIAL', 'Reddit post or direct message', 'Reddit campaign tracking', 'APPROVED', TRUE, 'v1.0'),
    ('NEXT', 'Nextdoor', 'SOCIAL', 'Nextdoor neighborhood post', 'Nextdoor local deal post', 'APPROVED', TRUE, 'v1.0'),
    ('THREADS', 'Threads', 'SOCIAL', 'Threads post or mention', 'Threads profile tracking', 'APPROVED', TRUE, 'v1.0'),
    ('PINT', 'Pinterest', 'SOCIAL', 'Pinterest pin or ad', 'Pinterest rich pin referral', 'APPROVED', TRUE, 'v1.0'),
    ('SNAP', 'Snapchat', 'SOCIAL', 'Snapchat ad or story reply', 'Snapchat swipe-up link', 'APPROVED', TRUE, 'v1.0'),
    ('QUORA', 'Quora', 'SOCIAL', 'Quora answer / ad referral', 'Quora answer tracking', 'APPROVED', TRUE, 'v1.0'),
    ('DISCORD', 'Discord', 'COMMUNITY', 'Discord real estate server', 'Discord channel invite', 'APPROVED', TRUE, 'v1.0'),
    ('TELEGRAM', 'Telegram', 'COMMUNITY', 'Telegram channel / chat group', 'Telegram bot referral', 'APPROVED', TRUE, 'v1.0'),
    ('PODIO', 'Podio CRM Sync', 'INTEGRATION', 'Imported from Podio workspace', 'Podio webhook sync', 'APPROVED', TRUE, 'v1.0')
ON CONFLICT (source_code) DO NOTHING;

-- 2. All 15 Contact Methods (Part 3, Section 9)
INSERT INTO ref.contact_methods (method_code, method_name)
VALUES
    ('CALL', 'Live Phone Call'),
    ('TEXT', 'SMS or MMS Message'),
    ('EMAIL', 'Electronic Mail'),
    ('WEBFORM', 'Website Form Submission'),
    ('DM', 'Direct Message (Social Media)'),
    ('COMMENT', 'Social Media Public Comment'),
    ('CHAT', 'Website Live Chat / Bot'),
    ('WHATSAPP', 'WhatsApp Message or Call'),
    ('INPERSON', 'In-Person Meeting / Walkthrough'),
    ('MAIL', 'Postal Correspondence / Letter'),
    ('VOICEMAIL', 'Voicemail Recording / Drop'),
    ('WEBCHAT', 'Video Meeting (Zoom / Meet)'),
    ('IMPORT', 'Technical Import / API / Batch'),
    ('OTHER', 'Other Described Method'),
    ('UNKNOWN', 'Undetermined Contact Method')
ON CONFLICT (method_code) DO NOTHING;

-- 3. All 11 Person & Contact Roles (Part 3, Section 10)
INSERT INTO ref.person_roles (role_code, role_name, description)
VALUES
    ('SELLER', 'Potential Seller', 'Property owner or heir considering selling property'),
    ('BUYER', 'Potential Buyer', 'Individual or entity seeking real estate acquisitions'),
    ('WHOLE', 'Wholesaler', 'Real estate wholesaler contracting and assigning deals'),
    ('AGENT', 'Agent or Broker', 'Licensed real estate salesperson or broker'),
    ('LANDLORD', 'Landlord', 'Property owner managing rental units or multifamily'),
    ('LENDER', 'Lender / Capital', 'Private money, hard money, or institutional lender'),
    ('VENDOR', 'Vendor / Contractor', 'Title agent, general contractor, attorney, inspector'),
    ('INVESTOR', 'Investor / Partner', 'Equity capital partner, fix-and-flipper, or buy-and-hold investor'),
    ('REFERRER', 'Referral Contact', 'Bird dog or contact providing seller / buyer leads'),
    ('OTHER', 'Other Role', 'Other specialized real estate business role'),
    ('UNKNOWN', 'Unidentified Role', 'Role not yet determined or pending qualification')
ON CONFLICT (role_code) DO NOTHING;

-- 4. All 30 Platforms (Part 3, Section 11)
INSERT INTO ref.platforms (platform_code, platform_name, category)
VALUES
    ('FB', 'Facebook', 'Social'),
    ('IG', 'Instagram', 'Social'),
    ('YT', 'YouTube', 'Social'),
    ('TT', 'TikTok', 'Social'),
    ('LI', 'LinkedIn', 'Social'),
    ('X', 'X / Twitter', 'Social'),
    ('REDDIT', 'Reddit', 'Social'),
    ('NEXT', 'Nextdoor', 'Social'),
    ('THREADS', 'Threads', 'Social'),
    ('PINT', 'Pinterest', 'Social'),
    ('SNAP', 'Snapchat', 'Social'),
    ('QUORA', 'Quora', 'Social'),
    ('DISCORD', 'Discord', 'Community'),
    ('TELEGRAM', 'Telegram', 'Community'),
    ('WHATSAPP', 'WhatsApp', 'Messaging'),
    ('GOOGLE', 'Google Search / Ads', 'Search'),
    ('BING', 'Bing Search / Ads', 'Search'),
    ('TRUEPEOPLE', 'TruePeopleSearch', 'Research'),
    ('CLERK', 'Clerk / Court Docket Portal', 'Government'),
    ('APPRAISER', 'County Property Appraiser', 'Government'),
    ('TAXCOLL', 'County Tax Collector', 'Government'),
    ('SUNBIZ', 'Florida Sunbiz Registry', 'Government'),
    ('DEATHREC', 'Florida Vital Statistics / Death Records', 'Government'),
    ('CODEENF', 'Municipal Code Enforcement Division', 'Government'),
    ('GIS', 'County GIS Spatial Mapping', 'Government'),
    ('MLS', 'Authorized Real Estate MLS', 'Listing'),
    ('ZILLOW', 'Zillow Marketplace', 'Listing'),
    ('REALTOR', 'Realtor.com Portal', 'Listing'),
    ('OTHER', 'Other Platform', 'Fallback'),
    ('UNKNOWN', 'Unknown Platform', 'Fallback')
ON CONFLICT (platform_code) DO NOTHING;
