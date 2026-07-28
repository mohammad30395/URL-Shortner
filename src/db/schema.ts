import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const shortLinks = pgTable(
  "short_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    originalUrl: text("original_url").notNull(),
    clickCount: bigint("click_count", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (table) => [
    uniqueIndex("short_links_code_key").on(table.code),
    index("short_links_created_at_idx").on(table.createdAt.desc()),
    index("short_links_last_accessed_at_idx")
      .on(table.lastAccessedAt.desc())
      .where(sql`${table.lastAccessedAt} is not null`),
    check(
      "short_links_code_length_check",
      sql`char_length(${table.code}) between 5 and 32`,
    ),
    check(
      "short_links_code_format_check",
      sql`${table.code} ~ '^[A-Za-z0-9_-]+$'`,
    ),
    check(
      "short_links_code_reserved_check",
      sql`lower(${table.code}) not in ('api', 'admin', 'login', 'signup', 'dashboard', 'favicon.ico', 'robots.txt', 'sitemap.xml', '_next')`,
    ),
    check(
      "short_links_original_url_not_empty_check",
      sql`btrim(${table.originalUrl}) <> ''`,
    ),
    check(
      "short_links_click_count_non_negative_check",
      sql`${table.clickCount} >= 0`,
    ),
  ],
).enableRLS();
