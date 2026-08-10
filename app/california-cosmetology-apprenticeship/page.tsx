import Link from "next/link";
import { ExternalLink, ArrowRight, AlertTriangle, Clock, Ban, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";
import { CA_TRAINING_HOURS } from "@/lib/ca-sources";
import {
  CA_APPRENTICESHIP,
  CA_APPRENTICE_EXAM,
  CA_SCHOOL_EXAM_Q1_2026,
} from "@/lib/ca-apprenticeship";

/**
 * California's apprenticeship route — Tier 4.
 *
 * ~110/mo, the smallest cluster in the plan, and the page with the most
 * genuinely new information on it. Every existing description of California
 * apprenticeship is the sales pitch: earn while you learn, no tuition, a real
 * alternative to school. All true, and all half the story.
 *
 * THE TWO HALVES NOBODY PUTS TOGETHER:
 *
 *   3,200 on-the-job hours plus 220 classroom hours, against 1,000 hours at
 *   a school. The apprenticeship is not a shortcut — it is more than three
 *   times the hours.
 *
 *   And apprentices pass the written exam at ~40% where school candidates
 *   pass at 63-71%. The board publishes this quarterly, in a separate PDF
 *   from the school results, which is most of why nobody has noticed.
 *
 * That is not an argument against the route. Somebody who cannot fund tuition
 * is not choosing between apprenticeship and school, they are choosing between
 * apprenticeship and nothing. The page is written for that reader: here is
 * what it costs you in time and in odds, so the trade is yours to make rather
 * than one you discover at the exam.
 *
 * HONESTY CONSTRAINTS, all stated on the page rather than buried:
 *   - written exam, first-time takers only
 *   - the school comparison is a single quarter against a multi-year
 *     apprentice series; the periods are not matched
 *   - what carries it anyway is that no quarter in the series reaches the
 *     school rate
 *
 * SLUG. /california-cosmetology-apprenticeship rather than a neutral one,
 * because "california cosmetology apprenticeship" is 70/mo of the ~110 and
 * the barber phrasings have no volume of their own. The page covers all three
 * licences that have the route.
 */

const COS_HOURS = CA_TRAINING_HOURS.find((h) => h.license === "Cosmetology")!.hours;
const TOTAL_APPRENTICE_HOURS = CA_APPRENTICESHIP.ojtHours + CA_APPRENTICESHIP.rthHours;
const MULTIPLE = (TOTAL_APPRENTICE_HOURS / COS_HOURS).toFixed(1);

const TITLE = "California Cosmetology Apprenticeship: Hours & Pass Rates";
const DESCRIPTION =
  "California's apprenticeship route: 3,200 paid on-the-job hours plus 220 in class, against 1,000 at school — and how apprentices actually do on the exam.";
const VERIFIED_ON = "2026-08-10";
const PAGE = `${SITE_URL}/california-cosmetology-apprenticeship`;

const FACTS = [
  {
    label: "On-the-job hours",
    value: CA_APPRENTICESHIP.ojtHours.toLocaleString(),
    detail: `Over two years, at ${CA_APPRENTICESHIP.weeklyHours.min}–${CA_APPRENTICESHIP.weeklyHours.max} hours a week. Paid.`,
  },
  {
    label: "Classroom hours",
    value: `${CA_APPRENTICESHIP.rthHours}`,
    detail: "Related Training Hours, run by your program sponsor — and in addition to the 3,200, not part of them.",
  },
  {
    label: "Minimum age",
    value: `${CA_APPRENTICESHIP.minimumAge}`,
    detail: `A year younger than the licence itself allows, plus the ${CA_APPRENTICESHIP.grade}th grade or its equivalent.`,
  },
  {
    label: "Board fee",
    value: `$${CA_APPRENTICESHIP.boardFee}`,
    detail: "For the apprentice licence. Your program sponsor charges its own fees, plus kit and textbooks.",
  },
];

const FAQS = [
  {
    q: "How long is a cosmetology apprenticeship in California?",
    a: `Two years: ${CA_APPRENTICESHIP.ojtHours.toLocaleString()} on-the-job training hours at ${CA_APPRENTICESHIP.weeklyHours.min} to ${CA_APPRENTICESHIP.weeklyHours.max} hours a week, plus ${CA_APPRENTICESHIP.rthHours} Related Training Hours in a classroom that are additional to the ${CA_APPRENTICESHIP.ojtHours.toLocaleString()}. That is ${TOTAL_APPRENTICE_HOURS.toLocaleString()} hours in total against ${COS_HOURS.toLocaleString()} for the school route — roughly ${MULTIPLE} times as many. The apprenticeship is not the faster path; it is the paid one.`,
  },
  {
    q: "Can you do a nail or esthetician apprenticeship in California?",
    a: "No. The board's FAQ is explicit that apprenticeship is available for barbering, cosmetology and electrology only. If you want a manicurist or esthetician licence you go to a school. This is worth knowing early, because those are the two shortest and cheapest school programmes — 400 and 600 hours — and they are the ones someone priced out of cosmetology tuition is most likely to be aiming at.",
  },
  {
    q: "Do California apprentices get paid?",
    a: `Yes — that is the point of the route. The Division of Apprenticeship Standards approves the programme and the apprentice earns a wage while training, working ${CA_APPRENTICESHIP.weeklyHours.min} to ${CA_APPRENTICESHIP.weeklyHours.max} hours a week in a licensed establishment under an approved supervisor. There is no tuition in the school sense, though sponsors charge their own fees and you pay for a kit and textbooks.`,
  },
  {
    q: "Do California apprentices pass the exam at the same rate as school graduates?",
    a: `No, and the gap is large. Across eleven quarters of the board's own apprentice reports, barber apprentices passed the written exam at ${CA_APPRENTICE_EXAM.barber.pooledPassPct}% first time; across twelve quarters, cosmetology apprentices passed at ${CA_APPRENTICE_EXAM.cosmetology.pooledPassPct}%. In the first quarter of 2026, school candidates passed at ${CA_SCHOOL_EXAM_Q1_2026.barber.passPct}% and ${CA_SCHOOL_EXAM_Q1_2026.cosmetology.passPct}% respectively. Not one quarter in either apprentice series reached the school rate.`,
  },
  {
    q: "Do my cosmetology school hours count toward an apprenticeship?",
    a: "No. The board's FAQ states that clock-hours and operations accumulated at a board-approved school are non-transferable to the apprentice program. Someone who starts school, runs out of money and switches to an apprenticeship begins the 3,200 hours at zero. Nothing in the board's published material addresses the reverse case, so do not assume it works either way.",
  },
  {
    q: "What happens if I fail the exam as an apprentice?",
    a: `Your apprentice licence ends. Under Business and Professions Code section 7335 it expires two years from issue, or when you are licensed, or when you fail the licensing examination a second time — whichever comes first. You also cannot work more than three months after completing the required training without applying for and taking the exam. The board can extend either period for good cause, such as illness or military service.`,
  },
  {
    q: "Can an apprentice work alone in the shop?",
    a: "No, and this one has teeth. Section 7332 requires supervision at all times by a board-approved licensee, and states that an apprentice shall at no time be the only individual working in the establishment. An apprentice working unsupervised is deemed to be practising unlicensed — which is a problem for the establishment as much as for the apprentice.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "california cosmetology apprenticeship",
    "california barbering and cosmetology apprenticeship",
    "california cosmetology apprenticeship program",
    "cosmetology apprenticeship california requirements",
    "barber apprenticeship california",
    "california apprenticeship pass rates",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE, type: "article" },
  alternates: { canonical: PAGE },
};

export default function CaliforniaApprenticeshipPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          California Board of Barbering &amp; Cosmetology
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          California cosmetology apprenticeship
        </h1>
        <p className="mb-8 text-base leading-relaxed text-slate-600">
          California will let you earn a wage while you train for a barber, cosmetology or
          electrology licence instead of paying a school. That is a real route and almost nobody
          explains it properly. Here is the whole of it, including the two parts the sales pitch
          leaves out: it takes {MULTIPLE} times the hours, and apprentices pass the exam at a
          markedly lower rate.
        </p>

        <ResearchByline
          verifiedOn={VERIFIED_ON}
          what="Statute, the board's apprenticeship sheets and eleven quarters of its exam reports, compiled"
        />

        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{f.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{f.value}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.detail}</p>
            </div>
          ))}
        </div>

        {/* Half one of what the pitch leaves out. */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Clock className="h-5 w-5 text-indigo-600" />
            It is not the shortcut. It is {MULTIPLE}&times; the hours.
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th scope="col" className="pb-2 pr-4 font-black text-slate-900">Route</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-slate-900">Hours</th>
                  <th scope="col" className="pb-2 font-black text-slate-500">You</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Cosmetology school</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">
                    {COS_HOURS.toLocaleString()}
                  </td>
                  <td className="py-2 text-slate-500">pay tuition</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Apprenticeship &mdash; on the job</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">
                    {CA_APPRENTICESHIP.ojtHours.toLocaleString()}
                  </td>
                  <td className="py-2 text-slate-500">get paid</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-700">Apprenticeship &mdash; classroom</td>
                  <td className="py-2 pr-4 text-right font-bold tabular-nums text-slate-900">
                    +{CA_APPRENTICESHIP.rthHours}
                  </td>
                  <td className="py-2 text-slate-500">sponsor&apos;s fees</td>
                </tr>
                <tr className="border-b-2 border-slate-300">
                  <td className="py-2 pr-4 font-black text-slate-900">Apprenticeship total</td>
                  <td className="py-2 pr-4 text-right font-black tabular-nums text-slate-900">
                    {TOTAL_APPRENTICE_HOURS.toLocaleString()}
                  </td>
                  <td className="py-2 text-slate-500">two years</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            The {CA_APPRENTICESHIP.rthHours} classroom hours are{" "}
            <strong className="font-bold text-slate-900">in addition to</strong> the{" "}
            {CA_APPRENTICESHIP.ojtHours.toLocaleString()}, not carved out of them &mdash; the
            board&apos;s FAQ answers that question directly, which suggests people keep assuming
            otherwise. At {CA_APPRENTICESHIP.weeklyHours.min} to{" "}
            {CA_APPRENTICESHIP.weeklyHours.max} hours a week this is a full-time job, not something
            done around one.
          </p>
        </section>

        {/* Half two, and the reason this page exists. */}
        <section className="mb-10 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-rose-950">
            <AlertTriangle className="h-5 w-5" />
            Apprentices pass the written exam at about 40%
          </h2>
          <p className="text-sm leading-relaxed text-rose-950/90">
            The board publishes apprentice exam results quarterly, in a separate report from the
            school results &mdash; which is most of the reason nobody has put the two side by side.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-sm">
              <caption className="sr-only">
                California written exam pass rates for first-time test takers, apprentice programmes
                against schools
              </caption>
              <thead>
                <tr className="border-b border-rose-300 text-left">
                  <th scope="col" className="pb-2 pr-4 font-black text-rose-950">Written exam, first attempt</th>
                  <th scope="col" className="pb-2 pr-4 text-right font-black text-rose-950">Barber</th>
                  <th scope="col" className="pb-2 text-right font-black text-rose-950">Cosmetology</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-rose-200">
                  <td className="py-2 pr-4 text-rose-950/80">Apprentices, pooled</td>
                  <td className="py-2 pr-4 text-right font-black tabular-nums text-rose-700">
                    {CA_APPRENTICE_EXAM.barber.pooledPassPct}%
                  </td>
                  <td className="py-2 text-right font-black tabular-nums text-rose-700">
                    {CA_APPRENTICE_EXAM.cosmetology.pooledPassPct}%
                  </td>
                </tr>
                <tr className="border-b border-rose-200">
                  <td className="py-2 pr-4 text-rose-950/60">&nbsp;&nbsp;candidates</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-rose-950/60">
                    {CA_APPRENTICE_EXAM.barber.candidates.toLocaleString()}
                  </td>
                  <td className="py-2 text-right tabular-nums text-rose-950/60">
                    {CA_APPRENTICE_EXAM.cosmetology.candidates.toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b border-rose-200">
                  <td className="py-2 pr-4 text-rose-950/60">&nbsp;&nbsp;quarterly range</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-rose-950/60">
                    {CA_APPRENTICE_EXAM.barber.rangePct[0]}&ndash;{CA_APPRENTICE_EXAM.barber.rangePct[1]}%
                  </td>
                  <td className="py-2 text-right tabular-nums text-rose-950/60">
                    {CA_APPRENTICE_EXAM.cosmetology.rangePct[0]}&ndash;{CA_APPRENTICE_EXAM.cosmetology.rangePct[1]}%
                  </td>
                </tr>
                <tr className="border-b border-rose-200">
                  <td className="py-2 pr-4 font-bold text-rose-950">Schools, Q1 2026</td>
                  <td className="py-2 pr-4 text-right font-black tabular-nums text-emerald-700">
                    {CA_SCHOOL_EXAM_Q1_2026.barber.passPct}%
                  </td>
                  <td className="py-2 text-right font-black tabular-nums text-emerald-700">
                    {CA_SCHOOL_EXAM_Q1_2026.cosmetology.passPct}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-rose-950/60">&nbsp;&nbsp;candidates</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-rose-950/60">
                    {CA_SCHOOL_EXAM_Q1_2026.barber.candidates.toLocaleString()}
                  </td>
                  <td className="py-2 text-right tabular-nums text-rose-950/60">
                    {CA_SCHOOL_EXAM_Q1_2026.cosmetology.candidates.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-rose-950/90">
            In <strong className="font-bold">no quarter</strong> of either series &mdash; eleven for
            barbering, twelve for cosmetology &mdash; did apprentices reach the school rate. The
            cosmetology gap is the wider of the two, and cosmetology is the licence most people
            search this route for.
          </p>
        </section>

        {/* State the limits of the comparison plainly. */}
        <section className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <h2 className="mb-2 text-lg font-black text-slate-900">What that comparison does and doesn&apos;t show</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
            <li>
              <strong className="font-bold text-slate-900">The periods are not matched.</strong> The
              apprentice figures pool every quarter the board published from late 2018 to early
              2026. The school figures are a single quarter, {CA_SCHOOL_EXAM_Q1_2026.period}. What
              makes the comparison hold anyway is that no individual apprentice quarter reaches the
              school rate, so this is not one bad quarter being generalised.
            </li>
            <li>
              <strong className="font-bold text-slate-900">Written exam only, first attempt only.</strong>{" "}
              Both sides are first-time test takers on the written exam. Quarters before 2022 also
              had a practical exam, which California abolished on 1 January 2022; practical results
              are excluded from both figures rather than blended in.
            </li>
            <li>
              <strong className="font-bold text-slate-900">It does not say why.</strong> Apprentices
              and school candidates are not the same population, and nothing in the board&apos;s
              data separates the effect of the training from the circumstances of the people
              choosing it. A pass-rate gap is a fact about outcomes, not a verdict on the route.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Ban className="h-5 w-5 text-rose-600" />
            Not available for nails or esthetics
          </h2>
          <p className="text-sm leading-relaxed text-slate-600">
            Apprenticeship covers{" "}
            <strong className="font-bold text-slate-900">
              {CA_APPRENTICESHIP.availableFor.join(", ")}
            </strong>{" "}
            and nothing else. The board&apos;s FAQ answers this outright: for a manicurist or
            esthetician licence you go to a school.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            The reason this deserves saying loudly is who it catches. Nails is 400 hours and
            esthetics 600 &mdash; the two shortest and cheapest programmes California approves, and
            precisely what somebody who cannot fund cosmetology tuition tends to be aiming at. The
            paid route is not available for either.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-slate-900">
            <Wallet className="h-5 w-5 text-indigo-600" />
            The rules that end an apprenticeship early
          </h2>
          <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <strong className="font-bold text-slate-900">Two failures and the licence is gone.</strong>{" "}
              Under BPC 7335 the apprentice licence expires two years from issue, or when you are
              licensed, or when you fail the examination a second time &mdash; whichever comes
              first. Set against a {CA_APPRENTICE_EXAM.cosmetology.pooledPassPct}% first-time pass
              rate, that is the single most consequential rule on this page.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <strong className="font-bold text-slate-900">Three months to sit the exam.</strong> You
              cannot work more than three months after completing the required training without
              applying for and taking it. The board can extend both this and the two-year term for
              good cause &mdash; illness, accident, military service.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <strong className="font-bold text-slate-900">Never alone in the shop.</strong> Section
              7332 requires supervision at all times by a board-approved licensee and states that an
              apprentice shall at no time be the only individual working in the establishment. An
              unsupervised apprentice is deemed to be practising unlicensed, which is the
              establishment&apos;s problem as much as theirs.
            </li>
            <li className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <strong className="font-bold text-slate-900">School hours do not carry over.</strong>{" "}
              Clock-hours and operations from a board-approved school are non-transferable to the
              apprentice programme. Switching mid-way means starting the{" "}
              {CA_APPRENTICESHIP.ojtHours.toLocaleString()} hours from zero.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-xl font-black text-slate-900">How to actually start</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            You cannot apply directly &mdash; you join an approved programme first. The board calls
            them <strong className="font-bold text-slate-900">program sponsors</strong>, and they are
            approved jointly by the board and the Division of Apprenticeship Standards. The board
            publishes the list, and its own advice is to contact several and ask about costs before
            committing: sponsor fees, kit and textbooks are all on top of the $
            {CA_APPRENTICESHIP.boardFee} licence fee.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            You will also need a social security number or ITIN, government photo ID, and to be at
            least {CA_APPRENTICESHIP.minimumAge} with the {CA_APPRENTICESHIP.grade}th grade or its
            equivalent. Barbering applicants complete preapprentice training before serving the
            public; so do cosmetology, skin care, nail care and electrology applicants.
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

        <div className="mb-8 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6">
          <h2 className="text-xl font-black text-white">Find an approved program sponsor</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            The board maintains the list of approved apprenticeship programmes on its applicant
            pages. Contact more than one and compare what they charge before you sign.
          </p>
          <a
            href="https://www.barbercosmo.ca.gov/applicants/"
            target="_blank"
            rel="noopener noreferrer"
            data-ig-click="ca_apprenticeship_board_sponsors"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
          >
            Board applicant pages
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        <section className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link
            href="/california-cosmetology-license"
            data-ig-click="ca_apprenticeship_to_cos_license"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                The school route
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                {COS_HOURS.toLocaleString()} hours, and the other two ways into the exam.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
          <Link
            href="/california-school-leaderboard"
            data-ig-click="ca_apprenticeship_to_leaderboard"
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="block text-sm font-black text-slate-900 group-hover:text-indigo-700">
                School pass rates
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                The other side of the comparison, school by school.
              </span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        </section>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          Requirements from the board&apos;s Apprenticeship Information sheet and FAQ, and from
          Business and Professions Code sections{" "}
          <a
            href="https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=7332."
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            7332
          </a>
          {" "}to 7336. Exam figures are computed from the board&apos;s quarterly &ldquo;Apprentice
          Program Pass/Fail Rate&rdquo; reports (Q4 2018 &ndash; Q1 2026) and its &ldquo;School Exam
          Pass/Fail Rates for Written for First Time Test Takers&rdquo; report for{" "}
          {CA_SCHOOL_EXAM_Q1_2026.period}. Apprenticeship programmes are approved under the
          Shelley-Maloney Apprentice Labor Standards Act of 1939 and administered with the Division
          of Apprenticeship Standards. Confirm on{" "}
          <a
            href="https://www.barbercosmo.ca.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-indigo-600 hover:underline"
          >
            barbercosmo.ca.gov
          </a>{" "}
          before relying on a figure here.
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
            about: { "@type": "Thing", name: "California barbering and cosmetology apprenticeship" },
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
              { "@type": "ListItem", position: 2, name: "Apprenticeship", item: PAGE },
            ],
          }),
        }}
      />
    </div>
  );
}
