'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

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
      {children}
    </NextThemesProvider>
  )
}
