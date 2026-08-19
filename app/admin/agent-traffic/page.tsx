import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Search, Terminal, User, HelpCircle, Wrench, Radio } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";
import { getAgentTraffic } from "@/lib/agent-requests";
import type { AgentKind } from "@/lib/agent-classify";

export const metadata: Metadata = {
  title: "Agent traffic",
  robots: { index: false, follow: false },
};

// Live operational data — never cached, never prerendered.
export const dynamic = "force-dynamic";

/**
 * WHO IS CALLING THE MACHINE-READABLE SURFACES, AND WHAT THEY ASK FOR.
 *
 * The question this page was built to answer: has anyone actually used the MCP
 * server? It shipped, it was published to the MCP registry, and it logged
 * nothing at all — so the honest answer was "unknowable", which is a bad place
 * to stand when deciding whether machine access is worth charging for.
 *
 * THE NUMBER THAT MATTERS IS "OUTSIDE MACHINES", NOT "TOTAL". A total is
 * flattering and useless: the table this replaced ran five weeks and collected
 * 57 rows, of which 52 were our own curl checks and internal validators. Two
 * were real. That distinction is the entire content of this page, which is why
 * the outside figure is the large one and the total is a footnote.
 */

const WINDOWS = [
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
  { label: "90 days", hours: 24 * 90 },
];

const KIND_META: Record<AgentKind, { label: string; icon: any; note: string; className: string }> = {
  ai: { label: "AI crawlers", icon: Bot, note: "Answer engines and model trainers", className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  search: { label: "Search crawlers", icon: Search, note: "Googlebot, bingbot and friends", className: "text-blue-700 bg-blue-50 border-blue-200" },
  tool: { label: "Scripted clients", icon: Terminal, note: "curl, wget, HTTP libraries", className: "text-slate-600 bg-slate-50 border-slate-200" },
  internal: { label: "Our own jobs", icon: Wrench, note: "Validators and scheduled scripts", className: "text-slate-600 bg-slate-50 border-slate-200" },
  browser: { label: "Browsers", icon: User, note: "A person opened the URL", className: "text-slate-600 bg-slate-50 border-slate-200" },
  unknown: { label: "Unidentified", icon: HelpCircle, note: "Worth reading the raw agent string", className: "text-amber-700 bg-amber-50 border-amber-200" },
};

const SURFACE_LABEL: Record<string, string> = {
  mcp: "MCP server",
  md_entity: "Entity .md",
  md_page: "Content .md",
};

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400 italic">{children}</p>;
}

function Bars({ rows }: { rows: { label: string; count: number; hint?: string }[] }) {
  if (!rows.length) return <Empty>Nothing recorded in this window.</Empty>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3">
          <span className="w-44 shrink-0 truncate text-sm text-slate-700" title={r.label}>
            {r.label}
            {r.hint && <span className="text-slate-400"> · {r.hint}</span>}
          </span>
          <span className="h-2 flex-1 rounded-full bg-slate-100">
            <span className="block h-2 rounded-full bg-slate-800" style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }} />
          </span>
          <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-slate-900">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AgentTrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string }>;
}) {
  /*
   * Gated here as well as in middleware. A page is not a server action, but
   * this one reads an operational table containing caller IPs, and the cost of
   * restating the check is one line.
   */
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) redirect("/login?redirect=/admin/agent-traffic");

  const { hours } = await searchParams;
  const requested = Number(hours);
  const windowHours = WINDOWS.some((w) => w.hours === requested) ? requested : 24 * 30;

  const data = await getAgentTraffic(windowHours);
  const externalShare = data.total ? Math.round((data.externalTotal / data.total) * 100) : 0;
  const mcpCount = data.bySurface.find((s) => s.surface === "mcp")?.count ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900">
      <main className="px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <header>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-2">Internal</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">Agent traffic</h1>
            <p className="text-slate-600 mt-2 leading-relaxed max-w-3xl">
              Every machine request to the MCP server and the Markdown layer — who called, what they asked for, and
              whether they got it. Built to answer one question that had no answer before: is anything out there
              actually using this?
            </p>
          </header>

          <nav className="flex flex-wrap gap-2">
            {WINDOWS.map((w) => (
              <Link
                key={w.hours}
                href={`/admin/agent-traffic?hours=${w.hours}`}
                className={`rounded-full border px-4 py-1.5 text-xs font-bold transition ${
                  w.hours === windowHours
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                }`}
              >
                {w.label}
              </Link>
            ))}
          </nav>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-emerald-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Outside machines</p>
              </div>
              <p className="text-4xl font-black tabular-nums text-emerald-900">{data.externalTotal}</p>
              <p className="text-xs text-emerald-800 mt-2 leading-relaxed">
                AI and search crawlers only. The one figure here that represents demand rather than us.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">MCP calls</p>
              <p className="text-4xl font-black tabular-nums text-slate-900">{mcpCount}</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Exact — the endpoint is uncached, so every call reaches the function.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">All requests</p>
              <p className="text-4xl font-black tabular-nums text-slate-900">{data.total}</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {externalShare}% of it from outside. The rest is our own testing and tooling.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-black">Markdown counts are a floor, not a total.</strong> Both <code>.md</code>{" "}
              routes are cached at the edge, so a repeat fetch inside the cache window is answered without reaching the
              code that records it. MCP numbers are exact. Do not compare the two as like for like.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Who called" subtitle="Bucketed, because a raw list of user agents is not a measurement.">
              {data.byKind.length ? (
                <ul className="space-y-2">
                  {data.byKind.map(({ kind, count }) => {
                    const meta = KIND_META[kind] ?? KIND_META.unknown;
                    const Icon = meta.icon;
                    return (
                      <li key={kind} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${meta.className}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">
                          <span className="text-sm font-bold">{meta.label}</span>
                          <span className="block text-[11px] opacity-70">{meta.note}</span>
                        </span>
                        <span className="text-lg font-black tabular-nums">{count}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <Empty>Nothing recorded in this window.</Empty>
              )}
            </Panel>

            <Panel title="By surface">
              <Bars rows={data.bySurface.map((s) => ({ label: SURFACE_LABEL[s.surface] ?? s.surface, count: s.count }))} />
            </Panel>

            <Panel title="Named agents" subtitle="Tokens matched against lib/robots-rules.ts, so this cannot drift from what robots.txt allows.">
              <Bars rows={data.byAgent.map((a) => ({ label: a.name, count: a.count, hint: a.kind }))} />
            </Panel>

            <Panel
              title="MCP tools requested"
              subtitle="What clients came here wanting. A tool called that we do not have is the most useful row on this page."
            >
              <Bars rows={data.byTool.map((t) => ({ label: t.tool, count: t.count }))} />
            </Panel>
          </div>

          <Panel title="Most requested paths">
            <Bars rows={data.byPath.map((p) => ({ label: p.path, count: p.count }))} />
          </Panel>

          <Panel title="Recent requests" subtitle="Newest 100 in the window.">
            {data.recent.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <th className="pb-2 pr-4 font-black">When</th>
                      <th className="pb-2 pr-4 font-black">Who</th>
                      <th className="pb-2 pr-4 font-black">Surface</th>
                      <th className="pb-2 pr-4 font-black">Asked for</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recent.map((r) => (
                      <tr key={r.id} className={r.isError ? "bg-amber-50/60" : undefined}>
                        <td className="py-2 pr-4 whitespace-nowrap text-slate-500 tabular-nums">
                          {new Date(r.requestedAt).toLocaleString()}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="font-bold text-slate-800">{r.agentName ?? "—"}</span>
                          <span className="block text-[11px] text-slate-400">{KIND_META[r.agentKind]?.label ?? r.agentKind}</span>
                        </td>
                        <td className="py-2 pr-4 whitespace-nowrap text-slate-600">{SURFACE_LABEL[r.surface] ?? r.surface}</td>
                        <td className="py-2 pr-4 text-slate-700">
                          <span className="block truncate max-w-md" title={r.path}>
                            {r.toolName ? `${r.toolName}()` : r.mcpMethod ?? r.path}
                          </span>
                          {r.toolArguments != null && (
                            <code className="block truncate max-w-md text-[11px] text-slate-500">
                              {JSON.stringify(r.toolArguments)}
                            </code>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>
                Nothing yet in this window. For the MCP endpoint that is a real finding, not a bug — it means no client
                has called it.
              </Empty>
            )}
          </Panel>
        </div>
      </main>
    </div>
  );
}
