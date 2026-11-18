# HushHawk: status against the client spec (updated 18 Nov 2026)

Measured on the live system. "Working" means tested with real data. "Gap" means the spec asks for it and it is missing or unproven. No fake or demo data remains in the database that we know of.

## Working with real data
- Sign-in, roles enforced by the server, audit trail, per-account sign-in lockout, security headers, daily encrypted database backup to S3 with a tested restore.
- Podio two-way sync: leads, cash buyers, properties, the Feeds conversation log; webhooks signed with a secret; leads deleted in Podio become LOST.
- CrownKey property registry: 15 properties with real county parcels, owner of record, assessed value and legal description, found from the address by a county parcel lookup that accepts a parcel only when its street address matches. 9 Absentee Owner events from the county roll, each linked to the roll record as evidence.
- Lead quality: every lead has a kind (seller, needs review, business contact, automated sender, internal or test) with the reason. Seller counts, dashboard, analytics and marketing use sellers plus needs-review only (24 of 76 today). A person can change a lead's kind and rules never override it.
- Seller Leads, Dashboard, Follow-ups, Tasks, Calendar, Cash Buyers, Contacts, Team, Settings, Vault (S3), Analytics, Marketing, Dispositions, Contracts, Direct Mail (all read and write tested).
- Conversation Desk: Email, Podio and smrtPhone receive real messages from Podio Feeds. Every tab shows whether it is connected and says why when empty.
- Texts, emails and deal blasts hand off to Podio Feeds when no carrier is configured and are never reported as sent unless the hand-off succeeded.
- Meta channels (Messenger, Instagram, WhatsApp, Facebook Lead Ads): intake, replies, lead creation and signature checks are built and tested with signed test webhooks. Not connected yet (see below).

## Gaps that need something from the client or an account

| # | Gap | What is needed |
|---|-----|----------------|
| 1 | **County distress events are not fed.** Foreclosure, pre-foreclosure, tax, tax certificate, tax deed, code violation, municipal lien, probate, eviction, condemnation and the rest have no machine-readable source that software can reach. RealForeclose refuses automated access; the City's GIS server has no code or lien layers; its open data hub is private. | Records requests to the Duval Clerk, Tax Collector and Municipal Code Compliance, or a data vendor (letters in docs/RECORDS_REQUEST_PLAN.md). The Tax Collector's Delinquent Parcels and County-Held Tax Certificates reports can be downloaded by a person today and imported. |
| 2 | **Meta channels are not connected.** No Meta app credentials are set, so no real social message has flowed. TikTok, X, LinkedIn, Reddit, YouTube and the listing sites have no messaging connection (most have no public API). | Meta developer app and the six values in docs/OPERATIONS.md. Decide with the client which other platforms matter. |
| 3 | **Graph (Neo4j) is not configured.** Outbox messages are waiting. | A Neo4j instance and credentials. |
| 4 | **Real message delivery is unproven.** No SMS or email carrier is configured; sends go to Podio Feeds and are untested end to end; calls are click-to-dial. | A real test to the team's own phone and email; optionally Twilio and SendGrid. |
| 5 | **Skip tracing has no provider.** Phone, DNC and cost columns are empty. | A skip-trace vendor and a DNC source. |
| 6 | **Deal Analyzer, ARV, repairs and MAO have no data source.** The acquisitions board shows dashes. | A comps or valuation source, or manual entry fields per lead. |
| 7 | **AI assistant is not configured.** | A model key. |
| 8 | **Contracts have no e-signature or title partner connection.** | An e-signature provider. |
| 9 | **Direct mail has no print or mail vendor.** Tracking is built and shows zero pieces. | A mail vendor. |

## Gaps in the product that remain

| # | Gap | Note |
|---|-----|------|
| 10 | **Only 2 of 76 leads link to a property.** Podio holds a property on only 2 leads and the rest carry no address anywhere. Leads link automatically when an address exists (Podio relation, a conversation that names a street address, or a BatchLeads push with an address). | The team needs to capture the property address on each lead. |
| 11 | **Leads still need people.** 19 leads are "needs review" and 31 are classified as business contacts by rules that look at email domains; some will be wrong. There is no duplicate merge tool. | Review the lists with the Type selector on the Seller Leads page. A merge tool is not built. |
| 12 | **5 of the 19 Podio properties cannot be registered** (2 in New York, the "9 Maple Ave" test property, 2 whose addresses did not match a parcel). | Correct the addresses in Podio or enter the parcels by hand. |

## Security and operations to finish
- Rotate every credential that was pasted into chat (database, AWS, Podio, GitHub, and the Meta values once added). Make the GitHub repository private.
- Vercel talks to the server over plain HTTP. Put HTTPS in front of the server (needs a domain for the server). Restrict the server's firewall.
- Turn off `WEBHOOK_ALLOW_UNSIGNED` once BatchLeads and smrtPhone use the signed URL.
- Check that RDS automated backups are switched on (not verifiable with the current AWS keys) and add an external uptime alert on `/api/v1/health`.
- Delete the "Test Seller" and "Test" leads from live Podio.
