import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { createAdminClient } from "@/lib/supabase/admin";
import { PUBLIC_ENTITY_TYPES } from "@/lib/gbp-audit-public";
import { auditPublicEntity } from "@/lib/gbp-audit-public-fetch";
import { approvedAgencyByCode } from "@/lib/agency-partners";
import { CONSENT_TEXT, recordAuditView } from "@/lib/audit-share";
import { ReviewRequestForm } from "@/components/audit/review-request-form";

/**
 * A business's Google profile check, shared by an agency (lib/audit-share.ts).
 *
 * Personal to one business: noindex, and excluded from the sitemap and the
 * .md layer (lib/public-routes.ts). The score is the public audit from our
 * stored data, and says so, with its date and how much of a full audit it
 * covers — never presented as the whole picture.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ type: string; slug: string }>; searchParams: Promise<{ via?: string }> };

export async function generateMetadata({ params }: Params) {
  const { type, slug } = await params;
  const cfg = PUBLIC_ENTITY_TYPES[type];
  const { data } = cfg ? await (createAdminClient().from(cfg.table) as any).select(cfg.nameField).eq("slug", slug).maybeSingle() : { data: null };
  return { title: data ? `${data[cfg!.nameField]} — Google profile check` : "Google profile check", robots: { index: false, follow: false } };
}

const ICON = {
  pass: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />,
  warn: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />,
  fail: <XCircle className="h-5 w-5 shrink-0 text-rose-600" />,
  unavailable: <Lock className="h-5 w-5 shrink-0 text-slate-400" />,
};

export default async function SharedAuditPage({ params, searchParams }: Params) {
  const { type, slug } = await params;
  const { via } = await searchParams;
  const cfg = PUBLIC_ENTITY_TYPES[type];
  if (!cfg) notFound();
  const db = createAdminClient() as any;
  const { data: row } = await db.from(cfg.table).select("id, updated_at").eq("slug", slug).maybeSingle();
  if (!row) notFound();
  const scored = await auditPublicEntity(db, type, cfg, slug);
  if (!scored) notFound();
  const { business, audit } = scored;

  const agency = via ? await approvedAgencyByCode(via) : null;
  if (agency) await recordAuditView(agency.memberId, type, row.id, (await headers()).get("user-agent")).catch(() => {});

  const gaps = audit.checks.filter((c) => c.status === "fail" || c.status === "warn");
  const good = audit.checks.filter((c) => c.status === "pass");
  const asOf = row.updated_at ? new Date(row.updated_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;
  const joinHref = agency ? `/join/${encodeURIComponent(via!)}` : "/membership";

  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">
        {agency && <p className="text-sm font-bold text-slate-500">Shared with you by {agency.name}</p>}
        <h1 className="mt-1 text-3xl font-black tracking-tight">{business.name}</h1>
        <p className="mt-1 text-sm text-slate-600">A check of how your Google Business Profile looks to customers{business.city ? ` in ${business.city}` : ""}.</p>

        <section className="mt-6 flex flex-wrap items-center gap-5 rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
          <div className="text-5xl font-black">{audit.score}<span className="text-xl text-slate-400">/100</span></div>
          <p className="flex-1 text-sm text-slate-600">
            From what&apos;s visible publicly — {audit.coverage.visible} of the {audit.coverage.total} things a full check looks at. The rest are only visible once you connect your Google profile.
          </p>
        </section>

        {gaps.length > 0 && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Worth fixing ({gaps.length})</h2>
            <ul className="mt-3 space-y-4">
              {gaps.map((c) => (
                <li key={c.id} className="flex gap-3">
                  {ICON[c.status]}
                  <div className="text-sm">
                    <p className="font-bold">{c.label}</p>
                    <p className="text-slate-600">{c.detail}</p>
                    {c.fix && <p className="mt-1 text-slate-800">{c.fix}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {good.length > 0 && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Already good ({good.length})</h2>
            <ul className="mt-3 space-y-2">{good.map((c) => <li key={c.id} className="flex gap-3 text-sm">{ICON.pass}<span><strong>{c.label}.</strong> <span className="text-slate-600">{c.detail}</span></span></li>)}</ul>
          </section>
        )}

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Not visible from outside ({audit.locked.length})</h2>
          <ul className="mt-3 space-y-2 text-sm">{audit.locked.map((l) => <li key={l.label} className="flex gap-3">{ICON.unavailable}<span><strong>{l.label}.</strong> <span className="text-slate-600">{l.why}</span></span></li>)}</ul>
        </section>

        <section className="mt-6 rounded-2xl bg-slate-900 p-6 text-white">
          <h2 className="text-xl font-black">Fix this with ShearQuery</h2>
          <p className="mt-2 text-sm text-slate-300">Claim your listing, connect your Google profile for the full check, and fix what&apos;s missing — from your phone, or just by talking to Claude. Free to start.</p>
          <Link href={joinHref} className="mt-4 inline-block rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-900">Get started free</Link>
        </section>

        {agency && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Want a hand with it?</h2>
            <p className="mt-2 text-sm text-slate-600">{agency.name} can walk you through a free review of your profile.</p>
            <div className="mt-4"><ReviewRequestForm via={via!} entityType={type} slug={slug} consentText={CONSENT_TEXT(agency.name)} /></div>
          </section>
        )}

        <p className="mt-6 text-xs text-slate-500">
          Based on public information ShearQuery collected{asOf ? ` in ${asOf}` : ""}; some of it may have changed since. ShearQuery isn&apos;t affiliated with Google.
        </p>
      </main>
    </div>
  );
}
