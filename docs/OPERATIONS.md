# HushHawk operations guide

## First-time setup
1. Copy `.env.example` to `.env` and fill it in (at minimum `DATABASE_URL`, `PUBLIC_API_URL`, `WEBHOOK_SECRET`).
2. `npm ci && npm run db:migrate` applies every migration and seed. It is safe to run on every deploy.
3. Create the first administrator (the password is read from the environment, never from source control):
   ```bash
   ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='at-least-12-characters' npm run db:create-admin
   ```
4. `npm run build` for the web app and `node backend/src/server.js` for the API (`deploy-ec2.sh` does all of this).

## Security model
* Every API route requires a signed-in session. Public: `/health`, `/auth/login`, and the mailer QR pages under `/track/`.
* Webhooks (Podio, smrtPhone, BatchLeads) must present `WEBHOOK_SECRET` (`?secret=` or `X-Webhook-Secret`). The URLs built by the
  app already include it. Without `WEBHOOK_SECRET` set, webhooks are refused.
* Administrator-only: settings changes, integrations, connectors, dictionary governance, audit log, team management.
* The audit log is append-only at the database level. Actions are attributed to the signed-in user, never to a name sent by the browser.
* Set `DATABASE_SSL_CA` so the database certificate is verified.

## Data rules enforced by the database
* `first_source_code` on a lead cannot be changed (a trigger blocks it). Later responses are recorded as touchpoints.
* Event numbers come from `ops.allocate_event_number`, one atomic statement per property and pillar. The same case never gets a second number.
* A lead can exist before its property is known ("Property pending").
* Only the 29 pillars from the CrownKey guide are live. Any other pillar needs an administrator to approve and enable it
  (Settings, CrownKey Control, Dictionary).

## Upgrading a server that already receives webhooks
Podio hooks, BatchLeads and smrtPhone were registered without the secret. Until each one uses the signed URL, set `WEBHOOK_ALLOW_UNSIGNED=true`
so nothing is dropped, then re-register the Podio hooks (`POST /api/v1/integrations/podio/register-all-webhooks`), add `?secret=<WEBHOOK_SECRET>`
to the BatchLeads and smrtPhone URLs, and finally remove `WEBHOOK_ALLOW_UNSIGNED`. The server also needs every `PODIO_*` variable in `.env`:
the code no longer falls back to built-in app IDs or tokens, so a missing variable shows "Podio not configured on the server".

## Security controls
- Every API route needs a signed-in session, except health, login and the signed webhooks (Podio, BatchLeads, smrtPhone use `WEBHOOK_SECRET`; Meta uses its own verify token and HMAC signature).
- Roles are enforced on the server, not only in the menus: a user whose role lacks a section cannot call that section's API (see `SECTION_RULES` in `backend/src/middleware/auth.js`). Administrators are not restricted. Shared areas (dashboard, notifications, chat, search, outreach actions) are open to every signed-in user.
- Sign-in: sessions last 12 hours, are stored hashed, and end on logout, suspension and password change. After 5 failed sign-ins for one account (from anywhere) that account is locked for 15 minutes; each address is also limited to 30 attempts per 15 minutes.
- API responses carry `nosniff`, no-framing, no-referrer and a restrictive content policy. The site (Vercel) carries `nosniff`, same-origin framing only, a strict referrer policy and HSTS.
- In production an unexpected server error returns a short reference instead of the raw message; the real message is in the server log with that reference. Webhook secrets in query strings are redacted from the request log.
- Still open: put HTTPS in front of the server (Vercel reaches it over plain HTTP), rotate every credential that was shared in chat, and restrict the server's firewall.

## File uploads from the browser
Photos and documents go straight from the browser to the private S3 bucket using a short-lived signed address, so the bucket must allow the site's own address in its CORS settings. If uploads fail with "Failed to fetch", check the bucket's CORS rules include the site address (`https://hushhawk-kohl.vercel.app`). `node backend/scripts/setup_s3_bucket.js` sets them (add other addresses with `PUBLIC_APP_ORIGIN`, comma separated).

## Exports
CSV exports (cash buyers, team roster, audit log, analytics, mail batches) use one shared writer: missing values are empty, quotes are escaped, and values that start with = or @ are neutralised so a spreadsheet cannot run them as formulas.

## Skip tracing (BatchLeads)
Traces are run inside BatchLeads. On the Skip Tracing page, "Export queue for BatchLeads" downloads the parcels waiting for a trace (owner, address, city, state, ZIP, county, parcel). Upload that file to BatchLeads and run the trace there. In BatchLeads, point the push/webhook at `/api/v1/integrations/batchleads/webhook`; phones and emails then arrive on the lead. Queued parcels are marked as automated, so they are not counted as seller leads until a trace brings in a real contact.

## In-house mailing
Direct Mail has an "In-House Mailing" tab for mail we print and pack ourselves (no mail vendor). Each touch (1 first outreach, 2 follow-up, 3 final courtesy) has one letter and one matching envelope (PDF, PNG or JPG, uploaded to the private bucket under `mail-templates/`). A run checks the audience (owner of record, deliverable mailing address, existing leads, responses, opted-out and returned mail, duplicate owners, touch order), gives every piece a mailpiece ID and a response token, and produces a ZIP with `mailing_list.csv`, `letters.pdf` and `envelopes.pdf` in the same order (pillar, then CrownKey). "Mark as mailed" starts the clock for the next touch (default 14 days). Returned mail and "asked to stop" are recorded by mailpiece ID and are never mailed again. The envelope address position and the optional name/QR on the letter are set per template and checked with Preview. Needs `pdf-lib` and `fflate` (installed with `npm install`).

**Premium design.** The Letter & envelope step can create a matching navy-and-gold letter and #10 envelope for each touch ("Use for all three touches"). It prints the company name, return address, phone, website and sign-off saved under "Mailing identity" and leaves out anything left empty. Art stays 0.25 in inside the paper edge because office printers cannot print to the edge. The letter copy is generic and makes no claims; have your counsel review it. Re-press "Use" after changing the identity. Uploading your own files replaces the premium ones for future runs.

## Do-not-contact list
- Replies that ask to stop (STOP, QUIT, UNSUBSCRIBE and plain phrases such as "stop texting me") are detected in Podio conversations and the sender is added to the list automatically. Newsletter footers that merely contain the word "unsubscribe" are ignored. The outbound gate matches on the last 10 digits, so +1 and local formats both match.
- To load a list (for example the national Do Not Call registry download for your area codes, or your own list): `POST /api/v1/compliance/suppression/import` with `{ "text": "<one number or email per line>", "reason": "National Do Not Call registry, downloaded <date>" }`. It reports how many were added, already listed or rejected. Registering for the national registry and downloading the file needs your own account at telemarketing.donotcall.gov.

## Deal analyzer
- Pick a registered property and the analyzer reads the county roll for its living area, then finds similar qualified sales within about half a mile in the last 18 months (same land use, living area within 30%, improved, arm's length). With at least three it suggests an ARV (median price per square foot times the home's living area) and shows the sales and the 25th to 75th percentile range. With fewer than three it makes no estimate and says why. Repairs, the buy-box percentage, the fee and the title buffer are yours to enter; the percentage and fee start from Settings, Underwriting. Results are cached for 7 days per property.
- Limits: the roll has no bedrooms or bathrooms, no condition and no renovation history, and sale prices include investor purchases of damaged homes, so the range can be wide. Treat the figure as a starting point.

## Monitoring and alerts
- `GET /api/v1/health` answers with `status` (ONLINE when the database is reachable) and `degraded` (true when the Podio sync has failed or stopped, or the daily backup is overdue), plus a `checks` block of yes/no states. Point an uptime monitor at it and alert on a non-200 reply or on `"degraded":true`.
- Scheduled tasks that fail three times in a row raise a notification in the app (and an email when `ALERT_EMAIL` is set), at most once every six hours per problem.
- The server keeps its logs rotated daily (20 MB per file, 14 kept, compressed) with pm2-logrotate.
- Known limitation: the build tools (Vite, vue-router) depend on `picomatch`, which has a published ReDoS issue with no fixed release yet. It only runs at build time on our own file patterns. Re-run `npm audit` periodically.

## Backups and restore
Once a day the API writes a compressed copy of every table (except sign-in sessions) to the private S3 bucket under `backups/db/`, encrypted (AES256), and keeps the last 30 days (at least the newest 7). This is on top of the database provider's own automated backups, which should also be switched on and checked in the AWS console.
- Settings (optional): `BACKUP_EVERY_HOURS` (default 24), `BACKUP_RETENTION_DAYS` (default 30).
- Status: `GET /api/v1/admin/backups`. Run one now (administrators only): `POST /api/v1/admin/backups/run`.
- Restore into an EMPTY, freshly migrated database: download the file from S3, then `DATABASE_URL=... node database/restore_backup.js hushhawk-<time>.json.gz`. It refuses to run on a database that already has leads. Rehearsed end to end with the real file from S3: it restored all 75 tables (1,361 rows) into a fresh database.

## Meta channels (Messenger, Instagram, WhatsApp, Facebook Lead Ads)
The Conversation Desk receives and answers these through Meta's official API. Nothing arrives until Meta is connected:
1. In Meta for Developers create a Business app. Add the Messenger, Instagram and WhatsApp products (and Webhooks).
2. Choose a long random string and set it as `META_VERIFY_TOKEN`. Copy the app secret into `META_APP_SECRET`.
3. Webhook callback URL: `<PUBLIC_API_URL>/api/v1/webhooks/meta` (it must be https), verify token = `META_VERIFY_TOKEN`.
   Subscribe the Page to `messages` and `leadgen`, Instagram to `messages`, WhatsApp to `messages`.
4. Page token: `META_PAGE_ID` and `META_PAGE_ACCESS_TOKEN` (a long-lived Page token with `pages_messaging`, `pages_manage_metadata`, `leads_retrieval`; Instagram messages need `instagram_manage_messages` on the linked account).
5. WhatsApp: `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` from the WhatsApp Business account.
6. Restart the API and open `GET /api/v1/integrations/meta/status` to see which channels are READY.
Notes: Meta only lets you reply within 24 hours of the person's last message (WhatsApp needs an approved template after that); the desk shows Meta's own refusal text and keeps the draft. Going live with real people needs Meta app review and business verification.
Every inbound message is stored once, a new sender becomes a lead whose first source is the platform (Facebook, Instagram, WhatsApp, or Facebook Lead Ad), and a sender who already matches a lead by phone or email is added to that lead instead of duplicated.

## Podio
Set the `PODIO_*` variables and `PODIO_SYNC_INTERVAL_MIN` (minutes). The API then syncs on that schedule and also reacts to webhooks.
Register the webhooks once: `POST /api/v1/integrations/podio/register-all-webhooks` as an administrator.
* A Podio lead's first source is mapped from Podio's own **Source** field (unrecognised text becomes OTHER, blank becomes UNKNOWN).
* A Podio property is registered only when it has a **Parcel / APN** and a **County**. Items without them are kept as raw records and are
  counted as "awaiting parcel" in the Podio status. Add the parcel in Podio and the next sync registers it.
* `npm run sync:podio` runs one full sync on demand.

## County and provider feeds
Add a feed with `POST /api/v1/connectors` (https URL, optional bearer token read from an environment variable named in `auth_env_var`,
`records_path`, `field_map`, `schedule_minutes`). A connector runs only after an administrator approves and enables it
(Settings, CrownKey Control, Imports & connectors). Manual files go through `POST /api/v1/imports`.

## Relationship graph (Neo4j)
Set `NEO4J_HTTP_URL`, `NEO4J_USER`, `NEO4J_PASSWORD`. Changes are published from the transactional outbox every 30 seconds and the
Graph sync tab compares Postgres and Neo4j counts. Without these variables the outbox simply accumulates.

## Messaging
Nothing is reported as sent unless Twilio, SendGrid or SMTP accepts it. Without a carrier configured, sends return HTTP 503.
Every text, email and call passes the compliance gate (suppression list, consent, rate limits, permitted hours, permissions).

## One-time clean-up of data written by the older version
* `node database/correct_legacy_podio_data.js` (dry run) then `--apply`: corrects Podio leads that were all labelled MAIL and clears
  property links to invented parcels. Properties with invented parcels are listed, not deleted.
* `node database/resolve_duplicate_events.js` (dry run) then `--apply`: if the same court case was recorded twice by the old counters, the later
  copy is rejected (kept on record, number never reused), its evidence moves to the first, and the one-case-one-event rule is enabled.
  The migration skips that rule when duplicates exist, so run this once after migrating.
* `node database/import_legacy_store.js backend/data/canonical_store.json`: brings the old JSON-file workspaces (direct-mail batches,
  campaigns, calendar, etc.) into the database. After that the file can be deleted.

## Tests
`npm test` runs the core engine acceptance tests against a **disposable local database** (it refuses to run against a remote host).
