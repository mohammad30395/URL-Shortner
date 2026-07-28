import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/short-links/create-short-link", () => ({
  createShortLink: vi.fn(),
}));

import { createShortLink } from "../../../lib/short-links/create-short-link";
import { POST } from "./route";

const mockedCreateShortLink = vi.mocked(createShortLink);

function createJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/shorten", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

describe("POST /api/shorten", () => {
  beforeEach(() => {
    mockedCreateShortLink.mockReset();
  });

  it("creates a short link for valid requests", async () => {
    mockedCreateShortLink.mockResolvedValue({
      code: "Ab3xP9q",
      originalUrl: "https://example.com/a/long/path",
    });

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/a/long/path",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      code: "Ab3xP9q",
      originalUrl: "https://example.com/a/long/path",
      shortUrl: "http://localhost:3000/Ab3xP9q",
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mockedCreateShortLink).toHaveBeenCalledWith(
      "https://example.com/a/long/path",
    );
  });

  it("returns 400 for invalid URLs", async () => {
    const response = await POST(
      createJsonRequest({
        url: "ftp://example.com/file.txt",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_URL",
        message: "Please enter a valid HTTP or HTTPS URL.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 400 for missing URL fields", async () => {
    const response = await POST(createJsonRequest({}));

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_URL",
        message: "Please enter a valid HTTP or HTTPS URL.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed request bodies", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Please send a valid JSON request body.",
      },
    });
    expect(response.status).toBe(400);
    expect(mockedCreateShortLink).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when database insertion fails", async () => {
    mockedCreateShortLink.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      createJsonRequest({
        url: "https://example.com/",
      }),
    );

    await expect(readJson(response)).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "The short link could not be created. Please try again later.",
      },
    });
    expect(response.status).toBe(500);
  });
});
