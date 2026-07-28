import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "drizzle/0000_direct_postgresql.sql"),
  "utf8",
);

describe("direct PostgreSQL migration", () => {
  it("is additive and safe for an existing short-links table", () => {
    expect(migrationSql).toMatch(
      /create table if not exists "public"\."short_links"/i,
    );
    expect(migrationSql).toMatch(
      /create unique index if not exists "short_links_code_key"/i,
    );
    expect(migrationSql).not.toMatch(/\b(drop|truncate|delete)\b/i);
  });

  it("preserves row-level security and all database constraints", () => {
    expect(migrationSql).toMatch(
      /alter table "public"\."short_links" enable row level security/i,
    );
    expect(migrationSql).toMatch(/short_links_code_length_check/i);
    expect(migrationSql).toMatch(/short_links_code_format_check/i);
    expect(migrationSql).toMatch(/short_links_original_url_not_empty_check/i);
    expect(migrationSql).toMatch(/short_links_click_count_non_negative_check/i);
  });
});
