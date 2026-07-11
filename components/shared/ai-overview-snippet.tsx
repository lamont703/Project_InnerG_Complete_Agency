"use client"

import { Sparkles, ChevronRight, Loader2 } from "lucide-react"

const PREVIEW_LENGTH = 220

// Mirrors Google's AI Overview: a live AI answer sits above the organic
// results instead of behind a separate tab, with a low-friction path to
// keep reading/chatting — familiarizes people with AI search as a
// companion to the results list, not a detour away from it. Reuses the
// exact same conversation the dedicated "AI Mode" tab already runs (see
// page.tsx's auto-ask effect and handleTabClick), so clicking through
// here never re-asks the question — it's already answered.
export function AiOverviewSnippet({
  responseText,
  isLoading,
  onExpand,
}: {
  responseText: string | null
  isLoading: boolean
  onExpand: () => void
}) {
  const preview = responseText
    ? responseText.length > PREVIEW_LENGTH
      ? responseText.slice(0, PREVIEW_LENGTH).trim() + "…"
      : responseText
    : null

  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full text-left bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 mb-2 hover:border-blue-300 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </span>
        <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">AI Overview</p>
      </div>

      {isLoading && !preview ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Thinking about your search…
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{preview}</p>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 mt-3 group-hover:underline">
            Continue in AI Mode
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </>
      )}
    </button>
  )
}
