import { notFound } from "next/navigation";
import { Radio } from "lucide-react";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { adminOverview } from "@/lib/live-training/store";
import { whenLong } from "@/lib/live-training/messages";
import { CAMPAIGN } from "@/lib/live-training/messages";
import { campaignSession } from "@/lib/live-training/schedule";
import { LiveTrainingSettings } from "@/components/live-training/admin-settings";

/** Admin: the weekly LIVE training — settings, who's registered, and the campaign (lib/live-training/). */
export const dynamic = "force-dynamic";
export const metadata = { title: "LIVE Training | Admin", robots: { index: false, follow: false } };

export default async function LiveTrainingAdmin() {
  if (!(await isAdmin())) notFound();
  const o = await adminOverview();
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl space-y-6 px-5 pb-20 pt-28 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black"><Radio className="h-6 w-6 text-red-600" /> LIVE training</h1>
        <p className="text-sm text-slate-600">Registration page: <a className="font-bold text-blue-700 underline" href="/live-training">/live-training</a> · Mondays 3 PM ET · registration closes Saturday 3 PM ET.</p>
        <LiveTrainingSettings initial={o.config} />

        {o.sessions.map((s) => (
          <section key={s.sessionDate} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-black">{whenLong(s.sessionDate)} — {s.registrations.length} registered</h2>
            <p className={`mt-1 text-xs ${s.meetUrl ? "text-slate-500" : "font-bold text-amber-700"}`}>{s.meetUrl ? `Link: ${s.meetUrl}` : "No Google Meet link set — link reminders will wait."}</p>
            {s.registrations.length > 0 && (
              <table className="mt-4 w-full text-left text-xs">
                <thead className="text-slate-500"><tr><th className="py-1">Name</th><th>Email</th><th>Texts</th><th>Type</th><th>Source</th></tr></thead>
                <tbody>
                  {s.registrations.map((r: any) => (
                    <tr key={r.email} className="border-t border-slate-100"><td className="py-1.5">{r.first_name}</td><td>{r.email}</td><td>{r.sms_consent ? "yes" : "—"}</td><td>{r.audience ?? "—"}</td><td>{r.source ?? "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-black">12-week member campaign</h2>
          <p className="mt-1 text-xs text-slate-500">{o.config.campaign_start ? `Starts Wednesday ${o.config.campaign_start}.` : "Not scheduled — set a start Wednesday above."}{!o.config.mailing_address && " Blocked until the mailing address is set."}</p>
          <ol className="mt-3 space-y-1 text-sm">
            {CAMPAIGN.map((w, i) => {
              const stats = o.campaign[i + 1];
              return (
                <li key={w.subject} className="flex flex-wrap justify-between gap-2 border-t border-slate-100 py-1.5">
                  <span><span className="font-bold">Week {i + 1}:</span> {w.subject}{o.config.campaign_start ? <span className="text-slate-400"> · for {campaignSession(o.config.campaign_start, i + 1)}</span> : null}</span>
                  <span className="text-xs text-slate-500">{stats ? `${stats.sent} sent${stats.failed ? `, ${stats.failed} failed` : ""}` : "not sent"}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </main>
    </div>
  );
}
