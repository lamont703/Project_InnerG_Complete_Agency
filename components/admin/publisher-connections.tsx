import { Check, AlertTriangle, MinusCircle } from "lucide-react";
import type { PublisherConnectionView } from "@/lib/admin/publisher-queue";

/**
 * Which destinations the next post will actually reach.
 *
 * READ-ONLY ON PURPOSE. Connecting a platform mints a token, and a token is
 * minted by a person at a keyboard running scripts/publisher_connect.js — not
 * by a button on a page that would need its own OAuth callback, state store and
 * consent surface for an account we authorise about once a year.
 *
 * IT NAMES THE ACCOUNT, NOT JUST THE PLATFORM. "LinkedIn ✓" is not enough
 * information: posting as the company page and posting as a person are
 * different decisions, and a wrong one is a mistake made in public under
 * somebody's own name.
 */

const LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X",
  gbp: "Google Business Profile",
  tiktok: "TikTok",
};

function Row({ c }: { c: PublisherConnectionView }) {
  const live = c.enabled && c.status === "connected";
  const label = LABELS[c.platform] ?? c.platform;

  // Not enabled reads grey, because it is a setting rather than a fault.
  // Enabled-but-broken reads amber, because it is the one that needs a person.
  const tone = live
    ? "text-emerald-700"
    : !c.enabled
      ? "text-slate-400"
      : "text-amber-700";

  const Icon = live ? Check : !c.enabled ? MinusCircle : AlertTriangle;

  const detail = live
    ? c.accountLabel || "connected"
    : !c.enabled
      ? "switched off"
      : c.status === "disconnected"
        ? "not connected — run scripts/publisher_connect.js"
        : c.lastError || c.status;

  return (
    <li className="flex items-start gap-2 py-1.5">
      <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${tone}`} />
      <span className="text-[11px] leading-tight">
        <span className="font-bold text-slate-700">{label}</span>
        <span className={`ml-1.5 ${tone}`}>{detail}</span>
      </span>
    </li>
  );
}

export function PublisherConnections({ connections }: { connections: PublisherConnectionView[] }) {
  if (connections.length === 0) return null;

  const live = connections.filter((c) => c.enabled && c.status === "connected").length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 mb-8">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Extra destinations
        </h2>
        <span className="text-[10px] text-slate-400">
          {live} of {connections.length} live
        </span>
      </div>
      <p className="text-[11px] text-slate-400 mb-2 leading-snug">
        YouTube and Instagram publish from their own connections and are always attempted.
        These four are skipped when they are not live — a skip never marks a post failed.
      </p>
      <ul className="divide-y divide-slate-100">
        {connections.map((c) => <Row key={c.platform} c={c} />)}
      </ul>
    </div>
  );
}
