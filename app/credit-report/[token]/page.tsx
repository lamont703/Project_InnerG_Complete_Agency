import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { memberById } from "@/lib/member-context";
import { buildReport } from "@/lib/credit-report/model";
import { resolveShare, recordShareView, tradelinesForMember, listShares } from "@/lib/credit-report/store";
import { CreditReportView } from "@/components/credit-report/report-view";

/**
 * A shared ShearQuery Credit Report.
 *
 * THE ONLY WAY A THIRD PARTY EVER SEES ONE. There is no lookup, no search and
 * no directory — a shop cannot type a name and find a score. Someone handed
 * over this link, the way they would hand over a reference, and they can take
 * it back.
 *
 * NOINDEX AND NO SITEMAP ENTRY. A link that is meant for one shop must not end
 * up in a search result. That is belt-and-braces rather than the real control,
 * since the token is 160 bits and expires — but a private record that leaks
 * through a crawler is not less leaked for having been unguessable.
 *
 * EVERY FAILURE LOOKS THE SAME. Unknown token, revoked link and expired link
 * all render the same 404. Telling a stranger "this link was revoked" confirms
 * that a report exists for somebody, which is precisely what the privacy model
 * promises not to do.
 */
export const metadata: Metadata = {
  title: "Shared ShearQuery Credit Report",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SharedCreditReportPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  const resolved = await resolveShare(token);
  if (!resolved) notFound();

  const [member, tradelines] = await Promise.all([
    memberById(resolved.memberId),
    tradelinesForMember(resolved.memberId),
  ]);
  if (!member) notFound();

  /*
   * The view is counted here, before render, so the owner of the record sees
   * an accurate number on their share panel. Failing to count must never fail
   * the page — the person reading it did nothing wrong.
   */
  try {
    const shares = await listShares(resolved.memberId);
    const mine = shares.find((s) => s.id === resolved.shareId);
    await recordShareView(resolved.shareId, mine?.viewCount ?? 0);
  } catch {
    /* counting is telemetry, not a gate */
  }

  const report = buildReport(tradelines);
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || "ShearQuery member";

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-24">
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <div className="text-sm text-sky-900">
            <p className="font-bold">{name} shared this report with you.</p>
            <p className="mt-1">
              It is a record of booth rent paid to shops that report through ShearQuery. It is not a
              credit score, is not reported to any bureau, and says nothing about anyone&apos;s skill
              or character. The link expires, and {member.firstName || "they"} can revoke it.
            </p>
          </div>
        </div>

        <CreditReportView report={report} subject={{ name, handle: null, memberSince: null }} />

        <p className="mt-8 text-center text-sm text-slate-500">
          Own a shop?{" "}
          <Link href="/shearquery-credit-report" className="font-bold text-blue-700 hover:underline">
            See how reporting works
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
