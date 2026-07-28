"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";

import { validateShortCode } from "../lib/urls/generate-code";
import { validateExpiration } from "../lib/urls/validate-expiration";
import { validateUrl } from "../lib/urls/validate-url";

type ShortenResult = {
  code: string;
  expiresAt: string | null;
  originalUrl: string;
  shortUrl: string;
};

type ApiError = {
  error: {
    code: string;
    message: string;
  };
};

const COPIED_RESET_DELAY_MS = 1800;

export function ShortenForm() {
  const urlInputId = useId();
  const aliasInputId = useId();
  const aliasHelpId = useId();
  const expirationInputId = useId();
  const expirationHelpId = useId();
  const errorId = useId();
  const copyResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittingRef = useRef(false);
  const [url, setUrl] = useState("");
  const [alias, setAlias] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) {
      return;
    }

    const trimmedAlias = alias.trim();
    const validation = validateUrl(url);

    if (!validation.ok) {
      setError(validation.error);
      setResult(null);
      setHasCopied(false);
      return;
    }

    if (trimmedAlias) {
      const aliasValidation = validateShortCode(trimmedAlias);

      if (!aliasValidation.ok) {
        setError(aliasValidation.error);
        setResult(null);
        setHasCopied(false);
        return;
      }
    }

    const expirationValidation = validateExpiration(expirationDate);

    if (!expirationValidation.ok) {
      setError(expirationValidation.error);
      setResult(null);
      setHasCopied(false);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setHasCopied(false);

    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alias: trimmedAlias || undefined,
          expiresAt: expirationDate || undefined,
          url: validation.url,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getApiErrorMessage(payload));
        return;
      }

      if (!isShortenResult(payload)) {
        setError("The server returned an unexpected response.");
        return;
      }

      setResult(payload);
    } catch {
      setError(
        "Unable to shorten the URL right now. Check your connection and try again.",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!result || isSubmitting) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.shortUrl);
      setHasCopied(true);

      if (copyResetTimer.current) {
        clearTimeout(copyResetTimer.current);
      }

      copyResetTimer.current = setTimeout(() => {
        setHasCopied(false);
      }, COPIED_RESET_DELAY_MS);
    } catch {
      setError("Copy failed. Select the short URL and copy it manually.");
    }
  }

  return (
    <section
      aria-labelledby="shorten-form-title"
      className="w-full rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 id="shorten-form-title" className="sr-only">
        Shorten a URL
      </h2>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label
            htmlFor={urlInputId}
            className="block text-sm font-medium text-slate-900"
          >
            Long URL
          </label>
          <input
            id={urlInputId}
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            aria-describedby={`${error ? errorId : ""} privacy-note`.trim()}
            aria-invalid={Boolean(error)}
            placeholder="https://example.com/a/long/path"
            className="block w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950/20"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor={aliasInputId}
            className="block text-sm font-medium text-slate-900"
          >
            Custom alias{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id={aliasInputId}
            name="alias"
            type="text"
            autoComplete="off"
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            aria-describedby={`${aliasHelpId} ${error ? errorId : ""}`.trim()}
            aria-invalid={Boolean(error)}
            placeholder="my-link_2026"
            className="block w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950/20"
          />
          <p id={aliasHelpId} className="text-sm leading-6 text-slate-600">
            Aliases are case-sensitive and can use 5-32 letters, numbers,
            hyphens, or underscores.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={expirationInputId}
            className="block text-sm font-medium text-slate-900"
          >
            Expiration date{" "}
            <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id={expirationInputId}
            name="expiresAt"
            type="date"
            value={expirationDate}
            onChange={(event) => setExpirationDate(event.target.value)}
            aria-describedby={`${expirationHelpId} ${
              error ? errorId : ""
            }`.trim()}
            aria-invalid={Boolean(error)}
            className="block w-full rounded-md border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus-visible:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950/20"
          />
          <p id={expirationHelpId} className="text-sm leading-6 text-slate-600">
            Expired links stop redirecting and show a clear unavailable message.
          </p>
        </div>

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="text-sm font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white outline-none transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400 motion-reduce:transition-none sm:w-auto"
        >
          {isSubmitting ? "Shortening..." : "Shorten URL"}
        </button>
      </form>

      <p id="privacy-note" className="mt-4 text-sm leading-6 text-slate-600">
        Submitted URLs are stored so redirects can work when someone visits your
        short link.
      </p>

      <div aria-live="polite" aria-busy={isSubmitting} className="mt-6">
        {isSubmitting ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
            Creating your short link...
          </div>
        ) : null}

        {result ? (
          <section
            aria-label="Shortened URL result"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-950">Short URL</p>
              <p className="mt-1 break-all text-lg font-semibold text-slate-950">
                {result.shortUrl}
              </p>
              <p
                className="mt-3 truncate text-sm text-slate-700"
                title={result.originalUrl}
              >
                Original: {result.originalUrl}
              </p>
              {result.expiresAt ? (
                <p className="mt-2 text-sm text-slate-700">
                  Expires:{" "}
                  <time dateTime={result.expiresAt}>
                    {formatExpiration(result.expiresAt)}
                  </time>
                </p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {hasCopied ? "Copied" : "Copy"}
              </button>
              <a
                href={result.shortUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-950 outline-none ring-1 ring-inset ring-slate-300 transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                Open link
              </a>
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}

function formatExpiration(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getApiErrorMessage(payload: unknown): string {
  if (isApiError(payload)) {
    return payload.error.message;
  }

  return "Unable to shorten the URL right now. Please try again later.";
}

function isApiError(value: unknown): value is ApiError {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  );
}

function isShortenResult(value: unknown): value is ShortenResult {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    (typeof value.expiresAt === "string" || value.expiresAt === null) &&
    typeof value.originalUrl === "string" &&
    typeof value.shortUrl === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
