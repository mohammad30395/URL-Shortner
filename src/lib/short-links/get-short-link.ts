import "server-only";

import { getSupabaseAdminClient } from "../supabase/admin";
import { validateUrl } from "../urls/validate-url";

export type ShortLinkLookupResult =
  | {
      ok: true;
      originalUrl: string;
    }
  | {
      ok: false;
      reason: "missing" | "database" | "unsafe-url";
    };

export type ShortLinkLookupRepository = {
  findOriginalUrlByCode(code: string): Promise<
    | {
        ok: true;
        originalUrl: string | null;
      }
    | {
        ok: false;
      }
  >;
};

export async function getShortLink(
  code: string,
  repository: ShortLinkLookupRepository = createSupabaseShortLinkLookupRepository(),
): Promise<ShortLinkLookupResult> {
  const result = await repository.findOriginalUrlByCode(code);

  if (!result.ok) {
    return {
      ok: false,
      reason: "database",
    };
  }

  if (!result.originalUrl) {
    return {
      ok: false,
      reason: "missing",
    };
  }

  const validation = validateUrl(result.originalUrl);

  if (!validation.ok) {
    return {
      ok: false,
      reason: "unsafe-url",
    };
  }

  return {
    ok: true,
    originalUrl: validation.url,
  };
}

function createSupabaseShortLinkLookupRepository(): ShortLinkLookupRepository {
  return {
    async findOriginalUrlByCode(code) {
      const { data, error } = await getSupabaseAdminClient()
        .from("short_links")
        .select("original_url")
        .eq("code", code)
        .maybeSingle();

      if (error) {
        return {
          ok: false,
        };
      }

      return {
        ok: true,
        originalUrl: data?.original_url ?? null,
      };
    },
  };
}
