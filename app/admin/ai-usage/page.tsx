import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { UsageClient } from "./usage-client";

export const metadata: Metadata = {
  title: "AI Usage & Cost",
  robots: { index: false, follow: false },
};

// Live operational data — never cached, never prerendered.
export const dynamic = "force-dynamic";

export default function AiUsagePage() {
  return (
    <div className="min-h-screen bg-slate-50 light text-slate-900 flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <header>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 mb-2">Internal</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">AI usage &amp; cost</h1>
            <p className="text-slate-600 mt-2 leading-relaxed max-w-2xl">
              Every AI call, what it sent, what came back, and what it cost. Recorded from the provider&apos;s own token
              counts — successes and failures both, because a quota block burns no tokens and would otherwise look
              like nothing happening.
            </p>
          </header>
          <UsageClient />
        </div>
      </main>
    </div>
  );
}
