import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchFindings, findingStats } from "@/lib/research/store";
import { ResearchFindingsPanel } from "@/components/admin/research-findings";
import { runCrmAgent, setCrmFindingStatus } from "./actions";
import { GitBranch } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "CRM Research Agent | ShearQuery",
  robots: { index: false, follow: false },
};

/**
 * How to move a lead one step further along the pipeline.
 *
 * Reads the site's analytics, GoHighLevel and Shopify together, against the
 * declared funnel: traffic -> pages -> AI Chat -> membership -> product usage.
 *
 * THE FUNNEL IS EXTREMELY LOPSIDED AND THE AGENT IS TOLD SO. Tens of thousands
 * of pixel events sit above single-digit membership counts. An agent handed
 * only the bottom of that would confidently recommend optimising a conversion
 * rate computed from eight people. The counts go into the prompt and low
 * confidence is required where the sample cannot carry a conclusion.
 */
export default async function CrmResearchPage() {
  if (!(await isAdmin())) notFound();

  const [findings, stats] = await Promise.all([fetchFindings("crm"), findingStats("crm")]);

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-sky-700 bg-sky-50 border border-sky-100 rounded-full px-3 py-1 mb-3">
          <GitBranch className="w-3 h-3" />
          Internal · CRM Research
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {stats.open > 0 ? `${stats.open} conversion idea${stats.open === 1 ? "" : "s"} waiting` : "CRM Research Agent"}
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Reads GoHighLevel, Shopify and the site&apos;s own analytics against the pipeline —
          traffic → pages → AI Chat → membership → product usage — looking for the step where
          people are lost and what would move them on.
        </p>

        <ResearchFindingsPanel
          agent="crm"
          findings={findings}
          stats={stats}
          runAction={runCrmAgent}
          statusAction={setCrmFindingStatus}
          emptyHint="No research yet. Press Run research and it'll read all three systems against the pipeline."
        />
      </div>
    </div>
  );
}
