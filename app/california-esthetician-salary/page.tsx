import Link from "next/link";
import { ArrowRight, AlertTriangle, Users } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { ORG_ID, WEBSITE_ID, graph, ref } from "@/lib/schema-graph";
import { caWorkforce } from "@/lib/ca-workforce";

/**
 * How much California estheticians actually work — filed under "salary"
 * because that is what people search, and answered honestly because we cannot
 * answer the question they asked.
 *
 * ~320/mo across "how much do estheticians make in california" (210) and "in
 * ca" (110). Every answer on the open web is an ANNUAL figure from Indeed,
 * ZipRecruiter or salary.com, and an annual figure is an hourly rate times a
 * full-time year.
 *
 * THE BOARD'S OWN SURVEY SAYS 8.7% OF ESTHETICIANS WORK A FULL-TIME WEEK.
 * 29.5% work nine hours or less. So the published estimates are answers about
 * the 8.7%, being read by the other 91%. That is a genuinely different answer
 * to a question with real volume, and it comes from the regulator's survey of
 * licensees rather than from scraped job ads.
 *
 * WHAT THIS PAGE MUST NOT DO. The board publishes NO earnings data — checked
 * across all 517 pages of the 2026 Sunset Review; every wage mention concerns
 * apprentice pay rules, the Executive Officer's appraisal or travel
 * reimbursement. So there is no number here to replace the ones elsewhere, and
 * inventing one by multiplying an hourly rate we do not have by hours we do
 * would be exactly the error the page exists to point out. It corrects an
 * assumption; it does not supply an estimate. Saying so plainly is the page's
 * whole credibility.
 */

const W = caWorkforce("esthetics");
const FULL_TIME = W.hours.find((h) => h.band.startsWith("40"))!;
const NINE_OR_LESS = W.hours.find((h) => h.band.startsWith("9"))!;
const UNDER_30 = W.hours
  .filter((h) => ["9 hours or less", "10–19 hours", "20–29 hours"].includes(h.band))
  .reduce((s, h) => s + h.pct, 0);

const TITLE = "How Much Do Estheticians Make in California? The Real Answer";
const DESCRIPTION =
  "Every California esthetician salary figure assumes a full-time week. The board's own survey of licensees says 8.7% work one. What that does to the number.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-esthetician-salary`;

const FAQS = [
  {
    q: "How much do estheticians make in California?",
    a: `Nobody can tell you honestly, and the sites that do are answering a narrower question than the one you asked. The California Board of Barbering & Cosmetology publishes no licensee earnings data at all. What it publishes is hours: in its survey of ${W.respondents.toLocaleString()} licensees, ${FULL_TIME.pct}% reported working 40 or more hours a week and ${NINE_OR_LESS.pct}% reported nine hours or less. Every annual salary figure you will find is an hourly rate multiplied by a full-time year, which describes ${FULL_TIME.pct}% of the profession.`,
  },
  {
    q: "Is esthetics a full-time job in California?",
    a: `For most licensees, no. ${UNDER_30.toFixed(1)}% of respondents to the board's survey reported working under 30 hours a week, and ${NINE_OR_LESS.pct}% reported nine hours or less — closer to a side income than a career wage. Only ${FULL_TIME.pct}% reported a full-time week. This is not a claim that the work is scarce; it is what licensees reported about their own schedules.`,
  },
  {
    q: "Why are the salary figures online so different from each other?",
    a: "Because they are estimates built from job advertisements and self-reported submissions, and because they annualise. Two sites can quote very different numbers from the same underlying hourly rates simply by assuming a different working year. None of them is drawing on a state register of what licensees earn, because California does not keep one.",
  },
  {
    q: "Do most California estheticians work for a salon?",
    a: `${W.soleOwnerPct}% of respondents described themselves as sole owners. For that group, "salary" is the wrong frame entirely: it is revenue minus rent on a room or a chair, minus product, minus the weeks with no bookings. An employed hourly rate and a sole owner's take-home are not comparable figures, and most salary pages blend them.`,
  },
  {
    q: "How many clients does a California esthetician see a day?",
    a: `${W.lowClientLoad!.pct}% of respondents reported ${W.lowClientLoad!.band}. That is the number to hold next to any per-service price when you are working out what a week actually looks like.`,
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "how much do estheticians make in california",
    "california esthetician salary",
    "esthetician pay california",
    "how much do estheticians make in ca",
    "california esthetician hours worked",
    "is esthetics a good career in california",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaEstheticianSalaryPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology survey data
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          How much do estheticians make in California?
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          The short answer is that we don&apos;t know, and neither does anyone quoting you an annual
          figure. California keeps no record of what licensees earn. What the board does have is a
          survey of {W.respondents.toLocaleString()} licensees describing how much they work &mdash;
          and it dismantles the assumption every published salary figure is built on.
        </p>

        <ResearchByline
          verifiedOn={VERIFIED_ON}
          what="The board's own licensee survey read from its 2026 report to the Legislature, compiled"
        />

        {/* The finding. */}
        <section className="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-rose-950">
            <AlertTriangle className="h-5 w-5" />
            Every salary figure assumes a full-time week
          </h2>
          <p className="text-sm leading-relaxed text-rose-950/90">
            An annual salary is an hourly rate multiplied by a working year. That is how Indeed,
            ZipRecruiter and salary.com produce theirs, and it is a reasonable method for a job
            where people work a standard week.
          </p>
          <p className="mt-4 text-6xl font-black leading-none text-rose-700">{FULL_TIME.pct}%</p>
          <p className="mt-2 text-sm font-bold text-rose-950">
            of California estheticians reported working 40 or more hours a week
          </p>
          <p className="mt-4 text-sm leading-relaxed text-rose-950/90">
            {FULL_TIME.n.toLocaleString()} respondents out of {W.respondents.toLocaleString()}. The
            published estimates are accurate answers to a question about those{" "}
            {FULL_TIME.n.toLocaleString()} people, and they are being read by the other{" "}
            {(W.respondents - FULL_TIME.n).toLocaleString()}.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">The actual distribution</h2>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            From the board&apos;s occupational analysis of the esthetician licence, self-reported by
            licensees:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <caption className="sr-only">
                Hours worked per week reported by California esthetician licensees
              </caption>
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th scope="col" className="pb-2 pr-4 font-black text-slate-900">Hours per week</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-500">Respondents</th>
                  <th scope="col" className="pb-2 text-right font-black text-slate-900">Share</th>
                </tr>
              </thead>
              <tbody>
                {W.hours.map((h) => (
                  <tr key={h.band} className="border-b border-slate-100">
                    <td className={`py-2 pr-4 ${h.band === "Missing" ? "italic text-slate-400" : "text-slate-700"}`}>
                      {h.band}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-500">
                      {h.n.toLocaleString()}
                    </td>
                    <td className={`py-2 text-right font-bold tabular-nums ${h.band === "Missing" ? "text-slate-400" : "text-slate-900"}`}>
                      {h.pct}%
                    </td>
                  </tr>
                ))}
                <tr className="border-b-2 border-slate-300">
                  <td className="py-2 pr-4 font-black text-slate-900">Total</td>
                  <td className="py-2 pr-4 text-right font-black tabular-nums text-slate-900">
                    {W.respondents.toLocaleString()}
                  </td>
                  <td className="py-2 text-right font-black tabular-nums text-slate-900">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            <strong className="font-bold text-slate-900">{UNDER_30.toFixed(1)}%</strong> reported
            working under 30 hours a week, and{" "}
            <strong className="font-bold text-slate-900">{NINE_OR_LESS.pct}%</strong> &mdash; the
            single largest band &mdash; reported nine hours or less. The Missing row is kept in
            because dropping it silently inflates every other share.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Users className="h-5 w-5 text-indigo-600" />
            And most of them are not employees
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            <strong className="font-bold text-slate-900">{W.soleOwnerPct}%</strong> of respondents
            described themselves as sole owners. For that group &ldquo;salary&rdquo; is not the
            right unit at all &mdash; the number that matters is revenue minus room or chair rent,
            minus product, minus the weeks with a light book. An employed hourly rate and a sole
            owner&apos;s take-home are different quantities, and a salary page that averages them
            together produces a figure that describes nobody.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The other half of that arithmetic is the client load:{" "}
            <strong className="font-bold text-slate-900">{W.lowClientLoad!.pct}%</strong> reported{" "}
            {W.lowClientLoad!.band}. Held next to a service price, that is a more useful planning
            number than any annual figure.
          </p>
        </section>

        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">What this page will not give you</h2>
          <p className="text-sm leading-relaxed text-slate-600">
            A number. The board collects no earnings data from licensees &mdash; across all 517
            pages of its 2026 report to the Legislature, every mention of wages concerns apprentice
            pay rules, staff appraisal or travel reimbursement. We could multiply an hourly rate we
            do not have by hours we do and publish the result, and it would look more useful than
            this page. It would also be the exact mistake this page exists to point out.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            What the survey supports is narrower and more durable: whatever figure you are looking
            at, check what working week it assumes, and compare that to the{" "}
            {FULL_TIME.pct}% who report one.
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
            href="/california-esthetician-license"
            data-ig-click="ca_esthy_salary_to_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                What the licence takes
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                600 hours, $115 in board fees, and the laser rule.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-barber-salary"
            data-ig-click="ca_esthy_salary_to_barber_salary"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                Barbers, for comparison
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                The same survey, and a very different working week.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Hours, client load and ownership from the occupational analysis of the esthetician licence
          in the California Board of Barbering &amp; Cosmetology&apos;s 2026 Sunset Review Report to
          the Legislature (p.{W.page}). These are self-selected survey respondents rather than all
          licensees, and the board publishes no earnings data. Confirm on{" "}
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
          __html: JSON.stringify(graph(
            {
            "@type": "FAQPage",
            "@id": `${SITE_URL}/california-esthetician-salary#faqpage`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
          )),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "Article",
            "@id": `${SITE_URL}/california-esthetician-salary#article`,
            "isPartOf": ref(WEBSITE_ID),
            "publisher": ref(ORG_ID),
            author: authorSchema(),
            headline: TITLE,
            description: DESCRIPTION,
            dateModified: VERIFIED_ON,
            mainEntityOfPage: PAGE,
            about: { "@type": "Thing", name: "California esthetician earnings and hours worked" },
          },
          )),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(graph(
            {
            "@type": "BreadcrumbList",
            "@id": `${SITE_URL}/california-esthetician-salary#breadcrumblist`,
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "California", item: `${SITE_URL}/california` },
              { "@type": "ListItem", position: 2, name: "Esthetician earnings", item: PAGE },
            ],
          },
          )),
        }}
      />
    </div>
  );
}
