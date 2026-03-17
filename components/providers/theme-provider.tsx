'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { useTheme } from 'next-themes'
import { createBrowserClient } from '@/lib/supabase/browser'

const AGENCY_SENTINEL_ID = '00000000-0000-0000-0000-000000000000'

/**
 * Syncs the agency theme from the database to the client-side state
 * without requiring a manual refresh.
 */
function ThemeSyncGuard({ children, isGated }: { children: React.ReactNode, isGated: boolean }) {
  const { theme, setTheme } = useTheme()
  const [synced, setSynced] = React.useState(false)

  React.useEffect(() => {
    // Only attempt to sync if on an internal gated page and not already synced in this mount
    if (!isGated || synced) return

    const sync = async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) return

        const { data: profile } = await (supabase
          .from('agency_profile')
          .select('theme_preference')
          .eq('id', AGENCY_SENTINEL_ID)
          .maybeSingle() as any)

        if (profile?.theme_preference && profile.theme_preference !== theme) {
          setTheme(profile.theme_preference)
        }
        setSynced(true)
      } catch (err) {
        console.warn('[ThemeSync] Persistent theme check failed:', err)
      }
    }

    sync()

    // Listen for auth state changes (e.g. login) to trigger immediate sync
    const supabase = createBrowserClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        sync()
      }
    })

    return () => subscription.unsubscribe()
  }, [isGated, setTheme, theme, synced])

  return <>{children}</>
}

/**
 * Smart Theme Provider
 * Force dark mode on public brand pages, respect theme settings on internal gated tools.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const pathname = usePathname()

  // Define gated internal sections where the theme toggle is permitted
  const gatedPrefixes = ['/dashboard', '/admin', '/select-portal']
  
  // If the current path doesn't start with a gated prefix, force dark mode
  const isGated = gatedPrefixes.some(prefix => pathname?.startsWith(prefix))

  return (
    <NextThemesProvider 
      {...props} 
      forcedTheme={isGated ? undefined : 'dark'}
    >
      <ThemeSyncGuard isGated={isGated}>
        {children}
      </ThemeSyncGuard>
    </NextThemesProvider>
  )
}
