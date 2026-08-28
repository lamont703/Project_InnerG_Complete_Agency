import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { membershipPath } from "@/lib/audiences";
import { currentMember } from "@/lib/member-context";
import { enrollmentForMember, rosterFor, weeksFor } from "@/lib/credit-report/store";
import { SITE_URL } from "@/lib/site";
import { CreditReportingManager, type WorkerWithWeeks } from "./manager";

/**
 * The owner's credit reporting management system.
 *
 * The biweekly SMS check-in builds the record going forward. This is where it
 * gets corrected, backfilled, and where the shop's own details are kept right —
 * including the licence number, which is the thing that makes a report from
 * this shop mean anything to the next one that reads it.
 */
export const metadata: Metadata = {
  title: "Credit reporting",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CreditReportingPage() {
  const member = await currentMember();
  if (!member) redirect(membershipPath("owner"));

  const enrollment = await enrollmentForMember(member.id);

  // Not enrolled is not an error — it is the top of the funnel. Send them to
  // the page that explains the thing rather than showing an empty console.
  if (!enrollment) redirect("/shearquery-credit-report");

  const roster = await rosterFor(enrollment.id);
  const workers: WorkerWithWeeks[] = await Promise.all(
    roster.map(async (r) => ({ ...r, weeks: await weeksFor(r.id) }))
  );

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-24">
        <header className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Credit reporting</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {enrollment.shopName} · reporting every {enrollment.checkinIntervalDays} days · rent due{" "}
            {enrollment.dueDay}
          </p>
        </header>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-sm leading-relaxed text-slate-600">
            {enrollment.nextCheckinAt ? (
              <>
                <span className="font-bold text-slate-900">
                  Next check-in {new Date(enrollment.nextCheckinAt).toLocaleDateString()}
                </span>{" "}
                to {enrollment.smsPhone}.{" "}
              </>
            ) : (
              <span className="font-bold text-slate-900">No check-in scheduled yet. </span>
            )}
            You do not have to wait for it — anything you set here counts the same as an answer by
            text.
          </p>
        </div>

        <CreditReportingManager enrollment={enrollment} workers={workers} origin={SITE_URL} />

        <p className="mt-8 text-sm text-slate-500">
          <Link href="/shearquery-credit-report" className="font-bold text-blue-700 hover:underline">
            How this works
          </Link>
          {" · "}
          <Link href="/account/credit-report" className="font-bold text-blue-700 hover:underline">
            Your own report
          </Link>
        </p>
      </main>
    </div>
  );
}
