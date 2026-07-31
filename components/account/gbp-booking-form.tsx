"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Calendar, Check, ExternalLink, Info, Loader2, Lock, Trash2 } from "lucide-react";
import { validateBookingUrl, type BookingState, type PlaceActionLink } from "@/lib/gbp-place-actions";

/**
 * The Book button.
 *
 * One link, one job — but the most valuable click on the profile, so the screen
 * spends its effort on where that click lands rather than on the form. A link
 * to a Facebook page is refused; a link to a homepage is allowed with a note,
 * because some shops genuinely book from the front page and most owners have
 * never thought about the difference.
 */
export function GbpBookingForm() {
  const [state, setState] = useState<BookingState | null>(null);
  const [url, setUrl] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/account/gbp-booking", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) setError(json.error || "Could not load your booking links.");
      else setState(json.state);
    } catch { setError("Could not load your booking links."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const send = async (payload: Record<string, unknown>, message: string) => {
    setBusy(true); setError(null); setDone(null);
    try {
      const res = await fetch("/api/account/gbp-booking", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error || "That didn't work."); return; }
      setState(json.state); setUrl(""); setEditing(null); setDone(message);
    } catch { setError("That didn't work."); }
    finally { setBusy(false); }
  };

  if (loading) return <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Checking your booking links…</p>;
  if (error && !state) return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm font-semibold text-amber-900">{error}</p>
      <Link href="/account/gbp-audit" className="mt-3 inline-block text-sm font-bold text-primary hover:underline">Back to my audit</Link>
    </div>
  );
  if (!state) return null;

  const check = url.trim() ? validateBookingUrl(url) : null;

  return (
    <div>
      {!state.hasBooking && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5">
          <p className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Calendar className="h-4 w-4 text-primary" /> No booking link yet
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
            Without one, someone ready to book has to find your website first. Most don&apos;t.
          </p>
        </div>
      )}

      {state.editable.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Your booking links</h2>
          {state.editable.map((l) => (
            <LinkRow
              key={l.name}
              link={l}
              busy={busy}
              editing={editing === l.name}
              onEdit={() => { setEditing(l.name!); setUrl(l.uri); }}
              onCancel={() => { setEditing(null); setUrl(""); }}
              onSave={(next) => send({ action: "update", linkName: l.name, uri: next }, "Booking link updated.")}
              onRemove={() => send({ action: "delete", linkName: l.name }, "Booking link removed.")}
              url={url}
              setUrl={setUrl}
            />
          ))}
        </section>
      )}

      {state.locked.length > 0 && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
            <Lock className="h-3 w-3" /> Managed by your booking provider
          </p>
          {state.locked.map((l) => (
            <p key={l.name} className="mt-2 break-all text-sm text-slate-600">{l.uri}</p>
          ))}
          <p className="mt-2 text-xs text-slate-500">
            These come from an integration rather than from you, so they have to be changed there.
          </p>
        </section>
      )}

      {state.missingTypes.length > 0 && !editing && (
        <section className="mt-6">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Add {state.missingTypes[0].displayName.toLowerCase()}
          </h2>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://yourshop.com/book"
            aria-label="Booking link"
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />
          <Issues check={check} />
          <button
            onClick={() => send({ action: "create", uri: url, placeActionType: state.missingTypes[0].placeActionType }, "Booking link added.")}
            disabled={busy || !check?.ok}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-black uppercase tracking-wide text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Add booking link
          </button>
        </section>
      )}

      {error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {done && (
        <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          <Check className="h-4 w-4" /> {done}
        </p>
      )}

      <p className="mt-8">
        <Link href="/account/gbp-audit" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          Back to my audit <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}

function Issues({ check }: { check: ReturnType<typeof validateBookingUrl> | null }) {
  if (!check || !check.issues.length) return null;
  return (
    <ul className="mt-2 space-y-1">
      {check.issues.map((i, n) => (
        <li key={n} className={`flex items-start gap-2 text-xs ${i.level === "error" ? "text-rose-700" : "text-amber-700"}`}>
          {i.level === "error" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          {i.message}
        </li>
      ))}
    </ul>
  );
}

function LinkRow({
  link, editing, busy, url, setUrl, onEdit, onCancel, onSave, onRemove,
}: {
  link: PlaceActionLink; editing: boolean; busy: boolean; url: string;
  setUrl: (v: string) => void; onEdit: () => void; onCancel: () => void;
  onSave: (next: string) => void; onRemove: () => void;
}) {
  const check = editing && url.trim() ? validateBookingUrl(url) : null;
  const existing = validateBookingUrl(link.uri);

  return (
    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4">
      {editing ? (
        <>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Booking link"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
          />
          <Issues check={check} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => onSave(url)} disabled={busy || !check?.ok} className="rounded-xl bg-primary px-4 py-2 text-sm font-black uppercase tracking-wide text-primary-foreground disabled:opacity-50">
              Save
            </button>
            <button onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <a href={link.uri} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 break-all text-sm font-semibold text-primary hover:underline">
              {link.uri} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
            <div className="flex shrink-0 gap-2">
              <button onClick={onEdit} className="text-xs font-bold text-slate-600 hover:text-slate-900">Edit</button>
              <button onClick={onRemove} disabled={busy} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 disabled:opacity-50">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
          {existing.issues.length > 0 && <Issues check={existing} />}
        </>
      )}
    </div>
  );
}
