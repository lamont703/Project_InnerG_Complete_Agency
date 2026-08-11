import Link from "next/link";
import {
  BadgeCheck, Award, Clock, MapPin, Compass, ScrollText, ClipboardCheck,
  ArrowRight, ExternalLink, Info,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { MarylandResourceIndex } from "@/components/maryland/MarylandResourceIndex";
import { SITE_URL } from "@/lib/site";
import {
  REGULATORS, breadcrumbNode, graph, ref, stateNode, topics, webPageNode,
} from "@/lib/schema-graph";
import { authorSchema } from "@/lib/author";
import {
  CHECKED, MD_SOURCES, BARBER_REQUIREMENTS, COSMETOLOGY_REQUIREMENTS, PSI_PRACTICALS,
} from "@/lib/maryland-licensing";

/**
 * Maryland hub.
 *
 * DESIGN FOLLOWS /texas DELIBERATELY. Same slate-50 canvas, same max-w-6xl
 * column, same centred hero over a row of stat chips, same white section cards
 * with an icon and a one-line explainer, same four-up grids of slate-50 tiles.
 * A visitor moving between state hubs should not feel they have left the site,
 * even though Maryland has a fraction of the content behind it.
 *
 * WHAT IT DOES NOT COPY, and why. Texas opens on entity counts and city
 * directories because thousands of Texas businesses sit behind them. Maryland
 * has none yet. The layout is identical; the chips carry licensing figures
 * instead of business counts, and the page says plainly that the directory does
 * not cover Maryland rather than showing an empty search box in the same shape.
 *
 * The Texas sponsorship banner is also absent — a state sponsorship slot with
 * no sponsor is a hole, not a design element.
 */

const TITLE = "Maryland Barber & Cosmetology Licensing (2026)";
const DESCRIPTION =
  "Maryland barber and cosmetology licensing: training hours, the full fee schedule from both boards, renewal cycles and CE, and every practical exam — sourced from the Maryland Department of Labor and the PSI candidate bulletins.";

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
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/maryland`, type: "website" },
  alternates: { canonical: `${SITE_URL}/maryland` },
};

const GUIDES = [
  { href: "/maryland-barber-license-requirements", label: "Barber requirements", note: "1,200 school hours or 2,250 apprentice" },
  { href: "/maryland-cosmetology-license-requirements", label: "Cosmetology requirements", note: "1,500 hours down to 250" },
  { href: "/maryland-barber-license-renewal", label: "Barber renewal", note: "$56 · 2-year cycle · no CE" },
  { href: "/maryland-cosmetology-license-renewal", label: "Cosmetology renewal", note: "$28 · 2-year cycle · 6 CE hours" },
];

const PRACTICAL_LINKS = [
  { href: "/maryland-barber-practical-exam-kit-list", label: "Barber & master barber", note: "The one exam with an itemised kit" },
  ...PSI_PRACTICALS.map((p) => ({
    href: `/${p.slug}`,
    label: p.license.replace("Limited ", ""),
    note: `${p.topics.length} topics · ${p.totalMinutesStated} min · ${p.passPct}%`,
  })),
];

const BOARD_LINKS = [
  { label: "Board of Barbers — requirements", href: MD_SOURCES.barberRequirements },
  { label: "Board of Barbers — fees", href: MD_SOURCES.barberFees },
  { label: "Board of Cosmetologists — requirements", href: MD_SOURCES.cosRequirements },
  { label: "Board of Cosmetologists — fees", href: MD_SOURCES.cosFees },
  { label: "Barbers law (Title 4)", href: MD_SOURCES.barberLaw },
  { label: "Cosmetologists law (Title 5)", href: MD_SOURCES.cosLaw },
  { label: "Maryland licence search", href: MD_SOURCES.licenseSearch },
  { label: "PSI candidate portal", href: MD_SOURCES.psiPortal },
];

const MD_LABOR = "https://labor.maryland.gov/license/barbers/";

export default function MarylandHubPage() {
  /**
   * Maryland's two boards are modelled as two nodes under one department,
   * because that is what they are. Collapsing them into "the Maryland
   * regulator" would erase the distinction this entire hub exists to teach —
   * different titles of the statute, different hours, and CE on one side only.
   */
  const boards = [
    {
      "@type": "GovernmentOrganization",
      "@id": `${SITE_URL}/maryland#board-of-barbers`,
      name: "Maryland Board of Barbers",
      url: MD_SOURCES.barberRequirements,
      parentOrganization: ref(REGULATORS.md["@id"]),
    },
    {
      "@type": "GovernmentOrganization",
      "@id": `${SITE_URL}/maryland#board-of-cosmetologists`,
      name: "Maryland Board of Cosmetologists",
      url: MD_SOURCES.cosRequirements,
      parentOrganization: ref(REGULATORS.md["@id"]),
    },
  ];

  const jsonLd = graph(
    {
      ...webPageNode({
        path: "/maryland",
        type: "CollectionPage",
        name: TITLE,
        description: DESCRIPTION,
        breadcrumb: true,
      }),
      author: authorSchema(),
      about: [
        ref(REGULATORS.md["@id"]),
        ref(boards[0]["@id"]),
        ref(boards[1]["@id"]),
        stateNode("MD"),
        ...topics("barbering", "cosmetology", "esthetics", "nails"),
      ],
      citation: [
        { "@type": "WebPage", name: "Maryland Board of Barbers", url: MD_SOURCES.barberRequirements },
        { "@type": "WebPage", name: "Maryland Board of Cosmetologists", url: MD_SOURCES.cosRequirements },
        { "@type": "Legislation", name: "Business Occupations and Professions Article, Title 4 (Barbers)", url: MD_SOURCES.barberLaw, legislationJurisdiction: stateNode("MD") },
        { "@type": "Legislation", name: "Business Occupations and Professions Article, Title 5 (Cosmetologists)", url: MD_SOURCES.cosLaw, legislationJurisdiction: stateNode("MD") },
      ],
    },
    breadcrumbNode("/maryland", [
      { name: "Home", path: "" },
      { name: "Maryland", path: "/maryland" },
    ]),
    REGULATORS.md,
    ...boards,
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="min-h-screen bg-slate-50 light flex flex-col">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-12 flex-1 w-full">

          {/* ---- hero ---------------------------------------------------- */}
          <div className="text-center max-w-2xl mx-auto mb-4">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
              Maryland Barber &amp; Cosmetology Licensing
            </h1>
            <p className="text-slate-600">
              Two separate boards, two sets of rules — training hours, fees, renewal and every
              practical exam, read from the Maryland Department of Labor and the PSI bulletins.
            </p>
          </div>

          {/* ---- stat chips ---------------------------------------------- */}
          <div className="max-w-4xl mx-auto mb-8 flex flex-wrap gap-3 justify-center">
            <Link
              href="/maryland-barber-license-requirements"
              className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5 hover:border-indigo-300 transition-colors"
            >
              <BadgeCheck className="w-5 h-5 text-blue-700 shrink-0" />
              <p className="text-sm text-slate-600">
                <span className="font-black text-slate-900">1,200</span> hours · barber
              </p>
            </Link>
            <Link
              href="/maryland-cosmetology-license-requirements"
              className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5 hover:border-indigo-300 transition-colors"
            >
              <Award className="w-5 h-5 text-indigo-600 shrink-0" />
              <p className="text-sm text-slate-600">
                <span className="font-black text-slate-900">1,500</span> hours · cosmetologist
              </p>
            </Link>
            <Link
              href="/maryland-cosmetology-license-renewal"
              className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-3 flex items-center gap-2.5 hover:border-indigo-300 transition-colors"
            >
              <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-slate-600">
                <span className="font-black text-slate-900">6</span> CE hours · cosmetology only
              </p>
            </Link>
          </div>

          {/* ---- licensing guides ---------------------------------------- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <ScrollText className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Licensing Guides</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              The Board of Barbers sits under Title 4 of the Business Occupations and Professions
              Article, the Board of Cosmetologists under Title 5 — different hours, different fees,
              and only one of them requires continuing education.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {GUIDES.map((g) => (
                <Link
                  key={g.href}
                  href={g.href}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 block"
                >
                  <p className="font-bold text-slate-900 text-sm">{g.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{g.note}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* ---- practical exams ----------------------------------------- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Practical Exams</h2>
              <span className="text-sm font-bold text-slate-400">({PRACTICAL_LINKS.length})</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Maryland runs two different systems. The barber exams are Maryland-specific and come
              with an itemised kit. Everything under the cosmetology board uses the PSI National
              Practical test, for which PSI states there are no supply lists — you bring what you
              would use at work.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {PRACTICAL_LINKS.map((p) => (
                <Link
                  key={p.href}
                  href={p.href}
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 block"
                >
                  <p className="font-bold text-slate-900 text-sm">{p.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.note}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* ---- every licence at a glance -------------------------------- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Every Licence, and the Hours Behind It</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Barber figures come from the Board of Barbers, cosmetology from the Board of
              Cosmetologists. The two are not interchangeable.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[32rem] text-sm">
                <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Licence</th>
                    <th className="px-4 py-3">Board</th>
                    <th className="px-4 py-3">School hours</th>
                    <th className="px-4 py-3">Apprentice route</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {[
                    ...BARBER_REQUIREMENTS.map((r) => ({ ...r, board: "Barbers" })),
                    ...COSMETOLOGY_REQUIREMENTS.map((r) => ({ ...r, board: "Cosmetologists" })),
                  ].map((r) => (
                    <tr key={r.board + r.license}>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{r.license}</td>
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
          </div>

          {/* ---- straight to the boards ----------------------------------- */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 mb-8">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-black text-slate-900">Statewide Resources</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Straight to the source. Barbering and cosmetology in Maryland are regulated by the{" "}
              <a href={MD_LABOR} className="font-semibold text-blue-700 hover:underline">
                Maryland Department of Labor
              </a>
              , Division of Occupational and Professional Licensing.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {BOARD_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 block"
                >
                  <p className="font-bold text-slate-900 text-sm inline-flex items-center gap-1">
                    {l.label}
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                  </p>
                </a>
              ))}
            </div>
          </div>

          <MarylandResourceIndex />

          {/* ---- what this hub is not ------------------------------------- */}
          <div className="bg-white border border-amber-300 rounded-2xl shadow-sm px-6 py-5 mb-8">
            <div className="flex items-start gap-2.5">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-black text-slate-900 mb-1">No Maryland business listings yet</h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  The directory covers Texas and California shops, salons, schools and supply stores.
                  Maryland here is licensing information only — we would rather say so than show you
                  an empty search box.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  <strong className="text-slate-700">Checked {CHECKED}.</strong> Maryland publishes
                  almost none of this as a PDF; the fee tables and hour requirements exist only as web
                  pages that carry no version and change without notice. Every figure names its
                  source — confirm against it before you rely on it.
                </p>
              </div>
            </div>
          </div>

          {/* ---- sibling hubs --------------------------------------------- */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/texas"
              className="rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 flex items-center justify-between gap-2"
            >
              <span className="font-bold text-slate-900 text-sm">Texas Hub</span>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>
            <Link
              href="/california"
              className="rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 transition-colors p-4 flex items-center justify-between gap-2"
            >
              <span className="font-bold text-slate-900 text-sm">California Hub</span>
              <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
            </Link>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/tools/barbershop-search"
              className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ← Back to Search
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
