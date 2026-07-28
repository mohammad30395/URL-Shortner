import "server-only";

import { eq, sql } from "drizzle-orm";

import { DatabaseConfigurationError, getDatabase, type Database } from ".";
import { shortLinks } from "./schema";

const UNIQUE_VIOLATION_CODE = "23505";

type InsertShortLinkInput = {
  code: string;
  expiresAt: Date | null;
  originalUrl: string;
};

export type InsertShortLinkRecordResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "collision" | "database";
    };

export type ResolveShortLinkRecordResult =
  | {
      ok: true;
      status: "active";
      originalUrl: string;
    }
  | {
      ok: true;
      status: "expired" | "missing";
    }
  | {
      ok: false;
    };

type InsertExecutor = (input: InsertShortLinkInput) => Promise<void>;
type ResolveActiveExecutor = (code: string) => Promise<string | null>;
type FindInactiveStatusExecutor = (
  code: string,
) => Promise<"expired" | "missing">;

export async function insertShortLinkRecord(
  input: InsertShortLinkInput,
  execute: InsertExecutor = executeInsert,
): Promise<InsertShortLinkRecordResult> {
  try {
    await execute(input);

    return {
      ok: true,
    };
  } catch (error: unknown) {
    if (isShortCodeCollision(error)) {
      return {
        ok: false,
        reason: "collision",
      };
    }

    logDatabaseFailure(error, "insertion");
    return {
      ok: false,
      reason: "database",
    };
  }
}

export async function resolveShortLinkRecord(
  code: string,
  executeActive: ResolveActiveExecutor = executeResolveActive,
  findInactiveStatus: FindInactiveStatusExecutor = executeFindInactiveStatus,
): Promise<ResolveShortLinkRecordResult> {
  try {
    const originalUrl = await executeActive(code);

    if (originalUrl) {
      return {
        ok: true,
        status: "active",
        originalUrl,
      };
    }

    return {
      ok: true,
      status: await findInactiveStatus(code),
    };
  } catch (error: unknown) {
    logDatabaseFailure(error, "resolution");
    return {
      ok: false,
    };
  }
}

export function buildInsertShortLinkQuery(
  database: Database,
  input: InsertShortLinkInput,
) {
  return database.insert(shortLinks).values({
    code: input.code,
    expiresAt: input.expiresAt,
    originalUrl: input.originalUrl,
  });
}

export function buildResolveShortLinkQuery(database: Database, code: string) {
  return database
    .update(shortLinks)
    .set({
      clickCount: sql`${shortLinks.clickCount} + 1`,
      lastAccessedAt: sql`now()`,
    })
    .where(
      sql`${shortLinks.code} = ${code} and (${shortLinks.expiresAt} is null or ${shortLinks.expiresAt} > now())`,
    )
    .returning({
      originalUrl: shortLinks.originalUrl,
    });
}

export function buildFindShortLinkExpirationQuery(
  database: Database,
  code: string,
) {
  return database
    .select({
      expiresAt: shortLinks.expiresAt,
    })
    .from(shortLinks)
    .where(eq(shortLinks.code, code))
    .limit(1);
}

async function executeInsert(input: InsertShortLinkInput): Promise<void> {
  await buildInsertShortLinkQuery(getDatabase(), input);
}

async function executeResolveActive(code: string): Promise<string | null> {
  const rows = await buildResolveShortLinkQuery(getDatabase(), code);

  return rows.at(0)?.originalUrl ?? null;
}

async function executeFindInactiveStatus(
  code: string,
): Promise<"expired" | "missing"> {
  const rows = await buildFindShortLinkExpirationQuery(getDatabase(), code);

  return rows.length > 0 ? "expired" : "missing";
}

function isShortCodeCollision(error: unknown): boolean {
  if (hasPostgresErrorCode(error, UNIQUE_VIOLATION_CODE)) {
    return true;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    hasPostgresErrorCode(error.cause, UNIQUE_VIOLATION_CODE)
  ) {
    return true;
  }

  return false;
}

function hasPostgresErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function logDatabaseFailure(
  error: unknown,
  operation: "insertion" | "resolution",
): void {
  if (error instanceof DatabaseConfigurationError) {
    console.error(error.message);
    return;
  }

  console.error(`Short-link database ${operation} failed.`);
}
