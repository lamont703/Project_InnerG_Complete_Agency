import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchInstagramQueue, type QueuedPost } from "@/lib/admin/instagram-queue";
import { Instagram, AlertTriangle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instagram Queue | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * Every scheduled Instagram post, with its card and its tag list visible while
 * it is still changeable.
 *
 * THE TAG LIST IS THE REASON THIS PAGE EXISTS. Captions can be edited after
 * publishing; a tag cannot be un-notified. Every handle we hold was scraped and
 * none is verified, so the one thing a person must be able to check before a
 * post goes out is which accounts it will notify — shown here in full rather
 * than summarised as a count.
 *
 * Gated by middleware (INTERNAL_TOOL_ROUTES) plus isAdmin() here, because the
 * middleware fails OPEN on an auth exception and this shows unpublished work.
 */
export default async function InstagramQueuePage() {
  if (!(await isAdmin())) notFound();

  const queue = await fetchInstagramQueue();
  const waiting = queue.due.length + queue.upcoming.length;
  const overdue = queue.due.filter((p) => p.overdue).length;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-100 rounded-full px-3 py-1 mb-3">
          <Instagram className="w-3 h-3" />
          Internal · Instagram Queue
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {waiting === 0 ? "Nothing scheduled" : `${waiting} post${waiting === 1 ? "" : "s"} scheduled`}
          {overdue > 0 && <span className="text-amber-700"> · {overdue} overdue</span>}
        </h1>
        <p className="text-slate-500 text-sm mb-10 max-w-2xl">
          Check the card and the tag list before each one goes out. A caption can be
          edited after publishing; a tag cannot be un-notified.
        </p>

        <Section title="Due now" posts={queue.due} empty="Nothing due." />
        <Section title="Upcoming" posts={queue.upcoming} empty="Nothing scheduled ahead." />
        <Section title="Published" posts={queue.done} empty="Nothing published yet." />
      </div>
    </div>
  );
}

function Section({ title, posts, empty }: { title: string; posts: QueuedPost[]; empty: string }) {
  return (
    <section className="mb-12">
      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">{title}</h2>
      {posts.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      )}
    </section>
  );
}

function PostCard({ post }: { post: QueuedPost }) {
  const failed = post.status === "failed";
  return (
    <article className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${failed ? "border-rose-200" : "border-slate-200"}`}>
      {post.image_urls?.[0] && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.image_urls[0]} alt="" className="w-full aspect-[4/5] object-cover bg-slate-100" />
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {post.scheduled_for}
          </span>
          {post.overdue && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
              <AlertTriangle className="w-3 h-3" /> overdue
            </span>
          )}
          {post.image_urls.length > 1 && (
            <span className="text-[10px] font-bold text-slate-400">{post.image_urls.length} slides</span>
          )}
        </div>
        <p className="font-black text-sm text-slate-900 leading-snug">{post.title}</p>
        <p className="text-xs text-slate-500 mt-2 whitespace-pre-line line-clamp-6">{post.caption}</p>

        {/* In full, never as a count. This is the field that cannot be undone. */}
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
            Will tag {post.tag_handles.length === 0 ? "— nobody" : `${post.tag_handles.length}`}
          </p>
          {post.tag_handles.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {post.tag_handles.map((h) => (
                <li key={h}>
                  <a href={`https://instagram.com/${h}`} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-700 bg-slate-100 hover:bg-slate-200 rounded px-1.5 py-0.5">
                    @{h}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {post.permalink && (
          <a href={post.permalink} target="_blank" rel="noopener noreferrer"
             className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-fuchsia-700 hover:underline">
            View on Instagram <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {post.error && <p className="mt-3 text-xs text-rose-700 font-medium">{post.error}</p>}
      </div>
    </article>
  );
}
