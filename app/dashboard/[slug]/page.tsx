"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams } from "next/navigation"
import {
    Loader2
} from "lucide-react"
import { ChatInterface } from "@/features/chat/ChatInterface"
import { DashboardSidebar } from "@/components/layout/dashboard/sidebar"
import { DashboardHeader } from "@/components/layout/dashboard/header"
import { SignalGrid as AiSignalCards } from "@/features/signals/SignalGrid"
import { MetricsGrid } from "@/features/metrics/MetricsGrid"
import { createBrowserClient } from "@/lib/supabase/browser"
import { SlotProvider } from "@/features/metrics/SlotContext"
import { DashboardMobileNav, type MobileTab } from "@/components/layout/dashboard/MobileNav"

import { MobileNavProvider, useMobileNav } from "@/features/agency/context/MobileNavContext"

function DashboardContent() {
    return (
        <SlotProvider userRole="client">
            <DashboardPageContent />
        </SlotProvider>
    )
}

function DashboardPageContent() {
    const params = useParams()
    const slug = (params?.slug as string) ?? "innergcomplete"


    // User & Project State
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [projectName, setProjectName] = useState("")
    const [isLoading, setIsLoading] = useState(true)

    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    useEffect(() => {
        setMounted(true)

        const fetchData = async () => {
            try {
                const supabase = createBrowserClient()

                // 1. Fetch User data
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: profile } = await supabase
                        .from("users")
                        .select("full_name, role")
                        .eq("id", user.id)
                        .maybeSingle() as any

                    const meta = user.user_metadata || {}
                    const name = profile?.full_name || meta.full_name || meta.name || meta.display_name || "User"
                    const role = profile?.role?.replace("_", " ").toUpperCase() || "CLIENT"

                    setUserData({
                        name,
                        role
                    })
                }

                // 2. Fetch Project Name
                const { data: project } = await supabase
                    .from("projects")
                    .select("name")
                    .eq("slug", slug)
                    .maybeSingle() as any

                if (project) {
                    setProjectName(project.name)
                }

            } catch (err) {
                console.error("[Dashboard] Error fetching initial data:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()

        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [slug])

    const { activeTab, setActiveTab } = useMobileNav()

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
            {/* Background ambient gradients - Strategic placement for depth */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none" />
            <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] opacity-10 pointer-events-none" />

            <div className="hidden lg:block">
                <DashboardHeader
                    userName={userData?.name || "User"}
                    userRole={userData?.role || "CLIENT"}
                    currentTime={currentTime}
                    mounted={mounted}
                    onMenuOpen={() => setIsSidebarOpen(true)}
                    projectName={projectName}
                />
            </div>

            {/* Main Content Area - Tabbed for Mobile, Side-by-Side for Desktop */}
            <div className="flex-1 flex flex-col lg:flex-row relative z-10 w-full overflow-hidden h-full">
                
                {/* 1. Intelligence Hub (Chat) - Primary Center */}
                <div className={`flex-1 min-w-0 flex flex-col overflow-hidden ${activeTab === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                    <ChatInterface projectSlug={slug} isFlush={true} />
                </div>

                {/* 2. Operational Signals & Stream - Flush to the right edge */}
                <div className={`w-full lg:w-[450px] flex-1 lg:flex-none lg:shrink-0 flex flex-col bg-card/50 backdrop-blur-xl border-l border-border ${activeTab === 'signals' ? 'flex' : 'hidden lg:flex'}`}>
                    <AiSignalCards projectSlug={slug} isFlush={true} />
                </div>
            </div>
        </>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <DashboardContent />
        </Suspense>
    )
}
