import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Check } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgencyProfile } from "@/lib/agency";
import { AgencyProfileForm } from "@/components/account/agency-profile-form";

/**
 * Where an agency lands after signing up: tell us who you are, then use
 * ShearQuery in Claude. The demo shop is set up by an admin (lib/agency.ts),
 * and this page says plainly whether it is ready yet.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agency | ShearQuery",
  robots: { index: false, follow: false },
};

export default async function AgencyPage() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/agency");
    return null;
  }
  const { data: member } = await (createAdminClient().from("community_members") as any)
    .select("audience").eq("id", ctx.memberId).maybeSingle();
  const profile = member?.audience === "agency" ? await getAgencyProfile(ctx.memberId) : null;

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
          <Briefcase className="h-6 w-6" /> Your agency on ShearQuery
        </h1>

        {member?.audience !== "agency" ? (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            This page is for agency accounts. If you run an agency that builds for barbers and stylists,{" "}
            <Link href="/membership/agencies" className="font-bold text-blue-700 underline">sign up as an agency</Link>.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">1. Tell us about your agency</h2>
              <div className="mt-4">
                <AgencyProfileForm initial={profile} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">2. Try ShearQuery in your Claude</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Add <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">https://shearquery.com/mcp</code> as a
                connector in Claude. Industry data and a Google profile audit on any listing work straight away —
                useful for scoping a prospective client.
              </p>
              {profile?.demo_ready_at ? (
                <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-emerald-800">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  Your demo shop is ready. Ask Claude &quot;what&apos;s on my calendar this week?&quot; — it signs you in the first time.
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-600">
                  {profile
                    ? "We're setting up a demo shop in your account — a calendar with made-up clients and bookings — so you can try the appointment tools in Claude. This page will say when it's ready."
                    : "Once you've told us about your agency, we'll set up a demo shop in your account so you can try the appointment tools in Claude."}
                </p>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-100 p-6 text-sm leading-relaxed text-slate-700">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">3. The partner program</h2>
              <p className="mt-2">
                We&apos;re building a partner program for agencies — managing your clients&apos; ShearQuery accounts with their
                permission, and earning for the businesses you bring. It isn&apos;t open yet, and its terms aren&apos;t set. The
                agencies here now are the ones we&apos;re building it with.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
