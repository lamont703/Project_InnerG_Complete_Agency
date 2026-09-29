import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAutopilotSettings, recentAutopilotActions } from "@/lib/autopilot/run";
import { AutopilotSettingsForm } from "@/components/account/autopilot-settings";

/**
 * Autopilot: what it does for this owner, the switches, and a log of
 * everything it did. Runs only on the Autopilot plan (the member's STORED
 * plan — see app/api/cron/autopilot).
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Autopilot | ShearQuery", robots: { index: false, follow: false } };

const KIND: Record<string, string> = { review_reply: "Review reply", post: "Weekly post", weekly_report: "Weekly report", digest: "Daily digest" };

export default async function AutopilotPage() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/autopilot");
    return null;
  }
  const { data: m } = await (createAdminClient().from("community_members") as any).select("plan").eq("id", ctx.memberId).maybeSingle();
  const on = m?.plan === "autopilot";
  const [settings, actions] = await Promise.all([getAutopilotSettings(ctx.memberId), recentAutopilotActions(ctx.memberId)]);

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl"><Bot className="h-6 w-6" /> Autopilot</h1>
        <p className="mt-2 text-sm text-slate-600">
          The jobs that keep your Google profile active without you asking. Everything it publishes shows up in{" "}
          <Link href="/account/changes" className="font-bold text-blue-700 underline">your change history</Link>, where any of it can be undone.
        </p>

        {!on && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            Autopilot runs on the Autopilot plan. You can set it up now; it starts when your plan is Autopilot.{" "}
            <Link href="/account/plan" className="font-bold underline">See plans</Link>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white px-6 py-3 shadow-sm">
          <AutopilotSettingsForm initial={settings} />
        </section>

        <h2 className="mt-8 text-sm font-black uppercase tracking-wide text-slate-500">What it did</h2>
        <section className="mt-2 rounded-2xl border border-slate-200 bg-white px-6 shadow-sm">
          {actions.length === 0 ? (
            <p className="py-5 text-sm text-slate-500">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {actions.map((a, i) => (
                <li key={i} className="py-3">
                  <p className="flex flex-wrap justify-between gap-2">
                    <span className="font-bold">{KIND[a.kind] ?? a.kind}{a.summary ? ` — ${a.summary}` : ""}</span>
                    <span className="text-xs text-slate-500">{a.status} · {new Date(a.created_at).toLocaleString()}</span>
                  </p>
                  {a.detail && <p className="mt-1 text-slate-600">{a.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
