import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/short-links/get-short-link", () => ({
  getShortLink: vi.fn(),
}));

import { getShortLink } from "../../lib/short-links/get-short-link";
import { GET } from "./route";

const mockedGetShortLink = vi.mocked(getShortLink);

function createRequest(code: string): Request {
  return new Request(`http://localhost:3000/${code}`);
}

function createContext(code: string) {
  return {
    params: Promise.resolve({
      code,
    }),
  };
}

describe("GET /{code}", () => {
  beforeEach(() => {
    mockedGetShortLink.mockReset();
  });

  it("redirects existing short codes", async () => {
    mockedGetShortLink.mockResolvedValue({
      ok: true,
      originalUrl: "https://example.com/a/long/path",
    });

    const response = await GET(createRequest("Ab3xP9q"), createContext("Ab3xP9q"));

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "https://example.com/a/long/path",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mockedGetShortLink).toHaveBeenCalledWith("Ab3xP9q");
  });

  it("returns 404 for missing short codes", async () => {
    mockedGetShortLink.mockResolvedValue({
      ok: false,
      reason: "missing",
    });

    const response = await GET(createRequest("Ab3xP9q"), createContext("Ab3xP9q"));
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toContain("Short link unavailable");
    expect(body).toContain('href="/"');
  });

  it("returns 404 for invalid short-code formats", async () => {
    const response = await GET(createRequest("bad-code!"), createContext("bad-code!"));

    expect(response.status).toBe(404);
    expect(mockedGetShortLink).not.toHaveBeenCalled();
  });

  it("returns 404 for database errors", async () => {
    mockedGetShortLink.mockResolvedValue({
      ok: false,
      reason: "database",
    });

    const response = await GET(createRequest("Ab3xP9q"), createContext("Ab3xP9q"));

    expect(response.status).toBe(404);
  });

  it("uses a temporary redirect status and destination", async () => {
    mockedGetShortLink.mockResolvedValue({
      ok: true,
      originalUrl: "http://example.com/",
    });

    const response = await GET(createRequest("Cd4yR8s"), createContext("Cd4yR8s"));

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("http://example.com/");
  });

  it("returns 404 instead of redirecting to itself", async () => {
    mockedGetShortLink.mockResolvedValue({
      ok: true,
      originalUrl: "http://localhost:3000/Ab3xP9q",
    });

    const response = await GET(createRequest("Ab3xP9q"), createContext("Ab3xP9q"));

    expect(response.status).toBe(404);
  });
});
