"use client";

import Link from "next/link";
import { ArrowRight, Search, Star } from "lucide-react";
import { browseLinksFor, deriveContext, type ComparisonRow } from "@/lib/shortlist";
import { AddToShortlist } from "./add-to-shortlist";

/**
 * "Keep looking" — the way out of the shortlist page.
 *
 * WHY IT EXISTS. Without it /shortlist is a dead end. Someone comparing three
 * salons and finding none of them convincing had nowhere to go but the browser's
 * back button, which is a poor answer on the one page where we know more about
 * what they want than anywhere else on the site.
 *
 * AND WE DO KNOW. The saved rows say the kind of business and the city, so none
 * of these links drops them on an empty search box to type it again. The context
 * is taken from the DOMINANT type and city rather than the first row — four
 * Houston salons and one barbershop is someone shopping for a salon in Houston,
 * and the continuation should follow the weight of the list.
 *
 * TWO WAYS ON, deliberately. Suggestions right here for the person who wants one
 * more option without leaving, and browse links for the person who wants to
 * start over properly. Making them choose between "add another" and "go
 * somewhere else" is the whole job of this block.
 */
export function KeepLooking({
  rows,
  suggestions,
}: {
  rows: ComparisonRow[];
  suggestions: ComparisonRow[];
}) {
  const { entityType, city } = deriveContext(rows);
  const links = browseLinksFor(entityType, city);
  const kind = entityType === "shop" ? "barbershops" : "salons";

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <h2 className="text-lg font-black text-slate-900">Keep looking</h2>
      <p className="mt-0.5 mb-5 text-sm leading-relaxed text-slate-600">
        {city
          ? `More ${kind} in and around ${city}, since that's where you're comparing.`
          : `More ${kind} to compare against these.`}
      </p>

      {suggestions.length > 0 && (
        <div className="mb-6 space-y-2.5">
          {suggestions.map((r) => (
            <div
              key={`${r.entityType}:${r.slug}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`${r.entityType === "shop" ? "/shop" : "/salons"}/${r.slug}`}
                  className="block truncate text-sm font-black text-slate-900 hover:text-indigo-700"
                >
                  {r.name}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-800">{r.rating?.toFixed(1)}</span>
                    <span className="text-slate-500">({r.reviewCount?.toLocaleString()})</span>
                  </span>
                  {r.distanceMiles != null && <span>{r.distanceMiles} mi from your first pick</span>}
                  {r.category && <span className="text-slate-500">{r.category}</span>}
                </p>
              </div>
              <AddToShortlist entityType={r.entityType} slug={r.slug} name={r.name} compact className="shrink-0" />
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-indigo-300"
          >
            <span className="min-w-0">
              <span className="flex items-center gap-2 text-sm font-black text-slate-900 group-hover:text-indigo-700">
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {l.label}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{l.why}</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600" />
          </Link>
        ))}
      </div>
    </section>
  );
}
