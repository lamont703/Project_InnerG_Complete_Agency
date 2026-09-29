import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { OWNER_NOTE, playbookSections } from "@/lib/agency-playbook";

/** The agency playbook (lib/agency-playbook.ts), for agencies to read. Claude answers from the same text. */
export const dynamic = "force-dynamic";
export const metadata = { title: "Partner playbook | ShearQuery", robots: { index: false, follow: false } };

export default async function PlaybookPage() {
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/agency/playbook");
    return null;
  }
  const sections = playbookSections();
  return (
    <div className="min-h-screen light bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 pt-28 pb-20 sm:px-6">
        <Link href="/account/agency" className="text-sm font-bold text-blue-700 underline">← Your agency</Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl"><BookOpen className="h-6 w-6" /> The partner playbook</h1>
        <p className="mt-2 text-sm text-slate-600">How the ShearQuery partner program works, and how to make it work for you. In your Claude, ask &ldquo;how does the partner program work?&rdquo; for the same answers.</p>
        {OWNER_NOTE && <blockquote className="mt-6 rounded-2xl border-l-4 border-slate-900 bg-white p-5 text-sm text-slate-700 shadow-sm">{OWNER_NOTE}<footer className="mt-2 text-xs font-bold text-slate-500">— Lamont</footer></blockquote>}
        <nav className="mt-6 flex flex-wrap gap-2 text-xs">{sections.map((s) => <a key={s.id} href={`#${s.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700">{s.title}</a>)}</nav>
        <div className="mt-6 space-y-5">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black">{s.title}</h2>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">{s.body.map((p, i) => <p key={i}>{p}</p>)}</div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
