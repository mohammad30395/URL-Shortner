import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type DatabaseEnvironment = {
  DATABASE_URL?: string;
};

type DatabaseResources = {
  client: Sql;
  database: Database;
};

const globalDatabase = globalThis as typeof globalThis & {
  __linkLiteDatabase?: DatabaseResources;
};

export class DatabaseConfigurationError extends Error {
  constructor(
    message = "Missing required server environment variable: DATABASE_URL",
  ) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

export function readDatabaseUrl(
  environment: DatabaseEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
  },
): string {
  const databaseUrl = environment.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new DatabaseConfigurationError();
  }

  try {
    const parsedUrl = new URL(databaseUrl);

    if (
      !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname
    ) {
      throw new Error("Invalid PostgreSQL URL.");
    }
  } catch {
    throw new DatabaseConfigurationError(
      "DATABASE_URL must be a valid PostgreSQL connection string.",
    );
  }

  return databaseUrl;
}

export function getDatabase(): Database {
  if (globalDatabase.__linkLiteDatabase) {
    return globalDatabase.__linkLiteDatabase.database;
  }

  const client = postgres(readDatabaseUrl(), {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const database = drizzle(client, { schema });

  globalDatabase.__linkLiteDatabase = {
    client,
    database,
  };

  return database;
}
