import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { agencyAccessState } from "@/lib/agency-support";
import { AgencyAccessToggle } from "@/components/account/agency-access-toggle";

/**
 * A business owner's switch for letting the agency that brought them in see
 * their account, read-only (lib/agency-support.ts). Linked from the request
 * email an agency can send.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Agency access | ShearQuery", robots: { index: false, follow: false } };

export default async function AgencyAccessPage() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/agency-access");
    return null;
  }
  const { agency, on } = await agencyAccessState(ctx.memberId);
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl"><ShieldCheck className="h-6 w-6" /> Agency access</h1>
        {!agency ? (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No agency brought your account to ShearQuery, so there&apos;s nobody to share it with.
          </p>
        ) : (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-700">
              <strong>{agency.name}</strong> brought you to ShearQuery. You can let them see how your account is doing, so they can help when something&apos;s stuck.
              It&apos;s <strong>{on ? "on" : "off"}</strong> right now.
            </p>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-bold">They would see</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                  <li>Whether Google, your calendar and Instagram are connected</li>
                  <li>Drafts waiting for you, and changes that failed and why</li>
                  <li>Your plan and Google audit score</li>
                  <li>Whether Autopilot is running cleanly</li>
                </ul>
              </div>
              <div>
                <p className="font-bold">They would never</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
                  <li>Change anything — it&apos;s read-only</li>
                  <li>See your customers&apos; names or phone numbers</li>
                  <li>Read your reviews or messages</li>
                  <li>See your card or payment details</li>
                </ul>
              </div>
            </div>
            <div className="mt-5"><AgencyAccessToggle on={on} agency={agency.name} /></div>
            <p className="mt-3 text-xs text-slate-500">You can switch it off any time, and it takes effect immediately.</p>
          </section>
        )}
      </main>
    </div>
  );
}
