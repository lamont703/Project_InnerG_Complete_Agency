"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** The LIVE training's settings on /admin/live-training. */
export function LiveTrainingSettings({ initial }: { initial: { default_meet_url: string | null; campaign_start: string | null; mailing_address: string | null } }) {
  const router = useRouter();
  const [meet, setMeet] = useState(initial.default_meet_url ?? "");
  const [start, setStart] = useState(initial.campaign_start ?? "");
  const [address, setAddress] = useState(initial.mailing_address ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const box = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm";
  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/live-training", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ default_meet_url: meet, campaign_start: start, mailing_address: address }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    setMsg(j.ok ? { ok: true, text: "Saved." } : { ok: false, text: j.error || "Not saved." });
    if (j.ok) router.refresh();
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Settings</h2>
      <label className="block text-sm font-bold">Google Meet link (every week)
        <input value={meet} onChange={(e) => setMeet(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" className={box} />
        <span className="mt-1 block text-xs font-normal text-slate-500">Sent 24 hours before and with every reminder after. Until it's set, the link reminders wait (and the cron logs it).</span>
      </label>
      <label className="block text-sm font-bold">Mailing address for emails
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Street or PO box, City, State ZIP" className={box} />
        <span className="mt-1 block text-xs font-normal text-slate-500">Required by CAN-SPAM on promotional email. The 12-week campaign won't send without it.</span>
      </label>
      <label className="block text-sm font-bold">12-week campaign starts (a Wednesday)
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={box} />
        <span className="mt-1 block text-xs font-normal text-slate-500">Emails go out Wednesdays at 11 AM ET to members not yet registered for that Monday. Leave empty to hold it.</span>
      </label>
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.text}</p>}
      <button onClick={save} disabled={busy} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
    </section>
  );
}
