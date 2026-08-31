"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check, Copy, KeyRound, Loader2, Plus, ShieldCheck, UserCheck, UserMinus, UserPlus,
} from "lucide-react";
import {
  addInstructorAction, assignBlockAction, issueInstructorLinkAction, setActiveAction,
} from "./actions";

export interface BlockRow {
  id: string;
  label: string;
  when: string;
  programName: string;
  modality: string;
  instructorId: string | null;
}

export interface InstructorCard {
  id: string;
  name: string;
  licenseNumber: string | null;
  email: string | null;
  active: boolean;
  claimedAt: string | null;
  claimToken: string | null;
  blockCount: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Managing instructors.
 *
 * DEACTIVATE, NEVER DELETE. Every signature an instructor gave points at their
 * row; removing it would turn each of those into "an instructor no longer on
 * file" and unpick hours that were properly signed at the time. Somebody
 * leaving does not un-teach the classes they taught.
 *
 * THE ACCOUNT LINK IS SHOWN, NOT SENT. Nothing messages instructors yet, and a
 * button that looked like it sent something would leave the school believing a
 * person had been contacted when they had not.
 */
export function InstructorsClient({
  instructors,
  blocks,
  origin,
}: {
  instructors: InstructorCard[];
  blocks: BlockRow[];
  origin: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(instructors.length === 0);
  const [f, setF] = useState({ name: "", licenseNumber: "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [freshLink, setFreshLink] = useState<Record<string, string>>({});

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addInstructorAction(f);
      if (res.ok) { setF({ name: "", licenseNumber: "", email: "" }); setOpen(false); router.refresh(); }
      else setError(res.error ?? "Could not add that instructor.");
    });
  };

  const copy = (id: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const linkFor = (i: InstructorCard) => {
    const token = freshLink[i.id] ?? i.claimToken;
    return token ? `${origin}/instructor?claim=${token}` : null;
  };

  const active = instructors.filter((i) => i.active);
  const inactive = instructors.filter((i) => !i.active);

  return (
    <div className="space-y-8">
      {/* Add */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            Add an instructor
          </button>
        ) : (
          <form onSubmit={add} className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">Add an instructor</h2>
            <p className="text-xs leading-relaxed text-slate-500">
              A real person with a real TDLR instructor license. Their name goes against every set
              of distance hours they sign for, so a placeholder here becomes a placeholder on a
              compliance record.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                required autoFocus placeholder="Full name" value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
              />
              <input
                placeholder="TDLR license no." value={f.licenseNumber}
                onChange={(e) => setF({ ...f, licenseNumber: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
              />
              <input
                type="email" placeholder="Email" value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
                className="rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
              />
            </div>
            {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit" disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add and create their link
              </button>
              <button
                type="button" onClick={() => setOpen(false)}
                className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* The people */}
      {instructors.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
          Nobody on file yet. Until there is at least one instructor, no distance hours can be
          signed for — the sign-off queue will collect sessions it has nobody to attribute.
        </p>
      ) : (
        <div className="space-y-3">
          {[...active, ...inactive].map((i) => {
            const url = linkFor(i);
            return (
              <div
                key={i.id}
                className={`rounded-2xl border p-5 shadow-sm ${i.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={`font-black ${i.active ? "text-slate-900" : "text-slate-500"}`}>
                      {i.name}
                      {!i.active && <span className="ml-2 text-xs font-bold uppercase tracking-wide">inactive</span>}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {i.licenseNumber ? `License ${i.licenseNumber}` : "No license number on file"}
                      {i.email && ` · ${i.email}`}
                      {" · "}
                      {i.blockCount === 0
                        ? "not on the timetable"
                        : `${i.blockCount} ${i.blockCount === 1 ? "class" : "classes"}`}
                    </p>
                  </div>
                  <button
                    onClick={() => startTransition(async () => {
                      const res = await setActiveAction(i.id, !i.active);
                      if (res.ok) router.refresh(); else setError(res.error ?? null);
                    })}
                    disabled={pending}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {i.active ? <UserMinus className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    {i.active ? "Deactivate" : "Reactivate"}
                  </button>
                </div>

                {/* Account */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {i.claimedAt ? (
                    <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                      <ShieldCheck className="h-4 w-4" />
                      Signed up — signatures from this account are authenticated
                    </p>
                  ) : (
                    <>
                      <p className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <KeyRound className="h-4 w-4 text-slate-400" />
                        No account yet
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Until they sign in, anything signed in their name is recorded as asserted by
                        the console rather than given by them.
                      </p>
                      {url ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                            {url}
                          </code>
                          <button
                            onClick={() => copy(i.id, url)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800"
                          >
                            {copied === i.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied === i.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startTransition(async () => {
                            const res = await issueInstructorLinkAction(i.id);
                            if (res.ok && res.token) setFreshLink((p) => ({ ...p, [i.id]: res.token! }));
                            else setError(res.error ?? null);
                          })}
                          disabled={pending}
                          className="mt-2 inline-flex items-center gap-2 rounded-lg border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Create their link
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timetable assignment */}
      <section>
        <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-slate-500">
          Who teaches what
        </h2>
        <p className="mb-3 max-w-2xl text-xs leading-relaxed text-slate-500">
          An instructor&apos;s sign-off queue shows the online sessions for the classes they are
          down to teach. Somebody assigned to nothing sees nothing, so this is what makes their
          account useful. Being scheduled to teach a class and confirming a session happened are
          recorded separately — this sets the first.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-3 font-black text-slate-700">Class</th>
                <th className="px-5 py-3 font-black text-slate-700">When</th>
                <th className="px-5 py-3 font-black text-slate-700">Instructor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blocks.map((b) => (
                <tr key={b.id} className={b.modality === "distance" ? "bg-sky-50/40" : ""}>
                  <td className="px-5 py-3">
                    <span className="font-bold text-slate-900">{b.label}</span>
                    <span className="ml-2 text-xs text-slate-500">{b.programName}</span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-slate-600">{b.when}</td>
                  <td className="px-5 py-3">
                    <select
                      value={b.instructorId ?? ""}
                      onChange={(e) => startTransition(async () => {
                        const res = await assignBlockAction(b.id, e.target.value || null);
                        if (res.ok) router.refresh(); else setError(res.error ?? null);
                      })}
                      disabled={pending}
                      className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-sm font-semibold outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value="">Nobody</option>
                      {active.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Shaded rows are the online classes — the only ones whose hours need signing.
        </p>
      </section>

      {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
    </div>
  );
}
