import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchPublisherQueue, fetchPublisherConnections } from "@/lib/admin/publisher-queue";
import { PublisherQueueBoard } from "@/components/admin/publisher-queue-board";
import { PublisherConnections } from "@/components/admin/publisher-connections";
import { PublisherSchedulePanel } from "@/components/admin/publisher-schedule-panel";
import { describeSlots } from "@/lib/admin/publisher-schedule";
import { Send } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Content Publisher | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * The publishing line for Shorts and Reels, in the order they will go out.
 *
 * Gated by middleware (INTERNAL_TOOL_ROUTES) plus isAdmin() here, because
 * middleware fails OPEN on an auth exception and this shows unpublished
 * content and can change what publishes next.
 */
export default async function ContentPublisherPage() {
  if (!(await isAdmin())) notFound();

  const [queue, connections] = await Promise.all([
    fetchPublisherQueue(),
    fetchPublisherConnections(),
  ]);
  const blocked = queue.queued.filter((i) => i.unpublishable).length;
  const s = queue.settings;
  // When the last queued video is planned to go out, under the schedule as set.
  const lastPlanned = queue.queued.map((q) => q.plannedAt).filter(Boolean).sort().pop() ?? null;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <Send className="w-3 h-3" />
          Internal · Content Publisher
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {queue.queued.length === 0
            ? "Nothing in line"
            : `${queue.queued.length} in line`}
          {blocked > 0 && (
            <span className="text-amber-700"> · {blocked} with no video</span>
          )}
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          {!s
            ? "The posting schedule can't be read, so nothing will post until it can."
            : s.paused
              ? "Posting is paused — nothing goes out until you resume it below."
              : `Posting ${describeSlots(s.weeklySlots)}. Whatever sits first in line goes out at the next posting time, to every destination connected below; pinned videos go at their own time.`}
          {lastPlanned && s && !s.paused && (
            <>
              {" "}This line runs until{" "}
              <strong className="text-slate-700">
                {new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric" }).format(new Date(lastPlanned))}
              </strong>
              .
            </>
          )}
        </p>

        <PublisherSchedulePanel settings={queue.settings} queued={queue.queued} />

        <PublisherConnections connections={connections} />

        <PublisherQueueBoard queue={queue} />
      </div>
    </div>
  );
}
