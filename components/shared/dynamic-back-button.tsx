"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { hasInternalNavigationHistory } from "@/components/layout/site-navigation-tracker";

export function DynamicBackButton({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        // Unconditional router.back() sent organic-search visitors straight
        // back to Google (the actual previous history entry) instead of
        // anywhere on this site. Only go back when we know a prior page in
        // this tab's history is one of ours; otherwise land on our own
        // listing page so "Back" never exits the site entirely.
        if (hasInternalNavigationHistory()) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors py-2 group"
    >
      <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
      Back
    </button>
  );
}
