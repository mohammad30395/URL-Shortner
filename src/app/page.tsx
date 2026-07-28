import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from "../lib/product";
import { ShortenForm } from "./shorten-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col justify-center gap-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Simple URL shortening
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
            {PRODUCT_NAME}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
            {PRODUCT_DESCRIPTION}
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <ShortenForm />

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">
              Built for clear redirects
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Paste any valid HTTP or HTTPS URL, create a short link, copy it,
              and open it immediately to test the redirect.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
