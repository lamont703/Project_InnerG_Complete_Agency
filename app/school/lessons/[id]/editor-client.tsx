"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, Plus, Trash2 } from "lucide-react";
import { addSectionAction, deleteSectionAction, setPublishedAction } from "../actions";

export interface EditorSection {
  id: string;
  position: number;
  title: string;
  body: string;
  question: string | null;
  options: string[] | null;
  answerIndex: number | null;
}

const EMPTY = { title: "", body: "", question: "", options: ["", "", "", ""], answerIndex: null as number | null };

/**
 * Writing a lesson.
 *
 * THE COMPREHENSION CHECK IS OPTIONAL BUT PROMOTED. A section with a question
 * produces an answer an instructor can look at; a section without one produces
 * a timestamp. Both are allowed, because not every section is a testable claim,
 * and the panel says which one is which rather than nagging.
 */
export function EditorClient({
  lessonId,
  published,
  sections,
}: {
  lessonId: string;
  published: boolean;
  sections: EditorSection[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(sections.length === 0);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const withQuestion = f.question.trim().length > 0;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await addSectionAction({
        lessonId, title: f.title, body: f.body,
        question: f.question,
        options: withQuestion ? f.options : [],
        answerIndex: withQuestion ? f.answerIndex : null,
      });
      if (res.ok) { setF(EMPTY); setOpen(false); router.refresh(); }
      else setError(res.error ?? "Could not add that section.");
    });
  };

  const remove = (sectionId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await deleteSectionAction(sectionId, lessonId);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not remove that section.");
    });
  };

  const togglePublish = () => {
    setError(null);
    startTransition(async () => {
      const res = await setPublishedAction(lessonId, !published);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Could not change that.");
    });
  };

  return (
    <div className="space-y-6">
      {/* Publish state */}
      <section
        className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 p-5 ${
          published ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className={`font-black ${published ? "text-emerald-900" : "text-slate-900"}`}>
            {published ? "Live — students can see this" : "Draft — students cannot see this"}
          </p>
          <p className={`mt-1 text-xs leading-relaxed ${published ? "text-emerald-800" : "text-slate-500"}`}>
            {published
              ? "Students can open it during the scheduled online class and earn hours."
              : "A lesson has to have at least one section before it can go live. Publishing an empty one would let a student open a session with nothing behind it."}
          </p>
        </div>
        <button
          onClick={togglePublish}
          disabled={pending}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black disabled:opacity-50 ${
            published
              ? "border-2 border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {published ? "Take it down" : "Publish"}
        </button>
      </section>

      {error && <p className="text-sm font-bold text-rose-700">{error}</p>}

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((s, idx) => (
          <div key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Section {idx + 1}
                </p>
                <h3 className="mt-1 font-black text-slate-900">{s.title}</h3>
              </div>
              <button
                onClick={() => remove(s.id)}
                disabled={pending}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {s.body || <span className="italic text-slate-400">No text yet.</span>}
            </p>

            {s.question ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-800">{s.question}</p>
                <ul className="mt-2 space-y-1">
                  {(s.options ?? []).map((o, n) => (
                    <li
                      key={n}
                      className={`flex items-center gap-2 text-sm ${
                        n === s.answerIndex ? "font-black text-emerald-800" : "text-slate-600"
                      }`}
                    >
                      {n === s.answerIndex ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="w-3.5" />}
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                No comprehension check — this section records that it was read, and nothing more.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Add */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add a section
          </button>
        ) : (
          <form onSubmit={add} className="space-y-4">
            <h2 className="text-lg font-black text-slate-900">New section</h2>
            <input
              required autoFocus placeholder="Section title" value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
            />
            <textarea
              required rows={8} placeholder="The text of this section. Blank lines start a new paragraph."
              value={f.body}
              onChange={(e) => setF({ ...f, body: e.target.value })}
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm leading-relaxed outline-none focus:border-blue-500"
            />

            <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Comprehension check (optional)
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                A question here is what turns &ldquo;this was open on screen&rdquo; into something an
                instructor can actually look at before signing for the hours.
              </p>
              <input
                placeholder="Question" value={f.question}
                onChange={(e) => setF({ ...f, question: e.target.value })}
                className="mt-3 w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
              />
              {withQuestion && (
                <div className="mt-3 space-y-2">
                  {f.options.map((o, n) => (
                    <label key={n} className="flex items-center gap-3">
                      <input
                        type="radio" name="answer" checked={f.answerIndex === n}
                        onChange={() => setF({ ...f, answerIndex: n })}
                        className="h-4 w-4 shrink-0"
                      />
                      <input
                        placeholder={`Answer ${n + 1}`} value={o}
                        onChange={(e) => {
                          const options = [...f.options];
                          options[n] = e.target.value;
                          setF({ ...f, options });
                        }}
                        className="flex-1 rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </label>
                  ))}
                  <p className="text-xs font-bold text-slate-500">
                    Select the radio button next to the right answer.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit" disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Add section
              </button>
              <button
                type="button" onClick={() => { setOpen(false); setF(EMPTY); }}
                className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
