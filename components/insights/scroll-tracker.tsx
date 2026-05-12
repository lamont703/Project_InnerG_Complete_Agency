"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { trackInsightEngagement, trackInsightView } from "@/lib/analytics"

export function ScrollTracker({ title }: { title?: string }) {
  const pathname = usePathname()
  const trackedDepths = useRef(new Set<number>())

  // Fire page view on mount
  useEffect(() => {
    // Only track if it's an actual insight article (not the index)
    if (pathname && pathname !== "/insights") {
      const slug = pathname.split("/").pop() || "unknown"
      trackInsightView(slug, title || "Unknown Title")
    }
    
    // Reset tracked depths on navigation
    return () => {
      trackedDepths.current.clear()
    }
  }, [pathname, title])

  // Track scroll depth
  useEffect(() => {
    if (!pathname || pathname === "/insights") return

    const slug = pathname.split("/").pop() || "unknown"

    const handleScroll = () => {
      // Calculate how far down the user has scrolled
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight = document.documentElement.scrollHeight
      const clientHeight = document.documentElement.clientHeight
      
      const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100

      // Define thresholds
      const thresholds = [25, 50, 75, 100]

      thresholds.forEach((threshold) => {
        if (scrollPercentage >= threshold && !trackedDepths.current.has(threshold)) {
          trackedDepths.current.add(threshold)
          // We only specifically log 50, 75, 100 per the analytics mapping, 
          // but we track 25 internally to ensure smooth progression if needed.
          if (threshold >= 50) {
            trackInsightEngagement(slug, `${threshold}%` as '50%' | '75%' | '100%')
          }
        }
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    
    // Initial check in case content is short
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [pathname])

  return null
}
