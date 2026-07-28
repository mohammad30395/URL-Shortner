import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schemaSql = readFileSync(
  join(process.cwd(), "supabase/schema.sql"),
  "utf8",
);

describe("supabase/schema.sql", () => {
  it("preserves the short-links table and all required columns", () => {
    expect(schemaSql).toMatch(
      /create table if not exists public\.short_links/i,
    );

    for (const column of [
      "id",
      "code",
      "original_url",
      "click_count",
      "created_at",
      "last_accessed_at",
    ]) {
      expect(schemaSql).toMatch(new RegExp(`\\b${column}\\b`, "i"));
    }
  });

  it("preserves constraints, indexes, and row-level security", () => {
    expect(schemaSql).toMatch(/short_links_code_length_check/i);
    expect(schemaSql).toMatch(/short_links_code_format_check/i);
    expect(schemaSql).toMatch(/short_links_original_url_not_empty_check/i);
    expect(schemaSql).toMatch(/short_links_click_count_non_negative_check/i);
    expect(schemaSql).toMatch(
      /create unique index if not exists short_links_code_key/i,
    );
    expect(schemaSql).toMatch(
      /alter table public\.short_links enable row level security/i,
    );
  });
});
