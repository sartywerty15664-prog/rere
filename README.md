# MindLarp

The website, documentation, chat, and developer console for the MindLarp model family by GonidonCloud. Built with Next.js 16, React 19, Node.js, PostgreSQL, GSAP, and Lenis. The dark amber, terminal-inspired interface is based on the official Hermes Agent visual language, adapted for a model platform.

## Features

- Responsive public website with model pages, pricing, changelog, status, and legal pages.
- English documentation and an OpenAI-compatible API reference.
- SEO metadata, Open Graph, JSON-LD, `robots.txt`, sitemap, and web manifest.
- Chat connected to a configurable OpenAI-compatible inference service.
- Account registration, returning-user login, logout, and password changes.
- Google and GitHub OAuth with PKCE where supported.
- Password recovery over SMTP using single-use, 30-minute tokens.
- Console with scoped API keys, usage reporting, profile settings, and billing.
- Stripe Checkout, Customer Portal, and signed subscription webhooks.
- PostgreSQL persistence with migrations, transactions, constraints, indexes, and row-level security.
- Local Supabase PostgreSQL-compatible Docker database and a JSON migration path.
- Atomic JSON storage remains available as a single-process development fallback.

MindLarp does not include a model runtime. Chat and inference return a clear `503` until an upstream service is configured.

## Requirements

- Node.js 20.9 or newer
- npm
- Docker with Docker Compose for the local database
- Optional: an OpenAI-compatible inference endpoint
- Optional: Google, GitHub, Stripe, and SMTP credentials

## Quick start

```bash
npm install
cp .env.example .env
npm run db:up
npm run db:migrate
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). PostgreSQL listens only on `127.0.0.1:54322` and stores data in the named `mindlarp-postgres` Docker volume.

On a new installation, visit `/setup` and create the owner account. After that:

- `/register` creates additional accounts.
- `/login` signs in returning users.
- `/forgot-password` starts SMTP password recovery.
- `/chat` opens the model chat.
- `/console` manages keys, usage, billing, and settings.
- `/docs` contains the developer documentation.

Check the database container and application health:

```bash
docker compose ps
curl http://localhost:5173/health
```

For production, apply database migrations, validate the real deployment environment without printing secrets, build, and then start Next.js:

```bash
npm run db:migrate
npm run check:production
npm run build
npm start
```

The production server defaults to port `3000`; set `PORT=5173` to keep the development port. `check:production` loads `.env` when present and fails before rollout if PostgreSQL, HTTPS, inference quota/entitlement, SMTP TLS, or provider pairings are unsafe. If development reports `EADDRINUSE`, stop the existing process or choose another port with `PORT=5174 npm run dev`.

## Configuration

Next.js loads configuration from `.env`. The migration commands also read `.env` when present. Never commit `.env` or real credentials; `.env.example` contains local development values and empty production placeholders.

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | Use `production` to enable secure session cookies. |
| `HOST` | No | Listen address; defaults to `0.0.0.0`. |
| `PORT` | No | HTTP port; development default is `5173`. |
| `PUBLIC_URL` | Production | Public origin without a trailing slash. Used for OAuth callbacks, reset links, canonical URLs, and Stripe redirects. |
| `DATABASE_URL` | For PostgreSQL | Application PostgreSQL connection. When set, it takes precedence over JSON storage. Use a pooler for hosted Supabase. |
| `DIRECT_URL` | Recommended | Direct PostgreSQL connection used by migration and import commands. Falls back to `DATABASE_URL`. |
| `DATABASE_POOL_SIZE` | No | Maximum PostgreSQL connections per Node.js process; defaults to `10`. Multiply it by the replica count when sizing PostgreSQL. |
| `DATABASE_QUERY_TIMEOUT`, `DATABASE_STATEMENT_TIMEOUT`, `DATABASE_LOCK_TIMEOUT` | No | Millisecond limits; default to `15000`, `15000`, and `5000`. Use larger migration-role values only when a schema change requires them. |
| `DATABASE_SSL` | No | Set `true` when the server requires TLS. Local Docker does not require it. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | No | Defaults to `true`; disabling certificate verification is rejected by production validation. |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | No | Local Docker database settings; defaults are development-only `postgres` values. |
| `POSTGRES_PORT` | No | Local host port; defaults to `54322`. |
| `DATA_FILE` | JSON fallback | JSON path when `DATABASE_URL` is empty; defaults to `./data/mindlarp.json`. |
| `SUPABASE_URL` | Future integration | Supabase project URL, reserved for server-side integration. |
| `SUPABASE_PUBLISHABLE_KEY` | Future integration | Publishable key for a future explicitly designed browser integration; currently unused. |
| `SUPABASE_SECRET_KEY` | Future integration | Secret key for server-side Supabase APIs; never expose it to the browser. |
| `MINDLARP_UPSTREAM_URL` | For inference | OpenAI-compatible base URL, for example `https://provider.example/v1`. External production endpoints must use HTTPS. |
| `MINDLARP_UPSTREAM_KEY` | If required | Bearer token sent to the inference provider. |
| `ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION` | No | Explicit development/private-deployment bypass for subscription checks. In production, either leave this unset and configure Stripe or set it deliberately for a trusted non-billing deployment. |
| `INFERENCE_DAILY_REQUEST_LIMIT` | For production inference | Positive account-level daily request quota shared by API keys and chat; production validation requires it whenever inference is enabled. |
| `ALLOW_HTTP_UPSTREAM` | No | Explicitly allow a non-local HTTP upstream only on a trusted private network. HTTPS is required otherwise. |
| `GOOGLE_CLIENT_ID` | For Google login | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | For Google login | Google OAuth client secret. |
| `GITHUB_CLIENT_ID` | For GitHub login | GitHub OAuth client ID. |
| `GITHUB_CLIENT_SECRET` | For GitHub login | GitHub OAuth client secret. |
| `STRIPE_SECRET_KEY` | For billing | Stripe secret API key. |
| `STRIPE_PRICE_ID` | For billing | ID of a recurring Stripe Price. |
| `STRIPE_WEBHOOK_SECRET` | For billing | Signing secret for the Stripe webhook endpoint. |
| `SMTP_HOST` | For recovery | SMTP server hostname. |
| `SMTP_PORT` | No | SMTP port; defaults to `587`. |
| `SMTP_SECURE` | No | `true` for implicit TLS, commonly port `465`; otherwise `false`. |
| `SMTP_REQUIRE_TLS` | No | Defaults to `true` in production. Keep it enabled for STARTTLS on port `587`; plaintext is accepted only for a local test relay. |
| `SMTP_USER` | If required | SMTP username. |
| `SMTP_PASS` | If required | SMTP password or app password. |
| `SMTP_FROM` | For recovery | Sender, for example `MindLarp <no-reply@mindlarp.ai>`. |

Do not expose server environment values in browser JavaScript. Console API keys authenticate MindLarp users; `MINDLARP_UPSTREAM_KEY` authenticates this server with its inference provider.

## PostgreSQL and Docker

The application uses normalized `users`, `sessions`, `api_keys`, `usage_events`, `conversations`, and `password_resets` tables. Passwords, sessions, API secrets, and recovery tokens remain hashed. Foreign keys, uniqueness constraints, indexes, and transactional read-modify-write updates protect data integrity.

Apply migrations whenever the schema changes:

```bash
npm run db:migrate
```

Development storage initialization applies pending migrations automatically. Production web processes do not run DDL: they verify that every SQL migration is already present and become unready if the schema is behind. Run `npm run db:migrate` as a release job through `DIRECT_URL` before starting new application instances, and use separate runtime and migration database roles where possible.

Row-level security is enabled on every application table and no anonymous or authenticated browser policies are created. This is deliberate: browsers do not connect directly to PostgreSQL. The Next.js server uses database credentials that can bypass RLS. Add narrowly scoped policies only if a future client integration needs them.

To stop or restart the local container without deleting its data:

```bash
docker compose stop postgres
docker compose start postgres
```

Do not use `docker compose down -v` unless you intentionally want to delete the local database volume.

### Import existing JSON data

If `data/mindlarp.json` contains accounts from an earlier installation, import it before creating a new owner:

```bash
npm run db:import
```

The importer preserves UUIDs and existing password/session hashes, skips IDs already imported, and leaves the source JSON unchanged. Re-run database backups before importing. Resolve any pre-existing duplicate emails or credentials in the source data first; database uniqueness errors abort the transaction rather than silently merging accounts.

If `DATABASE_URL` is empty, the application uses the original atomic JSON store. JSON remains a temporary, single-process mode and is not suitable for multiple server processes.

## Supabase deployment preparation

The local container uses `supabase/postgres:17.6.1.044`; the schema uses standard PostgreSQL, UUIDs, `timestamptz`, JSONB only for identities/billing/messages, and Supabase-compatible RLS. A complete hosted Supabase integration can reuse `db/migrations/001_initial.sql` and the existing server-side data layer.

1. Create a Supabase project and run the migration through its SQL migration workflow, or set the hosted direct connection as `DIRECT_URL` and run `npm run db:migrate`.
2. Set the hosted pooled PostgreSQL URL as `DATABASE_URL` for the Next.js application.
3. Keep `DIRECT_URL` on the direct database connection for migrations.
4. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` only when the corresponding Supabase APIs are added.
5. Keep database passwords and the Supabase secret key server-side. The current application does not expose direct table access to browsers and does not require permissive RLS policies.

Authentication is currently implemented by the MindLarp server, not Supabase Auth. Moving to Supabase Auth later requires a deliberate session and account-mapping migration; it is not silently emulated here.

## Model inference

Set the upstream base URL without `/chat/completions`:

```dotenv
MINDLARP_UPSTREAM_URL=https://provider.example/v1
MINDLARP_UPSTREAM_KEY=your-provider-key
```

The server proxies requests to `POST https://provider.example/v1/chat/completions`. Available identifiers are `MindLarp-Sol-1-Plus` and `MindLarp-Sol-1-Max`; configure matching aliases in the upstream gateway if necessary. Non-stream responses are capped at 1 MiB, chat answers are capped at 100,000 characters, and omitted `max_tokens` values default to `4096`.

Production inference is fail-closed. Requests require an `active` or `trialing` Stripe subscription unless `ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION=true` is explicitly configured for a trusted non-billing deployment. `INFERENCE_DAILY_REQUEST_LIMIT` is required and is enforced once per account across API keys and browser chat; API keys are additionally capped at 10 active keys and 120 inference requests per account per minute. A quota check is a launch safeguard, not a replacement for provider-side budgets and metered billing.

```bash
curl http://localhost:5173/v1/chat/completions \
  -H "Authorization: Bearer ml_sk_live_your_key" \
  -H "Content-Type: application/json" \
  -d '{"model":"MindLarp-Sol-1-Plus","messages":[{"role":"user","content":"Hello"}]}'
```

## Google and GitHub login

Create separate OAuth applications with these callback URLs, replacing the origin with `PUBLIC_URL`:

```text
http://localhost:5173/auth/google/callback
http://localhost:5173/auth/github/callback
```

For Google, configure an OAuth **Web application** in Google Cloud Console. For GitHub, create an OAuth App. OAuth routes return `503` while a provider is unconfigured. Identities are linked only by provider ID. A matching verified email is not sufficient to attach an identity to an existing password account; the user must continue signing in with that account's original authentication method unless an explicit authenticated linking flow is added later.

## Stripe billing

1. Create a recurring Price and set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID`.
2. Create a webhook destination at `https://your-domain.example/webhooks/stripe`.
3. Subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
4. Set `STRIPE_WEBHOOK_SECRET` from the webhook destination.

For local forwarding:

```bash
stripe listen --forward-to localhost:5173/webhooks/stripe
```

Checkout and Customer Portal are available from `/console/billing`. Webhook signatures, expected price IDs, customer/subscription binding, duplicate event IDs, and out-of-order event timestamps are enforced. `active` and `trialing` subscriptions authorize inference together with the account daily quota. Metered token invoicing, provider spending limits, and entitlement enforcement for future non-inference features still require explicit implementation.

## SMTP password recovery

```dotenv
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM="MindLarp <no-reply@example.com>"
```

For port `587`, use `SMTP_SECURE=false` with STARTTLS and keep `SMTP_REQUIRE_TLS=true`. Production rejects plaintext SMTP outside a local test relay. Reset links expire after 30 minutes, are stored only as hashes, are consumed atomically, and cannot be reused; concurrent submissions of the same token can succeed only once. A successful reset signs out all existing sessions. Without `SMTP_HOST`, recovery reports its configuration state rather than claiming an email was sent.

## Verification

```bash
npm test
npm run check
npm run check:production
npm audit --omit=dev
```

Set a valid production configuration before `check:production`. The HTTP integration tests start production Next.js on isolated ports with temporary JSON files and explicitly clear database connection variables. They cover public pages, asset alias isolation, runtime sitemap URLs, account setup, registration/login, sessions, CSRF, API key caps, entitlement and quota checks, mock inference and streaming, bounded upstream failures, chat, OAuth redirects and account-link safety, signed/idempotent Stripe webhooks, per-account login limits, concurrent reset-token consumption, and mock SMTP recovery.

To run the real PostgreSQL integration test against local Docker:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres node --test test/postgres.test.js
```

This test creates a uniquely named temporary database, applies migrations, verifies normalized writes and a second-store refresh, checks updates and cleanup, then drops only that test database. Without `TEST_DATABASE_URL`, this dedicated test is skipped.

## Project structure

```text
app/                     Next.js pages, form actions, and API routes
components/              React browser effects and reusable controls
db/migrations/           Versioned PostgreSQL / Supabase-compatible schema
scripts/                 Migration, production validation, and JSON import commands
src/server/database.js   PostgreSQL pool and migration runner
src/postgres-store.js    Transactional normalized PostgreSQL store
src/server/store.js      PostgreSQL selection and JSON fallback
src/store.js             Atomic JSON development store
src/views/               Page templates and layouts
public/                  Hermes-inspired styles, scripts, icons, and manifest
compose.yaml             Local Supabase PostgreSQL container and persistent volume
proxy.js                 Security headers and CSP nonces
test/                    HTTP and real PostgreSQL integration tests
```

## Production checklist

- Run `npm run db:migrate` as a release job, then `npm run check:production` with the real environment. Configure managed backups/PITR and verify a restore.
- Serve through HTTPS and set `NODE_ENV=production` and the correct origin-only `PUBLIC_URL`.
- Keep secrets in a deployment secret manager; never commit `.env` or publish a `.next/standalone` directory built on a workstation.
- Put Node.js behind a reverse proxy with request limits and timeouts. The proxy must terminate public access to direct Node/PostgreSQL ports and overwrite client-supplied `X-Real-IP`/`X-Forwarded-For` before `TRUST_PROXY=true` is enabled.
- Add a shared Redis/PostgreSQL-backed rate limiter before horizontal or high-risk public launch. The built-in limiter is process-local and is only a single-instance safeguard.
- Treat PostgreSQL scaling as a launch gate: the current store refreshes and serializes broad application state. Run a realistic load test and keep one application replica until the data path is refactored into targeted SQL queries.
- Create the owner through `/setup` before opening traffic. Decide whether public registration is allowed and add invitation/workspace authorization controls for a closed launch.
- Configure model aliases, provider-side budgets/quotas, `INFERENCE_DAILY_REQUEST_LIMIT`, and either Stripe subscriptions or an explicit non-billing inference override. Do not present quota accounting as metered invoicing.
- Define chat/usage retention and deletion policies and review the placeholder legal page.
- Review all model, price, status, trusted-company, and social-link content before launch.
- Test OAuth callbacks, SMTP delivery, live-mode Stripe webhooks, provider errors, and Docker/container smoke checks on the public domain before accepting users.
