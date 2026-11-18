# HushHawk: gap report against the client spec (18 Nov 2026)

Measured on the live system after the fake-data cleanup. "Working" means tested with real data. "Gap" means the spec asks for it and it is missing or unproven.

## Working with real data
- Sign-in, roles, audit trail; every route needs a session; webhooks need a secret.
- Podio two-way sync: 70 leads, 7 cash buyers, the Feeds conversation log; deleted-in-Podio leads become LOST.
- Seller Leads, Dashboard, Follow-ups, Tasks, Calendar, Cash Buyers, Contacts, Team, Settings, Vault (S3 configured), Analytics, Marketing, Dispositions, Contracts (all read and write tested).
- Conversation Desk for Email, Podio and smrtPhone (fed from Podio Feeds).
- Dictionaries: 42 pillars (29 enabled), 55 lead sources, 21 contact methods, 44 platforms.

## Done since this report was first written
- County parcel lookup (Florida DOR statewide roll, covers Duval, Clay, St. Johns, Nassau, Flagler, Polk): address is geocoded, the parcel is accepted only when its recorded street address matches, the county record is stored as evidence and the registration is audited.

- Meta channels: webhook intake (verify token and HMAC signature), deduplicated storage, lead creation with the platform as first source, and replies through the Graph API.

- Absentee Owner and Out-of-State Owner events from the county roll.

## Gaps, most important first

| # | Gap | Why it matters | What fills it |
|---|-----|----------------|---------------|
| 1 | **Property registry is half filled.** Parcel lookup is live (see below): 14 of the 19 Podio properties are registered with a county parcel, owner of record, assessed value and legal description. The other 5 are not registrable (2 are in New York, 1 is the "9 Maple Ave" test property, 2 have addresses the geocoder could not match). Only 2 of the 75 leads link to a property because Podio lists a property on only 2 leads. | Leads without a property cannot get events or pillars. | Link leads to properties by matching the lead's own address when Podio has no relation. |
| 2 | **Only two event types come from county records.** Absentee Owner and Out-of-State Owner are now created from the property appraiser roll (approved rules: owner mailing ZIP differs from site ZIP; owner mailing state is not FL), with the roll record as evidence, refreshed twice a day. Foreclosure, pre-foreclosure, tax, tax certificate, tax deed, code violation, municipal lien, probate, eviction, condemnation and the rest have **no free machine-readable source that could be reached**: Duval's foreclosure sales run on RealForeclose, which refuses automated access (HTTP 403); the City of Jacksonville GIS server exposes infrastructure layers only (no code enforcement, liens or tax data); its open data hub is private. | These distress events are what the system is meant to surface. | An official bulk data agreement or records request with the Duval Clerk (foreclosure, lis pendens, probate, eviction), the Tax Collector (delinquency, certificates, deeds) and Municipal Code Compliance (violations, liens), or a licensed data vendor. Once a feed exists the connector framework (Settings, Connectors) ingests it. |
| 3 | **Meta channels are built but not connected.** Messenger, Instagram, WhatsApp and Facebook Lead Ads intake and replies are coded and tested with signed test webhooks, but no Meta app credentials are set, so no real message has flowed. TikTok, X, LinkedIn, Reddit, YouTube and the listing sites (Zillow, Trulia, Homes.com, Houzz, Yelp, Nextdoor) are still not connected. | Real social messages only arrive once the client's Meta app is connected. | Follow the Meta section of docs/OPERATIONS.md; decide with the client which other platforms matter (most have no public messaging API; their lead emails can be parsed instead). |
| 4 | **Graph (Neo4j) is not configured.** 14 outbox messages are waiting. | The relationship graph, one of the two core stores in the spec, is not running. | A Neo4j instance and credentials; the outbox worker already exists. |
| 5 | **Real message delivery is unproven.** No SMS or email carrier is configured. Sends go to Podio Feeds and are untested end to end. Calls are click-to-dial. | The client cannot yet rely on outbound messages. | A real test to the team's own phone and email; optionally Twilio and SendGrid. |
| 6 | **Skip tracing has no provider.** Phone, DNC and cost columns are empty. | Contact data cannot be enriched or checked against do-not-call. | A skip-trace vendor and a DNC source. |
| 7 | **Deal Analyzer, ARV, repairs and MAO have no data source.** The acquisitions board shows dashes. | Underwriting cannot be done from the system. | A comps or valuation source, or manual entry fields saved per lead. |
| 8 | **AI assistant is not configured** (no model key). | HawkAI is a placeholder. | Add the key. |
| 9 | **Contracts have no e-signature or title partner connection.** | Contracts can be tracked but not signed in the system. | An e-sign provider. |
| 10 | **Direct mail has no print or mail vendor**, and the QR scan page shows 14 scans against 0 pieces mailed. | The scans may be test data. | Confirm and remove test scans; connect a mail vendor. |
| 11 | **Lead quality.** 63 of 75 leads have source EML, and some are not sellers ("Contact Info", the company's own name). There is no duplicate merge. | The pipeline count is inflated. | Rules to ignore non-seller emails; a merge tool. |

## Security and operations to finish
- Rotate every credential that was pasted into chat (database, AWS, Podio, GitHub, and the Meta values once added). Make the GitHub repository private.
- Vercel talks to the server over plain HTTP. Put HTTPS in front of the server.
- Turn off `WEBHOOK_ALLOW_UNSIGNED` once BatchLeads and smrtPhone use the signed URL.
- Check that RDS automated backups are switched on (not verifiable with the current AWS keys) and add an external uptime alert on `/api/v1/health` (for example UptimeRobot).

Done: roles enforced on the server, per-account sign-in lockout, security headers, error sanitising and log redaction; a daily encrypted database backup to S3 with a tested restore script; old unsigned Podio hooks removed; database certificate is verified (`DATABASE_SSL_CA`); the Team page no longer shows a password reveal control; `deploy-ec2.sh` now works on Amazon Linux; the S3 audit test waits for the audit rows instead of racing.
