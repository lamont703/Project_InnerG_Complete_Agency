import { notFound } from "next/navigation";
import { Images } from "lucide-react";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchCarouselQueue, fetchInstagramConnection } from "@/lib/admin/carousel-queue";
import { CarouselBoard } from "@/components/admin/carousel-board";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instagram Carousels | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * Comic carousels, waiting to be read before they go out.
 *
 * Gated by middleware (INTERNAL_TOOL_ROUTES) plus isAdmin() here, because
 * middleware fails OPEN on an auth exception and this page shows unpublished
 * copy and can post to the live account. Same posture as the Content Publisher.
 *
 * WHY THIS IS NOT PART OF THE CONTENT PUBLISHER. That board runs the Shorts and
 * Reels line — one video, two platforms, a slot schedule. A carousel is eleven
 * images, Instagram only, and its gate is a person reading every card rather
 * than a time slot arriving. Sharing a screen would mean two different review
 * models fighting over one set of buttons.
 */
export default async function InstagramCarouselsPage() {
  if (!(await isAdmin())) notFound();

  const [rows, connection] = await Promise.all([
    fetchCarouselQueue(),
    fetchInstagramConnection(),
  ]);

  const needsReview = rows.filter((r) => r.status === "draft").length;
  const ready = rows.filter((r) => r.status === "approved").length;
  const out = rows.filter((r) => r.status === "published").length;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-1 flex items-center gap-2">
          <Images className="h-4 w-4 text-slate-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Internal · Instagram Carousels
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          Read every card before it goes out
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-slate-600">
          Comic stories built from shop-floor conversations. Each one opens polarizing, takes a turn,
          and lands on a lesson — then asks a question, because a carousel that earns no comments is
          a lot of work for a like. Instagram takes the whole deck in one call, so there is no undo
          after publishing.
        </p>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-slate-500">
          <span>
            <b className="font-mono text-slate-900">{needsReview}</b> needing review
          </span>
          <span>
            <b className="font-mono text-slate-900">{ready}</b> approved
          </span>
          <span>
            <b className="font-mono text-slate-900">{out}</b> published
          </span>
          <span>
            Account{" "}
            <b className="font-mono text-slate-900">
              {connection.connected ? `@${connection.username ?? "connected"}` : "unavailable"}
            </b>
          </span>
        </div>

        <div className="mt-8">
          <CarouselBoard rows={rows} connection={connection} />
        </div>
      </main>
    </>
  );
}
