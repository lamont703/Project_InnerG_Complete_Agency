"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the value is on screen and selectable */ }
  };
  return (
    <div>
      <span className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1 flex items-stretch gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">{value}</code>
        <button onClick={copy} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
