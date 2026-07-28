# LinkLite URL Shortener

LinkLite is a public URL-shortening app built with:

- Next.js App Router
- Next.js Route Handlers
- Supabase PostgreSQL
- Vercel
- Optional Upstash Redis rate limiting

Users submit a long HTTP or HTTPS URL, the app stores it in Supabase, and visitors are redirected from `/{code}` to the original URL.

## Local Setup

1. Clone the repository:

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

2. Install dependencies:

```bash
npm install
```

3. Create a Supabase project:

- Go to https://supabase.com.
- Create a new project.
- Wait for the project to finish provisioning.

4. Open the Supabase SQL Editor:

- In your Supabase project dashboard, open **SQL Editor**.
- Create a new query.
- Copy the contents of `supabase/schema.sql`.
- Run the SQL.

This creates the `public.short_links` table and the `resolve_short_link` database function used for redirects and click counts.

5. Create your local environment file:

```bash
cp .env.example .env.local
```

6. Fill in Supabase values in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase Dashboard -> Project Settings -> API -> Project URL.
- `SUPABASE_SECRET_KEY`: Supabase Dashboard -> Project Settings -> API Keys -> secret key.

Keep `NEXT_PUBLIC_APP_URL=http://localhost:3000` for local development.

7. Optional: fill in Upstash rate-limit values:

- Create an Upstash Redis database at https://upstash.com.
- Copy the Redis REST URL into `UPSTASH_REDIS_REST_URL`.
- Copy the Redis REST token into `UPSTASH_REDIS_REST_TOKEN`.
- Set `RATE_LIMIT_HASH_SECRET` to a long random secret string.

If these Upstash variables are missing in local development, the app prints one warning and runs without rate limiting.

8. Start the development server:

```bash
npm run dev
```

9. Open the app:

```text
http://localhost:3000
```

10. Create a test short link:

- Paste a valid URL such as `https://example.com/a/long/path`.
- Select **Shorten URL**.
- Copy the generated short URL.

11. Test the redirect:

- Open the generated short URL in your browser.
- It should redirect to the original URL.

## Environment Variables

| Variable | Public or Server-only | Required or Optional | Description |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Required | Your Supabase project URL. It is safe to expose because it does not grant database access by itself. |
| `SUPABASE_SECRET_KEY` | Server-only | Required | Supabase secret key used only by server-side Route Handlers. Never expose this to browser code. |
| `NEXT_PUBLIC_APP_URL` | Public | Required | Base URL for the app. Use `http://localhost:3000` locally and your production domain on Vercel. |
| `UPSTASH_REDIS_REST_URL` | Server-only | Optional locally, recommended in production | Upstash Redis REST URL for rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only | Optional locally, recommended in production | Upstash Redis REST token for rate limiting. |
| `RATE_LIMIT_HASH_SECRET` | Server-only | Optional locally, recommended in production | Secret used to hash client IP information before rate limiting. |

Never commit `.env.local`.

Never expose `SUPABASE_SECRET_KEY`, `UPSTASH_REDIS_REST_TOKEN`, or `RATE_LIMIT_HASH_SECRET` to browser code, logs, screenshots, commits, or public documentation.

## Available Scripts

These commands match `package.json`:

```bash
npm run dev
npm run test
npm run lint
npm run typecheck
npm run build
npm run start
```

- `npm run dev` starts the local development server.
- `npm run test` runs unit tests.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs TypeScript type checking.
- `npm run build` creates a production build.
- `npm run start` starts the production server after a build.

## Deploy To Vercel

1. Push the project to GitHub:

```bash
git add .
git commit -m "Prepare URL shortener"
git push
```

Only run these commands when you are ready to commit your own changes.

2. Import the GitHub repository into Vercel:

- Go to https://vercel.com.
- Select **Add New Project**.
- Import your GitHub repository.
- Keep the default Next.js settings.

3. Add environment variables in Vercel:

- Open the Vercel project.
- Go to **Settings** -> **Environment Variables**.
- Add every required variable from the table above.
- Add Upstash variables if you want production rate limiting.

4. Set the production app URL:

- After the first deployment, copy your production Vercel domain.
- Set `NEXT_PUBLIC_APP_URL` to that domain, for example:

```text
https://your-project.vercel.app
```

5. Redeploy after changing environment variables:

- Vercel environment changes do not affect an already-built deployment.
- Go to **Deployments** and redeploy the latest deployment, or push a new commit.

6. Test production:

- Open the production domain.
- Create a short link.
- Open the generated short URL.
- Confirm it redirects on the production domain, not `localhost`.

## Supabase Through Vercel Marketplace

As an alternative to manually copying Supabase configuration values:

1. In Vercel, open your project.
2. Go to **Integrations** or **Marketplace**.
3. Connect Supabase.
4. Link or create a Supabase project.
5. Review the environment variables Vercel adds.
6. Confirm the app still has the exact variables listed in this README.
7. Run `supabase/schema.sql` in the connected Supabase project.
8. Redeploy the Vercel project.

Even when using the Marketplace integration, keep the Supabase secret key server-only.

## Troubleshooting

### "Invalid API key"

- Check `SUPABASE_SECRET_KEY`.
- Make sure you copied the secret key from the same Supabase project as `NEXT_PUBLIC_SUPABASE_URL`.
- Do not use the anon or publishable key in `SUPABASE_SECRET_KEY`.
- Redeploy Vercel after changing the value.

### Missing environment variables

- Confirm `.env.local` exists locally.
- Confirm Vercel has the variables in **Settings** -> **Environment Variables**.
- Make sure variable names match exactly.
- Restart `npm run dev` after editing `.env.local`.

### Database table not found

- Open Supabase SQL Editor.
- Run the contents of `supabase/schema.sql`.
- Confirm the `public.short_links` table exists in Supabase Table Editor.
- Confirm you are using the correct Supabase project.

### Short URL returns 404

- The short code may not exist.
- The database schema may not have been run.
- The stored original URL may be invalid.
- Supabase environment variables may point to the wrong project.
- Check that `public.resolve_short_link` exists in Supabase.

### Local URLs appear in production

- Set `NEXT_PUBLIC_APP_URL` in Vercel to your production domain.
- Redeploy after changing the variable.
- Create a new short link after redeploying.

### Environment changes are not taking effect

- Restart the local development server after editing `.env.local`.
- Redeploy Vercel after editing Vercel environment variables.
- Confirm the variable is added to the correct Vercel environment, such as Production.

### Rate-limiting configuration errors

- Local development can run without Upstash variables.
- Production should include `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_HASH_SECRET`.
- Confirm the Upstash REST token belongs to the same Redis database as the REST URL.
- Use a long random value for `RATE_LIMIT_HASH_SECRET`.

### Vercel build failures

Run the same checks locally:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

If local checks pass but Vercel fails:

- Confirm all required environment variables are set in Vercel.
- Confirm the build command is `npm run build`.
- Confirm dependencies were committed through `package-lock.json`.

## Security Warning

Public URL shorteners can be abused for spam, phishing, malware distribution, and unwanted redirects.

Before offering this service broadly:

- Never commit `.env.local`.
- Never expose the Supabase secret key.
- Keep Redis credentials and hashing secrets server-only.
- Use rate limiting.
- Monitor abuse reports and suspicious traffic.
- Provide a reporting mechanism so people can report harmful short links.
- Consider additional abuse controls before public launch.
