import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schemaSql = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8");

describe("supabase/schema.sql", () => {
  it("defines resolve_short_link as an atomic update returning the original URL", () => {
    expect(schemaSql).toMatch(
      /create or replace function public\.resolve_short_link\(short_code text\)/i,
    );
    expect(schemaSql).toMatch(/update public\.short_links/i);
    expect(schemaSql).toMatch(/click_count\s*=\s*click_count\s*\+\s*1/i);
    expect(schemaSql).toMatch(/last_accessed_at\s*=\s*now\(\)/i);
    expect(schemaSql).toMatch(/where code\s*=\s*\$1/i);
    expect(schemaSql).toMatch(/returning original_url/i);
  });

  it("sets a fixed search path and limits function execution to service_role", () => {
    expect(schemaSql).toMatch(/set search_path\s*=\s*public,\s*pg_temp/i);
    expect(schemaSql).toMatch(
      /revoke all on function public\.resolve_short_link\(text\) from public/i,
    );
    expect(schemaSql).toMatch(
      /revoke all on function public\.resolve_short_link\(text\) from anon/i,
    );
    expect(schemaSql).toMatch(
      /revoke all on function public\.resolve_short_link\(text\) from authenticated/i,
    );
    expect(schemaSql).toMatch(
      /grant execute on function public\.resolve_short_link\(text\) to service_role/i,
    );
  });
});
