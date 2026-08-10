import Link from "next/link";
import { ArrowRight, Info, Scissors } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { caWorkforce } from "@/lib/ca-workforce";

/**
 * California barber earnings — the same survey, and a genuinely different
 * answer from the esthetician page.
 *
 * WHY IT IS NOT A COPY. The framing is shared (published salary figures
 * annualise a full-time week the board's survey does not support), but the
 * finding inverts. Barbering is the ONLY licence in the survey where the
 * full-time band is the largest: 33.5%, against 8.7% for esthetics. So the
 * salary estimates are far closer to right for barbers than for anyone else
 * the board licenses — while still describing only a third of them.
 *
 * That contrast is the honest reason to have two pages instead of one: the
 * correction is not "published figures are wrong", it is "published figures
 * assume something that is true for a third of barbers and a twelfth of
 * estheticians", and nobody separates the two.
 *
 * ~100/mo across "barber salary california" (70) and "average barber salary
 * california" (30). Small, but it feeds the barber licence guide, and the
 * comparison is what makes both pages worth reading.
 */

const B = caWorkforce("barbering");
const E = caWorkforce("esthetics");
const FULL_TIME = B.hours.find((h) => h.band.startsWith("40"))!;
const E_FULL_TIME = E.hours.find((h) => h.band.startsWith("40"))!;
const THIRTY_PLUS = B.hours
  .filter((h) => h.band.startsWith("30") || h.band.startsWith("40"))
  .reduce((s, h) => s + h.pct, 0);

const TITLE = "Barber Salary in California: What the Board's Survey Shows";
const DESCRIPTION =
  "California barber pay figures assume a full-time week. The board's survey says 33.5% work one — the highest of any licence it issues, and still only a third.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-barber-salary`;

const FAQS = [
  {
    q: "What is the average barber salary in California?",
    a: `The board publishes no earnings data, so any average you find comes from job advertisements and self-reported submissions rather than from a state register. What the board does publish is hours: in its survey of ${B.respondents} barbering licensees, ${FULL_TIME.pct}% reported working 40 or more hours a week. That matters because an annual salary figure is an hourly rate multiplied by a full-time year, so those figures describe roughly a third of California barbers.`,
  },
  {
    q: "Do barbers work full time in California?",
    a: `More than any other licence the board issues, but still a minority. ${FULL_TIME.pct}% reported 40 or more hours and ${THIRTY_PLUS.toFixed(1)}% reported 30 hours or more. For comparison, only ${E_FULL_TIME.pct}% of estheticians reported a full-time week. If you are comparing career paths on published salary figures, that difference in the underlying assumption matters more than the difference in the headline numbers.`,
  },
  {
    q: "Why do barber salary estimates vary so much?",
    a: "They are built from job ads and voluntary submissions, and they annualise. Two sites can publish very different figures from similar hourly rates simply by assuming a different working year. None of them draws on a register of what licensees earn, because California does not maintain one.",
  },
  {
    q: "How many clients does a California barber see a day?",
    a: `${B.lowClientLoad!.pct}% of respondents reported ${B.lowClientLoad!.band}. Note that the board used a wider band for barbering than for the other licences, so this is not directly comparable to the esthetician or manicurist figures.`,
  },
  {
    q: "Is barbering the better-paid licence in California?",
    a: `The board's data cannot answer that, because it collects no earnings. What it shows is that barbers work the longest weeks of any licence type it regulates. Whether that converts into more money depends on rate and on whether you are employed, renting a chair, or running the shop — and the board's survey does not track any of those against income.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "barber salary california",
    "average barber salary california",
    "how much do barbers make in california",
    "california barber pay",
    "california barber hours worked",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaBarberSalaryPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology survey data
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Barber salary in California
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          California keeps no record of what licensees earn, so every published barber salary is an
          estimate built from job ads and annualised over a full-time year. For barbers, that
          assumption holds up better than for any other licence the board issues &mdash; and it
          still only describes a third of them.
        </p>

        <ResearchByline
          verifiedOn={VERIFIED_ON}
          what="The board's own licensee survey read from its 2026 report to the Legislature, compiled"
        />

        <section className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-indigo-950">
            <Scissors className="h-5 w-5" />
            Barbers work the longest weeks the board records
          </h2>
          <p className="mt-2 text-6xl font-black leading-none text-indigo-700">{FULL_TIME.pct}%</p>
          <p className="mt-2 text-sm font-bold text-indigo-950">
            reported working 40 or more hours a week &mdash; {FULL_TIME.n} of {B.respondents}{" "}
            respondents
          </p>
          <p className="mt-4 text-sm leading-relaxed text-indigo-950/90">
            It is the only licence in the board&apos;s survey where the full-time band is the
            largest single group. Esthetics reports {E_FULL_TIME.pct}%, manicuring 13.2%,
            electrology 11.0%. So a published barber salary is closer to the mark than a published
            esthetician salary &mdash; not because the estimate is better, but because the
            assumption behind it is true more often.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">The distribution</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <caption className="sr-only">
                Hours worked per week reported by California barbering licensees
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th scope="col" className="pb-2 pr-4 font-black text-slate-900">Hours per week</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-500">Respondents</th>
                  <th scope="col" className="pb-2 text-right font-black text-slate-900">Share</th>
                </tr>
              </thead>
              <tbody>
                {B.hours.map((h) => (
                  <tr key={h.band} className="border-b border-slate-100">
                    <td className={`py-2 pr-4 ${h.band === "Missing" ? "italic text-slate-400" : "text-slate-700"}`}>
                      {h.band}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">{h.n}</td>
                    <td className={`py-2 text-right font-bold tabular-nums ${h.band === "Missing" ? "text-slate-400" : "text-slate-900"}`}>
                      {h.pct}%
                    </td>
                  </tr>
                ))}
                <tr className="border-b-2 border-slate-300">
                  <td className="py-2 pr-4 font-black text-slate-900">Total</td>
                  <td className="py-2 pr-4 text-right font-black tabular-nums text-slate-900">{B.respondents}</td>
                  <td className="py-2 text-right font-black tabular-nums text-slate-900">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            <strong className="font-bold text-slate-900">{THIRTY_PLUS.toFixed(1)}%</strong> reported
            30 hours or more. The Missing row is kept in rather than dropped, because removing it
            quietly raises every other share.
          </p>
        </section>

        {/* The comparison is the point of having two pages. */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">
            Why this matters when comparing careers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th scope="col" className="pb-2 pr-4 font-black text-slate-900">Licence</th>
                  <th scope="col" className="pb-2 text-right font-black text-slate-900">
                    Working 40+ hrs/week
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-bold text-slate-900">Barbering</td>
                  <td className="py-2 text-right font-black tabular-nums text-indigo-700">{FULL_TIME.pct}%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Manicuring</td>
                  <td className="py-2 text-right font-bold tabular-nums text-slate-700">13.2%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Electrology</td>
                  <td className="py-2 text-right font-bold tabular-nums text-slate-700">11.0%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Esthetics</td>
                  <td className="py-2 text-right font-bold tabular-nums text-slate-700">{E_FULL_TIME.pct}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Two annual salary figures that look comparable are not, if one assumes a week that a
            third of licensees work and the other assumes a week that a twelfth of them work.
            Anyone weighing barbering against esthetics on published pay figures is comparing
            estimates built on very different footing, and no salary page says so.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-black text-slate-900">
            <Info className="h-5 w-5 text-slate-500" />
            What this page will not give you
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            A figure. The board collects no licensee earnings data &mdash; across its 517-page 2026
            report to the Legislature, every wage reference concerns apprentice pay rules, staff
            appraisal or travel reimbursement. Multiplying an hourly rate we do not have by hours we
            do would produce something that looks authoritative and is not. What the survey supports
            is narrower: check what working week a figure assumes before you plan around it.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-black text-slate-900">Common questions</h2>
          <div className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="mb-1.5 text-sm font-black text-slate-900">{f.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-barber-license"
            data-ig-click="ca_barber_salary_to_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                What the licence takes
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                1,000 hours, $125 in board fees, and where the scope differs from cosmetology.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-esthetician-salary"
            data-ig-click="ca_barber_salary_to_esthy_salary"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Estheticians, for comparison
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                The same survey, and a {E_FULL_TIME.pct}% full-time rate.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Hours and client load from the occupational analyses in the California Board of Barbering
          &amp; Cosmetology&apos;s 2026 Sunset Review Report to the Legislature &mdash; barbering
          p.{B.page}, esthetics p.{E.page}. These are self-selected survey respondents rather than
          all licensees, sample sizes differ substantially between licences, and the board publishes
          no earnings data. Confirm on{" "}
          <a
            href="https://www.barbercosmo.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            barbercosmo.ca.gov
          </a>
          .
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California barber earnings and hours worked" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Barber earnings", item: PAGE },
            ],
          }),
        }}
      />
    </div>
  );
}
