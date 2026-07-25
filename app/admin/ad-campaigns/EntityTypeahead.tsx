"use client";

import { useEffect, useRef, useState } from "react";
import { AD_ENTITY_TYPES } from "@/lib/ad-campaigns";
import { searchAdEntities, type EntitySuggestion } from "./actions";
import { Search, Check, X, Loader2 } from "lucide-react";

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

// Coordinated entity type + name type-ahead. Submits two form fields:
//   entity_type (the <select>) and creative (a hidden input = the chosen slug).
export function EntityTypeahead({ heading = "Entity being advertised" }: { heading?: string }) {
  const [entityType, setEntityType] = useState(AD_ENTITY_TYPES[0].key);
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<EntitySuggestion[]>([]);
  const [selected, setSelected] = useState<EntitySuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced search. Skips while a selection is showing (text === selected name).
  useEffect(() => {
    if (selected && text === selected.name) return;
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await searchAdEntities(entityType, text);
      setSuggestions(res);
      setLoading(false);
      setOpen(true);
    }, 250);
    return () => clearTimeout(t);
  }, [text, entityType, selected]);

  function pick(s: EntitySuggestion) {
    setSelected(s);
    setText(s.name);
    setSuggestions([]);
    setOpen(false);
  }

  function clearSelection() {
    setSelected(null);
    setText("");
    setSuggestions([]);
  }

  function titleCase(s: string) {
    return (s || "").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="border-t border-slate-100 pt-5">
      <p className="text-sm font-black text-slate-800 mb-3">{heading}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm font-bold text-slate-700">
          Entity type
          <select
            name="entity_type"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              clearSelection(); // a slug from another type is invalid
            }}
            className={`${inputCls} mt-1 font-normal bg-white`}
          >
            {AD_ENTITY_TYPES.map((e) => (
              <option key={e.key} value={e.key}>{e.label}</option>
            ))}
          </select>
        </label>

        <div className="text-sm font-bold text-slate-700 relative">
          Find the business
          {/* The slug the campaign actually stores. */}
          <input type="hidden" name="creative" value={selected?.slug || ""} />
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={text}
              autoComplete="off"
              placeholder="Start typing a name…"
              onChange={(e) => {
                setText(e.target.value);
                if (selected) setSelected(null);
              }}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
              className={`${inputCls} font-normal pl-9 ${selected ? "border-emerald-400 bg-emerald-50/40" : ""}`}
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
            {selected && !loading && (
              <button type="button" onClick={clearSelection} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}

            {open && suggestions.length > 0 && (
              <ul
                className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
                onMouseDown={(e) => { e.preventDefault(); if (blurTimer.current) clearTimeout(blurTimer.current); }}
              >
                {suggestions.map((s) => (
                  <li key={s.slug}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors"
                    >
                      <span className="block font-bold text-slate-900 text-sm">{titleCase(s.name)}</span>
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {s.city ? titleCase(s.city) + " · " : ""}{s.slug}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selected ? (
            <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
              <Check className="w-3 h-3" /> Selected — ad links to {selected.slug}
            </span>
          ) : (
            <span className="block text-[11px] font-normal text-slate-400 mt-1">Pick a result to set the advertised entity.</span>
          )}
        </div>
      </div>
    </div>
  );
}
