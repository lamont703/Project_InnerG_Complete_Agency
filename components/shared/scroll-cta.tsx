"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";

export function ScrollCTA() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Determine if we should show on the current page path
  const isEntityPage = /^\/(salons|barbers|schools|stores|shop|cosmetologists)\/[^/]+$/.test(pathname);

  // Figure out the context and target URL
  let typeLabel = "shops";
  let targetTab = "Barbershops";
  let hookText = "Compare this location against 1,000+ others in Texas.";

  if (pathname.startsWith("/schools")) {
    typeLabel = "schools";
    targetTab = "Schools";
    hookText = "Comparing beauty schools? View the official 2026 pass rates on our search engine.";
  } else if (pathname.startsWith("/salons")) {
    typeLabel = "salons";
    targetTab = "Salons";
    hookText = "Looking for premium salon options? Search our full directory by zip code.";
  } else if (pathname.startsWith("/stores")) {
    typeLabel = "stores";
    targetTab = "Stores";
    hookText = "Find top-rated beauty and barber supply stores near you.";
  } else if (pathname.startsWith("/cosmetologists")) {
    typeLabel = "cosmetologists";
    targetTab = "Cosmetologist";
    hookText = "Browse verified cosmetology professionals in the Houston metro.";
  } else if (pathname.startsWith("/barbers")) {
    typeLabel = "barbers";
    targetTab = "Barbers";
    hookText = "Looking for a precision cut? Search licensed local barbers.";
  }

  const searchUrl = `/tools/barbershop-search?tab=${targetTab}`;

  useEffect(() => {
    if (!isEntityPage || isDismissed) {
      setIsVisible(false);
      return;
    }

    const handleScroll = () => {
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
      const winHeight = window.innerHeight;
      const scrollTop = window.scrollY || window.pageYOffset;

      if (docHeight <= winHeight) return;

      const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;

      if (scrollPercent >= 50) {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial scroll position on mount
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isEntityPage, isDismissed, pathname]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    setIsVisible(false);
  };

  const handleCTAClick = () => {
    // Fire pixel analytics event if global tracker is available
    if (typeof window !== "undefined" && (window as any).innerG) {
      (window as any).innerG.track("click", {
        tag: "a",
        text: `Scroll CTA: Search ${targetTab}`,
        href: searchUrl,
        classes: "scroll-cta-button"
      });
    }
  };

  if (!isEntityPage || !isVisible) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[420px] z-[90] transition-all duration-500 ease-out animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-xl p-5 shadow-2xl shadow-black/60 md:p-6 group">
        
        {/* Glow effect */}
        <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl opacity-100 transition duration-1000 group-hover:duration-200" />
        
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Search className="h-4.5 w-4.5 animate-pulse" />
              </div>
              <span className="text-xs font-black tracking-widest text-slate-400 uppercase">
                Aesthetic Intelligence
              </span>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-100 leading-relaxed">
              {hookText}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={searchUrl}
              onClick={handleCTAClick}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm px-4 py-3 shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Search Directory
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
