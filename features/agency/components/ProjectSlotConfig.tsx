"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, Check, ArrowLeft, Database, Shield, Zap, Search, Filter, Globe, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "./AdminHeader"
import { METRIC_REGISTRY } from "@/features/metrics/registry"
import { getIcon } from "@/features/metrics/utils/icon-map"
import Link from "next/link"
import { toast } from "sonner"

export function ProjectSlotConfig() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [projectId, setProjectId] = useState<string | null>(null)
    const [projectName, setProjectName] = useState("")
    const [entitledSlotIds, setEntitledSlotIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [activeCategory, setActiveCategory] = useState<string>("all")

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                
                // 1. Fetch Project
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .single() as any

                if (!project) {
                    toast.error("Project not found")
                    router.push("/admin/projects")
                    return
                }

                setProjectId(project.id)
                setProjectName(project.name)

                // 2. Fetch Current Entitlements
                const { data: entitlements } = await supabase
                    .from("project_slot_entitlements")
                    .select("slot_id")
                    .eq("project_id", project.id) as any

                if (entitlements) {
                    setEntitledSlotIds(entitlements.map((e: any) => e.slot_id))
                }
            } catch (err) {
                console.error("Failed to load entitlements", err)
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [slug, router])

    const toggleSlot = (slotId: string) => {
        setEntitledSlotIds(prev => 
            prev.includes(slotId) 
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        )
    }

    const saveChanges = async () => {
        if (!projectId) return
        
        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            
            // 1. Delete Existing
            await supabase
                .from("project_slot_entitlements")
                .delete()
                .eq("project_id", projectId)

            // 2. Insert New
            if (entitledSlotIds.length > 0) {
                const { error } = await supabase
                    .from("project_slot_entitlements")
                    .insert(
                        entitledSlotIds.map(id => ({
                            project_id: projectId,
                            slot_id: id
                        }))
                    )

                if (error) throw error
            }

            toast.success("Entitlements updated successfully")
        } catch (err) {
            console.error("Failed to save entitlements", err)
            toast.error("Cloud sync failed")
        } finally {
            setIsSaving(false)
        }
    }

    const categories = ["all", ...new Set(METRIC_REGISTRY.map(s => s.category))]

    const filteredSlots = METRIC_REGISTRY.filter(slot => {
        const matchesSearch = slot.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             slot.description.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = activeCategory === "all" || slot.category === activeCategory
        return matchesSearch && matchesCategory
    })

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-black uppercase tracking-widest italic text-foreground mb-2">Synchronizing Entitlements...</h2>
                <p className="text-muted-foreground text-sm max-w-xs">Connecting to Neural Asset Registry for {slug}</p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            <AdminHeader 
                title="Service Architecture" 
                subtitle={`${projectName} • Feature Entitlements`}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10 w-full">
                <div className="p-6 md:p-10 max-w-6xl mx-auto w-full pb-32">
                    {/* Back Navigation */}
                    <div className="mb-10">
                        <Link
                            href={`/admin/metrics`}
                            className="flex items-center gap-2 text-[10px] font-black text-muted-foreground hover:text-primary transition-all uppercase tracking-[0.2em] group"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back to Global Registry
                        </Link>
                    </div>

                    {/* Context Panel */}
                    <div className="mb-12 flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-3xl bg-accent/5 border border-accent/10 relative overflow-hidden group">
                        <div className="relative z-10 text-center md:text-left">
                            <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">Project Entitlements</h2>
                            <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
                                Select which metric ports are enabled for <strong>{projectName}</strong>. Cards enabled here will immediately populate in the client portal as "Available Slots".
                            </p>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-2 relative z-10 shrink-0">
                            <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                                {entitledSlotIds.length} / {METRIC_REGISTRY.length} Features Enabled
                            </div>
                            <p className="text-[10px] text-muted-foreground/40 italic">Global Deployment: Ready</p>
                        </div>
                        <Database className="absolute -right-8 -bottom-8 h-48 w-48 text-accent/5 rotate-12 transition-transform group-hover:rotate-0" />
                    </div>

                    {/* Controls Bar */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 sticky top-0 z-30 p-2 bg-background/80 backdrop-blur-md rounded-2xl border border-border shadow-xl">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input 
                                type="text"
                                placeholder="Search the asset catalog..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm pl-12 h-10 placeholder:text-muted-foreground/30 font-medium"
                            />
                        </div>
                        <div className="h-4 w-px bg-border hidden sm:block" />
                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scroll-hidden">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${
                                        activeCategory === cat 
                                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' 
                                        : 'bg-muted/5 text-muted-foreground border-border hover:border-primary/20'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Registry Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredSlots.map(slot => {
                            const isEntitled = entitledSlotIds.includes(slot.id)
                            const Icon = getIcon(slot.iconName)
                            
                            return (
                                <div
                                    key={slot.id}
                                    onClick={() => toggleSlot(slot.id)}
                                    className={`group p-6 rounded-3xl border transition-all duration-500 cursor-pointer relative overflow-hidden flex flex-col h-full ${
                                        isEntitled 
                                        ? 'bg-primary/5 border-primary/30 shadow-[0_0_40px_rgba(var(--primary),0.05)]' 
                                        : 'bg-muted/5 border-border hover:border-primary/20'
                                    }`}
                                >
                                    <div className="flex items-start gap-5 mb-4 relative z-10">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${
                                            isEntitled ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20' : 'bg-white/5 text-muted-foreground border-white/10'
                                        }`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <h3 className={`text-base font-bold tracking-tight transition-colors ${isEntitled ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                                                    {slot.label}
                                                </h3>
                                                {isEntitled ? (
                                                    <div className="h-5 w-5 bg-emerald-500/20 rounded-lg flex items-center justify-center border border-emerald-500/40">
                                                        <Check className="h-3 w-3 text-emerald-400" />
                                                    </div>
                                                ) : (
                                                    <Lock className="h-3 w-3 text-muted-foreground/30" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 uppercase tracking-widest text-[9px] font-black">
                                                <span className="text-primary/60">{slot.category}</span>
                                                <span className="text-muted-foreground/20">•</span>
                                                <span className="text-muted-foreground/40">{slot.type}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground/60 leading-relaxed flex-1 relative z-10 line-clamp-2">
                                        {slot.description}
                                    </p>

                                    {/* Action Footnote */}
                                    <div className="mt-6 pt-4 border-t border-border/20 flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-2">
                                            <span className={`h-1.5 w-1.5 rounded-full ${isEntitled ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                                                {isEntitled ? 'Channel Active' : 'Access Restricted'}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-muted-foreground/10 font-mono tracking-tighter uppercase">{slot.id}</span>
                                    </div>
                                    
                                    {/* Success Background Effect */}
                                    {isEntitled && (
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Bottom Floating Bar */}
                    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50">
                        <div className="bg-black/80 backdrop-blur-2xl p-4 rounded-3xl border border-white/10 shadow-2xl shadow-black flex items-center justify-between gap-8">
                            <div className="flex items-center gap-4 pl-4 shrink-0">
                                <Shield className="h-6 w-6 text-violet-400 animate-pulse" />
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">Save Changes</p>
                                    <p className="text-[9px] text-white/40 italic">Push Neural Port Entitlements</p>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={saveChanges}
                                disabled={isSaving}
                                className="h-14 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] min-w-[200px] shadow-2xl shadow-primary/20"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-3" />
                                        Streaming...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="h-3 w-3 mr-3" />
                                        Commit Architecture
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
