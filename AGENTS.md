# AGENTS.md

## Architecture

- Use Next.js App Router and TypeScript.
- Use Tailwind CSS for styling.
- Use Next.js Route Handlers for server-side functionality.
- Use Supabase PostgreSQL for persistent URL mappings.
- Do not create a separate Express.js backend.
- Keep all database credentials on the server.
- Never expose the Supabase service-role key to client components.
- Keep client components as small as reasonably possible.

## Code Quality

- Use strict TypeScript.
- Avoid `any`.
- Validate all external input.
- Return consistent JSON error responses.
- Do not expose stack traces, credentials, or internal database errors.
- Prefer small reusable functions.
- Add comments only when they explain non-obvious decisions.

## Verification

Before considering a task complete, run:

- The lint command.
- The test command, when tests exist.
- The production build.

## Scope

The first version must support:

- Submitting a long URL.
- Generating a random short code.
- Saving the mapping in Supabase.
- Displaying the generated short URL.
- Copying the short URL.
- Redirecting visitors from `/{code}` to the original URL.
- Handling invalid and missing links.

The first version must not include:

- User accounts.
- Paid plans.
- An admin dashboard.
- Custom aliases.
- Expiring links.
- QR codes.
