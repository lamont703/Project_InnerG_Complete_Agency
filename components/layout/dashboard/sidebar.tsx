"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
    LayoutDashboard,
    Layout,
    LogOut,
    X,
    Settings,
    ShieldCheck,
    Loader2,
    Building2,
    BookOpen,
    Bot,
    Brain,
    BarChart3,
    Plug,
    Zap,
    GitBranch,
    Users,
    Calendar,
    TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { UserRole } from "@/types"

interface DashboardSidebarProps {
    projectSlug: string
    isSidebarOpen: boolean
    onClose: () => void
}

/**
 * Dashboard Sidebar — Desktop (sticky) and Mobile (slide-in drawer).
 * 
 * Implements Role-Based Access Control (RBAC) UI guarding.
 */
export function DashboardSidebar({ projectSlug, isSidebarOpen, onClose }: DashboardSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const currentTab = searchParams?.get("tab")
    const [userRole, setUserRole] = useState<UserRole | null>(null)
    const [hasCognitiveBrief, setHasCognitiveBrief] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const isIntelligenceProject = projectSlug.includes('intelligence') || 
                                 projectSlug.includes('student') || 
                                 projectSlug.includes('barber');

    const [features, setFeatures] = useState<{ 
        agent_enabled?: boolean;
        community_enabled?: boolean;
        social_enabled?: boolean;
        crypto_enabled?: boolean;
        funnel_enabled?: boolean;
        knowledge_enabled?: boolean;
        pixel_enabled?: boolean;
        connectors_enabled?: boolean;
        metrics_enabled?: boolean;
        cognitive_enabled?: boolean;
    }>({
        metrics_enabled: isIntelligenceProject ? true : false,
        knowledge_enabled: false,
        connectors_enabled: false,
        cognitive_enabled: false,
        social_enabled: false,
        crypto_enabled: false,
        community_enabled: false,
        funnel_enabled: false
    })

    useEffect(() => {
        const fetchUserRoleAndFeatures = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    // 1. Fetch role
                    const { data: profile } = await supabase
                        .from("users")
                        .select("role")
                        .eq("id", user.id)
                        .single() as any

                    if (profile) {
                        setUserRole(profile.role as UserRole)
                    }

                    // 2. Fetch project details & features
                    const { data: project } = await (supabase
                        .from("projects") as any)
                        .select(`
                            id, settings, 
                            funnel_enabled, knowledge_enabled, pixel_enabled, connectors_enabled,
                            agent_enabled, community_enabled, social_enabled, crypto_enabled,
                            cognitive_enabled, metrics_enabled
                        `)
                        .eq("slug", projectSlug)
                        .single()
                    
                    if (project) {
                        setFeatures(prev => ({ 
                            ...prev, 
                            funnel_enabled: project.funnel_enabled ?? false,
                            knowledge_enabled: project.knowledge_enabled ?? true,
                            pixel_enabled: project.pixel_enabled ?? false,
                            connectors_enabled: project.connectors_enabled ?? false,
                            agent_enabled: project.agent_enabled ?? false,
                            community_enabled: project.community_enabled ?? false,
                            social_enabled: project.social_enabled ?? false,
                            crypto_enabled: project.crypto_enabled ?? false,
                            cognitive_enabled: project.cognitive_enabled ?? true,
                            metrics_enabled: project.metrics_enabled ?? true
                        }))

                        if (project.settings?.features) {
                            setFeatures(prev => ({ ...prev, ...project.settings.features }))
                        }

                        // 3. Check for Cognitive PM Iterations
                        const { data: iterations } = await supabase
                            .from("pm_iterations")
                            .select("id")
                            .eq("project_id", project.id)
                            .limit(1) as any
                        
                        if (iterations && iterations.length > 0) {
                            setHasCognitiveBrief(true)
                        }

                        // 4. Fetch crypto intelligence status
                        const { data: cryptoConfig } = await supabase
                            .from("crypto_intelligence_config")
                            .select("is_active")
                            .eq("project_id", project?.id)
                            .single() as any

                        if (cryptoConfig?.is_active) {
                            setFeatures(prev => ({ ...prev, crypto_intelligence: true }))
                        }
                    }
                }
            } catch (err) {
                console.error("[Sidebar] Error fetching role/features:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserRoleAndFeatures()
    }, [projectSlug])

    const handleSignOut = async () => {
        const supabase = createBrowserClient()
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const navItems = [
        {
            href: `/dashboard/${projectSlug}`,
            icon: LayoutDashboard,
            label: "Intelligence Hub",
            active: pathname === `/dashboard/${projectSlug}`,
        },
        ...(hasCognitiveBrief && features.cognitive_enabled ? [
            {
                href: `/dashboard/${projectSlug}/cognitive-brief`,
                icon: Brain,
                label: "Cognitive Project Brief",
                active: pathname === `/dashboard/${projectSlug}/cognitive-brief`,
            }
        ] : []),
        ...(features.funnel_enabled ? [
            {
                href: `/dashboard/${projectSlug}/funnels`,
                icon: GitBranch,
                label: "Funnels & Conversions",
                active: pathname === `/dashboard/${projectSlug}/funnels`,
            }
        ] : []),
        ...(features.metrics_enabled ? [
            {
                href: `/dashboard/${projectSlug}/metrics`,
                icon: BarChart3,
                label: "Metrics & Intelligence",
                active: pathname === `/dashboard/${projectSlug}/metrics`,
            }
        ] : []),
        ...(features.community_enabled ? [
            {
                href: `/dashboard/${projectSlug}/community`,
                icon: Users,
                label: "Community Hub Agents",
                active: pathname === `/dashboard/${projectSlug}/community`,
            }
        ] : []),
        ...(features.social_enabled ? [
            {
                href: `/dashboard/${projectSlug}/social-planner`,
                icon: Calendar,
                label: "Social Planner Agent",
                active: pathname === `/dashboard/${projectSlug}/social-planner`,
            }
        ] : []),
        ...(features.crypto_enabled ? [
            {
                href: `/dashboard/${projectSlug}/crypto`,
                icon: TrendingUp,
                label: "Crypto Trading Intelligence",
                active: pathname === `/dashboard/${projectSlug}/crypto`,
            }
        ] : []),
        ...(features.connectors_enabled ? [
            {
                href: `/dashboard/${projectSlug}/connectors`,
                icon: Plug,
                label: "Connectors",
                active: pathname === `/dashboard/${projectSlug}/connectors`,
            }
        ] : []),
        ...(features.knowledge_enabled ? [
            {
                href: `/dashboard/${projectSlug}/knowledge`,
                icon: BookOpen,
                label: "Knowledge Base",
                active: pathname === `/dashboard/${projectSlug}/knowledge`,
            }
        ] : []),
        ...(features.pixel_enabled ? [
            {
                href: `/dashboard/${projectSlug}/pixel`,
                icon: Zap,
                label: "Connect Website",
                active: pathname === `/dashboard/${projectSlug}/pixel`,
            }
        ] : []),
        {
            href: "/select-portal",
            icon: Layout,
            label: "Switch Portal",
            active: pathname === "/select-portal",
        },
    ]

    const SidebarContent = () => (
        <>
            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        id={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-secondary/50"
                            }`}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-6 border-t border-border mt-auto">
                <Button
                    id="btn-sign-out"
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </>
    )

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 flex-col glass-panel border-r border-border h-screen sticky top-0">
                <div className="p-8 pb-10">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden">
                            <Image 
                                src="/icon-light-32x32.png" 
                                alt="Inner G Logo" 
                                width={32} 
                                height={32}
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <div>
                            <span className="text-xl font-bold tracking-tight text-foreground block leading-tight">
                                Inner G Complete
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                Intelligence Hub
                            </span>
                        </div>
                    </Link>
                </div>
                <SidebarContent />
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside
                className={`fixed top-0 left-0 bottom-0 w-[280px] bg-background border-r border-border z-[101] flex flex-col transition-transform duration-300 lg:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="p-6 pb-10 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground overflow-hidden">
                            <Image 
                                src="/icon-light-32x32.png" 
                                alt="Inner G Logo" 
                                width={24} 
                                height={24}
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground">Inner G Complete</span>
                    </Link>
                    <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full glass-panel">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <SidebarContent />
                )}
            </aside>
        </>
    )
}
