CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."short_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"original_url" text NOT NULL,
	"click_count" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone,
	CONSTRAINT "short_links_code_length_check" CHECK (char_length("short_links"."code") between 5 and 16),
	CONSTRAINT "short_links_code_format_check" CHECK ("short_links"."code" ~ '^[A-Za-z0-9_-]+$'),
	CONSTRAINT "short_links_original_url_not_empty_check" CHECK (btrim("short_links"."original_url") <> ''),
	CONSTRAINT "short_links_click_count_non_negative_check" CHECK ("short_links"."click_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "public"."short_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "short_links_code_key" ON "public"."short_links" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "short_links_created_at_idx" ON "public"."short_links" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "short_links_last_accessed_at_idx" ON "public"."short_links" USING btree ("last_accessed_at" DESC NULLS LAST) WHERE "short_links"."last_accessed_at" is not null;
