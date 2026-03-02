"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ArrowRight,
    BookOpen,
    Layout,
    ChevronRight,
    Search,
    Filter,
    PlusCircle,
    Building2,
    Calendar,
    Users,
    Heart,
    Music2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const projects = [
    {
        id: "kanes-bookstore",
        name: "Project Kanes Bookstore",
        client: "Kane's Bookstore",
        status: "Active",
        type: "Retail & Ebook Ecosystem",
        campaign: "Free Ebook Giveaway",
        lastActivity: "2 minutes ago",
        metrics: "4.8k leads, 65% activation",
        icon: BookOpen,
        href: "/dashboard"
    },
    {
        id: "plenty-of-hearts",
        name: "Project Plenty of Hearts",
        client: "Plenty of Hearts",
        status: "Active",
        type: "Social Community & Dating",
        campaign: "Community Growth",
        lastActivity: "Just now",
        metrics: "TikTok Bridge: Live, DB: Linked",
        icon: Heart,
        href: "/dashboard?project=plenty-of-hearts"
    }
]

export default function SelectPortalPage() {
    const [searchQuery, setSearchQuery] = useState("")
    const router = useRouter()

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase())
    )

    useEffect(() => {
    }, [])

    return (
        <main className="min-h-screen bg-[#020617] text-foreground relative w-full">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[160px] opacity-20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[140px] opacity-10 pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20 flex flex-col min-h-screen">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-16 gap-8">
                    <div className="flex flex-col">
                        <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                                <span className="text-xl font-bold">G</span>
                            </div>
                            <span className="text-xl font-bold tracking-tight text-foreground">
                                Inner G
                            </span>
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">Enterprise Client Portals</h1>
                        <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl">
                            Select an active growth architecture to access specific project analytics, campaign performance, and AI-driven insights.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 mt-8 md:mt-0 p-4 rounded-2xl glass-panel md:bg-transparent md:border-none">
                        <div className="h-12 w-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5">
                            <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-foreground">System Administrator</p>
                            <p className="text-xs text-primary uppercase tracking-widest font-semibold">Master Access</p>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col gap-4 mb-10">
                    <div className="relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search projects..."
                            className="bg-white/5 border-white/10 pl-12 h-14 text-base md:text-lg rounded-2xl focus:border-primary transition-all w-full"
                        />
                    </div>
                    <div className="flex flex-wrap md:flex-nowrap gap-4">
                        <Button variant="outline" className="flex-1 md:flex-none h-14 px-6 border-white/10 rounded-2xl gap-2 hover:bg-white/5 order-2 md:order-1">
                            <Filter className="h-5 w-5" />
                            Status: Active
                        </Button>
                        <Button className="flex-1 md:flex-auto h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl gap-2 glow-primary order-1 md:order-2">
                            <PlusCircle className="h-5 w-5" />
                            Request New Portal
                        </Button>
                    </div>
                </div>

                {/* Project List */}
                <div className="grid grid-cols-1 gap-6 flex-1">
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map((project) => (
                            <Link
                                key={project.id}
                                href={project.href}
                                className="group relative block glass-panel-strong hover:border-primary/50 transition-all duration-300 p-8 rounded-3xl shadow-2xl" // Removed overflow-hidden
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />

                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                                    <div className="flex flex-col sm:flex-row items-start gap-6">
                                        <div className="h-16 w-16 shrink-0 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                            <project.icon className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                                <h2 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                                    {project.name}
                                                </h2>
                                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                                                    {project.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4" />
                                                    {project.client}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    <Layout className="h-4 w-4" />
                                                    {project.type}
                                                </span>
                                                <span className="flex items-center gap-2 text-primary whitespace-nowrap">
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                    Campaign: {project.campaign}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-center gap-8 pr-4">
                                        <div className="text-right flex flex-col items-center md:items-end w-full md:w-auto">
                                            <p className="text-xs uppercase font-bold tracking-tighter text-muted-foreground mb-1">Live Feed Metric</p>
                                            <p className="text-lg font-bold text-foreground">{project.metrics}</p>
                                            <p className="text-[10px] text-primary mt-1 font-semibold flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Active Audit: {project.lastActivity}
                                            </p>
                                        </div>
                                        <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all group-hover:translate-x-2 group-hover:glow-primary">
                                            <ChevronRight className="h-6 w-6" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 glass-panel-strong rounded-3xl border-dashed border-white/5 opacity-50">
                            <Search className="h-12 w-12 mb-4" />
                            <p className="text-xl font-semibold">No portals match your search.</p>
                            <p className="text-sm">Try searching for 'Bookstore' or 'Kane'.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-20 py-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-sm text-muted-foreground font-medium">
                        Securely managed by <span className="text-foreground">Inner G Infrastructure</span>
                    </p>
                    <div className="flex items-center gap-8">
                        <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest font-bold">Standard Dashboard</Link>
                        <Link href="/login" className="text-xs text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest font-bold">Sign Out</Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
