"use client";

import * as React from "react";
import { X, ExternalLink, ArrowLeft, Loader2 } from "lucide-react";
import { embedHref } from "@/lib/embed-mode";

/**
 * A site page, opened beside the chat instead of instead of it.
 *
 * THE PROBLEM. Every link the agent produces is a real internal path, and
 * clicking one navigated away — taking the conversation with it. The answer and
 * the thing the answer is about could not be looked at together, and coming
 * back meant losing the thread. Someone comparing three schools had to leave
 * three times.
 *
 * A SAME-ORIGIN IFRAME, and it works because next.config sets
 * X-Frame-Options: SAMEORIGIN rather than DENY. The src carries ?embed=1 so the
 * page inside drops its navbar and floating CTA — see lib/embed-mode.ts for why
 * that flag has to exist at all.
 *
 * INTERNAL PATHS ONLY. embedHref() returns null for anything absolute or
 * protocol-relative, and this renders nothing in that case. Framing a third
 * party would be a security and consent problem, and their frame-ancestors
 * header would very often just render a blank box anyway.
 *
 * THE ESCAPE HATCHES MATTER AS MUCH AS THE PANEL. "Open in a new tab" is always
 * offered, because an iframe is a worse place to read something long, and a
 * reader who wants the real page should never have to fight for it.
 */
export function PagePanel({
  url,
  onClose,
  onCollapseChat,
  chatCollapsed,
}: {
  /** Internal path the agent linked to. */
  url: string;
  onClose: () => void;
  /** Hides the chat column so the page gets the full width. */
  onCollapseChat: () => void;
  chatCollapsed: boolean;
}) {
  const src = embedHref(url);
  const [loading, setLoading] = React.useState(true);

  // A new url means a new document; without this the spinner never returns and
  // the panel looks frozen while the next page loads.
  React.useEffect(() => setLoading(true), [url]);

  if (!src) return null;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <button
          type="button"
          onClick={onCollapseChat}
          data-ig-click="panel_toggle_chat"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
          title={chatCollapsed ? "Show the chat" : "Hide the chat"}
        >
          <ArrowLeft className={`h-3.5 w-3.5 transition-transform ${chatCollapsed ? "rotate-180" : ""}`} />
          {chatCollapsed ? "Chat" : "Hide chat"}
        </button>

        {/* The path, so it is never a mystery what is being shown. */}
        <span className="min-w-0 flex-1 truncate text-center text-xs font-medium text-slate-500">{url}</span>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          data-ig-click="panel_open_new_tab"
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
          title="Open in a new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button
          type="button"
          onClick={onClose}
          data-ig-click="panel_close"
          aria-label="Close panel"
          className="rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        )}
        <iframe
          key={src}
          src={src}
          onLoad={() => setLoading(false)}
          title={`Preview of ${url}`}
          className="h-full w-full border-0"
          /*
           * Same-origin, so no sandbox: the page needs its own scripts to
           * render, and sandboxing it without allow-same-origin would break
           * every client component inside. This only ever frames our own
           * pages — see embedHref.
           */
          referrerPolicy="same-origin"
        />
      </div>
    </div>
  );
}
