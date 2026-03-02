"use client"

import { useState, useEffect } from "react"
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
    ArrowUpRight
} from "lucide-react"
import { Button } from "@/components/ui/button"

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

import { ChatInterface } from "@/components/dashboard/chat-interface"

export default function DashboardPage() {
    const [userName, setUserName] = useState("Kane")
    const [currentTime, setCurrentTime] = useState(new Date())
    const router = useRouter()

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex w-72 flex-col glass-panel border-r border-white/5 h-screen sticky top-0">
                <div className="p-8 pb-10">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                            <span className="text-xl font-bold">G</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Inner G
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2">
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

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen bg-[#020617] relative">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] opacity-10 pointer-events-none" />

                {/* Top Header */}
                <header className="flex h-20 items-center justify-between px-8 border-b border-white/5 relative z-10">
                    <div>
                        <h2 className="text-sm font-medium text-muted-foreground">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <button className="relative h-10 w-10 rounded-full glass-panel flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
                        </button>
                        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-foreground">{userName}</p>
                                <p className="text-xs text-muted-foreground">Kanes Bookstore Admin Access</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                                <User className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 p-8 relative z-10 max-w-7xl mx-auto w-full">
                    {/* Welcome Message */}
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-foreground">Welcome Back, {userName}</h1>
                        <p className="text-muted-foreground mt-2 max-w-2xl">
                            The Kanes Bookstore growth systems are performing at optimal levels. All external inventory bridges
                            and retail API handshakes are stable as of <span className="text-foreground font-medium">{currentTime.toLocaleTimeString()}</span>.
                        </p>
                    </div>

                    {/* Connection Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        {statusItems.map((item) => (
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
                                        Latency: {Math.floor(Math.random() * 50) + 10}ms
                                    </span>
                                    <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                                        System Logs <ArrowUpRight className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Campaign Funnel Intelligence */}
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

                            {/* Instagram Signal */}
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

                    {/* Chat and Activity Feed */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
                        <div className="lg:col-span-2 rounded-2xl border border-white/[0.03] min-h-[500px]">
                            <ChatInterface />
                        </div>

                        <div className="rounded-2xl glass-panel-strong border border-white/[0.03] p-8">
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
                </div>
            </main>
        </div>
    )
}
