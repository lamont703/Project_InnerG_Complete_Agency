"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Flips true the first time the pathname changes after this module loads —
// i.e. the first client-side (App Router) navigation within the current
// page load. Lives at module scope (not React state) so BackToSearchLink
// can read it synchronously from a plain click handler, and so it resets
// naturally on every full page load without any sessionStorage bookkeeping.
let hasNavigatedClientSide = false;

export function hasInternalNavigationHistory() {
  return hasNavigatedClientSide;
}

export function SiteNavigationTracker() {
  const pathname = usePathname();
  const initialPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== initialPathname.current) {
      hasNavigatedClientSide = true;
    }
  }, [pathname]);

  return null;
}
