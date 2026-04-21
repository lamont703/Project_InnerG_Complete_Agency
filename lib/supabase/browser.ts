import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

export function createBrowserClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("@supabase/ssr: Your project's URL and API key are required to create a Supabase client!")
    }

    return createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
