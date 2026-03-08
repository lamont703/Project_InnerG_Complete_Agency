"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Loader2,
    ArrowLeft,
    ShieldCheck,
    Users,
    FolderKanban,
    Mail,
    Calendar,
    Building2,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"

interface Developer {
    id: string
    full_name: string
    email: string
    role: string
    created_at: string
    clients: { id: string; company_name: string }[]
}

export default function DeveloperPortfoliosPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [developers, setDevelopers] = useState<Developer[]>([])

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push("/login"); return }

                const { data: profile } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single() as any

                if (!profile || profile.role !== "super_admin") {
                    router.push("/select-portal")
                    return
                }

                // Fetch developers with their client assignments
                const { data: devs } = await supabase
                    .from("users")
                    .select(`
                        id,
                        full_name,
                        email,
                        role,
                        created_at,
                        developer_client_access(
                            clients(id, company_name)
                        )
                    `)
                    .in("role", ["developer", "super_admin"])
                    .order("full_name") as any

                if (devs) {
                    const mapped = devs.map((d: any) => ({
                        ...d,
                        clients: (d.developer_client_access || [])
                            .map((a: any) => a.clients)
                            .filter(Boolean),
                    }))
                    setDevelopers(mapped)
                }
            } catch (err) {
                console.error("[Developers] Load error:", err)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading developer portfolios...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#020617] relative">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[120px] opacity-20 pointer-events-none" />

            <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
                <Link
                    href="/dashboard/innergcomplete"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Back to Agency Dashboard
                </Link>

                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-500/30 flex items-center justify-center border border-primary/20">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Developer Portfolios</h1>
                            <p className="text-sm text-muted-foreground">
                                {developers.length} developer{developers.length !== 1 ? "s" : ""} in your agency
                            </p>
                        </div>
                    </div>
                </div>

                {/* Developer Cards */}
                <div className="space-y-4">
                    {developers.map((dev) => (
                        <div
                            key={dev.id}
                            className="glass-panel rounded-2xl border border-white/5 hover:border-white/10 transition-all p-6"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center border border-primary/20">
                                        <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">{dev.full_name || "Unnamed Developer"}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Mail className="h-3 w-3" />
                                                {dev.email}
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                Joined {new Date(dev.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${dev.role === "super_admin"
                                        ? "bg-primary/10 text-primary border border-primary/20"
                                        : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    }`}>
                                    {dev.role === "super_admin" ? "Super Admin" : "Developer"}
                                </span>
                            </div>

                            {/* Client Assignments */}
                            {dev.clients.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <FolderKanban className="h-3 w-3" />
                                        Assigned Clients
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {dev.clients.map((client) => (
                                            <span
                                                key={client.id}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-foreground"
                                            >
                                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                                {client.company_name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {dev.clients.length === 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-[10px] text-muted-foreground/60">No client assignments</p>
                                </div>
                            )}
                        </div>
                    ))}

                    {developers.length === 0 && (
                        <div className="text-center py-12 glass-panel rounded-2xl border border-white/5">
                            <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No developers found</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Developers will appear here once they are invited to the agency.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
