import { describe, expect, it } from "vitest";

import { validateUrl } from "./validate-url";

describe("validateUrl", () => {
  it("accepts valid HTTP URLs", () => {
    expect(validateUrl("http://example.com/path?x=1")).toEqual({
      ok: true,
      url: "http://example.com/path?x=1",
    });
  });

  it("accepts valid HTTPS URLs", () => {
    expect(validateUrl("https://example.com")).toEqual({
      ok: true,
      url: "https://example.com/",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(validateUrl("  https://example.com/docs  ")).toEqual({
      ok: true,
      url: "https://example.com/docs",
    });
  });

  it("rejects empty input", () => {
    expect(validateUrl("   ")).toEqual({
      ok: false,
      error: "Enter a URL.",
    });
  });

  it.each([
    "javascript:alert(1)",
    "data:text/plain,hello",
    "ftp://example.com",
  ])("rejects unsupported protocol %s", (url) => {
    expect(validateUrl(url)).toEqual({
      ok: false,
      error: "Only HTTP and HTTPS URLs are supported.",
    });
  });

  it("rejects invalid URLs", () => {
    expect(validateUrl("not a url")).toEqual({
      ok: false,
      error: "Enter a valid URL.",
    });
  });

  it("rejects URLs containing credentials", () => {
    expect(validateUrl("https://user:pass@example.com")).toEqual({
      ok: false,
      error: "URLs with usernames or passwords are not supported.",
    });
  });

  it("rejects overly long URLs", () => {
    const longUrl = `https://example.com/${"a".repeat(2048)}`;

    expect(validateUrl(longUrl)).toEqual({
      ok: false,
      error: "URL must be 2,048 characters or fewer.",
    });
  });

  it("rejects non-string values", () => {
    expect(validateUrl(null)).toEqual({
      ok: false,
      error: "URL must be submitted as text.",
    });
  });
});
