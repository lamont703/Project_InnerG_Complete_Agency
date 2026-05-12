import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

export async function createServerClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a dummy client during build to avoid crashing static generation
        return createSupabaseServerClient<Database>(
            "https://placeholder.supabase.co",
            "placeholder",
            { cookies: { get: () => undefined, setBy: () => {}, set: () => {}, remove: () => {} } } as any
        )
    }

    const cookieStore = await cookies()

    return createSupabaseServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Ignore if called from SC
                    }
                },
                remove(name: string, options: any) {
                    try {
                        cookieStore.set({ name, value: "", ...options })
                    } catch (error) {
                        // Ignore if called from SC
                    }
                },
            },
        }
    )
}
