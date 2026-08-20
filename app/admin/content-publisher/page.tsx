import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchPublisherQueue, fetchPublisherConnections } from "@/lib/admin/publisher-queue";
import { PublisherQueueBoard } from "@/components/admin/publisher-queue-board";
import { PublisherConnections } from "@/components/admin/publisher-connections";
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
  const daysOfRunway = Math.floor(queue.queued.length / 3);

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
        <p className="text-slate-500 text-sm mb-10 max-w-2xl">
          Three posts a day — 9:00 AM, 2:00 PM and 7:00 PM Eastern. Whatever sits
          in position 1 goes out at the next slot, to every destination that is
          connected below. Drag the cards to set the order the feed will read
          in.
          {queue.queued.length > 0 && (
            <>
              {" "}At three a day this line lasts{" "}
              <strong className="text-slate-700">
                {daysOfRunway === 0 ? "less than a day" : `about ${daysOfRunway} day${daysOfRunway === 1 ? "" : "s"}`}
              </strong>
              .
            </>
          )}
        </p>

        <PublisherConnections connections={connections} />

        <PublisherQueueBoard queue={queue} />
      </div>
    </div>
  );
}
