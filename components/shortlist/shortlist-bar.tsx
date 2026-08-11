"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Scale } from "lucide-react";
import type { ShortlistItem } from "@/lib/shortlist";
import { onShortlistChange, readShortlist } from "@/lib/shortlist-store";

/**
 * The persistent shortlist bar.
 *
 * WHY IT PERSISTS ACROSS PAGES. The shortlist only becomes a reason to come
 * back if the visitor can see it accumulating. A count that appears solely on
 * the page where you clicked is a button; a count that follows you is a tool.
 *
 * RENDERS NOTHING WHEN EMPTY. Most visitors will never add anything, and a bar
 * inviting them to compare an empty list is chrome taking up the bottom of a
 * phone screen for no reason. It appears on the first add and not before.
 */
export function ShortlistBar() {
  const [items, setItems] = useState<ShortlistItem[]>([]);
  useEffect(() => {
    setItems(readShortlist());
    return onShortlistChange(setItems);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:bottom-6 sm:justify-end sm:pr-6">
      <Link
        href="/shortlist"
        className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3.5 text-white shadow-lg transition-colors hover:bg-slate-800 sm:w-auto"
      >
        <span className="flex items-center gap-2.5">
          <Scale className="h-4 w-4 shrink-0 text-indigo-300" />
          <span className="text-sm font-black">
            {items.length} saved
            <span className="ml-2 font-medium text-slate-300">
              {items.length === 1 ? "Add another to compare" : "Compare side by side"}
            </span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </div>
  );
}
