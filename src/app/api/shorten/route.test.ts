import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/rate-limit/shorten-rate-limit", () => ({
  checkShortenRateLimit: vi.fn(),
}));

vi.mock("../../../lib/short-links/create-short-link", () => ({
  CreateShortLinkError: class CreateShortLinkError extends Error {
    constructor(
      public readonly code:
        "ALIAS_CONFLICT" | "DATABASE_ERROR" | "CODE_COLLISION_LIMIT",
    ) {
      super(code);
      this.name = "CreateShortLinkError";
    }
  },
  createShortLink: vi.fn(),
}));

import { checkShortenRateLimit } from "../../../lib/rate-limit/shorten-rate-limit";
import {
  createShortLink,
  CreateShortLinkError,
} from "../../../lib/short-links/create-short-link";
import { POST } from "./route";

const mockedCheckShortenRateLimit = vi.mocked(checkShortenRateLimit);
const mockedCreateShortLink = vi.mocked(createShortLink);

function createJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/shorten", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("POST /api/shorten", () => {
  beforeEach(() => {
    mockedCheckShortenRateLimit.mockReset();
    mockedCheckShortenRateLimit.mockResolvedValue({
      ok: true,
    });
    mockedCreateShortLink.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a short link for valid requests", async () => {
    mockedCreateShortLink.mockResolvedValue({
      code: "Ab3xP9q",
      expiresAt: null,
      originalUrl: "https://example.com/a/long/path",
    });

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/a/long/path",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      code: "Ab3xP9q",
      expiresAt: null,
      originalUrl: "https://example.com/a/long/path",
      shortUrl: "http://localhost:3000/Ab3xP9q",
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mockedCreateShortLink).toHaveBeenCalledWith(
      "https://example.com/a/long/path",
      {
        customCode: undefined,
        expiresAt: null,
      },
    );
  });

  it("creates a short link with a valid custom alias", async () => {
    mockedCreateShortLink.mockResolvedValue({
      code: "Launch_2026",
      expiresAt: null,
      originalUrl: "https://example.com/a/long/path",
    });

    const response = await POST(
      createJsonRequest({
        alias: " Launch_2026 ",
        url: "https://example.com/a/long/path",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      code: "Launch_2026",
      expiresAt: null,
      originalUrl: "https://example.com/a/long/path",
      shortUrl: "http://localhost:3000/Launch_2026",
    });
    expect(response.status).toBe(201);
    expect(mockedCreateShortLink).toHaveBeenCalledWith(
      "https://example.com/a/long/path",
      {
        customCode: "Launch_2026",
        expiresAt: null,
      },
    );
  });

  it("creates a short link with a future expiration date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T12:00:00.000Z"));
    mockedCreateShortLink.mockResolvedValue({
      code: "Ab3xP9q",
      expiresAt: "2026-07-29T23:59:59.999Z",
      originalUrl: "https://example.com/a/long/path",
    });

    const response = await POST(
      createJsonRequest({
        expiresAt: "2026-07-29",
        url: "https://example.com/a/long/path",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      code: "Ab3xP9q",
      expiresAt: "2026-07-29T23:59:59.999Z",
      originalUrl: "https://example.com/a/long/path",
      shortUrl: "http://localhost:3000/Ab3xP9q",
    });
    expect(response.status).toBe(201);
    expect(mockedCreateShortLink).toHaveBeenCalledWith(
      "https://example.com/a/long/path",
      {
        customCode: undefined,
        expiresAt: new Date("2026-07-29T23:59:59.999Z"),
      },
    );
  });

  it("returns 400 for invalid URLs", async () => {
    const response = await POST(
      createJsonRequest({
        url: "ftp://example.com/file.txt",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_URL",
        message: "Please enter a valid HTTP or HTTPS URL.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid aliases", async () => {
    const response = await POST(
      createJsonRequest({
        alias: "bad.alias",
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_ALIAS",
        message:
          "Alias can contain only letters, numbers, hyphens, and underscores.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 400 for reserved aliases", async () => {
    const response = await POST(
      createJsonRequest({
        alias: "Dashboard",
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_ALIAS",
        message: "That alias is reserved. Choose another alias.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 400 for expiration dates in the past", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T12:00:00.000Z"));

    const response = await POST(
      createJsonRequest({
        expiresAt: "2026-07-27",
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_EXPIRATION",
        message: "Expiration date must be in the future.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed expiration dates", async () => {
    const response = await POST(
      createJsonRequest({
        expiresAt: "not-a-date",
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_EXPIRATION",
        message: "Enter a valid expiration date.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 409 when a custom alias already exists", async () => {
    mockedCreateShortLink.mockRejectedValue(
      new CreateShortLinkError("ALIAS_CONFLICT"),
    );

    const response = await POST(
      createJsonRequest({
        alias: "Taken_2026",
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "ALIAS_CONFLICT",
        message: "That alias is already in use. Choose another alias.",
      },
    });
    expect(response.status).toBe(409);
  });

  it("returns 400 for missing URL fields", async () => {
    const response = await POST(createJsonRequest({}));

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_URL",
        message: "Please enter a valid HTTP or HTTPS URL.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed request bodies", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Please send a valid JSON request body.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when database insertion fails", async () => {
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockedCreateShortLink.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The short link could not be created. Please try again later.",
      },
    });
    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith("POST /api/shorten failed.", {
      name: "Error",
      message: "database unavailable",
    });
  });

  it("redacts database URLs from server-side error logs", async () => {
    const errorLog = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockedCreateShortLink.mockRejectedValue(
      new Error(
        "Failed to connect to postgresql://user:password@host/database",
      ),
    );

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/",
      }),
    );

    expect(response.status).toBe(500);
    expect(errorLog).toHaveBeenCalledWith("POST /api/shorten failed.", {
      name: "Error",
      message: "Failed to connect to [REDACTED_DATABASE_URL]",
    });
  });

  it("returns 429 when rate limited", async () => {
    mockedCheckShortenRateLimit.mockResolvedValue({
      ok: false,
      reason: "limited",
      retryAfterSeconds: 120,
    });

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many shortening requests. Please try again later.",
      },
    });
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when production rate-limit configuration is missing", async () => {
    mockedCheckShortenRateLimit.mockResolvedValue({
      ok: false,
      reason: "configuration",
    });

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The short link could not be created. Please try again later.",
      },
    });
    expect(response.status).toBe(500);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when the rate limiter is unavailable", async () => {
    mockedCheckShortenRateLimit.mockResolvedValue({
      ok: false,
      reason: "unavailable",
    });

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The short link could not be created. Please try again later.",
      },
    });
    expect(response.status).toBe(500);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });
});
