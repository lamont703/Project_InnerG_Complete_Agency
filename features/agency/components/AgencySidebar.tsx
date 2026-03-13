"use client"

import { useRouter } from "next/navigation"
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

    const handleSignOut = async () => {
        const supabase = createBrowserClient()
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const navItems = [
        { href: "/select-portal", icon: Layout, label: "Switch Portal", active: false },
        { href: "/dashboard/innergcomplete", icon: Building2, label: "Agency Command", active: true },
    ]

    const adminItems = [
        { href: "/admin/token-usage", icon: BarChart3, label: "Token Usage" },
        { href: "/admin/connectors", icon: Plug, label: "Connectors" },
        { href: "/admin/knowledge", icon: BookOpen, label: "Knowledge CMS" },
        { href: "/admin/settings", icon: Settings, label: "Agency Settings" },
        { href: "/admin/developers", icon: ShieldCheck, label: "Developer Portfolios" },
    ]

    const SidebarContent = () => (
        <>
            <nav className="flex-1 px-4 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${item.active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-secondary/50"
                            }`}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                ))}

                <div className="pt-6 mt-6 border-t border-white/5">
                    <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">AGENCY ADMIN</p>
                    {adminItems.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors"
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
            {/* Desktop Panel View (Sources Style) */}
            <aside className="hidden lg:flex w-full flex-col h-full bg-transparent overflow-hidden">
                <div className="p-8">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                            <span className="text-xl font-black">G</span>
                        </div>
                        <div>
                            <span className="text-sm font-black tracking-tight text-white block leading-none uppercase">
                                Inner G Complete
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mt-1 block">
                                Command Center
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
                    <div className="mb-8">
                        <p className="px-4 mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Intelligence Sources</p>
                        <SidebarContent />
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/90 backdrop-blur-xl z-[200] lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Mobile Sidebar Drawer */}
            <aside
                className={`fixed top-0 left-0 bottom-0 w-[300px] bg-black border-r border-white/5 z-[201] flex flex-col transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) lg:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="p-8 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            <span className="text-xl font-black">G</span>
                        </div>
                        <span className="text-sm font-black tracking-tight text-white uppercase">Agency Command</span>
                    </Link>
                    <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl glass-panel hover:bg-white/5 transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4">
                    <SidebarContent />
                </div>
            </aside>
        </>
    )
}
