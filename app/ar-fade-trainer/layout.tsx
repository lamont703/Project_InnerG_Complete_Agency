import type { Metadata } from "next"
import { SITE_URL } from "@/lib/site"

/**
 * page.tsx is `"use client"` — it owns camera state and a render loop — and a
 * client component cannot export `metadata`. Without this file the route would
 * silently serve the root layout's title and description, which is the trap
 * documented in .claude/skills/publish-page and the reason six account pages
 * shipped advertising themselves as indexable.
 */
export const metadata: Metadata = {
  title: "AR Fade Trainer — Work Backwards From the Finished Cut",
  description:
    "Pick the finished fade and see where the line sits, which guards ladder underneath it and in what order — drawn on a real head through your phone camera.",
  keywords: [
    "ar fade trainer",
    "how to fade hair",
    "barber fade guide",
    "fade guard ladder",
    "parietal ridge fade",
    "barber student training tool",
  ],
  openGraph: {
    title: "AR Fade Trainer — Work Backwards From the Finished Cut",
    description:
      "Name the finished fade and the tool derives the line placement, the guard ladder and the order of passes, then draws them on a real head through the camera.",
    url: `${SITE_URL}/ar-fade-trainer`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/ar-fade-trainer` },
}

export default function ArFadeTrainerLayout({ children }: { children: React.ReactNode }) {
  return children
}
