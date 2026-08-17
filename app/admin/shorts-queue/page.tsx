import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchShortsQueue } from "@/lib/admin/shorts-queue";
import { ShortsQueueGrid } from "@/components/admin/shorts-queue-grid";
import { Film } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "YouTube Shorts Queue | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * The Shorts publishing schedule, with every video playable before it goes out.
 *
 * Gated by middleware (INTERNAL_TOOL_ROUTES) plus isAdmin() here, because
 * middleware fails OPEN on an auth exception and this shows unpublished
 * content.
 */
export default async function ShortsQueuePage() {
  if (!(await isAdmin())) notFound();

  const queue = await fetchShortsQueue();
  const waiting = queue.due.length + queue.upcoming.length;
  const overdue = queue.due.filter((s) => s.overdue).length;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <Film className="w-3 h-3" />
          Internal · Shorts Queue
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {waiting === 0
            ? "Nothing scheduled"
            : `${waiting} Short${waiting === 1 ? "" : "s"} scheduled`}
          {overdue > 0 && <span className="text-amber-700"> · {overdue} overdue</span>}
        </h1>
        <p className="text-slate-500 text-sm mb-10 max-w-2xl">
          One a day. Every video can be played here before it publishes — check the
          numbers and the framing while it is still changeable.
        </p>

        <ShortsQueueGrid queue={queue} />
      </div>
    </div>
  );
}
