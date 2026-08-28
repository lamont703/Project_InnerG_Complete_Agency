import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { membershipPath } from "@/lib/audiences";
import { currentMember } from "@/lib/member-context";
import { buildReport, MIN_WEEKS_TO_SCORE } from "@/lib/credit-report/model";
import { tradelinesForMember, listShares } from "@/lib/credit-report/store";
import { CreditReportView } from "@/components/credit-report/report-view";
import { SITE_URL } from "@/lib/site";
import { SharePanel } from "./share-panel";
import { ClaimBanner } from "./claim-banner";

/**
 * A member's own ShearQuery Credit Report.
 *
 * SAME COMPONENT THE ADMIN PROTOTYPE RENDERS, on purpose: the number a barber
 * is shown has to be the number a shop is shown, and two renderers is how that
 * stops being true.
 *
 * ONLY CLAIMED TRADELINES APPEAR. tradelinesForMember keys on
 * shop_roster.member_id, so a shop that has been reporting on somebody's name
 * for months produces nothing here until that person follows their invite. An
 * unclaimed row is a statement about a name, not a record belonging to a
 * person, and showing it to whoever happens to share the name would be worse
 * than showing nothing.
 */
export const metadata: Metadata = {
  title: "Your ShearQuery Credit Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MyCreditReportPage(props: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await props.searchParams;
  const member = await currentMember();
  if (!member) redirect(membershipPath("professional"));

  const [tradelines, shares] = await Promise.all([
    tradelinesForMember(member.id),
    listShares(member.id),
  ]);
  const report = buildReport(tradelines);

  const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || "Your report";

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-24">
        {invite && <ClaimBanner token={invite} />}

        {tradelines.length === 0 ? (
          /*
           * The empty state is the common one and has to be reassuring rather
           * than apologetic. Nothing is wrong: most people arrive here before
           * any shop has reported on them, and telling them their report is
           * "unavailable" would read as a refusal.
           */
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Nothing on your record yet
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              This fills up when a shop you rent from enrols and adds you, then confirms your
              payments every couple of weeks. You cannot start it yourself — that is deliberate,
              because a payment record you wrote about yourself would be worth nothing to the next
              shop that reads it.
            </p>
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                If your shop has already added you, check your texts for the invite link — the record
                only becomes yours once you follow it. Until then it sits under your name, and nobody
                can see it.
              </p>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Own a shop?{" "}
              <Link href="/shearquery-credit-report" className="font-bold text-blue-700 hover:underline">
                Enrol it and start reporting
              </Link>
              .
            </p>
          </section>
        ) : (
          <>
            {report.score == null && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <span className="font-bold">No score yet — that is not a bad score.</span> It takes{" "}
                {MIN_WEEKS_TO_SCORE} confirmed weeks before a number means anything. The history
                below is real and already worth showing.
              </div>
            )}

            <CreditReportView
              report={report}
              subject={{
                name,
                handle: member.email,
                memberSince: null,
              }}
            />

            <SharePanel shares={shares} origin={SITE_URL} />
          </>
        )}
      </main>
    </div>
  );
}
