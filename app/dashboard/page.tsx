"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/**
 * Root Dashboard Page
 * Redirects to the default project dashboard.
 * Since we are moving away from multiple mock projects, 
 * this ensures users land on the primary operational dashboard.
 */
export default function RootDashboard() {
    const router = useRouter()

    useEffect(() => {
        // Redirect to the default project slug
        // In the future, this could fetch the user's last active project
        router.replace("/dashboard/agency-global")
    }, [router])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
}
