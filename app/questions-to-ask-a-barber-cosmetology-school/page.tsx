import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CalendarClock, Users } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ResearchByline } from "@/components/research-byline";
import { authorSchema } from "@/lib/author";
import { SITE_URL } from "@/lib/site";

/**
 * The three questions the school pass-rate panel promises.
 *
 * WHY THESE THREE. Not "questions to ask a school" in the generic
 * tour-checklist sense — that page exists a hundred times and helps nobody.
 * Each of these is something an applicant cannot find out from the school's
 * own website, and two of them come with a follow-up that only works because
 * the visitor has already read our exam data.
 *
 * SOURCING. Every figure here is from lib/tdlr-sources.ts and nothing is
 * carried between licences: barber and cosmetology operator are BOTH 1,000
 * hours with written eligibility at 900 (apply-barber, apply-cosmetologist —
 * separately verified entries, which is why both can be stated together), and
 * PSI administering on TDLR's behalf is the `examinations` entry. The
 * specialty licences have different hour totals and are deliberately not
 * mentioned; see CLAUDE.md.
 *
 * The Milady/PSI wording gap is not a TDLR claim and is not presented as one.
 * It is framed as a question to put to a school, because that is what it is.
 */

const TITLE = "3 Questions to Ask a Barber or Cosmetology School";
const DESCRIPTION =
  "Three things a school's website won't tell you: how they bridge Milady to PSI wording, what happens if you pause, and what they teach about getting clients.";
const VERIFIED_ON = "2026-08-06";

const QUESTIONS = [
  {
    icon: BookOpen,
    q: "You teach from Milady. The exam is written by PSI. How do you close the gap?",
    why:
      "Milady explains things in plain, familiar language. PSI writes exam questions in a different register — double negatives, and terms that never appear in the textbook a student spent a year in. A candidate can know the material and still misread the question.",
    good:
      "They can describe how they drill PSI-style phrasing specifically: practice questions written the way the exam writes them, not just chapter reviews.",
    bad:
      "“We cover all the Milady content.” That answers a question about material, not about wording, and it usually means nobody there has looked at how the two differ.",
    followUp:
      "Your first-attempt pass rate is on our page for this school. Ask what happens to the students who don’t pass first time — and whether the school thinks the gap is the wording or something else.",
  },
  {
    icon: CalendarClock,
    q: "What happens if I have to stop for a while?",
    why:
      "Barber and cosmetology operator programmes are both 1,000 clock hours. Most students cannot hold a full-time job and finish on the school’s intended schedule, so pausing is common rather than exceptional — and how a school handles it is policy, not law.",
    good:
      "A written leave-of-absence policy, a clear answer on what re-enrolling costs, and a straight answer about financial aid.",
    bad:
      "Vagueness, or “that doesn’t really happen here.” It does. A school that hasn’t written the policy down has not thought about the students it loses.",
    followUp:
      "Worth knowing before you ask: TDLR lets you sit the written exam at 900 hours, before the full 1,000 are finished. Ask whether the school schedules students for it then, or makes everyone wait.",
  },
  {
    icon: Users,
    q: "What do you teach about getting clients?",
    why:
      "Technique gets you licensed. A book of clients is what pays the booth rent. Most programmes teach the first thoroughly and the second not at all, and graduates discover the difference in their first month paying for a chair.",
    good:
      "Something specific and current — how to build a following, how to keep a client coming back, how to price. Ideally taught by someone who is doing it now.",
    bad:
      "A one-off guest speaker, or a business module that hasn’t changed since before social media was how people find a barber.",
    followUp:
      "Our booth rent data shows what a chair costs in your city. Ask how many clients the programme expects you to have on the day you start paying that.",
  },
];

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "questions to ask a cosmetology school",
    "questions to ask a barber school",
    "how to choose a barber school",
    "how to choose a cosmetology school",
    "psi exam vs milady",
    "barber school tour questions",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/questions-to-ask-a-barber-cosmetology-school`,
    type: "article",
  },
  alternates: { canonical: `${SITE_URL}/questions-to-ask-a-barber-cosmetology-school` },
};

export default function QuestionsToAskPage() {
  return (
    <div className="min-h-screen light bg-white text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 sm:px-6 pt-28 pb-16">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.25em] text-indigo-600">
          Before you enrol
        </p>
        <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          Three questions to ask a barber or cosmetology school
        </h1>

        <ResearchByline verifiedOn={VERIFIED_ON} what="Hour requirements read from TDLR sources, compiled" />

        <p className="mb-10 text-base leading-relaxed text-slate-600 sm:text-lg">
          Every school will show you the floor, the tools and the graduation photos. None of that
          separates a good programme from a bad one. These three do, and none of them can be
          answered from a brochure.
        </p>

        <div className="space-y-8">
          {QUESTIONS.map((item, i) => {
            const Icon = item.icon;
            return (
              <section key={item.q} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-black text-white">
                    {i + 1}
                  </span>
                  <h2 className="text-lg font-black leading-snug text-slate-900 sm:text-xl">
                    &ldquo;{item.q}&rdquo;
                  </h2>
                </div>

                <p className="mb-5 flex gap-2 text-sm leading-relaxed text-slate-600">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <span>{item.why}</span>
                </p>

                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      A good answer
                    </p>
                    <p className="text-sm leading-relaxed text-emerald-900">{item.good}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      A warning sign
                    </p>
                    <p className="text-sm leading-relaxed text-amber-900">{item.bad}</p>
                  </div>
                </div>

                <p className="flex gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <span>
                    <strong className="font-black text-slate-900">Then follow up:</strong>{" "}
                    {item.followUp}
                  </span>
                </p>
              </section>
            );
          })}
        </div>

        <section className="mt-10 rounded-2xl border border-slate-900 bg-slate-900 px-6 py-6 sm:px-7">
          <h2 className="text-lg font-black text-white">Go in knowing the numbers</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Two of these questions land harder when you already know how the school performs. We
            publish state board pass rates by school, and what a chair actually costs once you
            qualify.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/compare-schools"
              data-ig-click="questions_to_compare_schools"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
            >
              Compare schools by pass rate
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/compare-shops"
              data-ig-click="questions_to_compare_shops"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/5"
            >
              See booth rent by city
            </Link>
          </div>
        </section>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-relaxed text-slate-600">
          <p className="mb-2 flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>
              Hour requirements are TDLR&apos;s: Class A Barber and Cosmetology Operator are each
              1,000 hours, with the written exam available at 900. The specialty licences
              (esthetician, manicurist, eyelash extension, hair weaving) have different totals
              entirely &mdash; check the one you are actually enrolling for. Exams are administered
              by PSI on TDLR&apos;s behalf.
            </span>
          </p>
          <p className="pl-6">
            Already studying?{" "}
            <Link href="/tools/texas-cosmetology-exam-practice-deck" className="font-bold text-indigo-600 hover:underline">
              Our practice deck
            </Link>{" "}
            drills the question style PSI uses against Milady citations &mdash; which is the gap
            question 1 is about.
          </p>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: QUESTIONS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: `${item.why} A good answer: ${item.good} A warning sign: ${item.bad}`,
              },
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
            mainEntityOfPage: `${SITE_URL}/questions-to-ask-a-barber-cosmetology-school`,
          }),
        }}
      />
    </div>
  );
}
