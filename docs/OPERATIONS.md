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
