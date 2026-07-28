import "server-only";

import {
  resolveShortLinkRecord,
  type ResolveShortLinkRecordResult,
} from "../../db/queries";
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
  findOriginalUrlByCode(code: string): Promise<ResolveShortLinkRecordResult>;
};

export async function getShortLink(
  code: string,
  repository: ShortLinkLookupRepository = postgresShortLinkLookupRepository,
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

const postgresShortLinkLookupRepository: ShortLinkLookupRepository = {
  findOriginalUrlByCode: resolveShortLinkRecord,
};
