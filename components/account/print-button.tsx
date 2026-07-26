"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white font-bold text-sm px-4 py-2.5 hover:bg-slate-800 transition-colors print:hidden"
    >
      <Printer className="w-4 h-4" />
      Print / Save as PDF
    </button>
  );
}
