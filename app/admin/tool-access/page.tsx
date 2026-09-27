import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { ToolAccessBoard } from "@/components/admin/tool-access-board";
import { loadToolRows } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tool Access | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * Which tools are open on which door.
 *
 * `isAdmin()` runs here as well as in the middleware because the middleware
 * fails open — its catch returns next(). A page that trusted it would be one
 * thrown exception away from showing this to anyone.
 */
export default async function ToolAccessPage() {
  if (!(await isAdmin())) notFound();
  const rows = await loadToolRows();

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <SlidersHorizontal className="w-3 h-3" /> Internal · Tool Access
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          Which tools are open on which door
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-2xl">
          Two ways into the same data: the public MCP connector at <code className="font-mono text-slate-700">/mcp</code>,
          which any assistant can add, and the chat on this site. Changes take effect within about 15 seconds — no deploy.
          A tool with no stored row uses the default in <code className="font-mono text-slate-700">lib/tool-access.ts</code>.
        </p>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mb-8 text-sm text-amber-900">
          <strong className="font-black">Tools that return named individuals cannot be opened on the connector here.</strong>{" "}
          The switch is disabled, the write is refused, and the tool is dropped from the connector&rsquo;s list even if a row
          says otherwise. Publishing one means editing <code className="font-mono">lib/tool-access.ts</code>, in a diff
          somebody reviews — because an answer an assistant has already given cannot be taken back.
        </div>

        <ToolAccessBoard initial={rows} />
      </div>
    </div>
  );
}
