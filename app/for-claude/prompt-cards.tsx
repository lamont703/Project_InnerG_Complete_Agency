"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

/**
 * The copy buttons. Client-only for the clipboard, so the page around it stays a
 * server component and keeps its metadata (a "use client" page cannot export
 * any — see .claude/skills/publish-page).
 *
 * EVERY PROMPT NAMES A REAL .md URL. The Markdown twin of each public page is
 * what an assistant can actually read (middleware.ts serves it, see
 * lib/page-markdown.ts), and a prompt pointing at a page that does not exist
 * produces a confident invented answer — the exact failure this site's own
 * sourcing rules exist to prevent. Every path here was checked against app/.
 */
export type Prompt = { id: string; who: string; title: string; body: string };

export function PromptCards({ prompts }: { prompts: Prompt[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (p: Prompt) => {
    try {
      await navigator.clipboard.writeText(p.body);
      setCopied(p.id);
      setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 2000);
    } catch {
      /* Clipboard can be refused (permissions, http). The text is on screen and
         selectable, so a failure here is not a dead end — just no confirmation. */
      setCopied(null);
    }
  };

  return (
    <div className="mt-8 grid gap-4">
      {prompts.map((p) => (
        <article key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">{p.who}</span>
              <h3 className="mt-1 text-lg font-black leading-snug">{p.title}</h3>
            </div>
            <button
              onClick={() => copy(p)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800"
            >
              {copied === p.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === p.id ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-700">
{p.body}
          </pre>
        </article>
      ))}
    </div>
  );
}
