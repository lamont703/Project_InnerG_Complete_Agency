"use client";

import { useState, useTransition } from "react";
import { Lock, Globe, MessageSquare, RotateCcw, ShieldAlert, KeyRound } from "lucide-react";
import { TOOL_REGISTRY, type ToolRegistryEntry } from "@/lib/tool-access";
import { setToolAccess, resetToolAccess, type ToolRow } from "@/app/admin/tool-access/actions";

/** One switch. Disabled switches say why on hover rather than just looking broken. */
function Toggle({
  on,
  disabled,
  title,
  onClick,
  tone,
}: {
  on: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  tone: "mcp" | "chat";
}) {
  const active = tone === "mcp" ? "bg-amber-500" : "bg-indigo-600";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors ${
        disabled ? "cursor-not-allowed bg-slate-200" : on ? active : "bg-slate-300 hover:bg-slate-400"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function ToolAccessBoard({ initial }: { initial: ToolRow[] }) {
  const [rows, setRows] = useState<ToolRow[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = new Map(rows.map((r) => [r.id, r]));
  const groups = [...new Set(TOOL_REGISTRY.map((t) => t.group))];

  function flip(entry: ToolRegistryEntry, surface: "mcp" | "chat", next: boolean) {
    setError(null);
    // Optimistic, then reconciled by the server's answer — a refused write
    // must not leave the switch looking as though it worked.
    setRows((rs) =>
      rs.map((r) =>
        r.id === entry.id ? { ...r, [surface === "mcp" ? "enabledMcp" : "enabledChat"]: next } : r
      )
    );
    startTransition(async () => {
      const res = await setToolAccess(entry.id, surface, next);
      if (!res.ok) {
        setError(res.error);
        setRows((rs) =>
          rs.map((r) =>
            r.id === entry.id ? { ...r, [surface === "mcp" ? "enabledMcp" : "enabledChat"]: !next } : r
          )
        );
      }
    });
  }

  function reset(entry: ToolRegistryEntry) {
    setError(null);
    startTransition(async () => {
      const res = await resetToolAccess(entry.id);
      if (!res.ok) { setError(res.error); return; }
      setRows((rs) =>
        rs.map((r) =>
          r.id === entry.id
            ? { ...r, enabledMcp: entry.sensitive ? false : entry.defaultMcp, enabledChat: entry.defaultChat, stored: false, updatedAt: null }
            : r
        )
      );
    });
  }

  const openOnMcp = rows.filter((r) => r.enabledMcp).length;
  const openOnChat = rows.filter((r) => r.enabledChat).length;
  const blocked = TOOL_REGISTRY.filter((t) => t.sensitive).length;

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { k: "Open on connector", v: openOnMcp, icon: <Globe className="w-3 h-3" />, cls: "text-amber-700 bg-amber-50 border-amber-100" },
          { k: "Open on site chat", v: openOnChat, icon: <MessageSquare className="w-3 h-3" />, cls: "text-indigo-700 bg-indigo-50 border-indigo-100" },
          { k: "Blocked from connector", v: blocked, icon: <ShieldAlert className="w-3 h-3" />, cls: "text-rose-700 bg-rose-50 border-rose-100" },
        ].map((s) => (
          <div key={s.k} className={`rounded-xl border px-4 py-3 ${s.cls}`}>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">{s.icon}{s.k}</div>
            <div className="text-2xl font-black text-slate-950 mt-1 tabular-nums">{s.v}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1fr_88px_88px_40px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <span>Tool</span>
          <span className="text-center">Connector</span>
          <span className="text-center">Site chat</span>
          <span />
        </div>

        {groups.map((group) => (
          <div key={group}>
            <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-600">
              {group}
            </div>
            {TOOL_REGISTRY.filter((t) => t.group === group).map((entry) => {
              const row = byId.get(entry.id);
              if (!row) return null;
              const mcpBlocked = !!entry.sensitive;
              const mcpUnbuilt = !entry.implemented.includes("mcp");
              const chatUnbuilt = !entry.implemented.includes("chat");
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1fr_88px_88px_40px] gap-3 items-center px-4 py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{entry.label}</span>
                      {entry.sensitive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5">
                          <Lock className="w-2.5 h-2.5" /> Named people
                        </span>
                      )}
                      {entry.requiresKey && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
                          <KeyRound className="w-2.5 h-2.5" /> Owner key
                        </span>
                      )}
                      {row.stored && (
                        <span className="text-[10px] font-mono text-slate-400" title={row.updatedAt || ""}>
                          edited
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500 mt-0.5 truncate">{entry.id}</div>
                    {entry.personal && <p className="text-xs text-rose-700/90 mt-1">{entry.personal}</p>}
                    {entry.note && !entry.personal && <p className="text-xs text-slate-500 mt-1">{entry.note}</p>}
                  </div>

                  <div className="flex justify-center">
                    <Toggle
                      tone="mcp"
                      on={row.enabledMcp}
                      disabled={pending || mcpBlocked || mcpUnbuilt}
                      title={
                        mcpBlocked
                          ? "Blocked: returns data about named individuals. Opening this takes a code change."
                          : mcpUnbuilt
                            ? "Not implemented on the connector yet."
                            : row.enabledMcp
                              ? "Open on the public connector — switch off"
                              : "Closed on the public connector — switch on"
                      }
                      onClick={() => flip(entry, "mcp", !row.enabledMcp)}
                    />
                  </div>

                  <div className="flex justify-center">
                    <Toggle
                      tone="chat"
                      on={row.enabledChat}
                      disabled={pending || chatUnbuilt}
                      title={
                        chatUnbuilt
                          ? "Not implemented in the site chat."
                          : row.enabledChat
                            ? "On in the site chat — switch off"
                            : "Off in the site chat — switch on"
                      }
                      onClick={() => flip(entry, "chat", !row.enabledChat)}
                    />
                  </div>

                  <div className="flex justify-center">
                    {row.stored && (
                      <button
                        type="button"
                        title="Back to the default in lib/tool-access.ts"
                        disabled={pending}
                        onClick={() => reset(entry)}
                        className="text-slate-400 hover:text-slate-700 disabled:opacity-40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
