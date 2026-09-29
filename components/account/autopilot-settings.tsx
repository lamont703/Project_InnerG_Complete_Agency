"use client";

import { useState } from "react";
import { toast } from "sonner";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type S = { review_replies: boolean; weekly_posts: boolean; weekly_report: boolean; post_weekday: number };

/** Turn each Autopilot job on or off. Saves on every change. */
export function AutopilotSettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState(initial);
  const save = async (patch: Partial<S>) => {
    const next = { ...s, ...patch };
    setS(next);
    const r = await fetch("/api/account/autopilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const j = await r.json().catch(() => ({}));
    if (j.ok) toast.success("Saved.");
    else { toast.error(j.error || "Couldn't save."); setS(s); }
  };
  const row = (key: keyof S, title: string, body: string) => (
    <label className="flex cursor-pointer items-start gap-3 py-3">
      <input type="checkbox" checked={!!s[key]} onChange={(e) => save({ [key]: e.target.checked } as Partial<S>)} className="mt-1 h-4 w-4" />
      <span><span className="font-bold">{title}</span><span className="block text-sm text-slate-600">{body}</span></span>
    </label>
  );
  return (
    <div className="divide-y divide-slate-100">
      {row("review_replies", "Reply to 4 and 5 star reviews", "Within the hour, in your voice (learned from your own replies). Reviews under 4 stars are never answered for you — those need your words.")}
      {row("weekly_posts", "One Google post a week", "Written only from what's already on your profile — never a price or offer you didn't make. You get the text a day before it goes out, and can cancel it.")}
      {s.weekly_posts && (
        <div className="py-3 pl-7 text-sm">
          Post on{" "}
          <select value={s.post_weekday} onChange={(e) => save({ post_weekday: Number(e.target.value) })} className="rounded-lg border border-slate-200 px-2 py-1">
            {DAYS.map((d, i) => <option key={d} value={i}>{d}s</option>)}
          </select>
        </div>
      )}
      {row("weekly_report", "Weekly report", "Every Monday: how often you showed up on Google, calls, new reviews, and what Autopilot did.")}
    </div>
  );
}
