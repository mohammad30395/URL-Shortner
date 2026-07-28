import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getShortLink, type ShortLinkLookupRepository } from "./get-short-link";

function createRepository(
  result: Awaited<
    ReturnType<ShortLinkLookupRepository["findOriginalUrlByCode"]>
  >,
): ShortLinkLookupRepository {
  return {
    findOriginalUrlByCode: vi.fn(async () => result),
  };
}

describe("getShortLink", () => {
  it("returns an existing short link", async () => {
    const repository = createRepository({
      ok: true,
      status: "active",
      originalUrl: "https://example.com/path",
    });

    await expect(getShortLink("Ab3xP9q", repository)).resolves.toEqual({
      ok: true,
      originalUrl: "https://example.com/path",
    });
  });

  it("returns missing when no row exists", async () => {
    const repository = createRepository({
      ok: true,
      status: "missing",
    });

    await expect(getShortLink("Ab3xP9q", repository)).resolves.toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("returns expired when the row exists but is expired", async () => {
    const repository = createRepository({
      ok: true,
      status: "expired",
    });

    await expect(getShortLink("Ab3xP9q", repository)).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("returns database when lookup fails", async () => {
    const repository = createRepository({
      ok: false,
    });

    await expect(getShortLink("Ab3xP9q", repository)).resolves.toEqual({
      ok: false,
      reason: "database",
    });
  });

  it("rejects unsafe stored URLs", async () => {
    const repository = createRepository({
      ok: true,
      status: "active",
      originalUrl: "javascript:alert(1)",
    });

    await expect(getShortLink("Ab3xP9q", repository)).resolves.toEqual({
      ok: false,
      reason: "unsafe-url",
    });
  });
});
