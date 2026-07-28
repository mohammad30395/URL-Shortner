import { describe, expect, it } from "vitest";

import { validateExpiration } from "./validate-expiration";

const NOW = new Date("2026-07-28T12:00:00.000Z");

describe("validateExpiration", () => {
  it("accepts omitted and blank expiration dates", () => {
    expect(validateExpiration(undefined, NOW)).toEqual({
      ok: true,
      expiresAt: null,
    });
    expect(validateExpiration("   ", NOW)).toEqual({
      ok: true,
      expiresAt: null,
    });
  });

  it("accepts future date-only values as the end of that UTC day", () => {
    expect(validateExpiration("2026-07-29", NOW)).toEqual({
      ok: true,
      expiresAt: new Date("2026-07-29T23:59:59.999Z"),
    });
  });

  it("accepts future ISO date-time values", () => {
    expect(validateExpiration("2026-07-28T13:00:00.000Z", NOW)).toEqual({
      ok: true,
      expiresAt: new Date("2026-07-28T13:00:00.000Z"),
    });
  });

  it("rejects malformed expiration dates", () => {
    expect(validateExpiration("not-a-date", NOW)).toEqual({
      ok: false,
      error: "Enter a valid expiration date.",
    });
  });

  it("rejects past expiration dates", () => {
    expect(validateExpiration("2026-07-27", NOW)).toEqual({
      ok: false,
      error: "Expiration date must be in the future.",
    });
    expect(validateExpiration("2026-07-28T11:59:59.000Z", NOW)).toEqual({
      ok: false,
      error: "Expiration date must be in the future.",
    });
  });

  it("rejects non-string expiration values", () => {
    expect(validateExpiration(123, NOW)).toEqual({
      ok: false,
      error: "Expiration date must be submitted as text.",
    });
  });
});
