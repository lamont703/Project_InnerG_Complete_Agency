import Link from "next/link";
import { redirect } from "next/navigation";
import { FileSignature } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { createAdminClient } from "@/lib/supabase/admin";
import { AGREEMENT_SECTIONS, PARTNER_AGREEMENT, agreementIsFinal } from "@/lib/partner-agreement";
import { AgreementAcceptForm } from "@/components/account/agreement-accept-form";

/** The agency partner agreement, and accepting it (lib/partner-agreement.ts). */
export const dynamic = "force-dynamic";
export const metadata = { title: "Partner agreement | ShearQuery", robots: { index: false, follow: false } };

export default async function AgreementPage() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/agency/agreement");
    return null;
  }
  const { data: p } = await (createAdminClient().from("agency_profiles") as any)
    .select("agreement_version, agreement_accepted_at, agreement_accepted_by")
    .eq("community_member_id", ctx.memberId)
    .maybeSingle();
  const final = agreementIsFinal();
  const accepted = p?.agreement_version === PARTNER_AGREEMENT.version;

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">
        <Link href="/account/agency" className="text-sm font-bold text-blue-700 underline">← Your agency</Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl"><FileSignature className="h-6 w-6" /> {PARTNER_AGREEMENT.title}</h1>
        {!final && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong>Draft.</strong> This agreement is still being finalized and isn&apos;t in effect yet. You&apos;ll be asked to accept it here once it is.
          </p>
        )}
        <article className="mt-6 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700 shadow-sm">
          {AGREEMENT_SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-black text-slate-900">{s.title}</h2>
              {s.body.map((para, i) => <p key={i} className="mt-2">{para}</p>)}
            </section>
          ))}
          <p className="text-xs text-slate-400">Version {PARTNER_AGREEMENT.version}</p>
        </article>
        {final && p && (
          <section className="mt-6 rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
            {accepted ? (
              <p className="text-sm">Accepted by <strong>{p.agreement_accepted_by}</strong> on {new Date(p.agreement_accepted_at).toLocaleDateString()}.</p>
            ) : (
              <>
                {p.agreement_version && <p className="mb-3 text-sm text-slate-600">The agreement has changed since you last accepted it. Please review and accept this version.</p>}
                <AgreementAcceptForm />
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
