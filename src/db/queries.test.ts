import { drizzle } from "drizzle-orm/postgres-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  buildInsertShortLinkQuery,
  buildResolveShortLinkQuery,
  insertShortLinkRecord,
  resolveShortLinkRecord,
} from "./queries";
import * as schema from "./schema";

const input = {
  code: "Ab3xP9q",
  originalUrl: "https://example.com/a/long/path",
};

describe("direct PostgreSQL queries", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a parameterized insert for a short link", () => {
    const database = drizzle.mock({ schema });
    const query = buildInsertShortLinkQuery(database, input).toSQL();

    expect(query.sql).toMatch(/^insert into "short_links"/i);
    expect(query.params).toEqual([input.code, input.originalUrl]);
  });

  it("builds one atomic resolution query that updates analytics and returns the URL", () => {
    const database = drizzle.mock({ schema });
    const query = buildResolveShortLinkQuery(database, input.code).toSQL();

    expect(query.sql).toMatch(/^update "short_links"/i);
    expect(query.sql).toMatch(
      /"click_count"\s*=\s*"short_links"\."click_count" \+ 1/i,
    );
    expect(query.sql).toMatch(/"last_accessed_at"\s*=\s*now\(\)/i);
    expect(query.sql).toMatch(/where "short_links"\."code" = \$1/i);
    expect(query.sql).toMatch(/returning "original_url"/i);
    expect(query.params).toEqual([input.code]);
  });

  it("reports a successful insert", async () => {
    await expect(
      insertShortLinkRecord(input, async () => undefined),
    ).resolves.toEqual({
      ok: true,
    });
  });

  it("recognizes a PostgreSQL unique violation as a code collision", async () => {
    await expect(
      insertShortLinkRecord(input, async () => {
        throw {
          code: "23505",
        };
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "collision",
    });
  });

  it("maps unexpected insert failures to a safe database result", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      insertShortLinkRecord(input, async () => {
        throw new Error("connection details");
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "database",
    });
  });

  it("returns resolved and missing links", async () => {
    await expect(
      resolveShortLinkRecord(input.code, async () => input.originalUrl),
    ).resolves.toEqual({
      ok: true,
      originalUrl: input.originalUrl,
    });
    await expect(
      resolveShortLinkRecord(input.code, async () => null),
    ).resolves.toEqual({
      ok: true,
      originalUrl: null,
    });
  });

  it("maps resolution failures to a safe database result", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      resolveShortLinkRecord(input.code, async () => {
        throw new Error("connection details");
      }),
    ).resolves.toEqual({
      ok: false,
    });
  });
});
