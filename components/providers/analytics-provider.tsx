"use client"

import { useEffect } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { setUserId } from "@/lib/analytics"

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createBrowserClient()

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        setUserId(session.user.id)
      }
    })

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        setUserId(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        // Clear user_id by setting it to undefined/null in GA4 config
        // Note: The specific syntax for clearing user_id in gtag may require sending undefined
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
          window.gtag('config', 'G-VGHV9QQG46', { user_id: undefined })
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}
