"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter } from "next/navigation"
import {
    Loader2,
    Building2,
    BarChart3,
    Users,
    TrendingUp,
    Bot,
    Sparkles,
    Send,
    BookOpen,
    AlertTriangle,
    CheckCircle2,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Maximize2,
    Minimize2,
    Cpu,
    User,
    X,
    Layout,
    LayoutDashboard,
    LogOut,
    Settings,
    ShieldCheck,
    Plug,
    RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient, supabaseAnonKey } from "@/lib/supabase/browser"
import type { UserRole } from "@/types"
import Link from "next/link"

// ─────────────────────────────────────────────
// AGENCY SIDEBAR — Custom sidebar for the agency dashboard
// ─────────────────────────────────────────────

function AgencySidebar({ isSidebarOpen, onClose }: { isSidebarOpen: boolean; onClose: () => void }) {
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
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 flex-col glass-panel border-r border-white/5 h-screen sticky top-0">
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
                className={`fixed top-0 left-0 bottom-0 w-[280px] bg-background border-r border-white/5 z-[101] flex flex-col transition-transform duration-300 lg:hidden ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
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

// ─────────────────────────────────────────────
// PORTFOLIO SUMMARY CARD
// ─────────────────────────────────────────────

interface PortfolioMetric {
    label: string
    value: string | number
    change?: string
    trend?: "up" | "down" | "neutral"
    icon: React.ElementType
    color: string
}

function PortfolioCard({ metric }: { metric: PortfolioMetric }) {
    return (
        <div className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group">
            <div className="flex items-start justify-between mb-4">
                <div className={`h-10 w-10 rounded-xl ${metric.color} flex items-center justify-center`}>
                    <metric.icon className="h-5 w-5" />
                </div>
                {metric.change && (
                    <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${metric.trend === "up"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : metric.trend === "down"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-white/5 text-muted-foreground"
                        }`}>
                        {metric.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : metric.trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
                        {metric.change}
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{metric.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
        </div>
    )
}

// ─────────────────────────────────────────────
// AGENCY CHAT INTERFACE
// ─────────────────────────────────────────────

interface ChatMessage {
    id: string
    role: "user" | "assistant"
    content: string
    timestamp: Date
    signalCreated?: {
        id: string
        title: string
        severity: string
        signal_type: string
        project_id?: string
    } | null
}

function AgencyChatInterface() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello, Lamont! I'm your Inner G Complete Agency Agent. I can analyze data across all your client projects, reference our methodology and SOPs, and help you make strategic decisions. What would you like to explore?",
            timestamp: new Date(),
        }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        }
    }, [messages])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date(),
        }

        const currentInput = input
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setIsLoading(true)

        try {
            const supabase = createBrowserClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "Please log in again to use the Agency Agent.",
                    timestamp: new Date()
                }])
                return
            }

            // Call the agency-specific chat Edge Function
            const { data, error } = await supabase.functions.invoke("send-agency-chat-message", {
                body: {
                    message: currentInput,
                    model: "gemini-2.5-flash-lite",
                    session_id: sessionId,
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: supabaseAnonKey
                }
            })

            if (error) throw error

            if (data?.data) {
                // Persist session ID for conversational continuity
                if (data.data.session_id) {
                    setSessionId(data.data.session_id)
                }

                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: data.data.reply,
                    timestamp: new Date(),
                    signalCreated: data.data.signal_created || null,
                }])
            }
        } catch (err) {
            console.error("[AgencyChat] Error:", err)
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "I apologize — the Agency Agent encountered an issue. Please ensure the `send-agency-chat-message` Edge Function is deployed. You can deploy it with: `supabase functions deploy send-agency-chat-message`.",
                timestamp: new Date()
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className={`flex flex-col glass-panel-strong rounded-2xl border border-white/[0.03] transition-all duration-500 overflow-hidden ${isExpanded ? "fixed inset-0 md:inset-8 z-[102] shadow-2xl rounded-none md:rounded-2xl" : "h-[600px]"}`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border border-primary/30">
                        <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Agency Agent
                            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
                        </h3>
                        <p className="text-[10px] text-emerald-500 font-medium uppercase tracking-wider">Cross-Project Intelligence</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                        <Cpu className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Gemini 2.5 Lite</span>
                    </div>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-muted-foreground"
                    >
                        {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.map((m) => (
                    <div key={m.id} className={`flex gap-3 ${m.role === "assistant" ? "" : "flex-row-reverse"}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${m.role === "assistant" ? "bg-primary/20 border-primary/30" : "bg-secondary/50 border-white/10"}`}>
                            {m.role === "assistant" ? <Building2 className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-foreground" />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${m.role === "assistant" ? "bg-white/[0.03] border border-white/5 rounded-tl-none" : "bg-primary text-primary-foreground rounded-tr-none shadow-lg shadow-primary/10"}`}>
                            <span dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            {m.signalCreated && (
                                <div className={`mt-3 p-3 rounded-xl border ${m.signalCreated.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                                    m.signalCreated.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                                        'bg-blue-500/10 border-blue-500/20'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <AlertTriangle className={`h-3.5 w-3.5 ${m.signalCreated.severity === 'critical' ? 'text-red-400' :
                                            m.signalCreated.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'
                                            }`} />
                                        <span className="text-xs font-bold uppercase tracking-wider">
                                            {m.signalCreated.severity} Signal Created
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium">{m.signalCreated.title}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.signalCreated.signal_type} • Added to project dashboard</p>
                                </div>
                            )}
                            <div className={`text-[10px] mt-2 opacity-50 ${m.role === "assistant" ? "text-muted-foreground" : "text-primary-foreground/80"}`}>
                                {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl rounded-tl-none p-4">
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                <form onSubmit={handleSend} className="relative">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                        placeholder="Ask about portfolio performance, methodology, or strategy..."
                        className="bg-background/50 border-white/10 pr-12 h-12 rounded-xl focus:border-primary transition-all text-sm"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isLoading}
                        className="absolute right-1.5 top-1.5 h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-lg shadow-primary/20"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
                <p className="text-[10px] text-center text-muted-foreground mt-3 opacity-50">
                    Agency Agent — Cross-project intelligence with Inner G Complete methodology.
                </p>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────
// MAIN DASHBOARD CONTENT
// ─────────────────────────────────────────────

import { useRef } from "react"

function AgencyDashboardContent() {
    const router = useRouter()
    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)

    // Portfolio data
    const [projects, setProjects] = useState<any[]>([])
    const [totalSignals, setTotalSignals] = useState(0)
    const [unresolvedSignals, setUnresolvedSignals] = useState(0)
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [allSignals, setAllSignals] = useState<any[]>([])
    const [isSyncing, setIsSyncing] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            const supabase = createBrowserClient()

            // 1. Auth check + role verification
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: profile } = await supabase
                .from("users")
                .select("full_name, role")
                .eq("id", user.id)
                .single() as any

            if (!profile || profile.role !== "super_admin") {
                router.push("/select-portal")
                return
            }

            setUserData({
                name: profile.full_name || "Admin",
                role: "SUPER ADMIN"
            })

            // 2. Fetch all projects with client info
            const { data: projectData } = await supabase
                .from("projects")
                .select("id, name, slug, status, type, active_campaign_name, clients(name, industry)")
                .eq("status", "active")
                .order("name") as any

            setProjects(projectData || [])

            // 3. Fetch all AI signals across projects
            const { data: signalData } = await supabase
                .from("ai_signals")
                .select("id, project_id, signal_type, title, body, severity, is_resolved, created_at, projects(name)")
                .order("created_at", { ascending: false })
                .limit(20) as any

            if (signalData) {
                setAllSignals(signalData)
                setTotalSignals(signalData.length)
                setUnresolvedSignals(signalData.filter((s: any) => !s.is_resolved).length)
            }

            // 4. Fetch recent activity across all projects
            const { data: activityData } = await supabase
                .from("activity_log")
                .select("id, action, category, created_at, projects(name)")
                .order("created_at", { ascending: false })
                .limit(10) as any

            setRecentActivity(activityData || [])

        } catch (err) {
            console.error("[AgencyDashboard] Error:", err)
        } finally {
            setIsLoading(false)
        }
    }, [router, setUserData, setProjects, setAllSignals, setTotalSignals, setUnresolvedSignals, setRecentActivity, setIsLoading])

    const handleSyncGHL = async () => {
        setIsSyncing(true)
        try {
            const supabase = createBrowserClient()
            const { data: { session } } = await supabase.auth.getSession()

            const { data, error } = await supabase.functions.invoke("sync-ghl-pipeline", {
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    apikey: supabaseAnonKey
                }
            })

            if (error) {
                const responseBody = await error.context?.json()
                throw new Error(responseBody?.error?.message || error.message)
            }

            alert("GHL Pipeline Sync Successful!")
            fetchData()
        } catch (err: any) {
            console.error("Sync failed:", err)
            alert("Sync failed: " + (err.message || "Unknown error"))
        } finally {
            setIsSyncing(false)
        }
    }

    useEffect(() => {
        setMounted(true)
        fetchData()

        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [fetchData])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading Agency Command Center...</p>
                </div>
            </div>
        )
    }

    const portfolioMetrics: PortfolioMetric[] = [
        {
            label: "Active Client Projects",
            value: projects.length,
            icon: Building2,
            color: "bg-blue-500/20 text-blue-400",
        },
        {
            label: "Unresolved Signals",
            value: unresolvedSignals,
            change: unresolvedSignals > 0 ? `${unresolvedSignals} active` : "All clear",
            trend: unresolvedSignals > 0 ? "down" : "up",
            icon: AlertTriangle,
            color: unresolvedSignals > 0 ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400",
        },
        {
            label: "Total AI Signals",
            value: totalSignals,
            icon: Sparkles,
            color: "bg-violet-500/20 text-violet-400",
        },
        {
            label: "Recent Activities",
            value: recentActivity.length,
            icon: Activity,
            color: "bg-cyan-500/20 text-cyan-400",
        },
    ]

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row">
            <AgencySidebar
                isSidebarOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            <main className="flex-1 flex flex-col min-h-screen bg-[#020617] relative w-full">
                {/* Background ambient gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] opacity-10 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[80px] opacity-10 pointer-events-none" />

                {/* Header */}
                <header className="sticky top-0 z-50 h-20 flex items-center justify-between px-6 md:px-8 glass-panel border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden h-10 w-10 rounded-lg glass-panel flex items-center justify-center"
                        >
                            <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                        </button>
                        <div>
                            <p className="text-sm font-medium text-foreground">Agency Command Center</p>
                            <p className="text-xs text-muted-foreground">
                                {mounted && currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isSyncing}
                                onClick={handleSyncGHL}
                                className="h-8 gap-2 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                                {isSyncing ? "Syncing GHL..." : "Sync GHL"}
                            </Button>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium text-primary">Systems Online</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                                {userData?.name?.charAt(0) || "A"}
                            </div>
                            <div className="hidden md:block">
                                <p className="text-sm font-medium text-foreground">{userData?.name}</p>
                                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">{userData?.role}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-4 md:p-8 relative z-10 max-w-7xl mx-auto w-full overflow-x-hidden">
                    {/* Welcome Section */}
                    <div className="mb-8 md:mb-10">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                            Welcome Back, {userData?.name?.split(" ")[0] || "Admin"}
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base mt-2 max-w-2xl leading-relaxed text-balance">
                            Your <span className="text-foreground font-medium">Inner G Complete</span> agency portfolio overview.
                            Monitoring <span className="text-foreground font-medium">{projects.length} active project{projects.length !== 1 ? "s" : ""}</span> as of{" "}
                            <span className="text-foreground font-medium">{mounted && currentTime.toLocaleTimeString()}</span>.
                        </p>
                    </div>

                    {/* Portfolio Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
                        {portfolioMetrics.map((metric) => (
                            <PortfolioCard key={metric.label} metric={metric} />
                        ))}
                    </div>

                    {/* Main Grid: Chat + Signals */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        {/* Agency Agent Chat */}
                        <div className="rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-0">
                            <AgencyChatInterface />
                        </div>

                        {/* Cross-Project Signals */}
                        <div className="space-y-6">
                            {/* Active Projects */}
                            <div className="glass-panel rounded-2xl p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-primary" />
                                        Active Projects
                                    </h3>
                                    <Link href="/select-portal" className="text-xs text-primary hover:underline">View All</Link>
                                </div>
                                <div className="space-y-3">
                                    {projects.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No active projects</p>
                                    ) : (
                                        projects.map((project: any) => (
                                            <Link
                                                key={project.id}
                                                href={`/dashboard/${project.slug}`}
                                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                        <BarChart3 className="h-4 w-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{project.name}</p>
                                                        <p className="text-[10px] text-muted-foreground">{project.clients?.name || "Unknown Client"} • {project.active_campaign_name || "No active campaign"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">{project.status}</span>
                                                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Recent Signals Across All Projects */}
                            <div className="glass-panel rounded-2xl p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                                        Cross-Project Signals
                                    </h3>
                                    <span className="text-xs text-muted-foreground">{unresolvedSignals} unresolved</span>
                                </div>
                                <div className="space-y-3 max-h-[280px] overflow-y-auto custom-scrollbar">
                                    {allSignals.length === 0 ? (
                                        <div className="flex flex-col items-center py-6 text-center">
                                            <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                                            <p className="text-sm text-muted-foreground">No active signals — all systems nominal.</p>
                                        </div>
                                    ) : (
                                        allSignals.filter((s: any) => !s.is_resolved).slice(0, 6).map((signal: any) => (
                                            <div
                                                key={signal.id}
                                                className={`p-3 rounded-xl border transition-all ${signal.severity === "critical"
                                                    ? "bg-red-500/5 border-red-500/20"
                                                    : signal.severity === "warning"
                                                        ? "bg-amber-500/5 border-amber-500/20"
                                                        : "bg-blue-500/5 border-blue-500/20"
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{signal.title}</p>
                                                        <p className="text-[10px] text-muted-foreground mt-1">
                                                            {signal.projects?.name || "Unknown"} • {signal.signal_type} • {new Date(signal.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${signal.severity === "critical"
                                                        ? "bg-red-500/20 text-red-400"
                                                        : signal.severity === "warning"
                                                            ? "bg-amber-500/20 text-amber-400"
                                                            : "bg-blue-500/20 text-blue-400"
                                                        }`}>
                                                        {signal.severity}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Activity Across All Projects */}
                    <div className="glass-panel rounded-2xl p-6 border border-white/5 mb-12">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4 text-cyan-400" />
                                Cross-Project Activity Feed
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                            ) : (
                                recentActivity.map((activity: any) => (
                                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-foreground truncate">{activity.action}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {activity.projects?.name || "System"} • {new Date(activity.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground shrink-0">
                                            {activity.category}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default function AgencyDashboardPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
            <AgencyDashboardContent />
        </Suspense>
    )
}
