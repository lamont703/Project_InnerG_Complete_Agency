"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { InsightsData, Granularity } from "@/lib/admin/content-insights";

/**
 * The chart, and the controls that decide what it is a chart OF.
 *
 * connectNulls IS TRUE ON PURPOSE and is the one visual decision worth
 * defending. A gap means "no reading that period" — a collector that did not
 * run, or a platform we cannot read — and breaking the line there makes a
 * healthy series look like it stopped. Connecting across draws the trend the
 * operator came to see; the missing period is still visible because the tooltip
 * has no entry for it.
 *
 * The aggregate is a separate, heavier line rather than a stacked area. Stacking
 * would imply the platforms sum to one comparable quantity, and they do not —
 * YouTube and Instagram report views while GBP reports impressions.
 */

const COLORS: Record<string, string> = {
  youtube: "#dc2626",
  instagram: "#c026d3",
  gbp: "#2563eb",
  google: "#16a34a",
  linkedin: "#0369a1",
  tiktok: "#0f172a",
  tiktok_ghl: "#94a3b8",
  x: "#64748b",
  __aggregate: "#0f172a",
};

const RANGES: { label: string; days: number }[] = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "6 months", days: 180 },
  { label: "12 months", days: 365 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function bucketLabel(iso: string, g: Granularity): string {
  const d = new Date(iso + "T00:00:00Z");
  if (g === "month") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
  const s = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return g === "week" ? `w/c ${s}` : s;
}

export function ContentInsightsChart({
  data,
  onChange,
}: {
  data: InsightsData;
  onChange: (g: Granularity, days: number) => void;
}) {
  const reportable = data.series.filter((s) => !s.unavailableReason);
  const [hidden, setHidden] = useState<Set<string>>(
    // Google Search starts hidden for the same reason it is out of the
    // aggregate: it counts the whole site and would flatten everything else.
    () => new Set(["google"])
  );
  const [showAggregate, setShowAggregate] = useState(true);

  const rows = useMemo(
    () =>
      data.buckets.map((b, i) => {
        const row: Record<string, string | number | null> = { bucket: bucketLabel(b, data.granularity), iso: b };
        for (const s of reportable) row[s.platform] = s.points[i];
        row.__aggregate = data.aggregate[i];
        return row;
      }),
    [data, reportable]
  );

  const toggle = (p: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  if (!data.buckets.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">No measurements yet.</p>
        <p className="mt-1 text-sm text-slate-600">
          The collector runs daily at 08:20 UTC. The first chart appears after its first run;
          Instagram needs two runs, because a daily figure is the difference between two lifetime readings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {(["day", "week", "month"] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => onChange(g, data.days)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md capitalize transition ${
                data.granularity === g ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {g === "day" ? "Day to day" : g === "week" ? "Week to week" : "Month to month"}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => onChange(data.granularity, r.days)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                data.days === r.days ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAggregate((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
            showAggregate ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          All platforms · {fmt(data.aggregateTotal)}
        </button>
        {reportable.map((s) => (
          <button
            key={s.platform}
            onClick={() => toggle(s.platform)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition ${
              hidden.has(s.platform)
                ? "border-slate-200 bg-white text-slate-400"
                : "border-slate-300 bg-white text-slate-900"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[s.platform] ?? "#64748b" }} />
            {s.label} · {fmt(s.total)}
            <span className="font-medium text-slate-400">{s.metricKind}</span>
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={fmt} width={44} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
              formatter={(v: number, name: string) => [
                fmt(v),
                name === "__aggregate" ? "All platforms" : data.series.find((s) => s.platform === name)?.label ?? name,
              ]}
            />
            <Legend
              formatter={(name: string) =>
                name === "__aggregate" ? "All platforms" : data.series.find((s) => s.platform === name)?.label ?? name
              }
              wrapperStyle={{ fontSize: 11 }}
            />
            {showAggregate && (
              <Line
                type="monotone" dataKey="__aggregate" stroke={COLORS.__aggregate} strokeWidth={2.5}
                dot={false} connectNulls activeDot={{ r: 4 }}
              />
            )}
            {reportable
              .filter((s) => !hidden.has(s.platform))
              .map((s) => (
                <Line
                  key={s.platform} type="monotone" dataKey={s.platform}
                  stroke={COLORS[s.platform] ?? "#64748b"} strokeWidth={1.75}
                  dot={false} connectNulls activeDot={{ r: 4 }}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
