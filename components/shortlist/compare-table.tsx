"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, MapPin, Phone, Star, Trash2 } from "lucide-react";
import { sortRows, type ComparisonRow, type SortKey } from "@/lib/shortlist";
import { toggleShortlist } from "@/lib/shortlist-store";

/**
 * The side-by-side.
 *
 * WHAT IS SHOWN IS EXACTLY WHAT WE HAVE. Measured on 2026-08-11: rating and
 * review count are ~100% populated on both tables, coordinates 94-95%, photos
 * 100%, category 91-92%. Opening hours exist on 1 row out of 5,213 and there is
 * no price column at all — so neither appears here. An empty column reads as
 * "this business didn't say", which is a different and wronger claim than "we
 * don't know".
 *
 * The sort IS the "what matters to you" question, reduced to what the data can
 * actually answer.
 */
export function CompareTable({
  rows,
  removable = true,
}: {
  rows: ComparisonRow[];
  removable?: boolean;
}) {
  const [sort, setSort] = useState<SortKey>("added");
  const [hidden, setHidden] = useState<string[]>([]);
  const visible = sortRows(rows, sort).filter((r) => !hidden.includes(`${r.entityType}:${r.slug}`));

  const remove = (r: ComparisonRow) => {
    toggleShortlist({ entityType: r.entityType, slug: r.slug, name: r.name });
    setHidden((h) => [...h, `${r.entityType}:${r.slug}`]);
  };

  const anyDistance = visible.some((r) => r.distanceMiles != null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-slate-500">Sort by</span>
        {([
          ["added", "The order you added"],
          ["rating", "Highest rated"],
          ["reviews", "Most reviewed"],
          ...(anyDistance ? [["distance", "Closest together"] as const] : []),
        ] as [SortKey, string][]).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSort(k)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
              sort === k
                ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sort === "rating" && (
        // Stated rather than silently applied. A visitor who added a new shop
        // with two glowing reviews and finds it at the bottom deserves to know
        // why, otherwise the sort looks broken.
        <p className="mb-3 text-xs leading-relaxed text-slate-500">
          Businesses with fewer than 10 reviews sort last — a 5.0 from three people isn&apos;t
          a stronger signal than a 4.7 from nine hundred.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((r) => {
          const href = `${r.entityType === "shop" ? "/shop" : "/salons"}/${r.slug}`;
          return (
            <div key={`${r.entityType}:${r.slug}`} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {r.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo} alt="" className="h-32 w-full object-cover" loading="lazy" />
              )}
              <div className="flex flex-1 flex-col p-4">
                <Link href={href} className="text-sm font-black leading-snug text-slate-900 hover:text-indigo-700">
                  {r.name}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500">
                  {[r.category, r.city].filter(Boolean).join(" · ")}
                </p>

                <div className="mt-3 flex items-center gap-1.5">
                  {r.rating != null && r.reviewCount ? (
                    <>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-black text-slate-900">{r.rating.toFixed(1)}</span>
                      <span className="text-xs text-slate-500">({r.reviewCount.toLocaleString()})</span>
                    </>
                  ) : (
                    // Not "0 reviews" — we do not know that. We know we do not
                    // have the number.
                    <span className="text-xs text-slate-400">No rating on file</span>
                  )}
                </div>

                {r.distanceMiles != null && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    {r.distanceMiles === 0 ? "Reference point" : `${r.distanceMiles} mi from the first`}
                  </p>
                )}
                {r.address && <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.address}</p>}

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-300">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  )}
                  {r.website && (
                    <a href={r.website.startsWith("http") ? r.website : `https://${r.website}`} target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-300">
                      <ExternalLink className="h-3.5 w-3.5" /> Site
                    </a>
                  )}
                  {removable && (
                    <button type="button" onClick={() => remove(r)}
                            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
