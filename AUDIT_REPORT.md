# HushHawk CrownKey: Audit Against the Client Specification

**Method:** static code review of the backend, database migrations and seeds, the 20 Vue views, the committed data files and the deployment config. The checks were run against the client's A-to-Z spec.
**Not done:** the app was not run, and the production database was not touched. Every item below comes from reading code, so "confirmed" means confirmed in code, not by reproducing it live.

## What the project is
- **Frontend:** a WeWeb shell. One custom Vue element (`element-f1b67d54…`) holds 20 views plus Dashboard, Seller Leads and Acquisitions. All of it ships as `dist/`, which is committed to git.
- **Backend:** Express (`backend/src/routes/api.js`, 6,354 lines) with 7 Postgres schemas (ref, raw, core, rel, crm, ops, audit).
- **Data layer:** a JSON file, `backend/data/canonical_store.json`, plus an in-memory copy that is loaded at startup and written alongside Postgres.
- **Integrations:** Podio, smrtPhone, BatchLeads, S3 and Gemini.

The client's spec makes the **CrownKey identity and evidence engine** the foundation, with SQL as the authoritative registry. That is where the biggest gaps are.

---

## A. CRITICAL: security (fix before anything else)

| # | Issue | Evidence |
|---|---|---|
| A1 | **Almost every API route has no authentication.** Only `/team`, `/roles`, `/rbac`, `/audit` and `/automations` check a session. Leads, people, phones, emails, contacts, contracts, properties, vault files, communications, settings and the dashboard are all open to anyone who can reach the server. | `api.js:5361`, `5964`. The 15 of 20 views that never send an `Authorization` header (Analytics, Contacts, Properties, Settings, Marketing, etc.) work only because the server doesn't ask. |
| A2 | **`POST /admin/reset-database` is unauthenticated** and wipes leads, properties, people, contracts, the audit log and the outbox. One request erases the client's data from the JSON store. | `api.js:6220` |
| A3 | **HawkAI auth is bypassable.** Any `x-api-key` of 16 or more characters passes, as does any `Bearer` header longer than 15 characters or any `x-hushhawk-session` header. There is also a hardcoded fallback key, `hushhawk-internal-2026`. | `api.js:6270-6300` |
| A4 | **Page-level security is empty.** Every page has `"security":{}` and `unauthenticatedPageId` is null, so protected views render without a login. Navigation is not filtered by role server-side. | `index.html` `wwg_designInfo` |
| A5 | **`POST /settings` is unauthenticated.** Anyone can overwrite company, underwriting and integration settings. `GET /settings` also exposes the RDS hostname. | `api.js:5636`, `5779` |
| A6 | **Webhooks are unsigned.** Podio, smrtPhone and BatchLeads accept any POST. `item.delete` from Podio marks real leads LOST and deletes sync rows. | `api.js:1982`, `2294`, `2340` |
| A7 | **Real personal data is committed to git.** `canonical_store.json` holds 70 people (names, phones, emails) and 338 audit events. Two DB backups are also tracked. | `git ls-files backend/data database/backups` |
| A8 | **Weak default passwords.** The Team "Add member" form pre-fills `HushPass!####` using `Math.random()`. TLS to the database is `rejectUnauthorized:false`. CORS is fully open (`cors()`). | `TeamView.vue:1622`, `pgClient.js`, `server.js:9` |
| A9 | **Presigned S3 upload/download URLs are unauthenticated.** | `api.js:320`, `341`, `557`, `743` |

## B. CRITICAL: the CrownKey identity engine does not meet the spec

| # | Spec requirement | What the code does |
|---|---|---|
| B1 | **SQL owns the registry and event numbers.** | Events and counters are assigned in the in-memory JSON store. Postgres writes are fire-and-forget (`pool.query(...).catch(()=>{})`), and errors are swallowed unless `DEBUG_SQL=true`. If PG fails, the app still returns success. If the process restarts or two instances run, numbers can be reissued (`eventService.js`, `database.js:180`). The spec says to allocate "inside a DB transaction with a lock" and never use read-then-increment. This is read-then-increment. |
| B2 | **Transactional outbox, then Neo4j sync.** | **There is no Neo4j.** No driver is installed. `GraphService` builds a graph from the JSON store, and "reconciliation" only reads that same JSON store. The outbox is written but no worker consumes it. |
| B3 | **Do not activate unapproved dictionary entries.** | Migration `018` runs `UPDATE ref.pillars SET production_enabled=TRUE, review_status='APPROVED'` on **every** pillar. The dictionary has **42 pillars** instead of the 29 in the spec, with 13 extras (BANKR, MECH, STR, INSPECT, DEMO, ZONING, ESTATE, PROPDAM, SQUAT, ABAND, ROOF, UNSAFE, EVICT). Several duplicate approved ones (EVICT/EVI, ESTATE/PRB/INH, UNSAFE/CONDEMN, ABAND/VAC). |
| B4 | **Other dictionaries match the deck:** 46 lead sources, 15 contact methods, 30 platforms. | Seeds contain roughly 54 sources, 21 methods and 44 platforms. The JSON store holds only 8 sources and zero platforms, methods or roles, so it is out of sync with SQL. |
| B5 | **Counties are DUV, CLAY, FLAG, STJ.** | Store has `CLY` and `STJ` (the latter PROPOSED). Migration `018` adds `FLAG` but not `CLAY`. County lookups silently fall back to `'DUV'` (`crownkeyService.js:18`, `database.js` `COALESCE(...,'DUV')`), so a property with a missing county is shown as Duval. |
| B6 | **A lead can be saved before its property is known ("Property pending").** | `POST /leads` (UI path) **invents a fake parcel** (`FL-<zip>-<time>`), a fake property and a hardcoded `assessed_value=250000`. Every manual lead pollutes the property registry, and the county is hardcoded to Duval/Jacksonville (`api.js:1815-1860`). |
| B7 | **First source is kept as one of 46 codes, and original attribution never changes.** | The same route collapses source to `MAIL` or `OTHER` (`.includes('MAIL') ? 'MAIL':'OTHER'`), so Facebook, WEB, SMS, referral and the rest are lost on UI-created leads. The Seller Leads view then labels `OTHER` as "Direct Mail" (`api.js:1701`), which corrupts the marketing numbers. Nothing in the DB prevents `first_source_code` from being updated. |
| B8 | **Four distinct fields: source, contact method, platform, medium (+campaign).** | `core.interactions.method` is limited to `CALL, TEXT, EMAIL, FORM, VISIT, DIRECT_MAIL`, not the 15 spec codes. There are no `platform`, `medium` or `campaign_id` columns on leads or interactions, and no `attribution_touchpoints` table. A later contact cannot be stored as a new touchpoint. |
| B9 | **Contact roles, ownership links and relationship tables.** | No `contact_roles`, `property_contact_links`, `lead_property_links`, `lead_event_links`, `property_lineage`, `source_observations` or `import_jobs` tables. Parcel splits/merges and multi-role contacts cannot be modelled. The evidence link exists as `rel.event_evidence`, but that is one of the few spec tables present. |
| B10 | **Review queue: analyst decisions with an audit trail.** | Decisions live only in the JSON store and PG writes are fire-and-forget. The reviewer name defaults to a hardcoded `'David Sterling'` (`identityService.js`). The queue has no auth and no frontend screen at all (see C1). |
| B11 | **Compliance gate (consent, suppression, rate limit, jurisdiction).** | `ComplianceService` hardcodes checks 2 to 6 as `passed: true` with invented reasons ("Compliant with Florida telemarketing statutes"). Only the phone/email suppression match is real. It logs an approval it never evaluated. |
| B12 | **Two event statuses, verification and operational, kept separate.** | Defined in SQL, but `recordPillarEvent` defaults every new event to `CONFIRMED`, with no evidence required. |

## C. HIGH: spec modules that are missing or incomplete

| # | Spec module | State |
|---|---|---|
| C1 | **Review Queue, Evidence Center, Relationship Graph, Data Imports, Pillar Events, Admin/Dictionary governance** | **No frontend screens.** The backend routes (`/review/queue`, `/graph/projection`, `/connectors`, `/raw/source-records`, `/admin/pillars` etc.) are called by 0 views. The nav has 23 items, none of them these. |
| C2 | **Property detail with CrownKey events, evidence, ownership and graph tabs** | The Properties view is a photo/document/expense workspace. It does not show pillar events, evidence or verification status. |
| C3 | **Four-case CrownKey rendering and lead attribution display** | Rendering is correct and unit-tested, but `enrichProperty` shows only `events[0]` and the first lead's source for the whole property. A property with FC and TAX shows only one event, and the source belongs to a lead that may not relate to that event. |
| C4 | **Import pipeline with created/updated/rejected/review counts** | `leadImportService` imports leads only. There is no property/event/evidence import job tracking. |
| C5 | **Evidence freshness, OCR, checksum/duplicate detection** | Not implemented. |
| C6 | **Dashboards "link to underlying records", unique counts** | Dashboard and Analytics counts come from different sources (JSON store vs SQL), so the numbers can disagree. |

## D. HIGH: data integrity and architecture

- **D1 Dual source of truth.** Postgres, the JSON file and in-memory arrays all hold data. The server reads the JSON at start, then hydrates from PG in the background (`syncFromPostgres`). Some routes read memory, some PG. Two app instances, or a restart mid-write, will diverge. `persist()` rewrites a 550 KB file on every write.
- **D2 Schema drift.** `crm.cash_buyers` and `crm.stage_overrides` are queried but never created by any migration, so Cash Buyers and Deal Funnel stage routes fail on a fresh database (including CI's).
- **D3 Non-transactional writes.** `POST /leads` runs 3 separate inserts plus an audit insert with no transaction. Failure midway leaves orphan people and properties.
- **D4 Mock data still ships.** `wewebAdapter.js` hardcodes tasks and contacts ("James R. Carter", "Darren Richardson", "Travis…") as fallbacks. `/integrations/smrtphone/status` always returns `CONNECTED` with hardcoded phone numbers. Settings defaults contain a fake EIN (`88-1234567`) and "First American Title". Hardcoded people ("Alex Richard", "Elena Rostova", "Marcus Vance", "David Sterling") are used as default actors, so the audit log can attribute actions to people who did not do them.
- **D5 Audit trail.** Many routes pass a client-supplied `actor` or a hardcoded default instead of the session user.
- **D6 Hardcoded server IP** `3.148.218.118` in `vercel.json`, the deploy script and several routes. This is plain HTTP, so the API is called over an unencrypted link.

## E. MEDIUM: quality and operations

- **E1** The CI workflow migrates a fresh database, so it never creates `crm.cash_buyers` (D2). I did not run the tests, so which ones fail is unconfirmed.
- **E2** `validateCrownKeyFormat` parses keys with regexes. The spec says never to parse a CrownKey by splitting. It is only used as a lint, but it is exposed through `/crownkey/validate`.
- **E3** `WEBCHAT` (video meeting) vs `CHAT` naming conflict flagged by the spec is not resolved.
- **E4** `dist/` (compiled bundle) is committed, so every source fix needs a rebuild and a commit of generated files. `.env.production` and `.env.staging` are also tracked.
- **E5** Old test or simulate endpoints are left as 410 stubs instead of removed. `/ai/*` and `/integrations/test-all` are open.
- **E6** No rate limiting on any route, including login.
- **E7** A `signup` page exists and `PROVIDER_EMAIL_DISABLE_SIGNUP` is `FALSE`. Needs a live check that open signup is not possible.

---

## Suggested fix order
1. **Lock down the API** (A1-A5, A9): one auth middleware on the whole router with a public allowlist. Remove or protect `reset-database`. Fix HawkAI auth. Sign webhooks.
2. **Remove the data from git** and rotate any exposed secrets (A7).
3. **Make Postgres the only store** (B1, D1): move event numbering to a locked transaction and drop the JSON store.
4. **Fix lead intake** (B6, B7): property pending, real source codes, a transaction, and a DB rule that blocks `first_source_code` updates.
5. **Reconcile dictionaries to the deck** (B3-B5): 29 pillars, 46 sources, 15 methods, 30 platforms, and stop auto-approving.
6. **Add the missing schema and screens** (B8-B9, C1-C2): touchpoints, link tables, review/evidence/graph screens.
7. **Replace the stubs** (B2, B11): a real outbox worker and Neo4j, and a real compliance gate.
8. Clean up mock data and hardcoded actors (D4-D5).

---

## Status after the fixes (see also `docs/OPERATIONS.md`)

**Fixed and verified against a fresh disposable Postgres (12 acceptance tests, plus the CrownKey, notification, direct-mail and vault suites):**
A1-A6, A8, A9, B1-B12 (except as noted below), C1, D1-D5, E1-E6 and the Podio attribution/linking defects found during the fix.

| Report item | Result |
|---|---|
| A1 No auth on the API | Router-wide session gate; webhooks need `WEBHOOK_SECRET`; admin-only routes enforced server-side |
| A2 `reset-database` | Route removed |
| A3 HawkAI auth bypass | Administrator session only; default key removed |
| A7 Personal data in git | Untracked and ignored. **Still in git history, see below** |
| B1 SQL as registry / atomic numbering | Events, counters, review, leads, imports run in Postgres transactions (`ops.allocate_event_number`) |
| B2 Neo4j | Real outbox worker publishes to Neo4j when `NEO4J_*` is set; reconciliation compares real counts |
| B3 Auto-approved pillars | Only the 29 guide pillars are live; others need an audited administrator approval |
| B6-B9 Lead intake, attribution, tables | Property pending, real source codes, immutable first source, touchpoints, link/lineage/import tables |
| B11 Compliance gate | Six real checks; skipped steps are reported as skipped |
| C1 Missing screens | Review queue, events/evidence, imports/connectors, dictionary governance and graph sync under Settings, CrownKey Control |
| D Fake data | Fabricated connector feeds, Podio fallbacks, settings, integration status, deal/contract defaults, dashboard numbers and fixed personas removed |

**Not done, needs a decision or further work:**
* Git history still contains the committed Podio app token and the personal data (54 commits touch the data file). Rotate the Podio token and
  decide whether to rewrite history (destructive, needs everyone to re-clone).
* The 29-pillar dictionary still needs the business sign-off the client's guide asks for (reconciling the original legacy list).
* Lead sources: the dictionary holds the 46 guide codes plus a few integration codes (BATCHLEADS, PODIO, ...). Contact methods and platforms
  likewise hold extras beyond the guide's 15 and 30.
* Frontend views not individually re-audited line by line: Acquisitions, Contracts, Dispositions, Skip Tracing, Analytics, Marketing still
  contain some placeholder text and a few default ZIP values in their forms.
* Neo4j, county feeds, Twilio/SendGrid and Podio webhooks need real credentials and URLs before they do anything.
