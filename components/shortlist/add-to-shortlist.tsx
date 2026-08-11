"use client";

import { useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { MAX_ITEMS, type ShortlistEntityType } from "@/lib/shortlist";
import { isInShortlist, onShortlistChange, readShortlist, toggleShortlist } from "@/lib/shortlist-store";

/**
 * "Add to shortlist", placed beside the rating on a salon or barbershop page.
 *
 * WHY BESIDE THE RATING. The visitor arrived from "<business name> reviews".
 * The rating is the thing they came to read, and the instant after reading it is
 * the instant they think "okay, versus what?" — that is where the button has to
 * be, not at the bottom of the page.
 */
export function AddToShortlist({
  entityType,
  slug,
  name,
  className = "",
  compact = false,
}: {
  entityType: ShortlistEntityType;
  slug: string;
  name: string;
  className?: string;
  /** Drop the explanatory line — used in lists where it would repeat per row. */
  compact?: boolean;
}) {
  // Starts false on both server and client, then corrects after mount.
  // Reading localStorage during render would produce a hydration mismatch —
  // the server cannot know what this browser saved.
  const [added, setAdded] = useState(false);
  const [full, setFull] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAdded(isInShortlist(entityType, slug));
    setReady(true);
    return onShortlistChange((items) => {
      setAdded(items.some((i) => i.entityType === entityType && i.slug === slug));
      setFull(items.length >= MAX_ITEMS);
    });
  }, [entityType, slug]);

  const onClick = () => {
    if (!added && readShortlist().length >= MAX_ITEMS) {
      setFull(true);
      return;
    }
    setAdded(toggleShortlist({ entityType, slug, name }));
    setFull(false);
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={added}
        className={`inline-flex items-center gap-2 rounded-xl border font-black transition-colors ${
          compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
        } ${
          added
            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-slate-300 bg-white text-slate-800 hover:border-indigo-400 hover:text-indigo-700"
        }`}
      >
        {added ? <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> : <Plus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />}
        {added ? (compact ? "Added" : "On your shortlist") : (compact ? "Compare" : "Add to shortlist")}
      </button>
      {/* Only after mount, so the copy never contradicts the button's state. */}
      {ready && full && !added && !compact && (
        <p className="mt-1.5 text-xs text-amber-700">
          That&apos;s {MAX_ITEMS} — remove one on your shortlist to add another.
        </p>
      )}
      {ready && !added && !full && !compact && (
        <p className="mt-1.5 text-xs text-slate-500">Compare it with others before you book. No signup.</p>
      )}
    </div>
  );
}
