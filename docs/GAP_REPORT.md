# HushHawk: gap report against the client spec (18 Nov 2026)

Measured on the live system after the fake-data cleanup. "Working" means tested with real data. "Gap" means the spec asks for it and it is missing or unproven.

## Working with real data
- Sign-in, roles, audit trail; every route needs a session; webhooks need a secret.
- Podio two-way sync: 70 leads, 7 cash buyers, the Feeds conversation log; deleted-in-Podio leads become LOST.
- Seller Leads, Dashboard, Follow-ups, Tasks, Calendar, Cash Buyers, Contacts, Team, Settings, Vault (S3 configured), Analytics, Marketing, Dispositions, Contracts (all read and write tested).
- Conversation Desk for Email, Podio and smrtPhone (fed from Podio Feeds).
- Dictionaries: 42 pillars (29 enabled), 55 lead sources, 21 contact methods, 44 platforms.

## Gaps, most important first

| # | Gap | Why it matters | What fills it |
|---|-----|----------------|---------------|
| 1 | **The CrownKey property registry is empty** (0 properties, 0 events). The 19 properties in Podio have addresses but no parcel number or county, and the spec forbids registering a property without both. All 75 leads are therefore unlinked from any property. | This is the core of the product: immutable property IDs, event numbers, pillars, evidence. | County data connectors (Duval first) that look up the parcel from the address, then register and link. |
| 2 | **No county data connectors** (0 configured; Duval, Clay, St. Johns, Nassau, Flagler and Polk are listed). | No automatic foreclosure, tax, code, probate or vacancy events. | A connector per county source: field mapping, schedule, raw record storage, event creation with evidence. |
| 3 | **Social platforms in the Conversation Desk are not connected.** 17 of 20 tabs are empty; the spec lists 30 platforms and the desk has 20. | Messages from Facebook, Instagram, Messenger, WhatsApp and others never arrive. | Meta app and page access (Facebook, Instagram, Messenger, WhatsApp). Email intake for the listing sites. Decide with the client which other platforms matter. |
| 4 | **Graph (Neo4j) is not configured.** 14 outbox messages are waiting. | The relationship graph, one of the two core stores in the spec, is not running. | A Neo4j instance and credentials; the outbox worker already exists. |
| 5 | **Real message delivery is unproven.** No SMS or email carrier is configured. Sends go to Podio Feeds and are untested end to end. Calls are click-to-dial. | The client cannot yet rely on outbound messages. | A real test to the team's own phone and email; optionally Twilio and SendGrid. |
| 6 | **Skip tracing has no provider.** Phone, DNC and cost columns are empty. | Contact data cannot be enriched or checked against do-not-call. | A skip-trace vendor and a DNC source. |
| 7 | **Deal Analyzer, ARV, repairs and MAO have no data source.** The acquisitions board shows dashes. | Underwriting cannot be done from the system. | A comps or valuation source, or manual entry fields saved per lead. |
| 8 | **AI assistant is not configured** (no model key). | HawkAI is a placeholder. | Add the key. |
| 9 | **Contracts have no e-signature or title partner connection.** | Contracts can be tracked but not signed in the system. | An e-sign provider. |
| 10 | **Direct mail has no print or mail vendor**, and the QR scan page shows 14 scans against 0 pieces mailed. | The scans may be test data. | Confirm and remove test scans; connect a mail vendor. |
| 11 | **Lead quality.** 63 of 75 leads have source EML, and some are not sellers ("Contact Info", the company's own name). There is no duplicate merge. | The pipeline count is inflated. | Rules to ignore non-seller emails; a merge tool. |

## Security and operations to finish
- Rotate every credential that was pasted into chat (database, AWS, Podio, GitHub). Make the GitHub repository private.
- Vercel talks to the server over plain HTTP. Put HTTPS in front of the server.
- Turn off `WEBHOOK_ALLOW_UNSIGNED` once BatchLeads and smrtPhone use the signed URL; delete the old unsigned Podio hooks (they now fire twice).
- Set `DATABASE_SSL_CA` so the database certificate is verified.
- The Team page's "Reveal passwords" control only shows dots; remove it.
- `deploy-ec2.sh` fails on Amazon Linux when swapping Node 18 for 22 and on the frontend build; deploy by updating `dist` and restarting.
- Add a scheduled database backup and an uptime alert.
