import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchFindings, findingStats } from "@/lib/research/store";
import { ResearchFindingsPanel } from "@/components/admin/research-findings";
import { runContentAgent, setContentFindingStatus, queueFinding } from "./actions";
import { Lightbulb } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Content Research Agent | ShearQuery",
  robots: { index: false, follow: false },
};

/**
 * What to make posts about, argued from this site's own numbers.
 *
 * The agent reads what people search for, which pages they land on and abandon,
 * where they arrive from, how big each slice of the directory is, and what has
 * already been queued — then looks for the gaps. Every suggestion carries the
 * counts it came from, and one that cannot cite them is discarded before it
 * reaches this page.
 *
 * Gated by middleware (INTERNAL_TOOL_ROUTES) plus isAdmin() here, because
 * middleware fails OPEN on an auth exception and this renders traffic data.
 */
export default async function ContentResearchPage() {
  if (!(await isAdmin())) notFound();

  const [findings, stats] = await Promise.all([fetchFindings("content"), findingStats("content")]);

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 mb-3">
          <Lightbulb className="w-3 h-3" />
          Internal · Content Research
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {stats.open > 0 ? `${stats.open} content idea${stats.open === 1 ? "" : "s"} waiting` : "Content Research Agent"}
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Reads what people actually search for on this site, which pages they leave without
          clicking, and what&apos;s already been queued — then looks for the gap between demand and
          what exists.
        </p>

        <ResearchFindingsPanel
          agent="content"
          findings={findings}
          stats={stats}
          runAction={runContentAgent}
          statusAction={setContentFindingStatus}
        queueAction={queueFinding}
          emptyHint="No research yet. Press Run research and it'll read the site's traffic, searches and directory against what's already been published."
        />
      </div>
    </div>
  );
}
