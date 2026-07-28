# LinkLite URL Shortener

LinkLite is a small public URL-shortening app. It lets someone submit a long
HTTP or HTTPS URL, stores the mapping in Supabase PostgreSQL, returns a short
URL, and redirects visitors from the short URL to the saved destination.

This project uses:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Next.js Route Handlers
- Supabase PostgreSQL
- Drizzle ORM for the PostgreSQL schema and migrations
- Vercel for deployment
- Optional Upstash Redis rate limiting

The browser never talks directly to the database. Database credentials are used
only by server-side code.

## Local Setup

### 1. Clone The Repository

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create A Supabase Project

1. Go to [Supabase](https://supabase.com).
2. Create a new project.
3. Save the database password somewhere private.
4. Wait for the project to finish provisioning.

### 4. Run The Database Schema

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Create a new query.
4. Paste the full contents of `supabase/schema.sql`.
5. Run the query.

This creates the `public.short_links` table, constraints, indexes, and Row Level
Security. The SQL is idempotent and does not delete existing short links.

### 5. Create Your Local Environment File

```bash
cp .env.example .env.local
```

Never commit `.env.local`.

### 6. Add Supabase Values

This app uses direct PostgreSQL access from server-side code, so the important
Supabase value is the PostgreSQL connection string.

In Supabase:

1. Open your project.
2. Select **Connect**.
3. Choose the **Transaction pooler** connection string.
4. Copy the pooled URI into `DATABASE_URL` in `.env.local`.
5. Replace the password placeholder with your database password.
6. If your password contains special characters, percent-encode them.
7. Make sure SSL is enabled. If the URI has no query string, append
   `?sslmode=require`.

For Vercel and other serverless platforms, use Supabase's transaction-pooler
connection, usually on port `6543`. Do not use an IPv6-only direct connection
string for Vercel.

Keep this value for local development:

```text
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 7. Optional Upstash Rate Limiting

Rate limiting is optional during local development. When the Upstash variables
are missing locally, the app prints one concise development warning and
continues without rate limiting.

To enable local rate limiting:

1. Go to [Upstash](https://upstash.com).
2. Create a Redis database.
3. Copy the Redis REST URL into `UPSTASH_REDIS_REST_URL`.
4. Copy the Redis REST token into `UPSTASH_REDIS_REST_TOKEN`.
5. Generate a separate hashing secret:

```bash
openssl rand -base64 32
```

6. Put that generated value in `RATE_LIMIT_HASH_SECRET`.

### 8. Start The Development Server

```bash
npm run dev
```

Open `http://localhost:3000`.

### 9. Create A Test Short Link

1. Paste a valid `http://` or `https://` URL into the form.
2. Select **Shorten URL**.
3. Confirm the app displays a complete short URL.

### 10. Test The Redirect

Open the generated short URL. It should temporarily redirect to the original
URL with a `307` redirect.

## Environment Variables

| Variable                   | Public Or Server-only | Required Or Optional                     | Used For                                                                         |
| -------------------------- | --------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Server-only           | Required                                 | Supabase PostgreSQL connection string. Use the transaction-pooler URL in Vercel. |
| `NEXT_PUBLIC_APP_URL`      | Public                | Required                                 | Fallback public app origin for generated short URLs.                             |
| `UPSTASH_REDIS_REST_URL`   | Server-only           | Optional locally, required in production | Upstash Redis REST endpoint for rate limiting `POST /api/shorten`.               |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only           | Optional locally, required in production | Upstash Redis REST credential.                                                   |
| `RATE_LIMIT_HASH_SECRET`   | Server-only           | Optional locally, required in production | Secret used to hash client IP signals before rate limiting.                      |

Security rules:

- Never commit `.env.local`.
- Never expose `DATABASE_URL` to browser code.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code if you add that
  legacy key for another workflow.
- Never expose Redis credentials or `RATE_LIMIT_HASH_SECRET` to browser code.
- Only variables prefixed with `NEXT_PUBLIC_` are safe to read in client
  components.

This application currently uses `DATABASE_URL` for database access. It does not
need `SUPABASE_SERVICE_ROLE_KEY` for the URL-shortening routes.

## Available Commands

These commands match `package.json`:

```bash
npm run dev
npm run format
npm run format:check
npm run test
npm run lint
npm run typecheck
npm run build
npm run start
npm run db:generate
npm run db:migrate
```

Use `npm run db:migrate` only after `DATABASE_URL` is present in `.env.local`
and you have reviewed the pending SQL migration.

## Vercel Deployment

### 1. Push To GitHub

Commit the application code and push it to GitHub. Confirm `.env.local` is not
committed.

### 2. Import The Project Into Vercel

1. Open [Vercel](https://vercel.com).
2. Select **Add New Project**.
3. Import the GitHub repository.
4. Keep the detected Next.js framework settings.

### 3. Add Environment Variables In Vercel

Open the Vercel project, then go to **Settings** -> **Environment Variables**.
Add these variables for Production and Preview:

```text
DATABASE_URL
NEXT_PUBLIC_APP_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RATE_LIMIT_HASH_SECRET
```

Use the Supabase transaction-pooler connection string for `DATABASE_URL`.
Use the Upstash REST URL and REST token from the same Upstash Redis database.
Generate `RATE_LIMIT_HASH_SECRET` yourself with:

```bash
openssl rand -base64 32
```

### 4. Deploy

Deploy the project from Vercel.

### 5. Set The Production App URL

After Vercel gives you the production domain, set:

```text
NEXT_PUBLIC_APP_URL=https://your-production-domain.vercel.app
```

Use your real production domain. Do not include a trailing slash.

### 6. Redeploy After Environment Changes

Vercel deployments do not automatically receive environment-variable changes.
After adding or editing variables, redeploy the project.

### 7. Test Production

On the production domain:

1. Create a short link.
2. Confirm the returned short URL uses the production domain.
3. Open the short URL.
4. Confirm it redirects to the original URL.

### Supabase Through Vercel Marketplace

You can connect Supabase through the Vercel Marketplace instead of manually
copying every Supabase value:

1. Open the Vercel project.
2. Go to **Integrations** or **Marketplace**.
3. Connect Supabase.
4. Choose the existing Supabase project.
5. Review the environment variables Vercel adds.
6. If the integration does not create `DATABASE_URL`, add `DATABASE_URL`
   manually using the pooled PostgreSQL URI from Supabase **Connect**.
7. Add `NEXT_PUBLIC_APP_URL` and the Upstash variables.
8. Redeploy and test creation plus redirection.

## Troubleshooting

### Invalid API Key

This project does not use Supabase's browser API key for shortening links. If
you see an invalid API key error, confirm no old Supabase client code is being
used for this flow and verify that the deployed code matches the current
repository.

### Missing Environment Variables

- Locally, confirm `.env.local` exists in the repository root.
- In Vercel, confirm each variable is added to the correct environment.
- Restart `npm run dev` after local changes.
- Redeploy after Vercel changes.

### Database Table Not Found

- Open Supabase SQL Editor.
- Run `supabase/schema.sql`.
- Confirm `public.short_links` exists in Supabase Table Editor.
- Confirm `DATABASE_URL` points to the same Supabase project.

### Short URL Returns 404

- The short code may not exist.
- The link may have been created in a different database.
- `DATABASE_URL` may point to the wrong Supabase project.
- The original URL must be a previously validated HTTP or HTTPS URL.

### Local URLs Appear In Production

- Set `NEXT_PUBLIC_APP_URL` to the production HTTPS origin.
- Redeploy after changing it.
- Create a new short link after the redeploy.

### Environment Changes Do Not Take Effect

- Stop and restart the local development server after editing `.env.local`.
- Redeploy Vercel after editing project environment variables.
- Confirm variables are configured for the environment you are testing:
  Production, Preview, or Development.

### Rate-Limiting Configuration Errors

Production requires all three rate-limit variables:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RATE_LIMIT_HASH_SECRET
```

Confirm the REST URL and token belong to the same Upstash Redis database. Do
not reuse the Redis token as the hashing secret.

### Vercel Build Failures

Run the same checks locally:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Also confirm `package-lock.json` is committed and the Vercel project is using a
supported Node.js version for this Next.js release.

## Security Warning

Never commit `.env.local`. Never expose the Supabase service-role key,
database connection string, Redis credentials, or hashing secrets to browser
code.

Public URL shorteners can be abused for spam, phishing, malware, and unwanted
redirects. Rate limiting and abuse monitoring are recommended before public
use. The owner should provide a reporting mechanism before offering the service
broadly.
