import Link from "next/link";
import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { resolveMemberContext } from "@/lib/account/view-as";
import { approvedAgency, publisherOverview, videoLibrary } from "@/lib/agency-publisher";
import { AgencyPublisherBoard } from "@/components/agency/agency-publisher-board";

/**
 * The agency publisher on the web — the same line the agency's Claude manages
 * (lib/mcp/agency-publisher-tools.ts), laid out like /admin/content-publisher.
 * Approved agencies only.
 */
export const dynamic = "force-dynamic";
export const metadata = { title: "Agency Publisher | ShearQuery", robots: { index: false, follow: false } };

const MESSAGES: Record<string, string> = {
  connected: "Instagram connected — posting is on.",
  denied: "Instagram connection was cancelled.",
  not_available: "Posting isn't available for this account yet.",
  exchange_failed: "Instagram didn't finish connecting. If your account isn't an Instagram Tester on ShearQuery's app yet, that's why — ask ShearQuery for the invite.",
  store_failed: "Instagram connected, but it couldn't be saved. Try again.",
};

export default async function AgencyPublisherPage({ searchParams }: { searchParams: Promise<{ ig?: string }> }) {
  const q = await searchParams;
  const ctx = await resolveMemberContext();
  if ("error" in ctx) {
    if (ctx.status === 401) redirect("/login?redirect=/account/agency/publisher");
    return null;
  }
  const a = await approvedAgency(ctx.memberId);
  if (!a.ok) {
    return (
      <div className="min-h-screen light bg-slate-50 text-slate-900">
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 pt-28"><p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">{a.error} <Link href="/account/agency" className="font-bold text-blue-700 underline">Agency page</Link></p></main>
      </div>
    );
  }
  const [o, lib1, lib2] = await Promise.all([publisherOverview(ctx.memberId), videoLibrary({ limit: 30 }), videoLibrary({ limit: 30, offset: 30 })]);
  const library = [...lib1.videos, ...lib2.videos];
  const note = q.ig ? MESSAGES[q.ig] : null;

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700">
          <Send className="h-3 w-3" /> Agency · Instagram Publisher
        </span>
        <h1 className="mb-2 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">{o.queued.length === 0 ? "Nothing in line" : `${o.queued.length} in line`}</h1>
        <p className="mb-8 max-w-2xl text-sm text-slate-500">
          Repost ShearQuery&apos;s published Reels to your own Instagram. Up to three posts a day — 9:00 AM, 2:00 PM and 7:00 PM Eastern. Whatever sits in position 1
          goes out at your next slot. Your Claude can do all of this too: &ldquo;plan a week of posts for barbers from the ShearQuery library.&rdquo; Put your Monday LIVE
          training link in your Instagram bio — the captions point there. <Link href="/account/agency" className="font-bold text-blue-700 underline">Your links</Link>
        </p>
        {note && <p className="mb-6 rounded-xl bg-white p-3 text-sm font-semibold text-slate-700 shadow-sm">{note}</p>}
        <AgencyPublisherBoard queued={o.queued} done={o.done} slots={o.slots} settings={o.settings} instagram={o.instagram} library={library} />
      </div>
    </div>
  );
}
