import { randomInt } from "node:crypto";

import type { ShortCodeValidationResult } from "./types";

export const SHORT_CODE_MIN_LENGTH = 5;
export const SHORT_CODE_MAX_LENGTH = 32;
export const SHORT_CODE_LENGTH = 7;
export const SHORT_CODE_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
export const SHORT_CODE_REGEX = /^[A-Za-z0-9_-]{5,32}$/;

const RESERVED_SHORT_CODES = new Set([
  "_next",
  "admin",
  "api",
  "dashboard",
  "favicon.ico",
  "login",
  "robots.txt",
  "signup",
  "sitemap.xml",
]);

export function generateShortCode(): string {
  let code = "";

  for (let index = 0; index < SHORT_CODE_LENGTH; index += 1) {
    code += SHORT_CODE_ALPHABET[randomInt(SHORT_CODE_ALPHABET.length)];
  }

  return code;
}

export function validateShortCode(value: unknown): ShortCodeValidationResult {
  if (typeof value !== "string") {
    return {
      ok: false,
      error: "Alias must be submitted as text.",
    };
  }

  const trimmedCode = value.trim();

  if (!trimmedCode) {
    return {
      ok: false,
      error: "Enter an alias or leave the field empty.",
    };
  }

  if (isReservedShortCode(trimmedCode)) {
    return {
      ok: false,
      error: "That alias is reserved. Choose another alias.",
    };
  }

  if (
    trimmedCode.length < SHORT_CODE_MIN_LENGTH ||
    trimmedCode.length > SHORT_CODE_MAX_LENGTH
  ) {
    return {
      ok: false,
      error: "Alias must be 5 to 32 characters.",
    };
  }

  if (!SHORT_CODE_REGEX.test(trimmedCode)) {
    return {
      ok: false,
      error:
        "Alias can contain only letters, numbers, hyphens, and underscores.",
    };
  }

  return {
    ok: true,
    code: trimmedCode,
  };
}

export function isReservedShortCode(code: string): boolean {
  return RESERVED_SHORT_CODES.has(code.toLowerCase());
}
