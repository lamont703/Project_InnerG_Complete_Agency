"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Link2, Check, Share2, Linkedin } from "lucide-react";
import { SITE_URL } from "@/lib/site";

/**
 * Share affordances, chosen per audience rather than sprayed everywhere.
 *
 * NO SDK WIDGETS, EVER. The official LinkedIn/X/Facebook buttons load hundreds
 * of kilobytes of third-party JavaScript and set tracking cookies, on every
 * page view, for a control most people never touch. These are plain anchors and
 * one clipboard call. Same reasoning as the video facade.
 *
 * NO X BUTTON. Not an oversight. A student three weeks from a practical exam
 * sends a kit list to a classmate over iMessage, WhatsApp or an Instagram DM —
 * not to a public timeline. An affordance nobody uses still costs layout space
 * on the best pages on the site, and its click-through is indistinguishable
 * from noise, so it can never even be disproven.
 *
 * THE NATIVE SHEET IS THE RIGHT PRIMITIVE FOR STUDENTS. navigator.share opens
 * the device's own share sheet, which contains exactly the channels this
 * content actually travels through. One button, no network chosen for them.
 * It only exists on mobile, which is where that sharing happens anyway.
 *
 * LINKEDIN IS FOR A DIFFERENT READER: school administrators, instructors and
 * accreditors, who forward this kind of thing to colleagues. It belongs on the
 * institutional pages and nowhere near a kit list.
 *
 * WHAT MAKES THE LINKEDIN BUTTON WORK IS NOT THIS COMPONENT. LinkedIn ignores
 * any title or description passed in the URL — it reads Open Graph from the
 * page. So the share card in lib/og-cards.ts is doing the real work here, and
 * a page without one shares as a generic brand image no matter how good the
 * button is.
 */

export function ShareLinks({
  title,
  professional = false,
  className = "",
}: {
  /** Used as the native share sheet's title. LinkedIn ignores it — see above. */
  title: string;
  /** Adds LinkedIn. For pages whose readers are administrators, not students. */
  professional?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const url = `${SITE_URL}${pathname}`;
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  // Checked after mount, never during render: navigator does not exist on the
  // server, and branching on it in the markup is a hydration mismatch.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const track = (how: string) =>
    (window as any).innerG?.track?.("share_clicked", { how, page: pathname });

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
      track("native");
    } catch {
      /* the user dismissed the sheet — not an error, and not worth reporting */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context, or denied) — the button just does nothing */
    }
  };

  const btn =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 " +
    "text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors";

  return (
    <div className={`no-print flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-0.5">Share</span>

      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={btn}>
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
      )}

      {professional && (
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("linkedin")}
          className={btn}
        >
          <Linkedin className="w-3.5 h-3.5" />
          LinkedIn
        </a>
      )}

      <button type="button" onClick={copy} className={btn} aria-live="polite">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
