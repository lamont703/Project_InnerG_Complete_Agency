import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { CalendarClock, ExternalLink, Info, Scale } from "lucide-react";

export const revalidate = 900;

const SITE = "https://agency.innergcomplete.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TdlrUpdate {
  id: string;
  slug: string;
  headline: string;
  summary: string;
  what_changed: string | null;
  effective_date: string | null;
  license_types: string[] | null;
  source_urls: string[] | null;
  published_at: string;
}

async function getUpdates(): Promise<TdlrUpdate[]> {
  const { data, error } = await supabase
    .from("tdlr_updates")
    .select("id, slug, headline, summary, what_changed, effective_date, license_types, source_urls, published_at")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("tdlr_updates query error:", error);
    return [];
  }
  return (data as TdlrUpdate[]) || [];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

export const metadata: Metadata = {
  title: "Texas TDLR Barber & Cosmetology Rule Changes — Dated Update Log",
  description:
    "Every TDLR barber and cosmetology rule, fee, continuing-education and exam change, dated and sourced. Know what changed, when it takes effect, and which license types it hits.",
  keywords: [
    "TDLR rule changes",
    "Texas barber law changes",
    "Texas cosmetology rule changes",
    "TDLR continuing education requirement",
    "Texas barber license fee change",
    "TDLR barbering and cosmetology updates",
    "Texas cosmetology law update",
  ],
  openGraph: {
    title: "Texas TDLR Barber & Cosmetology Rule Changes — Dated Update Log",
    description:
      "Every TDLR barber and cosmetology rule, fee, CE and exam change — dated, sourced, and mapped to the license types it affects.",
    url: `${SITE}/texas-tdlr-updates`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Texas TDLR Rule Changes — Dated Update Log",
    description: "What TDLR changed, when it takes effect, and who it affects. Sourced to TDLR.",
  },
  alternates: { canonical: `${SITE}/texas-tdlr-updates` },
};

export default async function TdlrUpdatesPage() {
  const updates = await getUpdates();
  const latest = updates[0];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Texas TDLR Barber & Cosmetology Regulatory Updates",
    itemListElement: updates.slice(0, 25).map((u, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "NewsArticle",
        headline: u.headline,
        datePublished: u.published_at,
        url: `${SITE}/texas-tdlr-updates#${u.slug}`,
        description: u.summary,
        author: { "@type": "Organization", name: "Inner G Complete" },
        publisher: { "@type": "Organization", name: "Inner G Complete", url: SITE },
        ...(u.source_urls?.length ? { isBasedOn: u.source_urls } : {}),
      },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Texas TDLR Rule Changes", item: `${SITE}/texas-tdlr-updates` },
    ],
  };

  return (
    <div className="min-h-screen light bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-14">
        <div className="max-w-3xl mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Texas TDLR Rule Changes — Barber &amp; Cosmetology
          </h1>
          <p className="text-slate-600">
            When TDLR changes a continuing-education requirement, a fee, an exam, or a renewal deadline, it
            announces it once and moves on. This is the running log: what changed, when it takes effect, which
            licenses it hits, and a link to the rule itself.
            {latest && (
              <>
                {" "}Last updated <strong>{fmtDate(latest.published_at)}</strong>.
              </>
            )}
          </p>
        </div>

        <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-8 text-sm text-blue-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Each entry is written from the TDLR notice and links to the original rule — always confirm against the
            source before you act on it, and check the effective date. TDLR is the authority; we track and date the
            changes so you don&apos;t have to watch for them.
          </p>
        </div>

        {updates.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <CalendarClock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h2 className="font-black text-slate-900 mb-1">No changes logged yet</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              We monitor TDLR&apos;s barbering and cosmetology notices directly. The moment a rule, fee, CE
              requirement, or exam change is announced, it gets dated and posted here.
            </p>
          </div>
        ) : (
          <ol className="space-y-5">
            {updates.map((u) => (
              <li
                key={u.id}
                id={u.slug}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 scroll-mt-28"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  <CalendarClock className="w-3.5 h-3.5" />
                  <time dateTime={u.published_at}>{fmtDate(u.published_at)}</time>
                  {u.effective_date && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 normal-case tracking-normal">
                      Effective {fmtDate(u.effective_date)}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-black text-slate-900 mb-2">
                  <a href={`#${u.slug}`} className="hover:text-blue-600 transition-colors">
                    {u.headline}
                  </a>
                </h2>

                <p className="text-slate-600 mb-3">{u.summary}</p>

                {u.what_changed && (
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 mb-3">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      What changed
                    </div>
                    <p className="text-sm text-slate-700">{u.what_changed}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  {(u.license_types || []).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold capitalize"
                    >
                      {t}
                    </span>
                  ))}
                  {(u.source_urls || []).map((src) => (
                    <a
                      key={src}
                      href={src}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      TDLR source
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}

        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-black text-slate-900 mb-3">Where these changes apply</h2>
          <p className="text-slate-600 mb-4 text-sm">
            A rule change usually makes one of our guides out of date. These are the pages that carry the current
            requirements — if an update above is newer than what a guide says, the update is the newer fact.
          </p>
          <ul className="space-y-1.5 text-sm">
            {[
              ["/texas-barber-license-renewal", "Texas barber license renewal"],
              ["/texas-cosmetology-license-renewal", "Texas cosmetology license renewal"],
              ["/barber-cos-continuing-education", "Continuing education portal"],
              ["/insights/texas-barber-cosmetology-license-requirements", "License requirements, fees & renewal cycle"],
              ["/how-to-get-a-barber-license-in-texas", "How to get a barber license in Texas"],
              ["/how-to-get-a-cosmetology-license-in-texas", "How to get a cosmetology license in Texas"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-blue-600 font-semibold hover:underline">
                  {label}
                </Link>
              </li>
            ))}
            <li className="pt-1.5">
              <Link href="/compare-schools" className="text-blue-600 font-semibold hover:underline">
                <Scale className="w-3.5 h-3.5 inline mr-1" />
                Compare barber &amp; cosmetology schools
              </Link>{" "}
              <span className="text-slate-500">— exam pass rates, which these rule changes eventually move.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
