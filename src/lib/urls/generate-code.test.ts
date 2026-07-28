import { describe, expect, it } from "vitest";

import {
  generateShortCode,
  SHORT_CODE_REGEX,
  validateShortCode,
} from "./generate-code";

describe("generateShortCode", () => {
  it("generates seven-character codes", () => {
    expect(generateShortCode()).toHaveLength(7);
  });

  it("uses only permitted short-code characters", () => {
    for (let index = 0; index < 100; index += 1) {
      expect(generateShortCode()).toMatch(SHORT_CODE_REGEX);
    }
  });
});

describe("validateShortCode", () => {
  it("accepts valid custom aliases case-sensitively", () => {
    expect(validateShortCode("My-Link_2026")).toEqual({
      ok: true,
      code: "My-Link_2026",
    });
    expect(validateShortCode("my-link_2026")).toEqual({
      ok: true,
      code: "my-link_2026",
    });
  });

  it("trims aliases before returning them", () => {
    expect(validateShortCode("  Launch_01  ")).toEqual({
      ok: true,
      code: "Launch_01",
    });
  });

  it("rejects aliases shorter than five characters", () => {
    expect(validateShortCode("abcd")).toEqual({
      ok: false,
      error: "Alias must be 5 to 32 characters.",
    });
  });

  it("rejects aliases longer than 32 characters", () => {
    expect(validateShortCode("a".repeat(33))).toEqual({
      ok: false,
      error: "Alias must be 5 to 32 characters.",
    });
  });

  it("rejects unsupported characters", () => {
    expect(validateShortCode("bad.alias")).toEqual({
      ok: false,
      error:
        "Alias can contain only letters, numbers, hyphens, and underscores.",
    });
  });

  it("rejects reserved system paths case-insensitively", () => {
    expect(validateShortCode("api")).toEqual({
      ok: false,
      error: "That alias is reserved. Choose another alias.",
    });
    expect(validateShortCode("Admin")).toEqual({
      ok: false,
      error: "That alias is reserved. Choose another alias.",
    });
    expect(validateShortCode("_next")).toEqual({
      ok: false,
      error: "That alias is reserved. Choose another alias.",
    });
  });

  it("exports the reusable short-code regular expression", () => {
    expect("abcde").toMatch(SHORT_CODE_REGEX);
    expect("a".repeat(32)).toMatch(SHORT_CODE_REGEX);
    expect("abcd").not.toMatch(SHORT_CODE_REGEX);
    expect("bad.alias").not.toMatch(SHORT_CODE_REGEX);
  });
});
