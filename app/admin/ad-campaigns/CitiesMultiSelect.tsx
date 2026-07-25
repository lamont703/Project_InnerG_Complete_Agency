"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";

// Multi-select city picker for geo-targeting. Client-side filters the known
// hub-city list (no DB call) and submits one hidden `target_cities` input per
// selection. Empty = no city restriction.
export function CitiesMultiSelect({ cityOptions, initial = [] }: { cityOptions: { name: string; state: string }[]; initial?: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const q = text.trim().toLowerCase();
  const suggestions =
    q.length >= 1
      ? cityOptions.filter((c) => c.name.toLowerCase().includes(q) && !selected.includes(c.name)).slice(0, 10)
      : [];

  const add = (name: string) => {
    setSelected((s) => [...s, name]);
    setText("");
  };
  const remove = (name: string) => setSelected((s) => s.filter((n) => n !== name));

  return (
    <div>
      {selected.map((n) => (
        <input key={n} type="hidden" name="target_cities" value={n} />
      ))}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((n) => (
            <span key={n} className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white text-xs font-bold px-2.5 py-1">
              {n}
              <button type="button" onClick={() => remove(n)} aria-label={`Remove ${n}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Add cities…"
          className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm font-normal"
        />
        {open && suggestions.length > 0 && (
          <ul
            className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
            onMouseDown={(e) => {
              e.preventDefault();
              if (blurTimer.current) clearTimeout(blurTimer.current);
            }}
          >
            {suggestions.map((c) => (
              <li key={`${c.state}-${c.name}`}>
                <button type="button" onClick={() => add(c.name)} className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors text-sm">
                  <span className="font-bold text-slate-900">{c.name}</span> <span className="text-[11px] text-slate-400">{c.state}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
