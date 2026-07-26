"use client";

import { useEffect } from "react";

// Fires a distinct `page_not_found` pixel event so 404s are directly queryable
// in pixel_events (event_name = 'page_not_found', metadata.path = the URL that
// 404'd) instead of having to test every page_view URL after the fact.
export function NotFoundTracker() {
  useEffect(() => {
    try {
      (window as any).innerG?.track?.("page_not_found", {
        path: window.location.pathname,
        referrer: document.referrer || undefined,
      });
    } catch {
      /* pixel not loaded — ignore */
    }
  }, []);
  return null;
}
