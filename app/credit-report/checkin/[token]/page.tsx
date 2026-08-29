import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardCheck } from "lucide-react";

import { resolveCheckin, rosterActivity } from "@/lib/credit-report/store";
import { isStale, outstandingWeeks } from "@/lib/credit-report/checkin";
import { weekLabel } from "@/lib/credit-report/weeks";
import type { PaymentStatus } from "@/lib/credit-report/model";
import { CheckinClient, type CheckinWorker } from "./checkin-client";

/**
 * The fortnightly check-in, opened from the SMS or the email.
 *
 * NO NAVBAR AND NO SIGN-IN. The person answering is a shop owner on their
 * phone who tapped a link in a text. Asking them to log in to answer four
 * buttons is how a 40-second job becomes one they do later, which means never.
 * The token is the credential, and every write re-verifies it (see actions.ts).
 *
 * NOINDEX. The link authorises writing payment statements about named people;
 * it must not end up in a search result. The token is long and expires, so this
 * is belt-and-braces rather than the real control — but a private link that
 * leaks through a crawler is not less leaked for having been unguessable.
 *
 * THE PERIOD COMES FROM THE ROW, NOT FROM TODAY. A link opened four days late
 * still asks about the weeks it was sent for. Recomputing from the open time
 * would quietly shift the question, and an owner would answer for a week they
 * were never asked about.
 */
export const metadata: Metadata = {
  title: "Confirm booth rent",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckinPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;

  // Unknown and expired are the same 404 — the holder of a bad link is not
  // told which, for the same reason a share token is not.
  const resolved = await resolveCheckin(token);
  if (!resolved) notFound();

  const { checkin, enrollment } = resolved;
  const roster = await rosterActivity(enrollment.id);
  const now = Date.now();
  const period = { start: checkin.periodStart, end: checkin.periodEnd };

  /*
   * EVERY week in the period is shown, with the ones already recorded
   * PRE-SELECTED — not hidden. An owner who taps the wrong button and reloads
   * has to be able to see and change it, and a row that disappears on save
   * looks exactly like a tap that did nothing.
   */
  const periodWeeks = outstandingWeeks(period, []);

  const workers: CheckinWorker[] = roster.map((r) => {
    const answered: Record<string, PaymentStatus> = {};
    for (const w of periodWeeks) {
      if (r.weekStatus[w]) answered[w] = r.weekStatus[w];
    }
    return {
      id: r.id,
      name: r.barberName,
      outstanding: periodWeeks,
      answered,
      stale: isStale(
        {
          lastReportedAt: r.lastReportedAt,
          presenceAskedAt: r.presenceAskedAt,
          startedAt: r.startedAt,
          createdAt: r.createdAt,
        },
        now
      ),
      lastReportedAt: r.lastReportedAt,
    };
  });

  const asking = workers.filter((w) => w.outstanding.some((k) => !w.answered[k])).length;
  const stale = workers.filter((w) => w.stale).length;

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900">
      <main className="mx-auto max-w-lg px-4 pb-20 pt-10">
        <header className="mb-6">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
            <ClipboardCheck className="h-3 w-3" />
            ShearQuery Credit Report
          </span>
          <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-950">
            {enrollment.shopName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {period.start === period.end
              ? `Week of ${weekLabel(period.start)}.`
              : `${weekLabel(period.start)} – ${weekLabel(period.end)}.`}{" "}
            {asking > 0
              ? `${asking === 1 ? "One person" : `${asking} people`} to confirm.`
              : "Nothing outstanding."}
            {stale > 0 && ` ${stale === 1 ? "One roster check" : `${stale} roster checks`} too.`}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Each tap saves on its own — you can close this halfway and come back. A week you skip
            stays blank: never marked paid, never marked missed.
          </p>
        </header>

        {workers.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Nobody active on your roster right now. Add people from your account and the next
            check-in will ask about them.
          </p>
        ) : (
          <CheckinClient token={token} workers={workers} />
        )}
      </main>
    </div>
  );
}
