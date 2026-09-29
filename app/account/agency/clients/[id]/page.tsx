import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { clientSupportReport, hasAccess, reportLines } from "@/lib/agency-support";

/**
 * One client's account health, for the agency that brought them in — only
 * while the client has switched sharing on (lib/agency-support.ts).
 * Read-only, and never the client's own customers.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Client support view | ShearQuery", robots: { index: false, follow: false } };

export default async function ClientSupportPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/agency");
    return null;
  }
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !(await hasAccess(ctx.memberId, id))) notFound();
  const report = await clientSupportReport(id);
  if (!report) notFound();
  const [head, ...rest] = reportLines(report);
  const where = rest.indexOf("WHERE TO HELP");
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">
        <Link href="/account/agency" className="text-sm font-bold text-blue-700 underline">← Your clients</Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-black tracking-tight"><LifeBuoy className="h-6 w-6" /> {head}</h1>
        <p className="mt-1 text-xs text-slate-500">Shared with you by the client, read-only. They can switch it off any time.</p>
        <section className="mt-6 rounded-2xl border-2 border-slate-900 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Where to help</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{report.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        </section>
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Status</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {rest.slice(0, where > 0 ? where : undefined).filter((l) => l.trim()).map((l, i) => (
              <li key={i} className={l.startsWith("    ") ? "pl-6 text-xs text-rose-700" : ""}>{l.trim()}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
