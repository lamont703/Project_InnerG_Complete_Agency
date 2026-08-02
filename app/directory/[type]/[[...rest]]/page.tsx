import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { getDirectoryType, DIRECTORY_TYPES, PAGE_SIZE } from "@/lib/directory-config";
import { getDirectoryPage, resolveDirectoryCity } from "@/lib/directory-data";

export const revalidate = 3600;

type Props = { params: Promise<{ type: string; rest?: string[] }> };

const ORIGIN = "https://agency.innergcomplete.com";

type Parsed =
  | { kind: "ok"; citySlug: string | null; cityName: string | null; page: number }
  | { kind: "redirect"; to: string }
  | { kind: "notfound" };

// The optional catch-all after /directory/<type> can be:
//   []                       → national, page 1
//   ["2"]                    → national, page 2
//   ["houston"]              → city-scoped, page 1
//   ["houston","2"]          → city-scoped, page 2
// A page number of "1" is redirected to the bare canonical so page 1 has one
// URL. A non-numeric first segment is treated as a city slug and validated
// against the strict allow-list; anything unrecognized 404s.
function parseRoute(typeKey: string, rest?: string[]): Parsed {
  if (!rest || rest.length === 0) return { kind: "ok", citySlug: null, cityName: null, page: 1 };
  const isNum = (s: string) => /^\d+$/.test(s);
  const [a, b, ...extra] = rest;
  if (extra.length > 0) return { kind: "notfound" };

  // /directory/<type>/<a>
  if (b === undefined) {
    if (isNum(a)) {
      const n = parseInt(a, 10);
      if (n === 1) return { kind: "redirect", to: `/directory/${typeKey}` };
      if (n < 1) return { kind: "notfound" };
      return { kind: "ok", citySlug: null, cityName: null, page: n };
    }
    const cityName = resolveDirectoryCity(a);
    if (!cityName) return { kind: "notfound" };
    return { kind: "ok", citySlug: a, cityName, page: 1 };
  }

  // /directory/<type>/<a>/<b> — a must be a city slug, b a page number
  if (isNum(a)) return { kind: "notfound" }; // national lists never have two segments
  const cityName = resolveDirectoryCity(a);
  if (!cityName) return { kind: "notfound" };
  if (!isNum(b)) return { kind: "notfound" };
  const n = parseInt(b, 10);
  if (n === 1) return { kind: "redirect", to: `/directory/${typeKey}/${a}` };
  if (n < 1) return { kind: "notfound" };
  return { kind: "ok", citySlug: a, cityName, page: n };
}

function pageUrl(typeKey: string, citySlug: string | null, page: number): string {
  const base = citySlug ? `/directory/${typeKey}/${citySlug}` : `/directory/${typeKey}`;
  return page <= 1 ? base : `${base}/${page}`;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { type: typeKey, rest } = await props.params;
  const type = getDirectoryType(typeKey);
  const parsed = parseRoute(typeKey, rest);
  if (!type || parsed.kind === "notfound") return { title: "Directory Not Found" };
  if (parsed.kind === "redirect") {
    return { title: `${type.label} Directory | Inner G Complete`, alternates: { canonical: `${ORIGIN}${parsed.to}` } };
  }

  const { cityName, citySlug, page } = parsed;
  const cityLabel = cityName ? `${cityName} ` : "";
  const pageSuffix = page > 1 ? ` — Page ${page}` : "";
  const title = `${cityLabel}${type.label} Directory${pageSuffix} | Inner G Complete`;
  const description = cityName
    ? `Every ${type.label.toLowerCase()} in ${cityName} in our directory.`
    : type.description;
  const canonical = `${ORIGIN}${pageUrl(typeKey, citySlug, page)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

// Pre-render national page 1 of each type (linked from /directory and the
// sitemap). City-scoped pages render on-demand and cache via `revalidate`.
export function generateStaticParams() {
  return DIRECTORY_TYPES.map((t) => ({ type: t.key, rest: [] as string[] }));
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// First page, last page, and a window of ±2 around the current page, with
// ellipsis gaps — all rendered as real <a> links so Google can follow them.
function paginationItems(current: number, totalPages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const window = new Set<number>([1, totalPages, current - 1, current, current + 1, current - 2, current + 2]);
  let prev = 0;
  for (let n = 1; n <= totalPages; n++) {
    if (!window.has(n)) continue;
    if (n - prev > 1) out.push("…");
    out.push(n);
    prev = n;
  }
  return out;
}

export default async function DirectoryListPage(props: Props) {
  const { type: typeKey, rest } = await props.params;
  const type = getDirectoryType(typeKey);
  if (!type) notFound();

  const parsed = parseRoute(typeKey, rest);
  if (parsed.kind === "notfound") notFound();
  if (parsed.kind === "redirect") redirect(parsed.to);

  const { citySlug, cityName, page } = parsed;

  const { entities, total, totalPages } = await getDirectoryPage(type, page, cityName);
  if (page > totalPages) notFound(); // no infinitely crawlable empty pages
  // A city with genuinely zero listings for this type shouldn't exist as a page.
  if (cityName && total === 0) notFound();

  const startIndex = (page - 1) * PAGE_SIZE;
  const items = paginationItems(page, totalPages);
  const heading = cityName ? `${cityName} ${type.label}` : `${type.label} Directory`;

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <nav className="text-xs font-bold text-slate-400 mb-4">
          <Link href="/directory" className="hover:text-indigo-600">Directory</Link>
          <span className="mx-1.5">/</span>
          {cityName ? (
            <>
              <Link href={`/directory/${typeKey}`} className="hover:text-indigo-600">{type.label}</Link>
              <span className="mx-1.5">/</span>
              <span className="text-slate-600">{cityName}</span>
            </>
          ) : (
            <span className="text-slate-600">{type.label}</span>
          )}
        </nav>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {heading}
        </h1>
        <p className="text-slate-600 text-base leading-relaxed mb-8">
          {total.toLocaleString()} {type.label.toLowerCase()}
          {cityName ? ` in ${cityName}` : " in our directory"}.
          {totalPages > 1 && (
            <span className="text-slate-400 font-medium"> Page {page} of {totalPages}.</span>
          )}
          {cityName && (
            <>
              {" "}
              <Link href={`/directory/${typeKey}`} className="text-indigo-600 font-bold hover:underline">
                View all {type.label.toLowerCase()} →
              </Link>
            </>
          )}
        </p>

        <ol className="bg-white border border-slate-200 rounded-2xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {entities.map((e, i) => (
            <li key={e.slug}>
              <Link
                href={`${type.entityPrefix}/${e.slug}`}
                className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-indigo-50/60 transition-colors"
              >
                <span className="text-xs font-bold text-slate-300 w-8 shrink-0 tabular-nums">
                  {startIndex + i + 1}
                </span>
                <span className="font-bold text-slate-900 text-sm">{titleCase(e.name)}</span>
                {e.city && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-slate-400 font-medium shrink-0">
                    <MapPin className="w-3 h-3" />
                    {titleCase(e.city)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ol>

        {totalPages > 1 && (
          <nav className="flex flex-wrap items-center justify-center gap-1.5 mt-8" aria-label="Directory pagination">
            {page > 1 && (
              <Link
                href={pageUrl(typeKey, citySlug, page - 1)}
                rel="prev"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </Link>
            )}
            {items.map((it, idx) =>
              it === "…" ? (
                <span key={`gap-${idx}`} className="px-2 text-slate-400 font-bold">…</span>
              ) : (
                <Link
                  key={it}
                  href={pageUrl(typeKey, citySlug, it)}
                  aria-current={it === page ? "page" : undefined}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold tabular-nums transition-colors ${
                    it === page
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {it}
                </Link>
              )
            )}
            {page < totalPages && (
              <Link
                href={pageUrl(typeKey, citySlug, page + 1)}
                rel="next"
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </nav>
        )}

        <div className="text-center mt-10">
          <Link href="/directory" className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            ← All directory categories
          </Link>
        </div>
      </div>
    </div>
  );
}
