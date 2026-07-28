import "server-only";

import {
  insertShortLinkRecord,
  type InsertShortLinkRecordResult,
} from "../../db/queries";
import { generateShortCode } from "../urls/generate-code";

const DEFAULT_MAX_ATTEMPTS = 5;

export type CreateShortLinkResult = {
  code: string;
  originalUrl: string;
};

export type ShortLinkRepository = {
  insertShortLink(input: {
    code: string;
    originalUrl: string;
  }): Promise<InsertShortLinkRecordResult>;
};

export class CreateShortLinkError extends Error {
  constructor(public readonly code: "DATABASE_ERROR" | "CODE_COLLISION_LIMIT") {
    super(code);
    this.name = "CreateShortLinkError";
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
  const repository = options.repository ?? postgresShortLinkRepository;

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

const postgresShortLinkRepository: ShortLinkRepository = {
  insertShortLink: insertShortLinkRecord,
};
