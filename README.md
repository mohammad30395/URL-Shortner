# LinkLite URL Shortener

LinkLite is a public URL shortener built with Next.js App Router, TypeScript,
Tailwind CSS, Next.js Route Handlers, Drizzle ORM, Supabase PostgreSQL, and
Vercel. Upstash Redis provides optional rate limiting during local development
and is required for the protected production shortening endpoint.

The browser never connects to PostgreSQL. Server-side Route Handlers use a
pooled PostgreSQL connection to save links, resolve redirects, and update click
counts atomically.

## Local Setup

1. Clone the repository and enter it:

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

2. Install the dependencies:

```bash
npm install
```

3. Create a project at [Supabase](https://supabase.com), choose a database
password, and wait for the project to finish provisioning.

4. In the Supabase dashboard, open **SQL Editor**, create a new query, paste the
contents of `supabase/schema.sql`, and run it. This creates
`public.short_links`, its constraints and indexes, and enables Row Level
Security. The SQL is idempotent and does not delete existing rows.

5. Create the local environment file:

```bash
cp .env.example .env.local
```

6. In the Supabase project, select **Connect**, choose **Transaction pooler**,
and copy its URI into `DATABASE_URL` in `.env.local`. Replace the password
placeholder with the database password you chose. Percent-encode special
characters in the password. For Vercel and other serverless platforms, use the
transaction-pooler address, normally on port `6543`, instead of the direct
IPv6-only database address.

Use SSL for remote database traffic. If the copied URI does not already specify
SSL, append `?sslmode=require` (or `&sslmode=require` when it already has query
parameters). Do not disable certificate validation globally.

7. Keep this value for local short URLs:

```text
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

8. Optional for local development: create a Redis database in
[Upstash](https://upstash.com), then add its REST URL and REST token. Generate a
separate hashing secret:

```bash
openssl rand -base64 32
```

Store that generated value in `RATE_LIMIT_HASH_SECRET`. When all three Upstash
variables are absent locally, the app prints one concise warning and continues
without rate limiting. Production requests fail safely unless all three are
configured.

9. Start the development server:

```bash
npm run dev
```

10. Open `http://localhost:3000`, submit a valid HTTP or HTTPS URL, and select
**Shorten URL**. Open the generated short URL to verify its `307` redirect.

## Environment Variables

| Variable | Visibility | Requirement | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Server-only | Required | Pooled PostgreSQL connection string. Use Supabase Transaction pooler for Vercel. |
| `NEXT_PUBLIC_APP_URL` | Public | Required | Public application origin used as the fallback when generating short URLs. |
| `UPSTASH_REDIS_REST_URL` | Server-only | Optional locally, required in production | Upstash Redis REST endpoint for shortening rate limits. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only | Optional locally, required in production | Upstash Redis REST credential. |
| `RATE_LIMIT_HASH_SECRET` | Server-only | Optional locally, required in production | HMAC secret used to hash client IP signals before rate limiting. |

`DATABASE_URL`, Redis credentials, and `RATE_LIMIT_HASH_SECRET` must never be
committed, logged, returned by an API, or exposed through a `NEXT_PUBLIC_`
variable. Never commit `.env.local`.

The app no longer uses `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SECRET_KEY` for
database access. Adding `DATABASE_URL` works because the application database
code has been migrated from Supabase's HTTP Data API to direct PostgreSQL
queries.

## Database Schema And Migrations

The database artifacts are:

- `src/db/schema.ts`: typed Drizzle schema used by application queries.
- `drizzle/0000_direct_postgresql.sql`: Drizzle migration for an existing or
  new PostgreSQL database.
- `supabase/schema.sql`: plain SQL schema for the Supabase SQL Editor.

The migration uses `CREATE TABLE IF NOT EXISTS` and
`CREATE INDEX IF NOT EXISTS`, enables RLS, and never drops or recreates the
table. Existing `short_links` records are preserved.

For a beginner-friendly Supabase setup, apply `supabase/schema.sql` in SQL
Editor. For a Drizzle-managed environment, place `DATABASE_URL` in `.env.local`
and run:

```bash
npm run db:migrate
```

Generate a reviewed migration after an intentional Drizzle schema change:

```bash
npm run db:generate
```

Do not run destructive test migrations against production. Before a production
migration, create a Supabase backup or confirm Point-in-Time Recovery is
available, review the SQL, and test it against a separate database. This project
does not include an automatic destructive down migration. To roll back the
application safely, redeploy the previous application version and retain the
compatible `short_links` table and its data. Restore a database backup only
when a reviewed forward migration cannot repair the issue.

To verify connectivity without exposing credentials, start the app and create a
test link. A `201` response from `POST /api/shorten` followed by a working `307`
redirect confirms insertion, lookup, and update access.

## Available Scripts

These commands match `package.json`:

```bash
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
npm run start
npm run db:generate
npm run db:migrate
```

## Deploy To Vercel

1. Push the repository to GitHub. Confirm `.env.local` is not staged or
committed.

2. In [Vercel](https://vercel.com), select **Add New Project**, import the
GitHub repository, and keep the detected Next.js settings.

3. In **Project Settings** -> **Environment Variables**, add:

```text
DATABASE_URL
NEXT_PUBLIC_APP_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RATE_LIMIT_HASH_SECRET
```

Use the Supabase Transaction pooler URI for `DATABASE_URL`. Set each variable
for every Vercel environment that should work, such as Production and Preview.

4. Deploy once to obtain the production domain. Set `NEXT_PUBLIC_APP_URL` to
that complete HTTPS origin, for example `https://your-project.vercel.app`.

5. Redeploy after adding or changing environment variables. Existing Vercel
deployments do not receive later environment changes automatically.

6. On the production domain, create a new short link and open it. Confirm the
short URL uses the production origin and redirects to the saved destination.

### Supabase Through Vercel Marketplace

You can connect Supabase from Vercel's Marketplace instead of manually copying
configuration:

1. Open the Vercel project and go to **Integrations** or **Marketplace**.
2. Connect Supabase and select the existing Supabase project.
3. Review the variables added by the integration.
4. If the integration uses a provider-specific variable name, create
`DATABASE_URL` in Vercel with the pooled PostgreSQL URI from the integration or
the Supabase **Connect** panel.
5. Add the app URL and Upstash variables listed above.
6. Redeploy and test creation and redirection.

Do not expose the database connection string to client components even when an
integration manages it.

## Troubleshooting

### Database authentication failed

- Confirm `DATABASE_URL` uses the correct database password.
- Percent-encode special characters in the password.
- Copy the URI again from the same Supabase project's **Connect** panel.
- Use the Transaction pooler URI for Vercel.

### Missing environment variables

- Confirm `.env.local` contains `DATABASE_URL` locally.
- Confirm Vercel has every required variable in the target environment.
- Restart `npm run dev` or redeploy Vercel after changes.
- Never paste variable values into logs or support messages.

### Database table not found

- Open Supabase SQL Editor and run `supabase/schema.sql`.
- Confirm `public.short_links` exists in Table Editor.
- Confirm `DATABASE_URL` points to that same project.

### Short URL returns 404

- The short code may not exist.
- The stored destination may have failed the HTTP/HTTPS safety check.
- The database connection may be unavailable.
- Verify link creation returned `201` before testing its redirect.

### Local URLs appear in production

- Set `NEXT_PUBLIC_APP_URL` to the production HTTPS origin.
- Redeploy after changing it.
- Create a new short link after deployment.

### Environment changes are not taking effect

- Restart the local development server after editing `.env.local`.
- Redeploy after editing Vercel variables.
- Confirm variables are enabled for the correct Vercel environment.

### Rate-limiting configuration errors

- Production requires `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_HASH_SECRET`.
- Confirm the REST URL and token belong to the same Upstash database.
- Generate the hash secret independently; do not reuse the Redis token.

### Vercel build failures

Run the same checks locally:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Confirm `package-lock.json` is committed and the project uses a supported Node.js
version. A successful build does not prove database connectivity, so test a
creation request after deployment.

## Security Warning

Public URL shorteners can be abused for spam, phishing, malware distribution,
and unwanted redirects. Keep rate limiting enabled in production, monitor
failures and suspicious traffic, and provide an abuse-reporting mechanism
before offering the service broadly. Additional destination reputation checks
and operational abuse controls are appropriate for a large public launch.
