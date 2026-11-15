-- Migration 012: Comprehensive Threads and Messages for all 16 Lead Conversation Desk Platforms
INSERT INTO core.conversation_desk_threads (
    id, platform_id, contact_name, contact_phone, contact_email,
    property_address, property_specs, property_image,
    lead_score, priority, status, unread_count, ai_suggestion,
    last_message_preview, last_message_at
) VALUES
(
    'thread-yt-01', 'youtube', 'Devon Brooks', '(904) 555-6621', 'dbrooks.jax@gmail.com',
    '1421 Edgewood Ave S, Jacksonville, FL 32205',
    'Single-Family • 3 Bed / 2 Bath • Est. Equity: $82,000',
    'https://images.unsplash.com/photo-1576941089067-2de3c901e126?auto=format&fit=crop&w=400&q=80',
    89, 'High', 'Matched Contact', 1,
    'Thanks for watching our wholesale case study! We have 2 similar duplexes in Murray Hill under contract. Would you like the deal package?',
    'Saw your YouTube walkthrough on the Murray Hill flip. Do you have any off-market multi-families right now?',
    now() - INTERVAL '18 minutes'
),
(
    'thread-li-01', 'linkedin', 'Sarah Jenkins', '(904) 555-7734', 's.jenkins@firstcoastcapital.com',
    '7720 Baymeadows Rd, Jacksonville, FL 32256',
    'Commercial / Flex • 6,400 SqFt • Est. Equity: $320,000',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
    96, 'High', 'Matched Contact', 1,
    'Hi Sarah, our team closed $4.2M in private assignments last quarter. Let''s connect on our current Baymeadows commercial inventory.',
    'Connecting regarding debt placement & cash disposition liquidity for commercial parcels in Duval County.',
    now() - INTERVAL '35 minutes'
),
(
    'thread-x-01', 'x', 'Logan Vance', '(904) 555-9921', 'vance_invest@x.com',
    '4105 St Johns Ave, Jacksonville, FL 32205',
    'Single-Family • 4 Bed / 3 Bath • Est. Equity: $195,000',
    'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=400&q=80',
    84, 'Medium', 'New Lead', 0,
    'St. Johns Ave historic bungalow is available. ARV is $485k with $60k estimated rehab. Sending the comps sheet now.',
    'Saw your tweet about off-market deals in Avondale/Ortega. DMing proof of funds.',
    now() - INTERVAL '2 hours'
),
(
    'thread-nd-01', 'nextdoor', 'Brenda Morales', '(904) 555-3341', 'bmorales32211@yahoo.com',
    '2840 University Blvd N, Jacksonville, FL 32211',
    'Single-Family • 3 Bed / 1.5 Bath • Est. Equity: $72,000',
    'https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=400&q=80',
    90, 'High', 'Matched Contact', 2,
    'We can purchase the property entirely as-is with zero cleanup required on your part. Would you like our written cash offer today?',
    'Hi Alex, I saw your Nextdoor recommendation from our neighbor on Arlington. We need to sell our mother''s house as-is.',
    now() - INTERVAL '45 minutes'
),
(
    'thread-rd-01', 'reddit', 'Tyler Ross', '(904) 555-4412', 'tyler_ross99@gmail.com',
    '1124 King St, Jacksonville, FL 32204',
    'Duplex • 4 Bed / 2 Bath • Est. Equity: $118,000',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80',
    78, 'Normal', 'New Lead', 0,
    'King St duplex produces $2,600/mo current gross rent. Sending full pro-forma and lease agreements to your email.',
    'Saw your post on r/JacksonvilleREI. Looking for duplex opportunities in Riverside under $250k.',
    now() - INTERVAL '3 hours'
),
(
    'thread-tr-01', 'trulia', 'Amanda White', '(904) 555-2287', 'amanda.white@outlook.com',
    '5128 Timuquana Rd, Jacksonville, FL 32210',
    'Single-Family • 3 Bed / 2 Bath • Est. Equity: $68,000',
    'https://images.unsplash.com/photo-1582063289852-62e3ba2747f8?auto=format&fit=crop&w=400&q=80',
    85, 'Medium', 'Matched Contact', 0,
    'The property has clear title and ready for immediate closing. Would you like our title agent to forward the preliminary report?',
    'Inquired through Trulia about the property on Timuquana Rd. Is the seller open to a 14-day close?',
    now() - INTERVAL '4 hours'
),
(
    'thread-yp-01', 'yelp', 'Carlos Mendez', '(904) 555-5590', 'cmendez_jax@gmail.com',
    '6612 Arlington Rd, Jacksonville, FL 32211',
    'Single-Family • 3 Bed / 1 Bath • Est. Equity: $58,000',
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=400&q=80',
    82, 'Normal', 'New Lead', 0,
    'Yes, we pay 100% of standard closing costs with no commissions. Can our acquisitions specialist visit tomorrow at 11 AM?',
    'Found HushHawk on Yelp with top reviews. Need an honest cash offer on inherited property on Arlington Rd.',
    now() - INTERVAL '5 hours'
),
(
    'thread-gg-01', 'google', 'Patrick Moore', '(904) 555-8819', 'p.moore@moorelawfl.com',
    '9330 103rd St, Jacksonville, FL 32210',
    'Single-Family • 4 Bed / 2 Bath • Est. Equity: $92,000',
    'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=400&q=80',
    93, 'High', 'Matched Contact', 1,
    'We specialize in probate and estate acquisitions. We can provide an all-cash agreement with zero contingencies.',
    'Submitted inquiry via Google Search for probate property sale assistance in Duval County.',
    now() - INTERVAL '22 minutes'
),
(
    'thread-hd-01', 'homesdotcom', 'Rachel Foster', '(904) 555-1178', 'rfoster_homes@gmail.com',
    '4501 San Juan Ave, Jacksonville, FL 32210',
    'Single-Family • 3 Bed / 2 Bath • Est. Equity: $86,000',
    'https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?auto=format&fit=crop&w=400&q=80',
    87, 'Medium', 'Matched Contact', 0,
    'The San Juan Ave property is scheduled for inspection tomorrow. Can we pencil you in for the buyer walkthrough at 3 PM?',
    'Saw the wholesale listing on Homes.com. Is this contract assignable for cash buyers?',
    now() - INTERVAL '6 hours'
),
(
    'thread-hz-01', 'houzz', 'Victoria Sterling', '(904) 555-3390', 'vsterling@sterlingdesignjax.com',
    '3600 Ortega Blvd, Jacksonville, FL 32210',
    'Luxury Historic Estate • 5 Bed / 4 Bath • Est. Equity: $410,000',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80',
    97, 'High', 'Matched Contact', 0,
    'The Ortega estate features classic Georgian architecture with exceptional upside. Sending the architect package now.',
    'Inquiring about high-end renovation spread on the Ortega Blvd property featured in your design feed.',
    now() - INTERVAL '7 hours'
),
(
    'thread-ms-01', 'messenger', 'Keith Sullivan', '(904) 555-7711', 'ksullivan_fl@facebook.com',
    '10815 Atlantic Blvd, Jacksonville, FL 32225',
    'Single-Family • 3 Bed / 2 Bath • Est. Equity: $79,000',
    'https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?auto=format&fit=crop&w=400&q=80',
    85, 'Medium', 'Matched Contact', 2,
    'We can wire earnest money deposit directly to First Title Co within 24 hours of agreement signing. What is your ideal move date?',
    'Sent a direct Messenger ping regarding Atlantic Blvd contract terms. Can we do a 10-day inspection period?',
    now() - INTERVAL '12 minutes'
)
ON CONFLICT (id) DO UPDATE SET
    property_address = EXCLUDED.property_address,
    lead_score = EXCLUDED.lead_score,
    priority = EXCLUDED.priority,
    unread_count = EXCLUDED.unread_count,
    ai_suggestion = EXCLUDED.ai_suggestion,
    last_message_preview = EXCLUDED.last_message_preview,
    updated_at = now();

-- Seed Messages for the new threads
INSERT INTO core.conversation_desk_messages (id, thread_id, sender_type, sender_name, content, sent_at) VALUES
('msg-yt-01-1', 'thread-yt-01', 'lead', 'Devon Brooks', 'Saw your YouTube walkthrough on the Murray Hill flip. Do you have any off-market multi-families right now?', now() - INTERVAL '18 minutes'),
('msg-li-01-1', 'thread-li-01', 'lead', 'Sarah Jenkins', 'Connecting regarding debt placement & cash disposition liquidity for commercial parcels in Duval County.', now() - INTERVAL '35 minutes'),
('msg-x-01-1', 'thread-x-01', 'lead', 'Logan Vance', 'Saw your tweet about off-market deals in Avondale/Ortega. DMing proof of funds.', now() - INTERVAL '2 hours'),
('msg-nd-01-1', 'thread-nd-01', 'lead', 'Brenda Morales', 'Hi Alex, I saw your Nextdoor recommendation from our neighbor on Arlington. We need to sell our mother''s house as-is.', now() - INTERVAL '45 minutes'),
('msg-nd-01-2', 'thread-nd-01', 'rep', 'Alex Richard (HushHawk)', 'Hello Brenda! We would be honored to help. We buy homes completely as-is with zero fees or commissions.', now() - INTERVAL '30 minutes'),
('msg-nd-01-3', 'thread-nd-01', 'lead', 'Brenda Morales', 'That would be a huge relief for our family. When can someone come by to look at the property?', now() - INTERVAL '15 minutes'),
('msg-rd-01-1', 'thread-rd-01', 'lead', 'Tyler Ross', 'Saw your post on r/JacksonvilleREI. Looking for duplex opportunities in Riverside under $250k.', now() - INTERVAL '3 hours'),
('msg-tr-01-1', 'thread-tr-01', 'lead', 'Amanda White', 'Inquired through Trulia about the property on Timuquana Rd. Is the seller open to a 14-day close?', now() - INTERVAL '4 hours'),
('msg-yp-01-1', 'thread-yp-01', 'lead', 'Carlos Mendez', 'Found HushHawk on Yelp with top reviews. Need an honest cash offer on inherited property on Arlington Rd.', now() - INTERVAL '5 hours'),
('msg-gg-01-1', 'thread-gg-01', 'lead', 'Patrick Moore', 'Submitted inquiry via Google Search for probate property sale assistance in Duval County.', now() - INTERVAL '22 minutes'),
('msg-hd-01-1', 'thread-hd-01', 'lead', 'Rachel Foster', 'Saw the wholesale listing on Homes.com. Is this contract assignable for cash buyers?', now() - INTERVAL '6 hours'),
('msg-hz-01-1', 'thread-hz-01', 'lead', 'Victoria Sterling', 'Inquiring about high-end renovation spread on the Ortega Blvd property featured in your design feed.', now() - INTERVAL '7 hours'),
('msg-ms-01-1', 'thread-ms-01', 'lead', 'Keith Sullivan', 'Sent a direct Messenger ping regarding Atlantic Blvd contract terms. Can we do a 10-day inspection period?', now() - INTERVAL '12 minutes')
ON CONFLICT (id) DO NOTHING;

