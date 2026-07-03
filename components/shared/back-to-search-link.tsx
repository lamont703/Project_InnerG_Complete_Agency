"use client";

import { useRouter } from "next/navigation";

export function BackToSearchLink({ fallbackHref, className }: { fallbackHref: string; className?: string }) {
  const router = useRouter();

  return (
    <a
      href={fallbackHref}
      onClick={(e) => {
        e.preventDefault();
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackHref);
        }
      }}
      className={className}
    >
      ← Back to search
    </a>
  );
}
