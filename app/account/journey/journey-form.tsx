"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { saveJourneyAction } from "./actions";
import {
  STATE_LABELS,
  TRACK_LABELS,
  type JourneyFacts,
  type JourneyState,
  type LicenseTrack,
} from "@/lib/member-journey";

/**
 * The one form that turns an account into an agent.
 *
 * SIX FIELDS, AND ONLY THREE MATTER. State, licence and exam date are what
 * change every downstream answer; school, ZIP and hours make it sharper. So
 * nothing is required, and the form saves whatever it has. A student who knows
 * only that they're doing cosmetology in Texas should be able to say that and
 * get something back, rather than be blocked by a date they haven't been given
 * yet.
 *
 * TRACKS ARE FILTERED BY STATE. Texas issues eight separate specialty
 * licences; California's set is different and includes electrologist and
 * hairstylist, which Texas does not license separately. Offering every track
 * to every state would invite someone to pick a licence their state doesn't
 * issue, and then quietly answer them about it.
 */

const TRACKS_BY_STATE: Record<JourneyState, LicenseTrack[]> = {
  TX: ["barber", "cosmetology", "esthetician", "manicurist", "eyelash", "hair_weaving", "undecided"],
  CA: ["barber", "cosmetology", "esthetician", "manicurist", "hairstylist", "electrologist", "undecided"],
  MD: ["barber", "cosmetology", "esthetician", "manicurist", "eyelash", "hairstylist", "undecided"],
  // The exam-only states. Tracks are listed where the state actually licenses
  // them AND we hold a kit list, so nobody picks a licence we would then answer
  // about from another state's document. Minnesota offers only "undecided"
  // because its single page is the INSTRUCTOR practical, not an entry licence.
  VA: ["barber", "cosmetology", "undecided"],
  OH: ["barber", "cosmetology", "undecided"],
  MS: ["barber", "cosmetology", "esthetician", "manicurist", "undecided"],
  TN: ["barber", "undecided"],
  MN: ["instructor", "undecided"],
};

const LABEL = "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block";
const INPUT =
  "w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 focus:ring-0 transition-all outline-none";

export function JourneyForm({ initial }: { initial: JourneyFacts }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [state, setState] = useState<JourneyState | "">(initial.state ?? "");
  const [track, setTrack] = useState<LicenseTrack | "">(initial.track ?? "");
  const [schoolName, setSchoolName] = useState(initial.schoolName ?? "");
  const [examDate, setExamDate] = useState(initial.examDate ?? "");
  const [zip, setZip] = useState(initial.zip ?? "");
  const [hoursCompleted, setHoursCompleted] = useState(
    initial.hoursCompleted != null ? String(initial.hoursCompleted) : ""
  );
  const [hoursRequired, setHoursRequired] = useState(
    initial.hoursRequired != null ? String(initial.hoursRequired) : ""
  );
  const [licensed, setLicensed] = useState(Boolean(initial.licensedAt));

  // Changing state can strand a track the new state doesn't issue. Clearing it
  // is better than silently keeping a licence that doesn't exist there.
  const onStateChange = (next: string) => {
    const s = (next || "") as JourneyState | "";
    setState(s);
    if (s && track && !TRACKS_BY_STATE[s].includes(track as LicenseTrack)) setTrack("");
  };

  const availableTracks = state ? TRACKS_BY_STATE[state as JourneyState] : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    startTransition(async () => {
      const result = await saveJourneyAction({
        state: state || null,
        track: track || null,
        schoolName: schoolName.trim() || null,
        examDate: examDate || null,
        zip: zip.trim() || null,
        hoursCompleted,
        hoursRequired,
        licensed,
      });
      if (result.ok) {
        setSaved(true);
        (window as any).innerG?.track?.("journey_saved", {
          has_state: !!state,
          has_track: !!track,
          has_exam_date: !!examDate,
          has_school: !!schoolName.trim(),
          has_zip: !!zip.trim(),
        });
        // The milestones, countdown and school stats above are all server
        // rendered from this data, so a save that didn't refresh them would
        // look like it hadn't worked.
        router.refresh();
      } else {
        toast.error(result.error || "Could not save that.");
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="jr-state" className={LABEL}>
            State
          </label>
          <select id="jr-state" value={state} onChange={(e) => onStateChange(e.target.value)} className={INPUT}>
            <option value="">Select…</option>
            {(Object.keys(STATE_LABELS) as JourneyState[]).map((s) => (
              <option key={s} value={s}>
                {STATE_LABELS[s]}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Fees, hours and even whether there&apos;s a practical exam differ by state.
          </p>
        </div>

        <div>
          <label htmlFor="jr-track" className={LABEL}>
            Licence you&apos;re going for
          </label>
          <select
            id="jr-track"
            value={track}
            onChange={(e) => setTrack(e.target.value as LicenseTrack)}
            disabled={!state}
            className={`${INPUT} disabled:opacity-50`}
          >
            <option value="">{state ? "Select…" : "Pick a state first"}</option>
            {availableTracks.map((t) => (
              <option key={t} value={t}>
                {TRACK_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="jr-exam" className={LABEL}>
            Exam date
          </label>
          <input id="jr-exam" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={INPUT} />
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            Best guess is fine — change it whenever. This is what puts everything else on a clock.
          </p>
        </div>

        <div>
          <label htmlFor="jr-school" className={LABEL}>
            Your school
          </label>
          <input
            id="jr-school"
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Bladesmith Barber College"
            className={INPUT}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="jr-zip" className={LABEL}>
            Where you want to work
          </label>
          <input
            id="jr-zip"
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            placeholder="77002"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="jr-hours-done" className={LABEL}>
            Hours done
          </label>
          <input
            id="jr-hours-done"
            type="text"
            inputMode="numeric"
            value={hoursCompleted}
            onChange={(e) => setHoursCompleted(e.target.value.replace(/\D/g, ""))}
            placeholder="450"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="jr-hours-req" className={LABEL}>
            Hours required
          </label>
          <input
            id="jr-hours-req"
            type="text"
            inputMode="numeric"
            value={hoursRequired}
            onChange={(e) => setHoursRequired(e.target.value.replace(/\D/g, ""))}
            placeholder="1000"
            className={INPUT}
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={licensed}
          onChange={(e) => setLicensed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300"
        />
        <span className="text-xs font-bold text-slate-700">
          I&apos;ve passed and I&apos;m licensed
          <span className="block text-[11px] font-medium text-slate-500 mt-0.5">
            Switches everything over from exam prep to finding work.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && !pending && (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Check className="w-4 h-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
