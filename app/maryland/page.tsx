import Link from "next/link";
import { ArrowRight, ExternalLink, ScrollText } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { SITE_URL } from "@/lib/site";
import { authorSchema } from "@/lib/author";
import {
  CHECKED,
  MD_SOURCES,
  BARBER_REQUIREMENTS,
  COSMETOLOGY_REQUIREMENTS,
  RENEWAL,
} from "@/lib/maryland-licensing";

/**
 * Maryland hub.
 *
 * Deliberately NOT shaped like /texas or /california. Those lead with entity
 * counts because there are thousands of Texas and California shops, salons and
 * schools in the database. There are no Maryland entities yet, and a hub that
 * opens with empty directories would promise something the site cannot deliver.
 *
 * So this leads with what Maryland actually has: licensing facts read from the
 * two boards, every one of which links back to the page it came from. When
 * entity data arrives the directory sections can slot in above the fold.
 */

const TITLE = "Maryland Barber & Cosmetology Licensing (2026)";
const DESCRIPTION =
  "Maryland barber and cosmetology licensing: training hours, the full fee schedule from both boards, renewal cycles and CE, and the practical exam kit — sourced from the Maryland Department of Labor and the PSI candidate bulletins.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "maryland barber license",
    "maryland cosmetology license",
    "maryland board of barbers",
    "maryland board of cosmetologists",
    "maryland cosmetology license renewal",
    "maryland barber license requirements",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION },
  alternates: { canonical: `${SITE_URL}/maryland` },
};

const PAGES = [
  {
    href: "/maryland-barber-license-requirements",
    label: "Barber licence requirements",
    why: "1,200 school hours or 2,250 as an apprentice — plus every other category and the full fee table.",
  },
  {
    href: "/maryland-cosmetology-license-requirements",
    label: "Cosmetology licence requirements",
    why: "1,500 hours for a cosmetologist down to 250 for a nail technician, and the blow dry stylist licence almost no state has.",
  },
  {
    href: "/maryland-barber-license-renewal",
    label: "Barber licence renewal",
    why: "Two-year cycle, $56, and — unlike cosmetology — no continuing education.",
  },
  {
    href: "/maryland-cosmetology-license-renewal",
    label: "Cosmetology licence renewal",
    why: "Two-year cycle, $28, and 6 hours of CE since 1 June 2024.",
  },
  {
    href: "/maryland-barber-practical-exam-kit-list",
    label: "Barber & master barber kit list",
    why: "What PSI requires in the room, from a bulletin the board's own site does not link.",
  },
];

/**
 * The PSI National Practical guides, kept in their own list.
 *
 * They are a different kind of page from the guides above: those answer "what
 * does this licence take", these answer "what happens in the exam room". They
 * also share a fact worth stating once, here — PSI publishes no supply list for
 * any of them, which is the question most candidates arrive with.
 */
const PRACTICALS = [
  { href: "/maryland-cosmetology-practical-exam", label: "Cosmetology practical", why: "11 topics, 235 minutes, 75% to pass." },
  { href: "/maryland-hairstylist-practical-exam", label: "Hairstylist practical", why: "7 topics, 145 minutes." },
  { href: "/maryland-nail-technician-practical-exam", label: "Nail technician practical", why: "5 topics, 90 minutes, low-odour monomer only." },
  { href: "/maryland-esthetician-practical-exam", label: "Esthetician practical", why: "5 topics, 85 minutes, includes make-up application." },
  { href: "/maryland-eyelash-extension-practical-exam", label: "Eyelash extension practical", why: "4 topics, 60 minutes, includes a blood exposure incident." },
  { href: "/maryland-blow-dry-stylist-practical-exam", label: "Blow dry stylist practical", why: "3 topics — a licence most states do not have." },
];

export default function MarylandHubPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Maryland
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
          Maryland Barber &amp; Cosmetology Licensing
        </h1>
        <p className="mb-8 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Maryland runs <strong>two separate boards</strong> — the Board of Barbers under Title 4 of
          the Business Occupations and Professions Article, and the Board of Cosmetologists under
          Title 5. They set different hours, different fees, and only one of them requires
          continuing education. Everything below is read from those two boards and links back to the
          page it came from.
        </p>

        <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          <strong className="text-slate-900">Checked {CHECKED}.</strong> Maryland publishes almost
          none of this as a PDF — the fee tables and hour requirements exist only as web pages, and
          those pages carry no version and change without notice. Every figure here names its
          source. Confirm against that source before you rely on it.
        </div>

        {/* ---- the numbers that bring people here ------------------------- */}
        <section className="mb-10 grid gap-3 sm:grid-cols-3">
          {[
            { n: "1,200", l: "hours for a barber licence", s: "or 2,250 as an apprentice" },
            { n: "1,500", l: "hours for a cosmetologist", s: "or 24 months apprenticing" },
            { n: "6", l: "CE hours to renew cosmetology", s: "barbers require none" },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-2xl font-black tracking-tight text-slate-900">{x.n}</p>
              <p className="text-sm font-bold text-slate-700">{x.l}</p>
              <p className="mt-0.5 text-xs text-slate-500">{x.s}</p>
            </div>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-black text-slate-900">Guides</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {PAGES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                    {p.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{p.why}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-2 text-lg font-black text-slate-900">Practical exams</h2>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-slate-600">
            Maryland runs two different practical systems. The barber exams are Maryland-specific and
            come with an itemised kit. Everything under the Board of Cosmetologists uses the{" "}
            <strong>PSI National Practical test</strong>, for which PSI states plainly that there are
            no supply lists or suggested supplies — you bring what you would use at work. Each guide
            below gives that licence&apos;s graded topics, timings and pass mark.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRACTICALS.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">{p.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{p.why}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </Link>
            ))}
          </div>
        </section>

        {/* ---- licence categories at a glance ----------------------------- */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-black text-slate-900">Every licence, and the hours behind it</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Licence</th>
                  <th className="px-4 py-3">Board</th>
                  <th className="px-4 py-3">School hours</th>
                  <th className="px-4 py-3">Apprentice route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ...BARBER_REQUIREMENTS.map((r) => ({ ...r, board: "Barbers" })),
                  ...COSMETOLOGY_REQUIREMENTS.map((r) => ({ ...r, board: "Cosmetologists" })),
                ].map((r) => (
                  <tr key={r.board + r.license}>
                    <td className="px-4 py-2.5 font-bold text-slate-800">{r.license}</td>
                    <td className="px-4 py-2.5 text-slate-500">{r.board}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">
                      {r.schoolHours ? r.schoolHours.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-700">
                      {r.apprenticeHours ? `${r.apprenticeHours.toLocaleString()} hrs` : "see guide"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Barber figures from the Board of Barbers; cosmetology from the Board of Cosmetologists.
            The two are not interchangeable.
          </p>
        </section>

        {/* ---- honest note about what this hub is not --------------------- */}
        <section className="mb-10 rounded-2xl border border-amber-300 bg-amber-50 px-6 py-5">
          <p className="text-sm leading-relaxed text-amber-900">
            <strong className="text-amber-950">No Maryland business listings yet.</strong> The
            directory covers Texas and California shops, salons, schools and supply stores. Maryland
            here is licensing information only — we would rather say so than show you an empty
            search box.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900">
            <ScrollText className="h-4.5 w-4.5 text-indigo-600" />
            Straight to the boards
          </h2>
          <ul className="space-y-2 text-sm">
            {[
              ["Board of Barbers — licence requirements", MD_SOURCES.barberRequirements],
              ["Board of Barbers — forms &amp; fees", MD_SOURCES.barberFees],
              ["Board of Cosmetologists — licence requirements", MD_SOURCES.cosRequirements],
              ["Board of Cosmetologists — forms &amp; fees", MD_SOURCES.cosFees],
              ["Barbers law &amp; regulations (Title 4)", MD_SOURCES.barberLaw],
              ["Cosmetologists law &amp; regulations (Title 5)", MD_SOURCES.cosLaw],
              ["Maryland licence search", MD_SOURCES.licenseSearch],
              ["PSI candidate portal (both boards)", MD_SOURCES.psiPortal],
            ].map(([label, href]) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:underline"
                  dangerouslySetInnerHTML={{ __html: label }}
                />
                <ExternalLink className="ml-1 inline h-3 w-3 text-slate-400" />
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link href="/texas" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-sm hover:border-indigo-300">
            Texas hub →
          </Link>
          <Link href="/california" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-900 shadow-sm hover:border-indigo-300">
            California hub →
          </Link>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/maryland`,
            author: authorSchema(),
            about: { "@type": "Thing", name: "Maryland barber and cosmetology licensing" },
          }),
        }}
      />
    </div>
  );
}
