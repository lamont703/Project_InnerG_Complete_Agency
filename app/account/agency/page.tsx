import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Check, Clock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgencyProfile } from "@/lib/agency";
import { agencyDashboard } from "@/lib/agency-partners";
import { SITE_URL } from "@/lib/site";
import { AUDIENCES, storedAudience } from "@/lib/audiences";
import { AgencyProfileForm } from "@/components/account/agency-profile-form";
import { AgencyInviteForm } from "@/components/account/agency-invite-form";
import { CopyField } from "@/components/account/copy-field";

/**
 * An agency's home on ShearQuery: who they are, whether they're an approved
 * partner, their referral link and code, invites to their clients, and every
 * business credited to them with where each one is up to.
 *
 * Credit is recorded from approval onward (lib/agency-partners.ts). Commission
 * needs billing and is not shown — nothing here promises an amount.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Agency | ShearQuery", robots: { index: false, follow: false } };

const yes = (b: boolean) => (b ? <Check className="mx-auto h-4 w-4 text-emerald-600" /> : <span className="text-slate-300">—</span>);

export default async function AgencyPage() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/agency");
    return null;
  }
  const { data: member } = await (createAdminClient().from("community_members") as any).select("audience").eq("id", ctx.memberId).maybeSingle();
  const isAgency = member?.audience === "agency";
  const profile: any = isAgency ? await getAgencyProfile(ctx.memberId) : null;
  const { data: status } = isAgency
    ? await (createAdminClient().from("agency_profiles") as any).select("partner_status, referral_code").eq("community_member_id", ctx.memberId).maybeSingle()
    : { data: null };
  const approved = status?.partner_status === "approved";
  const dash = isAgency ? await agencyDashboard(ctx.memberId) : null;

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-4xl px-5 pt-28 pb-20 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
          <Briefcase className="h-6 w-6" /> Your agency on ShearQuery
        </h1>

        {!isAgency ? (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            This page is for agency accounts. If you run an agency that builds for barbers and stylists,{" "}
            <Link href="/membership/agencies" className="font-bold text-blue-700 underline">sign up as an agency</Link>.
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">About your agency</h2>
              <div className="mt-4"><AgencyProfileForm initial={profile} /></div>
            </section>

            {!profile ? null : !approved ? (
              <section className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {status?.partner_status === "rejected"
                    ? "Your partner application wasn't approved. Contact ShearQuery if you think that's a mistake."
                    : "We're reviewing your agency. Once you're approved you'll get your referral link and code, and can invite your clients — every business that joins through you is credited to you."}
                </span>
              </section>
            ) : (
              <>
                <section className="rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Your referral link and code</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Businesses that join through your link, type your code when they sign up, or accept your invite are credited to you — for good, first agency wins.
                  </p>
                  <div className="mt-4 space-y-3">
                    <CopyField label="Link" value={`${SITE_URL}/join/${status!.referral_code}`} />
                    <CopyField label="Code" value={status!.referral_code} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Invite a client by email</h2>
                  <div className="mt-4"><AgencyInviteForm /></div>
                  {dash!.invites.length > 0 && (
                    <ul className="mt-5 divide-y divide-slate-100 text-sm">
                      {dash!.invites.map((i: any) => (
                        <li key={`${i.email}-${i.sent_at}`} className="flex flex-wrap justify-between gap-2 py-2">
                          <span>{i.business_name ? `${i.business_name} · ` : ""}{i.email}</span>
                          <span className="text-xs text-slate-500">
                            {i.accepted_at ? "Joined" : new Date(i.expires_at) < new Date() ? "Expired" : `Sent ${new Date(i.sent_at).toLocaleDateString()}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

              </>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Your clients ({dash!.realCount})</h2>
              {dash!.realCount === 0 && (
                <p className="mt-2 text-sm text-slate-600">
                  {approved ? "No one yet — share your link or send an invite." : "Once you're approved, businesses you bring in show up here."} The three marked Sample show what each stage looks like; they aren&apos;t real businesses and never count toward credit.
                </p>
              )}
              {dash!.clients.length === 0 ? null : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="text-left text-[11px] font-black uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2">Client</th><th>Type</th><th>Joined</th>
                        <th className="text-center">Listing claimed</th><th className="text-center">Google connected</th>
                        <th className="text-center">Calendar live</th><th className="text-center">Audit score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dash!.clients.map((c) => {
                        const t = storedAudience(c.type);
                        return (
                          <tr key={c.memberId} className={c.isDemo ? "text-slate-500" : undefined}>
                            <td className="py-2">
                              <p className="font-bold">
                                {c.name}
                                {c.isDemo && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">Sample</span>}
                              </p>
                              <p className="text-xs text-slate-500">{c.isDemo ? "Not a real business" : c.email}</p>
                            </td>
                            <td>{t ? AUDIENCES[t].label : "not set"}</td>
                            <td className="text-xs text-slate-500">{new Date(c.joinedAt).toLocaleDateString()} · {c.source}</td>
                            <td className="text-center">{yes(c.claimedListing)}</td>
                            <td className="text-center">{yes(c.googleConnected)}</td>
                            <td className="text-center">{yes(c.calendarLive)}</td>
                            <td className="text-center font-bold">{c.auditScore ?? <span className="text-slate-300">—</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-xs text-slate-500">
                Next for each client: claim their listing, connect Google, then turn on their calendar. The gaps above are who to nudge.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-100 p-6 text-sm leading-relaxed text-slate-700">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">Use ShearQuery in your Claude</h2>
              <p className="mt-2">
                Add <code className="rounded bg-white px-1 font-mono text-[12px]">https://shearquery.com/mcp</code> as a connector in Claude for industry data and a Google profile audit on any listing — useful before a first call with a prospect.
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Managing your clients&apos; accounts from ShearQuery, with their permission, is being built. Commission terms aren&apos;t set yet.
              </p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
