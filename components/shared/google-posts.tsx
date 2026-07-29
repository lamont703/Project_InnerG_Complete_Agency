import { ExternalLink, Megaphone } from "lucide-react";
import { getGooglePostsForEntity } from "@/lib/gbp-reviews";

/**
 * The owner's recent Google Posts on their profile page.
 *
 * This is the freshness argument for connecting a Business Profile: posts are
 * the one thing owners update regularly, so a directory page that mirrors them
 * stops being a static record. Renders nothing when there's no connection or no
 * posts, so it's safe to drop onto every profile.
 */
export async function GooglePosts({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const posts = await getGooglePostsForEntity(entityType, entityId);
  if (!posts.length) return null;

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-indigo-600" />
        <h2 className="text-lg font-black text-slate-900">Latest updates</h2>
        <span className="text-xs text-slate-400">from Google</span>
      </div>

      <ul className="space-y-4">
        {posts.map((p) => (
          <li key={p.id} className="flex gap-3 border-t border-slate-100 pt-4 first:border-0 first:pt-0">
            {p.photo && (
              // Google-hosted and not persisted, so plain <img> rather than
              // next/image — no point optimizing a URL we don't keep.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.photo}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm leading-relaxed text-slate-700 line-clamp-4">{p.summary}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                {p.createdAt && (
                  <span className="text-xs text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                )}
                {(p.ctaUrl || p.url) && (
                  <a
                    href={p.ctaUrl || p.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold capitalize text-indigo-600 hover:underline"
                  >
                    {p.ctaLabel || "View on Google"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
