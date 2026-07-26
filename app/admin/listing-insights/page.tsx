import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchGlobalInsights } from "@/lib/admin/global-insights";
import { GlobalInsightsTable } from "@/components/admin/global-insights-table";
import { Globe2 } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Global Listing Insights | Inner G Complete",
  robots: { index: false, follow: false },
};

// Admin-only cross-entity conversion leaderboard: which listings earn the most
// organic views + lead actions, filterable by entity type / city / state.
// Gated by middleware (INTERNAL_TOOL_ROUTES lock) plus this isAdmin() guard.
export default async function GlobalListingInsightsPage() {
  if (!(await isAdmin())) notFound();

  const rows = await fetchGlobalInsights(); // all-time

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <Globe2 className="w-3 h-3" />
          Internal · Global Listing Insights
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          Organic conversion leaderboard
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Every listing with pixel activity, ranked by the leads it generated organically. Filter by entity type,
          city, and state to see who&apos;s converting — and who to approach for advertising. Counts are lifetime,
          from our first-party pixel.
        </p>

        <GlobalInsightsTable rows={rows} />
      </div>
    </div>
  );
}
