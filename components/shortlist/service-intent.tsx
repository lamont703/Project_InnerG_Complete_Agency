"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SERVICE_OPTIONS, type ShortlistEntityType } from "@/lib/shortlist";

/**
 * "What are you booking?" — a demand signal, not a filter.
 *
 * THE HONEST FRAMING MATTERS HERE. There is no service-level data for salons or
 * barbershops: `booksy_services` is on the BARBERS table, `custom_amenities` is
 * populated on 4 rows out of 5,213, and `specialty_desired` is a HIRING field
 * (what a shop wants to hire) rather than a list of services offered. So we
 * cannot filter by service today and the copy must not imply we can.
 *
 * What we can do is find out what people are shopping for, which is the thing
 * that decides which service data is worth acquiring and in what order. The
 * answer is recorded with the city and the page — never with anything
 * identifying the person — so it is a counter of demand, not a profile.
 *
 * One tap, no submit button, no follow-up question. The visitor is mid-decision
 * about a haircut; anything longer is a toll booth.
 */
export function ServiceIntent({
  entityType,
  entitySlug,
  city,
}: {
  entityType: ShortlistEntityType;
  entitySlug: string;
  city?: string | null;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const options = SERVICE_OPTIONS[entityType];

  const pick = (service: string) => {
    setChosen(service);
    // Fire-and-forget. If it fails the visitor loses nothing, so there is no
    // error state to show them — this request is for us, not for them.
    void fetch("/api/service-demand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service, entityType, entitySlug, city: city ?? null }),
    }).catch(() => {});
  };

  if (chosen) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-900">
          <Check className="h-4 w-4" /> Noted — {chosen.toLowerCase()}.
        </p>
        <p className="mt-1 text-sm leading-relaxed text-emerald-800">
          We don&apos;t list service menus yet. Telling us what people are booking is how we
          decide which to add first, and this counts toward {city || "your area"}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-black text-slate-900">What are you booking?</p>
      <p className="mt-0.5 mb-3 text-xs leading-relaxed text-slate-500">
        One tap. We don&apos;t have service menus for these businesses yet — your answer is how
        we decide which to add first.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pick(s)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
