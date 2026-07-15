"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Check, X, Sparkles } from "lucide-react";
import { fetchDirectives, type Directive } from "./actions";

const AGENTS = [
  {
    name: "Website User Behavior Agent",
    mission: "UX & Conversion — ensures traffic actually converts and stays on the page.",
    runEndpoint: "/api/agents/momentum-analyst/run",
  },
  {
    name: "Website Technology Performance Agent",
    mission: "Technical & Indexing — guards the gates, ensures every page gets indexed and doesn't throw errors.",
    runEndpoint: "/api/agents/sentinel/run",
  },
  {
    name: "Website Traffic Optimization Agent",
    mission: "SEO Growth — finds striking-distance keywords, CTR gaps, cannibalization, and coverage gaps in Search Console data.",
    runEndpoint: "/api/agents/traffic-optimization/run",
  },
  {
    name: "Google Ads Agent",
    mission: "Market Intelligence — finds real content gaps, city-expansion demand, seasonality, and competitive pressure using Keyword Planner data.",
    runEndpoint: "/api/agents/google-ads/run",
  },
  {
    name: "Website Business Discovery Agent",
    mission: "Finds real businesses missing from our database and stages them for review, then auto-chains into Entity Auditor — run locally: node scripts/discover_and_stage_businesses.js \"City TX\" (or with no city to auto-pick up every Google Ads Agent expansion city you've approved)",
    runEndpoint: null,
  },
  {
    name: "Entity Auditor Agent",
    mission: "Re-verifies staged candidates against Google Maps one by one, backfills missing photos, and recommends deletion for anything that isn't genuinely a barbershop/salon — run locally: node scripts/audit_staged_entities.js",
    runEndpoint: null,
  },
  {
    name: "Market Expansion Readiness Agent",
    mission: "Closes the loop — checks every city you've approved for expansion against real published business counts, and flags the moment one has enough real data to justify building a dedicated page.",
    runEndpoint: "/api/agents/market-expansion-readiness/run",
  },
  {
    name: "Auto-Publish Agent",
    mission: "Fully autonomous — publishes any staged entity the Entity Auditor has confirmed real with 5+ real photos straight to production, no per-entity approval — run locally: node scripts/auto_publish_audited_entities.js (add --dry-run to preview first)",
    runEndpoint: null,
  },
  {
    name: "Published Page Auditor Agent",
    mission: "Checks every auto-published page against the live site for rendering errors and SEO compatibility (title, canonical, JSON-LD, images, sitemap) — run locally: node scripts/audit_published_pages.js",
    runEndpoint: null,
  },
];

function confidencePill(confidence: string) {
  if (confidence === "high") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (confidence === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-500 border-slate-200";
}

function statusPill(status: Directive["status"]) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "denied") return "bg-slate-100 text-slate-500 border-slate-200";
  if (status === "resolved") return "bg-sky-50 text-sky-700 border-sky-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

const BUSINESS_DISCOVERY_AGENT = "Website Business Discovery Agent";

export default function AgentDirectivesPage() {
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const load = () => {
    setLoading(true);
    fetchDirectives().then((result) => {
      setDirectives(result);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const runAgent = async (endpoint: string, name: string) => {
    setRunning(name);
    setRunMessage(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setRunMessage(`${name}: ${body.error}`);
        return;
      }
      setRunMessage(`${name}: ${body.inserted || 0} new directive(s) from ${body.flagged ?? 0} anomaly(s) flagged.`);
      load();
    } catch (err: any) {
      setRunMessage(`${name}: ${err.message || "run failed"}`);
    } finally {
      setRunning(null);
    }
  };

  const resolve = async (id: string, status: "approved" | "denied", reason?: string) => {
    setDirectives((prev) => prev.map((d) => (d.id === id ? { ...d, status, deny_reason: reason || d.deny_reason } : d)));
    await fetch("/api/agents/directives/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, reason }),
    });
  };

  const startDeny = (id: string) => {
    setDenyingId(id);
    setDenyReason("");
  };

  const confirmDeny = (id: string) => {
    resolve(id, "denied", denyReason.trim() || undefined);
    setDenyingId(null);
    setDenyReason("");
  };

  const statusFiltered = filter === "pending" ? directives.filter((d) => d.status === "pending") : directives;
  const visible = agentFilter === "all" ? statusFiltered : statusFiltered.filter((d) => d.agent_name === agentFilter);

  // Counts reflect the current status filter, not the agent filter, so
  // switching status (Pending/All) updates the numbers on every tab. Tabs
  // are always the full agent list (not just ones with current matches) so
  // the row doesn't shuffle around as you switch Pending/All.
  const agentCounts = new Map<string, number>();
  for (const d of statusFiltered) agentCounts.set(d.agent_name, (agentCounts.get(d.agent_name) || 0) + 1);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Sparkles className="w-3 h-3" />
            Executive Brief
          </span>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 leading-tight mb-2">Agent Directives</h1>
          <p className="text-slate-600 text-sm leading-relaxed max-w-xl">
            One feed for every autonomous agent's findings. Review the evidence, then approve or deny.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Agents</h2>
          <div className="flex flex-col gap-2">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-slate-900">{agent.name}</p>
                  <p className="text-xs text-slate-500">{agent.mission}</p>
                </div>
                {agent.runEndpoint ? (
                  <button
                    onClick={() => runAgent(agent.runEndpoint!, agent.name)}
                    disabled={running === agent.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider transition-colors shrink-0"
                  >
                    {running === agent.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Run Now
                  </button>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 shrink-0">
                    Run locally
                  </span>
                )}
              </div>
            ))}
          </div>
          {runMessage && <p className="text-xs text-slate-500 font-mono mt-3 border-t border-slate-100 pt-3">{runMessage}</p>}
        </div>

        <div className="flex gap-2 mb-3">
          {(["pending", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${
                filter === f ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {f === "pending" ? "Pending" : "All"}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap mb-6">
          <button
            onClick={() => setAgentFilter("all")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
              agentFilter === "all" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            All agents ({statusFiltered.length})
          </button>
          {AGENTS.map((agent) => (
            <button
              key={agent.name}
              onClick={() => setAgentFilter(agent.name)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                agentFilter === agent.name ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {agent.name} ({agentCounts.get(agent.name) || 0})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <p className="text-sm text-amber-900 leading-relaxed">
              No {filter === "pending" ? "pending " : ""}directives. Run an agent above to check for anomalies.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((d) => (
              <div key={d.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wide text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                      {d.agent_name}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${statusPill(d.status)}`}>
                      {d.status}
                    </span>
                    {d.times_recurred > 1 && (
                      <span
                        className="text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 bg-violet-50 text-violet-700 border-violet-200"
                        title={d.first_seen_at ? `First flagged ${new Date(d.first_seen_at).toLocaleDateString()}` : undefined}
                      >
                        seen {d.times_recurred}x
                      </span>
                    )}
                    {typeof d.evidence?.confidence === "string" && (
                      <span
                        className={`text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 ${confidencePill(d.evidence.confidence)}`}
                        title={`Based on ${d.evidence.sessionsToday ?? "?"} session(s) today`}
                      >
                        {d.evidence.confidence} confidence
                      </span>
                    )}
                    {d.agent_name === BUSINESS_DISCOVERY_AGENT && d.evidence?.autoPublished === true && (
                      d.evidence?.pageAuditPassed === true ? (
                        <span
                          className="text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 bg-teal-50 text-teal-700 border-teal-200"
                          title={d.evidence?.pageAuditedAt ? `Checked ${new Date(d.evidence.pageAuditedAt).toLocaleString()}` : undefined}
                        >
                          ✓ auto-published & verified clean
                        </span>
                      ) : d.evidence?.pageAuditPassed === false ? (
                        <span
                          className="text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-700 border-amber-200"
                          title={d.evidence?.pageAuditedAt ? `Checked ${new Date(d.evidence.pageAuditedAt).toLocaleString()}` : undefined}
                        >
                          ⚠ auto-published — QA issue found
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-500 border-slate-200">
                          auto-published — QA pending
                        </span>
                      )
                    )}
                    {d.status === "pending" && d.evidence?.auditRecommendation === "delete" && (
                      <span className="text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 bg-red-50 text-red-700 border-red-200">
                        recommend delete
                      </span>
                    )}
                    {d.status === "pending" &&
                      d.evidence?.auditRecommendation === "approve" &&
                      Array.isArray(d.evidence?.images) &&
                      d.evidence.images.length >= 5 && (
                        <span
                          className="text-[10px] font-black uppercase tracking-wide border rounded-full px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200"
                          title="Meets Auto-Publish Agent's criteria — will publish on the next run unless denied first"
                        >
                          eligible for auto-publish
                        </span>
                      )}
                  </div>
                  <span className="text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</span>
                </div>

                <p className="text-sm text-slate-800 leading-relaxed mb-3">{d.directive_text}</p>

                {d.evidence && Object.keys(d.evidence).length > 0 && (
                  <details className="mb-3">
                    <summary className="text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-700">Evidence</summary>
                    <pre className="mt-2 text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto text-slate-600">
                      {JSON.stringify(d.evidence, null, 2)}
                    </pre>
                  </details>
                )}

                {d.status === "denied" && d.deny_reason && (
                  <p className="text-xs text-slate-500 italic mb-3">Denied: "{d.deny_reason}"</p>
                )}

                {d.status === "pending" && denyingId !== d.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => resolve(d.id, "approved")}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => startDeny(d.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-extrabold text-xs uppercase tracking-wider transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Deny
                    </button>
                  </div>
                )}

                {d.status === "pending" && denyingId === d.id && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      autoFocus
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && confirmDeny(d.id)}
                      placeholder="Why? (optional, but helps the agent adapt)"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                    />
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => confirmDeny(d.id)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition-colors"
                      >
                        Confirm Deny
                      </button>
                      <button
                        onClick={() => setDenyingId(null)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 font-extrabold text-xs uppercase tracking-wider transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
