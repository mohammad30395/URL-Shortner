create extension if not exists pgcrypto;

create table if not exists public.short_links (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  original_url text not null,
  click_count bigint not null default 0,
  created_at timestamp with time zone not null default now(),
  last_accessed_at timestamp with time zone,
  constraint short_links_code_length_check
    check (char_length(code) between 5 and 16),
  constraint short_links_code_format_check
    check (code ~ '^[A-Za-z0-9_-]+$'),
  constraint short_links_original_url_not_empty_check
    check (btrim(original_url) <> ''),
  constraint short_links_click_count_non_negative_check
    check (click_count >= 0)
);

create unique index if not exists short_links_code_key
  on public.short_links (code);

create index if not exists short_links_created_at_idx
  on public.short_links (created_at desc);

create index if not exists short_links_last_accessed_at_idx
  on public.short_links (last_accessed_at desc)
  where last_accessed_at is not null;

alter table public.short_links enable row level security;
