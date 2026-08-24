"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ContentInsightsChart } from "./content-insights-chart";
import type { InsightsData, Granularity } from "@/lib/admin/content-insights";

/**
 * Granularity and range live in the URL, not in component state.
 *
 * The rollup happens on the server against the whole stored history, so
 * switching to month-to-month has to re-query rather than re-bucket whatever
 * the client happens to be holding. Putting the choice in the query string
 * means a view is linkable and survives a refresh, and the server stays the
 * only place that knows how to difference the cumulative series.
 */
export function ContentInsightsView({ data }: { data: InsightsData }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const change = (g: Granularity, days: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("g", g);
    next.set("d", String(days));
    startTransition(() => router.push(`/admin/content-insights?${next}`, { scroll: false }));
  };

  return (
    <div className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <ContentInsightsChart data={data} onChange={change} />
    </div>
  );
}
