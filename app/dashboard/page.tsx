"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"

/**
 * Root Dashboard Page
 * Smart-redirects to the appropriate project dashboard based on user role and permissions.
 */
export default function RootDashboard() {
    const router = useRouter()

    useEffect(() => {
        const handleRedirect = async () => {
            const supabase = createBrowserClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.replace("/login")
                return
            }

            // 1. Resolve User Role
            const { data: profile } = await (supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .maybeSingle() as any)

            const role = profile?.role || "client_viewer"

            // 2. Routing Decision
            if (role === "super_admin" || role === "developer") {
                // Team always lands on the global intelligence portal
                router.replace("/dashboard/innergcomplete")
            } else {
                // Client users: land on their first assigned project
                const { data: access } = await (supabase
                    .from("project_user_access")
                    .select("projects(slug)")
                    .eq("user_id", user.id)
                    .limit(1)
                    .maybeSingle() as any)

                const slug = access?.projects?.slug
                
                if (slug) {
                    router.replace(`/dashboard/${slug}`)
                } else {
                    // No portal? Take them to the selection overview
                    router.replace("/select-portal")
                }
            }
        }

        handleRedirect()
    }, [router])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
}
