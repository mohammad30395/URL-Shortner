import type { ExpirationValidationResult } from "./types";

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateExpiration(
  value: unknown,
  now: Date = new Date(),
): ExpirationValidationResult {
  if (value === undefined || value === null) {
    return {
      ok: true,
      expiresAt: null,
    };
  }

  if (typeof value !== "string") {
    return {
      ok: false,
      error: "Expiration date must be submitted as text.",
    };
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return {
      ok: true,
      expiresAt: null,
    };
  }

  const expiresAt = DATE_ONLY_REGEX.test(trimmedValue)
    ? new Date(`${trimmedValue}T23:59:59.999Z`)
    : new Date(trimmedValue);

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      ok: false,
      error: "Enter a valid expiration date.",
    };
  }

  if (expiresAt <= now) {
    return {
      ok: false,
      error: "Expiration date must be in the future.",
    };
  }

  return {
    ok: true,
    expiresAt,
  };
}
