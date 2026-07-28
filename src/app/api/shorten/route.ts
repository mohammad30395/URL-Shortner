import { NextResponse } from "next/server";

import { checkShortenRateLimit } from "../../../lib/rate-limit/shorten-rate-limit";
import {
  createShortLink,
  CreateShortLinkError,
} from "../../../lib/short-links/create-short-link";
import { validateShortCode } from "../../../lib/urls/generate-code";
import { validateExpiration } from "../../../lib/urls/validate-expiration";
import { validateUrl } from "../../../lib/urls/validate-url";

type ErrorCode =
  | "ALIAS_CONFLICT"
  | "INTERNAL_ERROR"
  | "INVALID_ALIAS"
  | "INVALID_EXPIRATION"
  | "INVALID_JSON"
  | "INVALID_URL"
  | "RATE_LIMITED";

type ErrorResponseBody = {
  error: {
    code: ErrorCode;
    message: string;
  };
};

type ShortenResponseBody = {
  code: string;
  expiresAt: string | null;
  originalUrl: string;
  shortUrl: string;
};

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
};

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const rateLimit = await checkShortenRateLimit(request);

  if (!rateLimit.ok) {
    if (rateLimit.reason === "limited") {
      return jsonError(
        429,
        "RATE_LIMITED",
        "Too many shortening requests. Please try again later.",
        {
          "Retry-After": rateLimit.retryAfterSeconds.toString(),
        },
      );
    }

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "The short link could not be created. Please try again later.",
    );
  }

  const body = await parseRequestJson(request);

  if (!body.ok) {
    return jsonError(
      400,
      "INVALID_JSON",
      "Please send a valid JSON request body.",
    );
  }

  const submittedUrl = body.value.url;
  const submittedAlias = body.value.alias;
  const submittedExpiresAt = body.value.expiresAt;
  const validation = validateUrl(submittedUrl);

  if (!validation.ok) {
    return jsonError(
      400,
      "INVALID_URL",
      "Please enter a valid HTTP or HTTPS URL.",
    );
  }

  const aliasValidation = validateOptionalAlias(submittedAlias);

  if (!aliasValidation.ok) {
    return jsonError(400, "INVALID_ALIAS", aliasValidation.error);
  }

  const expirationValidation = validateExpiration(submittedExpiresAt);

  if (!expirationValidation.ok) {
    return jsonError(400, "INVALID_EXPIRATION", expirationValidation.error);
  }

  try {
    const shortLink = await createShortLink(validation.url, {
      customCode: aliasValidation.code ?? undefined,
      expiresAt: expirationValidation.expiresAt,
    });
    const shortUrl = new URL(`/${shortLink.code}`, getRequestOrigin(request));

    return NextResponse.json<ShortenResponseBody>(
      {
        code: shortLink.code,
        expiresAt: shortLink.expiresAt,
        originalUrl: shortLink.originalUrl,
        shortUrl: shortUrl.toString(),
      },
      {
        status: 201,
        headers: JSON_HEADERS,
      },
    );
  } catch (error: unknown) {
    if (
      error instanceof CreateShortLinkError &&
      error.code === "ALIAS_CONFLICT"
    ) {
      return jsonError(
        409,
        "ALIAS_CONFLICT",
        "That alias is already in use. Choose another alias.",
      );
    }

    logShortenFailure(error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "The short link could not be created. Please try again later.",
    );
  }
}

function validateOptionalAlias(value: unknown):
  | {
      ok: true;
      code: string | null;
    }
  | {
      ok: false;
      error: string;
    } {
  if (value === undefined || value === null) {
    return {
      ok: true,
      code: null,
    };
  }

  if (typeof value === "string" && value.trim() === "") {
    return {
      ok: true,
      code: null,
    };
  }

  const validation = validateShortCode(value);

  if (!validation.ok) {
    return validation;
  }

  return {
    ok: true,
    code: validation.code,
  };
}

function logShortenFailure(error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const message =
    error instanceof Error
      ? redactDatabaseUrls(error.message)
      : "A non-Error value was thrown.";

  console.error("POST /api/shorten failed.", {
    name,
    message,
  });
}

function redactDatabaseUrls(message: string): string {
  return message.replace(
    /\bpostgres(?:ql)?:\/\/[^\s]+/gi,
    "[REDACTED_DATABASE_URL]",
  );
}

function jsonError(
  status: number,
  code: ErrorCode,
  message: string,
  headers: Record<string, string> = {},
): NextResponse<ErrorResponseBody> {
  return NextResponse.json<ErrorResponseBody>(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        ...JSON_HEADERS,
        ...headers,
      },
    },
  );
}

async function parseRequestJson(request: Request): Promise<
  | {
      ok: true;
      value: {
        alias?: unknown;
        expiresAt?: unknown;
        url?: unknown;
      };
    }
  | {
      ok: false;
    }
> {
  try {
    const value: unknown = await request.json();

    if (!isPlainJsonObject(value)) {
      return {
        ok: false,
      };
    }

    return {
      ok: true,
      value,
    };
  } catch {
    return {
      ok: false,
    };
  }
}

function isPlainJsonObject(
  value: unknown,
): value is { alias?: unknown; expiresAt?: unknown; url?: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequestOrigin(request: Request): string {
  try {
    const origin = new URL(request.url).origin;

    if (origin !== "null") {
      return origin;
    }
  } catch {
    // Route requests are normally absolute; this supports unusual test/proxy contexts.
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
