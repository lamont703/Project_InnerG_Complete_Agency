import { Star, ExternalLink, Flag } from "lucide-react";
import { getGoogleReviewsForEntity } from "@/lib/gbp-reviews";

/**
 * Google reviews for a listing whose owner has connected their Google Business
 * Profile. Renders nothing at all when there's no connection — which is most
 * listings — so it can be dropped onto any profile page unconditionally.
 *
 * The three things here that aren't decoration are policy requirements of
 * showing Google review content (see lib/gbp-reviews.ts): visible attribution
 * to Google, a link out to the listing on Google, and a route for reporting a
 * review — which has to be Google's own flow, since they own the moderation.
 */

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
        />
      ))}
    </span>
  );
}

export async function GoogleReviews({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const data = await getGoogleReviewsForEntity(entityType, entityId);
  if (!data || !data.reviews.length) return null;

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">Reviews from Google</h2>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
            {data.rating != null && (
              <>
                <span className="font-bold text-slate-900">{data.rating.toFixed(1)}</span>
                <Stars value={Math.round(data.rating)} />
              </>
            )}
            {data.count != null && (
              <span className="text-slate-500">
                {data.count} review{data.count === 1 ? "" : "s"} on Google
              </span>
            )}
          </p>
        </div>
        {data.mapsUri && (
          <a
            href={data.mapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline"
          >
            View all on Google
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <ul className="space-y-4">
        {data.reviews.map((r) => (
          <li key={r.id} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{r.author}</span>
              <Stars value={r.stars} />
              {r.createdAt && (
                <span className="text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{r.text}</p>
            {r.reply && (
              <div className="mt-2 rounded-lg border-l-2 border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold text-slate-600">Response from the owner</p>
                <p className="mt-0.5 text-sm text-slate-700">{r.reply.text}</p>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <p className="text-[11px] text-slate-400">
          Reviews and ratings powered by Google. Shown with the business owner&apos;s authorization.
        </p>
        {data.mapsUri && (
          <a
            href={data.mapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600"
          >
            <Flag className="h-3 w-3" />
            Report a review on Google
          </a>
        )}
      </div>
    </section>
  );
}
