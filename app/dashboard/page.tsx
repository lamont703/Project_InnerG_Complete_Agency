"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    CheckCircle2,
    CircleDot,
    LayoutDashboard,
    Database,
    Bot,
    Zap,
    Instagram,
    Bell,
    User,
    LogOut,
    ShieldCheck,
    Activity,
    ArrowUpRight,
    Users,
    Layout,
    Music2,
    Heart,
    Sparkles,
    Menu,
    X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"

const statusItems = [
    {
        id: "database",
        label: "Database Connection",
        icon: Database,
        status: "Active",
        details: "PostgreSQL Cluster - Multi-region",
        color: "text-emerald-500 bg-emerald-500/10",
    },
    {
        id: "ai",
        label: "AI Agent Engine",
        icon: Bot,
        status: "Active",
        details: "LLM Orchestration - Ready",
        color: "text-primary bg-primary/10",
    },
    {
        id: "ghl",
        label: "GoHighLevel Sync",
        icon: Zap,
        status: "Active",
        details: "CRM Webhooks - Live",
        color: "text-orange-500 bg-orange-500/10",
    },
    {
        id: "instagram",
        label: "Instagram API",
        icon: Instagram,
        status: "Active",
        details: "Social Graph - Authenticated",
        color: "text-pink-500 bg-pink-500/10",
    },
]

import { ChatInterface } from "@/features/chat/ChatInterface"

function DashboardContent() {
    const searchParams = useSearchParams()
    const projectType = searchParams.get("project")
    const isPlentyOfHearts = projectType === "plenty-of-hearts"

    const [userName, setUserName] = useState(isPlentyOfHearts ? "Admin" : "Kane")
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)
    const [latencies, setLatencies] = useState<Record<string, number>>({})
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const router = useRouter()

    const dynamicStatusItems = statusItems.map(item => {
        if (isPlentyOfHearts && item.id === "instagram") {
            return {
                ...item,
                id: "tiktok",
                label: "TikTok API",
                icon: Music2,
                details: "Creator Marketplace - Connected",
                color: "text-cyan-400 bg-cyan-400/10"
            }
        }
        return item
    })

    useEffect(() => {
        setMounted(true)

        // Initialize latencies once on client mount
        const initialLatencies: Record<string, number> = {}
        dynamicStatusItems.forEach(item => {
            initialLatencies[item.id] = Math.floor(Math.random() * 50) + 10
        })
        setLatencies(initialLatencies)

        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex w-72 flex-col glass-panel border-r border-white/5 h-screen sticky top-0">
                <div className="p-8 pb-10">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                            <span className="text-xl font-bold">G</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Inner G Complete
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <Link href="/select-portal" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Layout className="h-5 w-5" />
                        Switch Portal
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium transition-colors">
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                    </Link>
                    <div className="pt-4 pb-2 px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground opacity-50">Systems</div>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Activity className="h-5 w-5" />
                        Monitoring
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <ShieldCheck className="h-5 w-5" />
                        Infrastructure
                    </button>
                </nav>

                <div className="p-6 border-t border-border mt-auto">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => router.push("/")}
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`fixed top-0 left-0 bottom-0 w-[280px] bg-background border-r border-white/5 z-[101] flex-col transition-transform duration-300 lg:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 pb-10 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <span className="text-lg font-bold">G</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-foreground">Inner G Complete</span>
                    </Link>
                    <button onClick={() => setIsSidebarOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-full glass-panel">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    <Link href="/select-portal" className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Layout className="h-5 w-5" />
                        Switch Portal
                    </Link>
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-primary/10 text-primary font-medium transition-colors">
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                    </Link>
                    <div className="pt-4 pb-2 px-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground opacity-50">Systems</div>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 transition-colors">
                        <Activity className="h-5 w-5" />
                        Monitoring
                    </button>
                </nav>

                <div className="p-4 border-t border-border mt-auto">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground"
                        onClick={() => router.push("/")}
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen bg-[#020617] relative w-full">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] opacity-10 pointer-events-none" />

                {/* Top Header */}
                <header className="flex h-20 items-center justify-between px-4 md:px-8 border-b border-white/5 relative z-10 bg-[#020617]/50 backdrop-blur-md sticky top-0 lg:static">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl glass-panel text-muted-foreground"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div className="hidden md:block">
                            <h2 className="text-sm font-medium text-muted-foreground">
                                {mounted && currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h2>
                        </div>
                        <div className="md:hidden">
                            <span className="text-lg font-bold tracking-tight text-foreground">Inner G Complete</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <button className="relative h-9 w-9 md:h-10 md:w-10 rounded-full glass-panel flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <Bell className="h-4 w-4 md:h-5 md:w-5" />
                            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary border-2 border-background" />
                        </button>
                        <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-6 border-l border-white/10">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-foreground leading-none">{userName}</p>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {isPlentyOfHearts ? "Hearts Admin" : "Bookstore Admin"}
                                </p>
                            </div>
                            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-4 md:p-8 relative z-10 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {/* Welcome Message */}
                    <div className="mb-8 md:mb-10">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Welcome Back, {userName}</h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
                            The {isPlentyOfHearts ? "Plenty of Hearts" : "Kanes Bookstore"} growth systems are performing at optimal levels. All external {isPlentyOfHearts ? "community" : "inventory"} bridges
                            and retail API handshakes are stable as of <span className="text-foreground font-medium">{mounted && currentTime.toLocaleTimeString()}</span>.
                        </p>
                    </div>

                    {/* Connection Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {dynamicStatusItems.map((item) => (
                            <div key={item.id} className="glass-panel-strong rounded-2xl p-6 transition-all hover:scale-[1.02] border border-white/[0.03] group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-xl ${item.color}`}>
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Valid</span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-foreground mb-1">{item.label}</h3>
                                <p className="text-xs text-muted-foreground mb-6 line-clamp-1 opacity-70 group-hover:opacity-100 transition-opacity">{item.details}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter flex items-center gap-1.5">
                                        <CircleDot className="h-3 w-3 text-emerald-500" />
                                        Latency: {latencies[item.id] || 0}ms
                                    </span>
                                    <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                                        System Logs <ArrowUpRight className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Performance Section */}
                    {!isPlentyOfHearts ? (
                        <>
                            {/* Free Ebook Giveaway Performance */}
                            <div className="mb-12">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                                            <h2 className="text-xl md:text-2xl font-bold text-foreground line-clamp-1">Campaign: Free Ebook Giveaway</h2>
                                        </div>
                                        <p className="text-sm text-muted-foreground">Goal: Drive user adoption of the Kanes Ebook Reader app.</p>
                                    </div>
                                    <div className="flex items-center gap-3 w-full md:w-auto">
                                        <div className="glass-panel px-3 py-2 rounded-xl flex-1 md:flex-none flex items-center gap-3 border-white/5 overflow-hidden">
                                            <div className="flex -space-x-2 shrink-0">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <div key={i} className="h-6 w-6 md:h-7 md:w-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                                                        {String.fromCharCode(64 + i)}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">
                                                <span className="text-foreground font-bold">+1,240</span> readers this week
                                            </span>
                                        </div>
                                        <Button size="sm" variant="outline" className="border-white/10 hidden sm:flex shrink-0">Export Report</Button>
                                    </div>
                                </div>

                                {/* Top Level Metrics */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                    {[
                                        { label: "Total Signups (GHL)", value: "4,822", growth: "+12%", icon: Users, color: "text-primary bg-primary/10" },
                                        { label: "Reader App Installs", value: "3,140", growth: "+24%", icon: Bot, color: "text-emerald-500 bg-emerald-500/10" },
                                        { label: "Funnel Conv. Rate", value: "65.1%", growth: "+4.2%", icon: Activity, color: "text-orange-500 bg-orange-500/10" },
                                        { label: "Total IG Reach", value: "82.4k", growth: "+115%", icon: Instagram, color: "text-pink-500 bg-pink-500/10" },
                                    ].map((stat, i) => (
                                        <div key={i} className="glass-panel-strong rounded-2xl p-6 border border-white/5">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-2.5 rounded-lg ${stat.color}`}>
                                                    <stat.icon className="h-5 w-5" />
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.growth.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                                                    {stat.growth}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                                            <h3 className="text-2xl font-bold text-foreground mt-1">{stat.value}</h3>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="mb-12">
                            <div className="glass-panel-strong rounded-3xl p-6 md:p-10 border border-primary/20 bg-primary/[0.02] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-20 hidden md:block">
                                    <Heart className="h-32 w-32 text-primary" />
                                </div>
                                <div className="relative z-10 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                                        <Sparkles className="h-4 w-4 text-primary" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Workspace Initialized</span>
                                    </div>
                                    <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">Welcome to Plenty of Hearts</h2>
                                    <p className="text-muted-foreground text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
                                        We are currently architecting your custom growth dashboard. Your TikTok Creator Bridge and
                                        Enterprise Database are successfully linked.
                                    </p>
                                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch md:items-start">
                                        <div className="glass-panel px-6 py-4 rounded-2xl border-white/5 flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-cyan-400/10 shrink-0">
                                                <Music2 className="h-6 w-6 text-cyan-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground">TikTok Status</p>
                                                <p className="text-sm font-bold text-foreground">Bridge Operational</p>
                                            </div>
                                        </div>
                                        <div className="glass-panel px-6 py-4 rounded-2xl border-white/5 flex items-center gap-4">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 shrink-0">
                                                <Database className="h-6 w-6 text-emerald-500" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground">Database Status</p>
                                                <p className="text-sm font-bold text-foreground">Syncing Clusters</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detailed Analysis Grid */}
                    <div className={`grid grid-cols-1 ${!isPlentyOfHearts ? 'lg:grid-cols-2' : ''} gap-8 mb-12`}>
                        {/* Growth Assistant Chat Interface (Left Column) */}
                        <div className="rounded-2xl border border-white/5 overflow-hidden flex flex-col h-full min-h-0">
                            <ChatInterface projectSlug={projectType ?? "kanes-bookstore"} />
                        </div>

                        {/* Right Column Stacking Social Impact and Acquisition Funnel */}
                        {!isPlentyOfHearts && (
                            <div className="space-y-8 flex flex-col">
                                {/* Instagram Social Engagement Analytics */}
                                <div className="glass-panel-strong rounded-2xl border border-white/5 p-8">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <Instagram className="h-5 w-5 text-pink-500" />
                                        Social Impact (Instagram API)
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 flex-1">
                                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Top Post Engagement</p>
                                            <div className="flex items-end gap-2 mb-1">
                                                <span className="text-2xl font-bold text-foreground">2.4k</span>
                                                <span className="text-[10px] text-emerald-500 font-bold mb-1">+18%</span>
                                            </div>
                                            <div className="flex gap-1 mt-4">
                                                {[40, 70, 45, 90, 65, 80].map((h, i) => (
                                                    <div key={i} className="flex-1 bg-pink-500/20 rounded-t-sm" style={{ height: `${h}px` }} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-2">Comments Sentiment</p>
                                            <div className="flex items-end gap-2 mb-1">
                                                <span className="text-2xl font-bold text-foreground">92%</span>
                                                <span className="text-[10px] text-emerald-500 font-bold mb-1">POS</span>
                                            </div>
                                            <div className="mt-4 flex flex-col gap-2">
                                                <div className="flex justify-between text-[10px] items-center">
                                                    <span>Excitement</span>
                                                    <span className="text-foreground font-bold">78%</span>
                                                </div>
                                                <div className="h-1 w-full bg-white/5 rounded-full"><div className="h-full bg-emerald-500 w-[78%] rounded-full" /></div>
                                                <div className="flex justify-between text-[10px] items-center">
                                                    <span>Technical Queries</span>
                                                    <span className="text-foreground font-bold">12%</span>
                                                </div>
                                                <div className="h-1 w-full bg-white/5 rounded-full"><div className="h-full bg-primary w-[12%] rounded-full" /></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                            <span className="text-muted-foreground">Highest Performing Post: <span className="text-foreground font-medium">"Top 5 Summer Reads Giveaway"</span></span>
                                            <ArrowUpRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                            <span className="text-muted-foreground">Top GHL Referral Source: <span className="text-foreground font-medium">IG Direct Message (Auto-Reply)</span></span>
                                            <ArrowUpRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </div>

                                {/* Conversion Funnel Breakdown */}
                                <div className="glass-panel-strong rounded-2xl border border-white/5 p-8">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                        <ArrowUpRight className="h-5 w-5 text-primary" />
                                        Acquisition Funnel (GHL & Supabase)
                                    </h3>
                                    <div className="space-y-6">
                                        {[
                                            { step: "IG Ad Impressions", count: "125,400", percent: 100, color: "bg-pink-500/20" },
                                            { step: "GHL Landing Page Visits", count: "12,840", percent: 10.2, color: "bg-primary/30" },
                                            { step: "Giveaway Leads (Signups)", count: "4,822", percent: 37.5, color: "bg-primary/50" },
                                            { step: "Ebook App Activation", count: "3,140", percent: 65.1, color: "bg-primary" },
                                        ].map((row, i) => (
                                            <div key={i} className="relative">
                                                <div className="flex justify-between items-end mb-2">
                                                    <span className="text-sm font-medium text-foreground">{row.step}</span>
                                                    <div className="text-right">
                                                        <span className="text-sm font-bold text-foreground">{row.count}</span>
                                                        {i > 0 && <span className="text-[10px] text-muted-foreground ml-2">({row.percent}% of prev)</span>}
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full ${row.color} rounded-full transition-all duration-1000`} style={{ width: `${i === 0 ? 100 : row.percent}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                        <p className="text-xs leading-relaxed text-muted-foreground">
                                            <span className="text-primary font-bold">AI Note:</span> Activation rates are 22% higher for users who engaging with the "Sneak Peek" carousel on Instagram.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Funnel Intelligence Section (Briefed) - Hidden for Plenty of Hearts */}
                    {!isPlentyOfHearts && (
                        <div className="mb-12">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">Campaign Funnel Intelligence</h2>
                                    <p className="text-sm text-muted-foreground">Real-time signals from your integrated data stack.</p>
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">Active Campaign: Spring Bestsellers</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Database Signal */}
                                <div className="glass-panel-strong rounded-2xl p-6 border border-white/[0.03] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Database className="h-5 w-5 text-emerald-500" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Inventory Signal</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">High Demand Prediction</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Database analysis indicates 'The Midnight Library' is trending. Current stock will deplete in <span className="text-orange-500 font-bold">48 hours</span> based on current velocity.
                                    </p>
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11">
                                        Automate Restock Order
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* GHL Signal */}
                                <div className="glass-panel-strong rounded-2xl p-6 border border-white/[0.03] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Zap className="h-5 w-5 text-primary" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Conversion Signal</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">342 Stalled Checkouts</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        GHL Data identifies a high-intent segment stuck at Step 2 of the 'Komet Card' funnel. Potential revenue gap: <span className="text-primary font-bold">$12,400</span>.
                                    </p>
                                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 h-11">
                                        Trigger Retargeting Flow
                                        <Zap className="h-4 w-4" />
                                    </Button>
                                </div>

                                {/* Right Signal column (Instagram - hidden for Plenty of Hearts) */}
                                <div className="glass-panel-strong rounded-2xl p-6 border border-white/[0.03] relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3">
                                        <span className="flex h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Instagram className="h-5 w-5 text-pink-500" />
                                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Social Signal</span>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2">Engagement Spike (+48%)</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Your latest Reel on 'Special Edition Hardcovers' is viral. Instagram API reports over <span className="text-pink-500 font-bold">500+ comments</span> asking for purchase links.
                                    </p>
                                    <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white gap-2 h-11">
                                        Deploy Bio-Link Update
                                        <ArrowUpRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Activity Feed */}
                    {!isPlentyOfHearts && (
                        <div className="max-w-xl">
                            <div className="rounded-2xl glass-panel-strong border border-white/5 p-8">
                                <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
                                <div className="space-y-6">
                                    {[
                                        { time: "2m ago", action: "Inventory Sync Completed", category: "Retail Ops" },
                                        { time: "45m ago", action: "Personalization Engine Updated", category: "Growth" },
                                        { time: "2h ago", action: "Komet Card Variant Verified", category: "Revenue" },
                                        { time: "5h ago", action: "New GHL Contact Synced", category: "CRM" },
                                    ].map((activity, idx) => (
                                        <div key={idx} className="flex gap-4 items-start">
                                            <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                                                <p className="text-[11px] text-muted-foreground opacity-70 mt-0.5">{activity.category} • {activity.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <Button className="w-full mt-10 bg-secondary/50 hover:bg-secondary text-foreground text-xs font-semibold py-6">View Historical Audit Data</Button>
                            </div>
                        </div>
                    )}
                </div>
            </main >
        </div >
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
            <DashboardContent />
        </Suspense>
    )
}
