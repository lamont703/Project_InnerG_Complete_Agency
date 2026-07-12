"use client";

import { useRouter } from "next/navigation";
import { hasInternalNavigationHistory } from "@/components/layout/site-navigation-tracker";

export function BackToSearchLink({ fallbackHref, className }: { fallbackHref: string; className?: string }) {
  const router = useRouter();

  return (
    <a
      href={fallbackHref}
      onClick={(e) => {
        e.preventDefault();
        // window.history.length > 1 is true even when the previous entry is
        // an external site (e.g. a Google search result) — it only reflects
        // total tab history, not whether the prior page is one of ours. Only
        // go back when we've actually navigated within the site this session.
        if (hasInternalNavigationHistory()) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      data-ig-click="outbound_lead"
      className={className}
    >
      ← Back to search
    </a>
  );
}
