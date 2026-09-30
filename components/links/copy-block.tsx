"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * A block of text with one Copy button — the setup steps and starter prompts
 * on /links. `event` names the tap for the site's tracker, so we can see
 * which instructions people actually take with them.
 */
export function CopyBlock({ text, label = "Copy", event, compact = false }: { text: string; label?: string; event: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the text is on screen and selectable */ }
    (window as any).innerG?.track?.("links_copy", { what: event });
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border border-slate-200 bg-white ${compact ? "p-3" : "p-4"}`}>
      <p className={`flex-1 whitespace-pre-wrap text-slate-800 ${compact ? "text-sm" : "text-[13px] leading-relaxed"}`}>{text}</p>
      <button
        onClick={copy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : label}
      </button>
    </div>
  );
}
