"use client"

import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
    Building2,
    BarChart3,
    BookOpen,
    Settings,
    ShieldCheck,
    Plug,
    Layout,
    LogOut,
    X,
    Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"

interface AgencySidebarProps {
    isSidebarOpen: boolean
    onClose: () => void
}

/**
 * Agency Sidebar - God Mode navigation for Super Admins.
 */
export function AgencySidebar({ isSidebarOpen, onClose }: AgencySidebarProps) {
    const router = useRouter()
    const pathname = usePathname()

    const handleSignOut = async () => {
        const supabase = createBrowserClient()
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const navItems = [
        { href: "/select-portal", icon: Layout, label: "Switch Portal", active: pathname === "/select-portal" },
        { href: "/dashboard/innergcomplete", icon: Building2, label: "Agency Command", active: pathname === "/dashboard/innergcomplete" },
    ]

    const adminItems = [
        { href: "/admin/projects", icon: Building2, label: "Project Access Hub", active: pathname.startsWith("/admin/projects") },
        { href: "/admin/metrics", icon: BarChart3, label: "Metrics & Intelligence", active: pathname === "/admin/metrics" },
        { href: "/admin/token-usage", icon: Layout, label: "Token Usage", active: pathname === "/admin/token-usage" },
        { href: "/admin/connectors", icon: Plug, label: "Connectors", active: pathname === "/admin/connectors" },
        { href: "/admin/pixel", icon: Zap, label: "Agency Pixel", active: pathname === "/admin/pixel" },
        { href: "/admin/knowledge", icon: BookOpen, label: "Knowledge CMS", active: pathname === "/admin/knowledge" },
        { href: "/admin/settings", icon: Settings, label: "Agency Settings", active: pathname === "/admin/settings" },
    ]

    const SidebarContent = () => (
        <>
            <nav className="flex-1 px-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
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

                    <div className="pt-6 mt-6 border-t border-border">
                        <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AGENCY ADMIN</p>
                        {adminItems.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
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
                    </div>
            </nav>

            <div className="p-6 border-t border-border mt-auto">
                <Button
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
                                Agency Command
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
                        <span className="text-lg font-bold tracking-tight text-foreground">Agency Command</span>
                    </Link>
                    <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full glass-panel">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <SidebarContent />
            </aside>
        </>
    )
}
