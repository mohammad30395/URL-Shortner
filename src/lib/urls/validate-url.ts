import type { UrlValidationResult } from "./types";

const MAX_URL_LENGTH = 2048;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function validateUrl(value: unknown): UrlValidationResult {
  if (typeof value !== "string") {
    return {
      ok: false,
      error: "URL must be submitted as text.",
    };
  }

  const trimmedUrl = value.trim();

  if (!trimmedUrl) {
    return {
      ok: false,
      error: "Enter a URL.",
    };
  }

  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      error: "URL must be 2,048 characters or fewer.",
    };
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return {
      ok: false,
      error: "Enter a valid URL.",
    };
  }

  if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
    return {
      ok: false,
      error: "Only HTTP and HTTPS URLs are supported.",
    };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return {
      ok: false,
      error: "URLs with usernames or passwords are not supported.",
    };
  }

  return {
    ok: true,
    url: parsedUrl.href,
  };
}
