import { NextResponse } from "next/server";

import { getShortLink } from "../../lib/short-links/get-short-link";
import { validateShortCode } from "../../lib/urls/generate-code";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { code } = await context.params;

  if (!validateShortCode(code).ok) {
    return notFoundResponse();
  }

  let result: Awaited<ReturnType<typeof getShortLink>>;

  try {
    result = await getShortLink(code);
  } catch {
    return notFoundResponse();
  }

  if (!result.ok || createsRedirectLoop(request, result.originalUrl)) {
    return notFoundResponse();
  }

  const response = NextResponse.redirect(result.originalUrl, {
    status: 307,
  });

  for (const [header, value] of Object.entries(NO_CACHE_HEADERS)) {
    response.headers.set(header, value);
  }

  return response;
}

function notFoundResponse(): Response {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Short link unavailable</title>
  </head>
  <body>
    <main>
      <h1>Short link unavailable</h1>
      <p>This short link is invalid or no longer available.</p>
      <p><a href="/">Return to the homepage</a></p>
    </main>
  </body>
</html>`,
    {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        ...NO_CACHE_HEADERS,
      },
    },
  );
}

function createsRedirectLoop(request: Request, destination: string): boolean {
  try {
    const requestUrl = new URL(request.url);
    const destinationUrl = new URL(destination);

    return (
      requestUrl.origin === destinationUrl.origin &&
      requestUrl.pathname === destinationUrl.pathname
    );
  } catch {
    return true;
  }
}
