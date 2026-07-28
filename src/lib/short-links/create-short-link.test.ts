import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createShortLink,
  CreateShortLinkError,
  type ShortLinkRepository,
} from "./create-short-link";

function createRepository(
  results: Awaited<ReturnType<ShortLinkRepository["insertShortLink"]>>[],
): ShortLinkRepository {
  return {
    insertShortLink: vi.fn(async () => {
      const result = results.shift();

      if (!result) {
        throw new Error("No mocked insert result available.");
      }

      return result;
    }),
  };
}

describe("createShortLink", () => {
  it("creates a short link with the first available code", async () => {
    const repository = createRepository([{ ok: true }]);

    await expect(
      createShortLink("https://example.com/", {
        generateCode: () => "Ab3xP9q",
        repository,
      }),
    ).resolves.toEqual({
      code: "Ab3xP9q",
      originalUrl: "https://example.com/",
    });

    expect(repository.insertShortLink).toHaveBeenCalledWith({
      code: "Ab3xP9q",
      originalUrl: "https://example.com/",
    });
  });

  it("retries when generated codes collide", async () => {
    const repository = createRepository([
      { ok: false, reason: "collision" },
      { ok: false, reason: "collision" },
      { ok: true },
    ]);
    const generateCode = vi
      .fn()
      .mockReturnValueOnce("Ab3xP9q")
      .mockReturnValueOnce("Cd4yR8s")
      .mockReturnValueOnce("Ef5zT7u");

    await expect(
      createShortLink("https://example.com/", {
        generateCode,
        repository,
      }),
    ).resolves.toEqual({
      code: "Ef5zT7u",
      originalUrl: "https://example.com/",
    });

    expect(generateCode).toHaveBeenCalledTimes(3);
    expect(repository.insertShortLink).toHaveBeenCalledTimes(3);
  });

  it("stops after five collision attempts", async () => {
    const repository = createRepository([
      { ok: false, reason: "collision" },
      { ok: false, reason: "collision" },
      { ok: false, reason: "collision" },
      { ok: false, reason: "collision" },
      { ok: false, reason: "collision" },
    ]);

    await expect(
      createShortLink("https://example.com/", {
        generateCode: () => "Ab3xP9q",
        repository,
      }),
    ).rejects.toMatchObject(new CreateShortLinkError("CODE_COLLISION_LIMIT"));

    expect(repository.insertShortLink).toHaveBeenCalledTimes(5);
  });

  it("throws a generic service error for database failures", async () => {
    const repository = createRepository([{ ok: false, reason: "database" }]);

    await expect(
      createShortLink("https://example.com/", {
        generateCode: () => "Ab3xP9q",
        repository,
      }),
    ).rejects.toMatchObject(new CreateShortLinkError("DATABASE_ERROR"));
  });
});
