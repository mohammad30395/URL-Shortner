import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DatabaseConfigurationError, readDatabaseUrl } from "./index";

describe("database configuration", () => {
  it("returns a configured database URL", () => {
    expect(
      readDatabaseUrl({
        DATABASE_URL: "postgresql://example.invalid/database",
      }),
    ).toBe("postgresql://example.invalid/database");
  });

  it("fails clearly without exposing a connection string when configuration is missing", () => {
    expect(() => readDatabaseUrl({})).toThrow(DatabaseConfigurationError);
    expect(() => readDatabaseUrl({})).toThrow(
      "Missing required server environment variable: DATABASE_URL",
    );
  });

  it("rejects non-PostgreSQL connection strings", () => {
    expect(() =>
      readDatabaseUrl({
        DATABASE_URL: "https://example.invalid/database",
      }),
    ).toThrow("DATABASE_URL must be a valid PostgreSQL connection string.");
  });
});
