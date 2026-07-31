"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Downloads a server-rendered PDF of the current page.
 *
 * Deliberately not window.print(): that hands the job to the visitor's own
 * print pipeline, which can sit on "Saving" indefinitely with no error and no
 * way for the page to recover. Here the work happens server-side and every
 * outcome is observable — it succeeds, or it says why.
 */
export function DownloadPdfButton({
  path,
  label = "Download PDF",
  className,
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Server rendering takes a few seconds; a request that never returns
      // must fail loudly rather than leave the button spinning forever —
      // that silent hang is the entire reason this component exists.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`/api/pdf?path=${encodeURIComponent(path)}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (path.replace(/^\/+/, "").replace(/\//g, "-") || "page") + ".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoking immediately can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      toast.error(
        aborted
          ? "The PDF took too long to build. Try again, or use your browser's Print → Save as PDF."
          : "Couldn't build the PDF. Try again, or use your browser's Print → Save as PDF."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={download}
      disabled={busy}
      aria-busy={busy}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait transition-colors"
      }
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {busy ? "Building PDF…" : label}
    </button>
  );
}
