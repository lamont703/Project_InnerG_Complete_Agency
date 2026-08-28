import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { membershipPath } from "@/lib/audiences";
import { currentMember, getJourney } from "@/lib/member-context";
import { TRACK_LABELS } from "@/lib/member-journey";
import { EnhancedTexasBarberExamDeck } from "@/features/student/components/EnhancedTexasBarberExamDeck";

/**
 * The AI-enhanced exam prep, on a member's own account.
 *
 * WHERE THIS CAME FROM. The same deck was only reachable at
 * /dashboard/<project-slug> — a per-user portal provisioned by
 * /api/barber/register, which is the model being retired. So the prep someone
 * signed up for lived behind a URL nobody could guess, in a UI nobody is
 * maintaining, and the practice deck's own "Login For AI Enhanced Prep" button
 * did not lead here. This gives it an address a member can reach from the
 * account menu.
 *
 * THE SCHOOL IS READ HERE, NOT IN THE DECK. member_journeys has RLS enabled
 * with no policies, so it is service-role only; the deck is a client component
 * and a read from there would come back empty rather than failing, which reads
 * as "no school on file" and never gets investigated. Server component, admin
 * read, passed down as a prop.
 */
export const metadata: Metadata = {
  title: "Texas Barber Exam Prep",
  // Per-member state. /account is excluded from the sitemap and the .md layer
  // in lib/public-routes.ts, and noindex'd in app/account/layout.tsx.
  robots: { index: false, follow: false },
};

// Per-member data — never statically rendered or cached between people.
export const dynamic = "force-dynamic";

export default async function ExamPrepPage() {
  const member = await currentMember();
  // Same stance as /account/journey: not signed in is the signup funnel, not
  // an error.
  if (!member) redirect(membershipPath("student"));

  const facts = await getJourney(member.id);

  /*
   * This deck is the Texas BARBER written exam, and nothing about it adapts.
   * Someone whose journey says California, or says esthetician, would work
   * through Texas barber questions with no indication they were the wrong ones
   * — which is worse than not offering it, because they would trust the score.
   *
   * They are told, and then left to decide. Not blocked: plenty of people
   * study across tracks, the account menu offers this to everyone, and
   * refusing to render a free practice deck because a form says "CA" is the
   * kind of audience-gating this codebase has already been bitten by.
   */
  const mismatch =
    (facts.state && facts.state !== "TX") || (facts.track && facts.track !== "barber");

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <header>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-3">
              <Sparkles className="w-3 h-3" />
              ShearQuery Intelligence
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight">
              Texas Barber Exam Prep
            </h1>
            <p className="text-slate-600 mt-2 leading-relaxed">
              Written-exam questions in the style PSI uses for the Class A Barber licence. Every
              answer is scored against the domain it belongs to, so the gaps it finds are the ones
              worth studying.
            </p>
          </header>

          {mismatch && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-black text-amber-900 mb-1">
                This deck is the Texas barber written exam.
              </p>
              <p className="text-xs leading-relaxed text-amber-800">
                Your journey says{" "}
                {[facts.state, facts.track ? TRACK_LABELS[facts.track].toLowerCase() : null]
                  .filter(Boolean)
                  .join(" · ")}
                . You&apos;re welcome to use it, but the questions and the passing standard are
                Texas barber — don&apos;t read the score as a signal about a different licence.{" "}
                <Link href="/account/journey" className="font-bold underline">
                  Update your journey
                </Link>
                .
              </p>
            </div>
          )}

          <EnhancedTexasBarberExamDeck initialSchoolId={facts.schoolId ?? null} />

          <p className="text-xs text-slate-500 text-center">
            <Link
              href="/account/journey"
              className="font-bold text-blue-700 hover:underline inline-flex items-center gap-1"
            >
              Your licence journey
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
