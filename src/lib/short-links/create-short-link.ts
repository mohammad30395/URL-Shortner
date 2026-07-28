import "server-only";

import {
  insertShortLinkRecord,
  type InsertShortLinkRecordResult,
} from "../../db/queries";
import { generateShortCode } from "../urls/generate-code";

const DEFAULT_MAX_ATTEMPTS = 5;

export type CreateShortLinkResult = {
  code: string;
  expiresAt: string | null;
  originalUrl: string;
};

export type ShortLinkRepository = {
  insertShortLink(input: {
    code: string;
    expiresAt: Date | null;
    originalUrl: string;
  }): Promise<InsertShortLinkRecordResult>;
};

export class CreateShortLinkError extends Error {
  constructor(
    public readonly code:
      "ALIAS_CONFLICT" | "DATABASE_ERROR" | "CODE_COLLISION_LIMIT",
  ) {
    super(code);
    this.name = "CreateShortLinkError";
  }
}

export async function createShortLink(
  originalUrl: string,
  options: {
    customCode?: string;
    expiresAt?: Date | null;
    generateCode?: () => string;
    maxAttempts?: number;
    repository?: ShortLinkRepository;
  } = {},
): Promise<CreateShortLinkResult> {
  const nextCode = options.generateCode ?? generateShortCode;
  const expiresAt = options.expiresAt ?? null;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const repository = options.repository ?? postgresShortLinkRepository;

  if (options.customCode) {
    const result = await repository.insertShortLink({
      code: options.customCode,
      expiresAt,
      originalUrl,
    });

    if (result.ok) {
      return {
        code: options.customCode,
        expiresAt: expiresAt?.toISOString() ?? null,
        originalUrl,
      };
    }

    if (result.reason === "collision") {
      throw new CreateShortLinkError("ALIAS_CONFLICT");
    }

    throw new CreateShortLinkError("DATABASE_ERROR");
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = nextCode();
    const result = await repository.insertShortLink({
      code,
      expiresAt,
      originalUrl,
    });

    if (result.ok) {
      return {
        code,
        expiresAt: expiresAt?.toISOString() ?? null,
        originalUrl,
      };
    }

    if (result.reason === "database") {
      throw new CreateShortLinkError("DATABASE_ERROR");
    }
  }

  throw new CreateShortLinkError("CODE_COLLISION_LIMIT");
}

const postgresShortLinkRepository: ShortLinkRepository = {
  insertShortLink: insertShortLinkRecord,
};
