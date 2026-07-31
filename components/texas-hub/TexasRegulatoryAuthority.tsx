import Link from "next/link";
import { BookOpen, Building2, Database, GraduationCap, Scale, Users } from "lucide-react";
import type { TdlrLicenseSummary } from "@/lib/tdlr-license-summary";

/**
 * Regulatory authority and statewide licence counts for /texas.
 *
 * Lives here rather than inside TexasHubDirectory because that component is
 * shared with /california — Texas statute citations must not render on a
 * California page.
 *
 * Two jobs. First, bind the page to the entity cluster its audience actually
 * searches in: TDLR, Occupations Code 1601/1602, "Class A Barber", "Cosmetology
 * Operator". The page previously mentioned none of them. Second, give
 * publishers something worth citing — the counts below don't exist in this form
 * anywhere else, including on TDLR's own site.
 *
 * On outbound links: these are plain follow links to primary sources. Adding
 * rel="nofollow" to a state agency and the state statute would forfeit the
 * trust signal the block exists to earn, and "PageRank leak" isn't a real cost
 * at this scale.
 *
 * The non-affiliation line is not boilerplate. A page that organises an agency's
 * rules and quotes its data can read as semi-official, and that is the one real
 * risk here — to the reader and to us.
 */

const TDLR_URL = "https://www.tdlr.texas.gov/barbering-and-cosmetology/";
const OC_1601 = "https://statutes.capitol.texas.gov/Docs/OC/htm/OC.1601.htm";
const OC_1602 = "https://statutes.capitol.texas.gov/Docs/OC/htm/OC.1602.htm";
const OPEN_DATA = "https://data.texas.gov/dataset/Barber-and-Cosmetologist-Licensees/7358-krk7";
const PAGE_URL = "https://agency.innergcomplete.com/texas";

const fmt = (n: number) => n.toLocaleString("en-US");

function niceDate(iso: string | null): string {
  if (!iso) return "the latest available extract";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export function TexasRegulatoryAuthority({ summary }: { summary: TdlrLicenseSummary | null }) {
  const asOf = niceDate(summary?.snapshotDate ?? null);
  const year = new Date().getUTCFullYear();

  return (
    <section
      id="texas-licensing-authority"
      className="mx-auto max-w-5xl px-4 pb-16 sm:px-6"
      aria-labelledby="texas-licensing-authority-heading"
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Scale className="h-3.5 w-3.5" /> Licensing authority
        </div>
        <h2 id="texas-licensing-authority-heading" className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          Who regulates barbering and cosmetology in Texas
        </h2>

        <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
          Barbering and cosmetology in Texas are regulated by the{" "}
          <a href={TDLR_URL} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500">
            Texas Department of Licensing and Regulation (TDLR)
          </a>
          , which issues and renews every individual, establishment and school licence in the
          state. The underlying law is{" "}
          <a href={OC_1601} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500">
            Texas Occupations Code Chapter 1601
          </a>{" "}
          for barbering and{" "}
          <a href={OC_1602} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500">
            Chapter 1602
          </a>{" "}
          for cosmetology. Every shop, salon, school and licensed professional in this directory
          operates under those chapters.
        </p>

        {/* The citable part */}
        {summary && (
          <>
            <h3 className="mt-8 flex items-center gap-2 text-lg font-black text-slate-900">
              <Database className="h-4 w-4 text-blue-700" />
              Texas barbering &amp; cosmetology licences, {year}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500">
              All figures as of <strong className="text-slate-700">{asOf}</strong>, derived from TDLR&apos;s
              licensee extract.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Users, label: "Licensed practitioners", value: summary.practitioners },
                { icon: Building2, label: "Licensed establishments", value: summary.establishments },
                { icon: GraduationCap, label: "Schools & CE providers", value: summary.schools },
                { icon: BookOpen, label: "Expiring within 90 days", value: summary.expiring90d },
              ].map((t) => (
                <div key={t.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <t.icon className="h-4 w-4 text-blue-700" />
                  <div className="mt-2 text-2xl font-black tabular-nums text-slate-900">{fmt(t.value)}</div>
                  <div className="mt-0.5 text-xs leading-snug text-slate-500">{t.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse text-sm">
                <caption className="sr-only">
                  Active Texas barbering and cosmetology licences by licence type, as of {asOf}
                </caption>
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th scope="col" className="py-2">Licence type</th>
                    <th scope="col" className="py-2 text-right">Active</th>
                    <th scope="col" className="py-2 text-right">Expiring in 90 days</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.types.slice(0, 12).map((t) => (
                    <tr key={t.licenseType} className="border-b border-slate-50">
                      <th scope="row" className="py-2 text-left font-medium text-slate-700">{t.licenseType}</th>
                      <td className="py-2 text-right tabular-nums text-slate-900">{fmt(t.total)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-500">{fmt(t.expiring90d)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 font-black">
                    <th scope="row" className="py-2 text-left text-slate-900">All licence types</th>
                    <td className="py-2 text-right tabular-nums text-slate-900">{fmt(summary.totalLicenses)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-700">{fmt(summary.expiring90d)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Source: licensee extract published by the Texas Department of Licensing and Regulation
              via the{" "}
              <a href={OPEN_DATA} className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500">
                Texas Open Data Portal
              </a>
              , snapshot {asOf}. Counts are of licence records, not unique individuals — one person
              may hold more than one licence.
            </p>
          </>
        )}

        {/* Make citing it effortless */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Cite this page</h3>
          <p className="mt-3 font-mono text-xs leading-relaxed text-slate-700">
            Inner G Complete Agency. &ldquo;Texas Barbershops, Hair Salons &amp; Barber Schools
            Directory.&rdquo; ShearQuery, {asOf}. {PAGE_URL}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            Figures may be reproduced with attribution to this page and to TDLR as the underlying
            source. If you need a breakdown we don&apos;t publish here — by county, by expiry month,
            or over time — ask and we&apos;ll prepare it.
          </p>
        </div>

        {/* Where the depth lives */}
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[
            { href: "/texas-barber-license-renewal", label: "Barber licence renewal" },
            { href: "/texas-cosmetology-license-renewal", label: "Cosmetology licence renewal" },
            { href: "/insights/texas-barber-cosmetology-license-requirements", label: "Licence requirements" },
            { href: "/barber-cos-continuing-education", label: "Continuing education" },
            { href: "/texas-barber-exam-intelligence-prep", label: "Barber exam prep" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="font-bold text-blue-700 hover:underline">
              {l.label}
            </Link>
          ))}
        </div>

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-400">
          ShearQuery and Inner G Complete Agency are not affiliated with, endorsed by, or acting on
          behalf of the Texas Department of Licensing and Regulation. TDLR is cited here as the
          governing authority and as the source of the licence data shown. For official guidance,
          always consult{" "}
          <a href={TDLR_URL} className="underline hover:text-slate-600">TDLR directly</a>.
        </p>
      </div>
    </section>
  );
}
