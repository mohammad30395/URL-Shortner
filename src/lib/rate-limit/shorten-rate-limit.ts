import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHmac } from "node:crypto";

const RATE_LIMIT_MAX_REQUESTS = 10;
const RATE_LIMIT_WINDOW = "10 m";
const RATE_LIMIT_PREFIX = "shorten";
const MAX_RETRY_AFTER_SECONDS = 600;

type RateLimiter = {
  limit(identifier: string): Promise<{
    success: boolean;
    reset: number;
  }>;
};

type RateLimitEnvironment = {
  NODE_ENV?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  RATE_LIMIT_HASH_SECRET?: string;
};

export type ShortenRateLimitResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "limited";
      retryAfterSeconds: number;
    }
  | {
      ok: false;
      reason: "configuration" | "unavailable";
    };

let cachedLimiter: RateLimiter | undefined;
let warnedAboutMissingDevelopmentConfig = false;

export async function checkShortenRateLimit(
  request: Request,
  options: {
    environment?: RateLimitEnvironment;
    limiter?: RateLimiter;
    now?: () => number;
  } = {},
): Promise<ShortenRateLimitResult> {
  const environment = options.environment ?? process.env;
  const config = readRateLimitConfig(environment);

  if (!config.ok) {
    if (environment.NODE_ENV === "production") {
      console.error("Rate limiting is not configured for POST /api/shorten.");
      return {
        ok: false,
        reason: "configuration",
      };
    }

    if (!warnedAboutMissingDevelopmentConfig) {
      console.warn(
        "Rate limiting disabled in development: Upstash env vars are missing.",
      );
      warnedAboutMissingDevelopmentConfig = true;
    }

    return {
      ok: true,
    };
  }

  const limiter = options.limiter ?? getRateLimiter(config.url, config.token);
  const identifier = hashClientIdentifier(request, config.hashSecret);
  let result: Awaited<ReturnType<RateLimiter["limit"]>>;

  try {
    result = await limiter.limit(identifier);
  } catch {
    console.error(
      "Rate limiting is temporarily unavailable for POST /api/shorten.",
    );
    return {
      ok: false,
      reason: "unavailable",
    };
  }

  if (result.success) {
    return {
      ok: true,
    };
  }

  return {
    ok: false,
    reason: "limited",
    retryAfterSeconds: getRetryAfterSeconds(result.reset, options.now),
  };
}

export function hashClientIdentifier(
  request: Request,
  hashSecret: string,
): string {
  return createHmac("sha256", hashSecret)
    .update(getClientIpSignal(request))
    .digest("hex");
}

function readRateLimitConfig(environment: RateLimitEnvironment):
  | {
      ok: true;
      url: string;
      token: string;
      hashSecret: string;
    }
  | {
      ok: false;
    } {
  const url = environment.UPSTASH_REDIS_REST_URL;
  const token = environment.UPSTASH_REDIS_REST_TOKEN;
  const hashSecret = environment.RATE_LIMIT_HASH_SECRET;

  if (!url || !token || !hashSecret) {
    return {
      ok: false,
    };
  }

  return {
    ok: true,
    url,
    token,
    hashSecret,
  };
}

function getRateLimiter(url: string, token: string): RateLimiter {
  if (!cachedLimiter) {
    cachedLimiter = new Ratelimit({
      redis: new Redis({
        url,
        token,
      }),
      limiter: Ratelimit.slidingWindow(
        RATE_LIMIT_MAX_REQUESTS,
        RATE_LIMIT_WINDOW,
      ),
      prefix: RATE_LIMIT_PREFIX,
      analytics: false,
      ephemeralCache: false,
    });
  }

  return cachedLimiter;
}

function getClientIpSignal(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstForwardedIp = forwardedFor.split(",").at(0)?.trim();

    if (firstForwardedIp) {
      return firstForwardedIp;
    }
  }

  for (const header of [
    "cf-connecting-ip",
    "x-real-ip",
    "true-client-ip",
    "fly-client-ip",
  ]) {
    const value = request.headers.get(header)?.trim();

    if (value) {
      return value;
    }
  }

  return "unknown-client";
}

function getRetryAfterSeconds(reset: number, now = Date.now): number {
  const seconds = Math.ceil((reset - now()) / 1000);

  if (!Number.isFinite(seconds)) {
    return MAX_RETRY_AFTER_SECONDS;
  }

  return Math.min(Math.max(seconds, 1), MAX_RETRY_AFTER_SECONDS);
}
