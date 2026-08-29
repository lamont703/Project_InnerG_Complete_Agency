"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Loader2, Plus, Store, UserPlus, History, AlertCircle, Send } from "lucide-react";
import type { PaymentStatus, PaymentWeek } from "@/lib/credit-report/model";
import type { Enrollment, RosterEntry } from "@/lib/credit-report/store";
import { weeksBetween, weekLabel, mondayOf } from "@/lib/credit-report/weeks";
import { addWorkerAction, resendInviteAction, setWeekAction, updateShopAction, updateWorkerAction } from "./actions";

export interface WorkerWithWeeks extends RosterEntry {
  weeks: PaymentWeek[];
}

/**
 * The credit reporting management system.
 *
 * WHAT THIS EXISTS TO MAKE POSSIBLE is correction. The biweekly SMS check-in
 * collects the record going forward; this is where an owner fixes what it got
 * wrong, fills in the months before they enrolled, and updates a licence number
 * or an address. Every week of every barber, editable, back as far as the
 * placement goes.
 *
 * "NO RECORD" IS A FIRST-CLASS CHOICE, not an absence. An owner who realises
 * they never actually knew whether a week was paid has to be able to say so —
 * otherwise the only way out of a wrong entry is a different wrong entry.
 */

const STATUS_OPTIONS: { value: PaymentStatus; label: string; tone: string }[] = [
  { value: "no_record", label: "No record", tone: "bg-slate-100 text-slate-600" },
  { value: "on_time", label: "Paid on time", tone: "bg-emerald-100 text-emerald-800" },
  { value: "caught_up", label: "Caught up next week", tone: "bg-sky-100 text-sky-800" },
  { value: "late", label: "Late", tone: "bg-amber-100 text-amber-900" },
  { value: "missed", label: "Not paid", tone: "bg-rose-100 text-rose-800" },
  { value: "excused", label: "Week off — nothing owed", tone: "bg-slate-100 text-slate-600" },
];

const FIELD =
  "w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-blue-500";
const LABEL = "ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400";

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900">
        <Icon className="h-4 w-4 text-slate-400" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function ShopDetails({ enrollment }: { enrollment: Enrollment }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    shopName: enrollment.shopName,
    address: enrollment.address,
    email: enrollment.email,
    smsPhone: enrollment.smsPhone,
    shopLicenseNumber: enrollment.shopLicenseNumber,
    dueDay: enrollment.dueDay,
  });

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateShopAction(f);
      if (res.ok) setSaved(true);
      else setError(res.error ?? "Could not save.");
    });
  };

  return (
    <Section title="Shop details" icon={Store}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL}>Shop name</label>
          <input className={FIELD} value={f.shopName} onChange={(e) => setF({ ...f, shopName: e.target.value })} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className={LABEL}>Address</label>
          <input className={FIELD} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Email</label>
          <input className={FIELD} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>SMS number for check-ins</label>
          <input className={FIELD} value={f.smsPhone} onChange={(e) => setF({ ...f, smsPhone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Shop licence number</label>
          <input
            className={FIELD}
            value={f.shopLicenseNumber}
            onChange={(e) => setF({ ...f, shopLicenseNumber: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Rent due on</label>
          <select className={FIELD} value={f.dueDay} onChange={(e) => setF({ ...f, dueDay: e.target.value })}>
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-rose-700">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save shop details
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </Section>
  );
}

function AddWorker() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [rent, setRent] = useState("");
  const [startedAt, setStartedAt] = useState("");

  const add = () => {
    setError(null);
    startTransition(async () => {
      const res = await addWorkerAction({ name, phone, rentPerWeek: rent, startedAt });
      if (res.ok) {
        /*
         * "Sent", never "delivered". lib/ghl-sms.ts is explicit that a text to
         * a landline is accepted by GHL and dropped by the carrier, and a lot
         * of numbers in this trade are landlines. Telling an owner it arrived
         * would have them waiting on a claim that is never coming.
         */
        setOutcome(
          res.invite === "sent"
            ? `Invite text sent to ${phone}. If they don't get it, use Resend on their card.`
            : res.invite === "no_phone"
              ? "Added. No number on file, so no invite went out — they cannot claim the record until you add one."
              : res.invite === "not_configured"
                ? "Added, but texting is not configured on this deployment, so no invite went out."
                : "Added, but the invite text could not be sent. Check the number and use Resend."
        );
        setName("");
        setPhone("");
        setRent("");
        setStartedAt("");
      } else { setOutcome(null); setError(res.error ?? "Could not add."); }
    });
  };

  return (
    <Section title="Add someone renting a chair" icon={UserPlus}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={LABEL}>Name</label>
          <input className={FIELD} value={name} onChange={(e) => setName(e.target.value)} placeholder="Marcus Webb" />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Mobile (optional)</label>
          <input className={FIELD} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(713) 555-0148" />
          {/* The single most consequential optional field on the page. */}
          <p className="ml-1 text-[11px] leading-relaxed text-slate-500">
            Without a number they can never claim the record, so it stays private to you and useless
            to them.
          </p>
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Weekly rent (optional)</label>
          <input className={FIELD} value={rent} onChange={(e) => setRent(e.target.value)} placeholder="225" inputMode="decimal" />
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Started (optional)</label>
          <input className={FIELD} type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
          <p className="ml-1 text-[11px] leading-relaxed text-slate-500">
            Set this back to when they actually started and you can fill in the history.
          </p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm font-semibold text-rose-700">{error}</p>}
      {outcome && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {outcome}
        </p>
      )}

      <button
        onClick={add}
        disabled={pending || !name.trim()}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add to roster
      </button>
    </Section>
  );
}

function WeekRow({
  rosterId,
  weekStart,
  current,
}: {
  rosterId: string;
  weekStart: string;
  current: PaymentWeek | undefined;
}) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<PaymentStatus>(current?.status ?? "no_record");
  const [error, setError] = useState<string | null>(null);

  const change = (next: PaymentStatus) => {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const res = await setWeekAction(rosterId, {
        weekStart,
        status: next,
        daysLate: next === "late" ? current?.daysLate ?? 1 : null,
        note: current?.note ?? null,
      });
      // Roll the control back rather than leaving it showing a value the
      // database rejected — a select that lies is worse than an error.
      if (!res.ok) {
        setStatus(previous);
        setError(res.error ?? "Could not save.");
      }
    });
  };

  const tone = STATUS_OPTIONS.find((o) => o.value === status)?.tone ?? "";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="w-28 shrink-0 text-xs font-bold text-slate-600">{weekLabel(weekStart)}</span>
      <select
        value={status}
        disabled={pending}
        onChange={(e) => change(e.target.value as PaymentStatus)}
        className={`rounded-lg px-3 py-1.5 text-xs font-bold outline-none transition-colors disabled:opacity-50 ${tone}`}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      {error && <span className="text-xs font-semibold text-rose-700">{error}</span>}
    </div>
  );
}

function WorkerCard({ worker, origin }: { worker: WorkerWithWeeks; origin: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [resend, setResend] = useState<{ ok: boolean; text: string } | null>(null);

  const byWeek = useMemo(() => {
    const m = new Map<string, PaymentWeek>();
    for (const w of worker.weeks) m.set(w.weekStart, w);
    return m;
  }, [worker.weeks]);

  /*
   * History runs from the placement start, or 26 weeks back when the owner
   * never set one. Half a year is enough to be useful without presenting a
   * wall; setting a start date is how you get more.
   */
  const today = new Date().toISOString().slice(0, 10);
  const from = worker.startedAt || mondayOf(new Date(Date.now() - 26 * 7 * 86_400_000).toISOString().slice(0, 10));
  const weeks = weeksBetween(from, today);

  const inviteUrl = worker.inviteToken ? `${origin}/account/credit-report?invite=${worker.inviteToken}` : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-black text-slate-900">{worker.barberName}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {worker.barberPhone || "No number on file"}
            {worker.rentPerWeek != null && ` · $${worker.rentPerWeek}/wk`}
            {worker.startedAt && ` · since ${weekLabel(worker.startedAt)}`}
          </p>
          <p className="mt-1.5">
            {worker.claimedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                <Check className="h-3 w-3" /> Claimed — this is theirs now
              </span>
            ) : worker.barberPhone ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-black text-amber-900">
                {worker.invitedAt
                  ? `Invite sent ${weekLabel(worker.invitedAt.slice(0, 10))} — not accepted yet`
                  : "No invite sent yet"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-black text-slate-600">
                <AlertCircle className="h-3 w-3" /> No number — they cannot claim this
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {/* Resend, for the ordinary case: they never saw the first one.
              Hidden once claimed, because there is nothing left to claim. */}
          {!worker.claimedAt && (
            <button
              onClick={() =>
                startTransition(async () => {
                  const res = await resendInviteAction(worker.id);
                  setResend({
                    ok: !!res.ok,
                    text: res.ok ? `Invite re-sent to ${worker.barberPhone}.` : res.error ?? "Could not resend.",
                  });
                })
              }
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Resend invite
            </button>
          )}
          {inviteUrl && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  /* clipboard unavailable — the owner can still text them */
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy invite"}
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <History className="h-3.5 w-3.5" />
            {open ? "Hide history" : "Edit history"}
          </button>
          {worker.status === "active" && (
            <button
              onClick={() => startTransition(async () => { await updateWorkerAction(worker.id, { status: "ended" }); })}
              disabled={pending}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              No longer here
            </button>
          )}
        </div>
      </div>

      {resend && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
            resend.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
          }`}
        >
          {resend.text}
        </p>
      )}

      {open && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            Newest first. Change any week — corrections are expected, and the barber sees the
            corrected version immediately.
          </p>
          <div className="max-h-96 overflow-y-auto pr-1">
            {weeks.map((w) => (
              <WeekRow key={w} rosterId={worker.id} weekStart={w} current={byWeek.get(w)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CreditReportingManager({
  enrollment,
  workers,
  origin,
}: {
  enrollment: Enrollment;
  workers: WorkerWithWeeks[];
  origin: string;
}) {
  return (
    <div className="space-y-6">
      <ShopDetails enrollment={enrollment} />
      <AddWorker />

      <Section title={`Your roster (${workers.length})`} icon={UserPlus}>
        {workers.length === 0 ? (
          <p className="text-sm leading-relaxed text-slate-600">
            Nobody on the roster yet. Add the people renting chairs from you above — the biweekly
            check-in has nothing to ask about until then.
          </p>
        ) : (
          <div className="space-y-4">
            {workers.map((w) => (
              <WorkerCard key={w.id} worker={w} origin={origin} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
