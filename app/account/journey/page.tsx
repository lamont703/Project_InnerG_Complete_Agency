import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, CircleDot, Check, Clock, Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentMember, getJourney } from "@/lib/member-context";
import { getSchoolExamStats, getStatewideExamStats } from "@/lib/shop-ecosystem";
import {
  PHASE_LABELS,
  SHARED_ROUTES,
  currentPhase,
  datedMilestones,
  isJourneyStarted,
  journeyHeadline,
  missingJourneyFields,
  nextBestActions,
  trackRoutes,
  TRACK_LABELS,
} from "@/lib/member-journey";
import { JourneyForm } from "./journey-form";

export const metadata: Metadata = {
  title: "Your licence journey",
  // /account is noindex via app/account/layout.tsx, and this page is per-member
  // state that must never be crawled — no canonical, no sitemap entry, and
  // lib/public-routes.ts already excludes the whole /account prefix.
  robots: { index: false, follow: false },
};

// Per-member data — never statically rendered or cached between people.
export const dynamic = "force-dynamic";

function StatusIcon({ status }: { status: "passed" | "due" | "upcoming" }) {
  if (status === "passed") return <Check className="w-4 h-4 text-slate-400" />;
  if (status === "due") return <CircleDot className="w-4 h-4 text-blue-600" />;
  return <Clock className="w-4 h-4 text-slate-300" />;
}

export default async function JourneyPage() {
  const member = await currentMember();
  // Not signed in is not an error here — it's the signup funnel. Everything on
  // this page only exists for someone with an account, so the honest response
  // is the page that explains why you'd want one.
  if (!member) redirect("/membership?for=student");

  const facts = await getJourney(member.id);
  const today = new Date().toISOString().split("T")[0];
  const started = isJourneyStarted(facts);
  const phase = currentPhase(facts, today);
  const milestones = datedMilestones(facts, today);
  const actions = nextBestActions(facts, today);
  const gaps = missingJourneyFields(facts);
  const routes = trackRoutes(facts.state, facts.track);

  // School performance, and only where it actually exists.
  //
  // The exam data behind this is the 2026 TDLR roster — Texas only. A
  // California student naming their school must not be shown a blank card
  // that reads as "your school has no results"; they're shown nothing, and
  // the copy below says why.
  let schoolStats: Awaited<ReturnType<typeof getSchoolExamStats>> = [];
  let statewide: Awaited<ReturnType<typeof getStatewideExamStats>> = [];
  if (facts.schoolName && facts.state === "TX") {
    try {
      const supabase = createAdminClient();
      [schoolStats, statewide] = await Promise.all([
        getSchoolExamStats(supabase as any, facts.schoolName),
        getStatewideExamStats(supabase as any),
      ]);
    } catch {
      // A stats failure must not take down the whole console.
      schoolStats = [];
    }
  }

  const isBarber = facts.track === "barber";
  const school = schoolStats[0];
  const schoolFirstAttempt = school
    ? isBarber
      ? school.barberFirstAttemptPassRate
      : school.cosmetologyFirstAttemptPassRate
    : null;
  const stateFirstAttempt = statewide.find(
    (s) => s.programType === (isBarber ? "barber" : "cosmetology") && s.testType === "written"
  )?.firstAttemptPassRate;

  const askHref = (q: string) => `${SHARED_ROUTES.search}?ask=${encodeURIComponent(q)}`;
  const openingQuestion = facts.state && facts.track
    ? `I'm going for a ${TRACK_LABELS[facts.track].toLowerCase()} licence. What should I be doing right now?`
    : "What should I be doing right now to get licensed?";

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <header>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3" />
              {PHASE_LABELS[phase]}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight">
              {started ? journeyHeadline(facts, today) : `Let's set this up${member.firstName ? `, ${member.firstName}` : ""}.`}
            </h1>
            <p className="text-slate-600 mt-2 leading-relaxed">
              {started
                ? "Everything below is worked out from what you've told us — and the AI uses the same facts, so you don't have to repeat them."
                : "Three answers — your state, your licence and roughly when you test — and the AI stops giving general advice about barber school and starts answering about yours."}
            </p>
          </header>

          {/* What to do now. First on the page when there IS something to do,
              because a console whose top item is a settings form is a settings
              form with a header. */}
          {started && actions.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="text-sm font-black text-slate-900 mb-4">What to do next</h2>
              <div className="space-y-3">
                {actions.map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 px-4 py-3 transition-colors group"
                  >
                    <div className="mt-0.5">
                      <StatusIcon status={a.status} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900">{a.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{a.body}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 whitespace-nowrap group-hover:underline inline-flex items-center gap-1">
                      {a.linkLabel}
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Ask the agent — the whole point of the account, one tap away and
              carrying the context with it. */}
          <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <h2 className="text-sm font-black text-slate-900 mb-1">Ask your agent</h2>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              It already knows {started ? "what's on this page" : "who you are"} — no need to explain yourself first.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={askHref(openingQuestion)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 transition-colors"
              >
                What should I be doing now?
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              {facts.schoolName && (
                <Link
                  href={askHref(`How does ${facts.schoolName} compare to other schools on pass rates?`)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  How&apos;s my school doing?
                </Link>
              )}
              {facts.zip && (
                <Link
                  href={askHref(`What's booth rent like in ${facts.zip}, and who's hiring there?`)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  What does a chair cost near me?
                </Link>
              )}
            </div>
          </section>

          {/* School performance. Shown only when we genuinely have it. */}
          {facts.schoolName && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h2 className="text-sm font-black text-slate-900 mb-1">{school?.schoolName || facts.schoolName}</h2>
              {school && schoolFirstAttempt != null ? (
                <>
                  <p className="text-xs text-slate-500 mb-4">
                    2026 TDLR written exam, first attempt{school.city ? ` · ${school.city}` : ""}
                  </p>
                  <div className="flex flex-wrap items-end gap-8">
                    <div>
                      <p className="text-3xl font-black text-slate-950">{schoolFirstAttempt}%</p>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                        Your school, first attempt
                      </p>
                    </div>
                    {stateFirstAttempt != null && (
                      <div>
                        <p className="text-3xl font-black text-slate-400">{Math.round(stateFirstAttempt)}%</p>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Statewide</p>
                      </div>
                    )}
                    {stateFirstAttempt != null && (
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
                          schoolFirstAttempt >= stateFirstAttempt
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {schoolFirstAttempt >= stateFirstAttempt ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {Math.abs(Math.round(schoolFirstAttempt - stateFirstAttempt))} points{" "}
                        {schoolFirstAttempt >= stateFirstAttempt ? "above" : "below"} the state
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                    First-attempt, not the eventually-passed figure schools usually quote. Statewide is weighted by
                    test-takers, so a school with three candidates doesn&apos;t count as much as one with three hundred.
                  </p>
                  {school.schoolHref && (
                    <Link href={school.schoolHref} className="text-xs font-bold text-blue-700 hover:underline mt-3 inline-block">
                      Full profile →
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  {facts.state === "TX"
                    ? "No 2026 exam results on file under that name — try the exact name on your enrolment paperwork, or search the leaderboard."
                    : "Exam results by school are only published for Texas right now, so there's nothing to compare this against yet."}{" "}
                  <Link
                    href={facts.state === "CA" ? SHARED_ROUTES.leaderboardCA : SHARED_ROUTES.leaderboardTX}
                    className="font-bold text-blue-700 hover:underline"
                  >
                    School leaderboard →
                  </Link>
                </p>
              )}
            </section>
          )}

          {/* The full sequence, so the plan is legible rather than a feed of
              nudges arriving from nowhere. */}
          {started && milestones.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-black text-slate-900">Your sequence</h2>
              </div>
              <ol className="space-y-3">
                {milestones.map((m) => (
                  <li key={m.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <StatusIcon status={m.status} />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <p className={`text-sm font-black ${m.status === "passed" ? "text-slate-400" : "text-slate-900"}`}>
                          {m.title}
                        </p>
                        <Link href={m.href} className="text-[11px] font-bold text-blue-700 hover:underline">
                          {m.linkLabel} →
                        </Link>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{m.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              {!facts.examDate && (
                <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                  These are in order but not on a clock yet — add your exam date below and each one gets a date.
                </p>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <h2 className="text-sm font-black text-slate-900 mb-1">Where you are</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Nothing here is required, and you can change any of it whenever. Blank means we don&apos;t know — the AI
              treats it that way too, and asks rather than guessing.
            </p>
            <JourneyForm initial={facts} />
            {gaps.length > 0 && started && (
              <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">Still missing</p>
                <ul className="space-y-1.5">
                  {gaps.slice(0, 3).map((g) => (
                    <li key={String(g.field)} className="text-xs text-slate-600 leading-relaxed">
                      {g.why}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {routes?.requirements && (
            <p className="text-xs text-slate-500 text-center">
              <Link href={routes.requirements} className="font-bold text-blue-700 hover:underline">
                Full requirements for your licence →
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
