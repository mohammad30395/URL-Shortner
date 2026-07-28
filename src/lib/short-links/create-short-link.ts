import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";
import { generateShortCode } from "../urls/generate-code";

const UNIQUE_VIOLATION_CODE = "23505";
const DEFAULT_MAX_ATTEMPTS = 5;

export type CreateShortLinkResult = {
  code: string;
  originalUrl: string;
};

export type InsertShortLinkResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "collision" | "database";
    };

export type ShortLinkRepository = {
  insertShortLink(input: {
    code: string;
    originalUrl: string;
  }): Promise<InsertShortLinkResult>;
};

export class CreateShortLinkError extends Error {
  constructor(
    public readonly code: "DATABASE_ERROR" | "CODE_COLLISION_LIMIT",
  ) {
    super(code);
  }
}

export async function createShortLink(
  originalUrl: string,
  options: {
    generateCode?: () => string;
    maxAttempts?: number;
    repository?: ShortLinkRepository;
  } = {},
): Promise<CreateShortLinkResult> {
  const nextCode = options.generateCode ?? generateShortCode;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const repository = options.repository ?? createSupabaseShortLinkRepository();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = nextCode();
    const result = await repository.insertShortLink({ code, originalUrl });

    if (result.ok) {
      return {
        code,
        originalUrl,
      };
    }

    if (result.reason === "database") {
      throw new CreateShortLinkError("DATABASE_ERROR");
    }
  }

  throw new CreateShortLinkError("CODE_COLLISION_LIMIT");
}

function createSupabaseShortLinkRepository(): ShortLinkRepository {
  return {
    async insertShortLink({ code, originalUrl }) {
      const { error } = await getSupabaseAdminClient()
        .from("short_links")
        .insert({
          code,
          original_url: originalUrl,
        });

      if (!error) {
        return {
          ok: true,
        };
      }

      if (error.code === UNIQUE_VIOLATION_CODE) {
        return {
          ok: false,
          reason: "collision",
        };
      }

      return {
        ok: false,
        reason: "database",
      };
    },
  };
}
