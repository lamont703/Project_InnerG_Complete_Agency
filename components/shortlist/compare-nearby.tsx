import Link from "next/link";
import { Star } from "lucide-react";
import type { ComparisonRow } from "@/lib/shortlist";
import { AddToShortlist } from "./add-to-shortlist";

/**
 * "Good compared to what?" — same-category businesses near this one.
 *
 * THIS IS THE DIFFERENTIATOR, and it is worth being precise about why. Someone
 * arriving from "<business name> reviews" is not asking whether 4.6 is a good
 * number in the abstract; they are asking whether to book here or somewhere
 * else. Google's listing answers the first question and is designed to end the
 * search. A directory can answer the second, which is the only thing it can do
 * that the business's own listing cannot.
 *
 * Same category only, and only businesses with enough reviews for the rating to
 * mean something — see fetchComparables. A nail salon offered beside a
 * barbershop, or a 5.0-from-two-people listing offered beside a 4.7-from-nine-
 * hundred, would make the comparison worse rather than better.
 *
 * Renders nothing when there is nothing to compare against. A section headed
 * "compared to what?" with one thin row is a worse answer than silence.
 */
export function CompareNearby({
  rows,
  originName,
  originRating,
}: {
  rows: ComparisonRow[];
  originName: string;
  originRating: number | null;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Good compared to what?</h2>
      <p className="mt-0.5 mb-4 text-xs leading-relaxed text-slate-500">
        The nearest {rows.length === 1 ? "one" : rows.length} of the same kind, rated by at least
        10 people.
        {originRating != null && ` ${originName} is rated ${originRating.toFixed(1)}.`}
      </p>

      <div className="space-y-2.5">
        {rows.map((r) => {
          const href = `${r.entityType === "shop" ? "/shop" : "/salons"}/${r.slug}`;
          const better = originRating != null && (r.rating ?? 0) > originRating;
          return (
            <div key={r.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0 flex-1">
                <Link href={href} className="block truncate text-sm font-black text-slate-900 hover:text-indigo-700">
                  {r.name}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-800">{r.rating?.toFixed(1)}</span>
                    <span className="text-slate-500">({r.reviewCount?.toLocaleString()})</span>
                  </span>
                  {r.distanceMiles != null && <span>{r.distanceMiles} mi away</span>}
                  {/* Stated only when true, and only as a fact about the two
                      numbers — not as a recommendation to go there instead. */}
                  {better && <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800">Rated higher</span>}
                </p>
              </div>
              <AddToShortlist entityType={r.entityType} slug={r.slug} name={r.name} className="shrink-0" compact />
            </div>
          );
        })}
      </div>
    </section>
  );
}
