import "server-only";

import { eq, sql } from "drizzle-orm";

import {
  DatabaseConfigurationError,
  getDatabase,
  type Database,
} from ".";
import { shortLinks } from "./schema";

const UNIQUE_VIOLATION_CODE = "23505";

type InsertShortLinkInput = {
  code: string;
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
      originalUrl: string | null;
    }
  | {
      ok: false;
    };

type InsertExecutor = (input: InsertShortLinkInput) => Promise<void>;
type ResolveExecutor = (code: string) => Promise<string | null>;

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
  execute: ResolveExecutor = executeResolve,
): Promise<ResolveShortLinkRecordResult> {
  try {
    return {
      ok: true,
      originalUrl: await execute(code),
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
    .where(eq(shortLinks.code, code))
    .returning({
      originalUrl: shortLinks.originalUrl,
    });
}

async function executeInsert(input: InsertShortLinkInput): Promise<void> {
  await buildInsertShortLinkQuery(getDatabase(), input);
}

async function executeResolve(code: string): Promise<string | null> {
  const rows = await buildResolveShortLinkQuery(getDatabase(), code);

  return rows.at(0)?.originalUrl ?? null;
}

function isShortCodeCollision(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === UNIQUE_VIOLATION_CODE
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
