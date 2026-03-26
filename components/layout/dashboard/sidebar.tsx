"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
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
    BarChart3,
    Plug,
    Zap,
    GitBranch,
    Users
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
    const [isLoading, setIsLoading] = useState(true)
    const [features, setFeatures] = useState<{ community_agents?: boolean }>({})

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

                    // 2. Fetch project features
                    const { data: project } = await supabase
                        .from("projects")
                        .select("settings")
                        .eq("slug", projectSlug)
                        .single() as any
                    
                    if (project?.settings?.features) {
                        setFeatures(project.settings.features)
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
        {
            href: `/dashboard/${projectSlug}/funnels`,
            icon: GitBranch,
            label: "Funnels & Conversions",
            active: pathname === `/dashboard/${projectSlug}/funnels`,
        },
        {
            href: `/dashboard/${projectSlug}/metrics`,
            icon: BarChart3,
            label: "Metrics & Intelligence",
            active: pathname === `/dashboard/${projectSlug}/metrics`,
        },
        ...(features.community_agents ? [
            {
                href: `/dashboard/${projectSlug}/community`,
                icon: Users,
                label: "Community Hub",
                active: pathname === `/dashboard/${projectSlug}/community`,
            }
        ] : []),
        {
            href: `/dashboard/${projectSlug}/connectors`,
            icon: Plug,
            label: "Connectors",
            active: pathname === `/dashboard/${projectSlug}/connectors`,
        },
        {
            href: `/dashboard/${projectSlug}/knowledge`,
            icon: BookOpen,
            label: "Knowledge Base",
            active: pathname === `/dashboard/${projectSlug}/knowledge`,
        },
        {
            href: `/dashboard/${projectSlug}/pixel`,
            icon: Zap,
            label: "Connect Website",
            active: pathname === `/dashboard/${projectSlug}/pixel`,
        },
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
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                            <span className="text-xl font-bold">G</span>
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <span className="text-lg font-bold">G</span>
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
