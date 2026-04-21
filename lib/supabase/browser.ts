import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

export function createBrowserClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !anonKey) {
        if (typeof window === 'undefined') {
            // Return a dummy client during build to prevent crashes
            return createSupabaseBrowserClient<Database>("https://placeholder.supabase.co", "placeholder")
        }
        throw new Error("@supabase/ssr: Your project's URL and API key are required to create a Supabase client!")
    }

    return createSupabaseBrowserClient<Database>(supabaseUrl, anonKey)
}
