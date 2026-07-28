import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  checkShortenRateLimit,
  hashClientIdentifier,
} from "./shorten-rate-limit";

function createRequest(): Request {
  return new Request("http://localhost:3000/api/shorten", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
    },
  });
}

const configuredEnvironment = {
  NODE_ENV: "production",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
  RATE_LIMIT_HASH_SECRET: "test-secret",
};

describe("checkShortenRateLimit", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows requests under the limit", async () => {
    const limiter = {
      limit: vi.fn(async () => ({
        success: true,
        reset: Date.now() + 60_000,
      })),
    };

    await expect(
      checkShortenRateLimit(createRequest(), {
        environment: configuredEnvironment,
        limiter,
      }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(limiter.limit).toHaveBeenCalledWith(
      hashClientIdentifier(createRequest(), "test-secret"),
    );
  });

  it("blocks requests over the limit with a safe retry window", async () => {
    const limiter = {
      limit: vi.fn(async () => ({
        success: false,
        reset: 1_700_000_120_000,
      })),
    };

    await expect(
      checkShortenRateLimit(createRequest(), {
        environment: configuredEnvironment,
        limiter,
        now: () => 1_700_000_000_000,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "limited",
      retryAfterSeconds: 120,
    });
  });

  it("allows local development when Upstash configuration is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(
      checkShortenRateLimit(createRequest(), {
        environment: {
          NODE_ENV: "development",
        },
      }),
    ).resolves.toEqual({
      ok: true,
    });
    expect(warn).toHaveBeenCalledWith(
      "Rate limiting disabled in development: Upstash env vars are missing.",
    );
  });

  it("returns a configuration error in production when Upstash configuration is missing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      checkShortenRateLimit(createRequest(), {
        environment: {
          NODE_ENV: "production",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "configuration",
    });
    expect(error).toHaveBeenCalledWith(
      "Rate limiting is not configured for POST /api/shorten.",
    );
  });

  it("hashes client IP information without exposing the raw address", () => {
    const identifier = hashClientIdentifier(createRequest(), "test-secret");

    expect(identifier).toMatch(/^[a-f0-9]{64}$/);
    expect(identifier).not.toContain("203.0.113.10");
  });
});
