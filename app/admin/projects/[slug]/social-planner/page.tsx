"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
    Calendar,
    Loader2,
    Save,
    Check,
    ArrowLeft,
    Shield,
    Zap,
    CheckCircle2,
    AlertTriangle,
    Youtube,
    Instagram,
    Facebook,
    Linkedin,
    Twitter,
    MessageSquare,
    Globe,
    Settings,
    Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"

export default function AgencySocialPlannerConfigPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [projectName, setProjectName] = useState("")
    const [projectId, setProjectId] = useState<string | null>(null)
    const [featureEnabled, setFeatureEnabled] = useState(false)
    const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)

    const PLATFORM_OPTIONS = [
        { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-500' },
        { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-500' },
        { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600' },
        { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-500' },
        { id: 'twitter', name: 'X (Twitter)', icon: Twitter, color: 'text-zinc-400' },
        { id: 'ghl', name: 'GoHighLevel', icon: MessageSquare, color: 'text-orange-500' },
        { id: 'discord', name: 'Discord', icon: MessageSquare, color: 'text-indigo-400' },
        { id: 'slack', name: 'Slack', icon: Activity, color: 'text-emerald-400' }
    ]

    useEffect(() => {
        const load = async () => {
            try {
                const supabase = createBrowserClient()
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) { 
                    router.push("/login")
                    return 
                }

                const { data: profile, error: profileErr } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single() as any

                if (profileErr || !profile || profile.role !== "super_admin") {
                    setError(`Access Denied: ${profileErr?.message || "Not a super_admin"}`)
                    return
                }

                const { data: project, error: projectErr } = await supabase
                    .from("projects")
                    .select("id, name, settings")
                    .eq("slug", slug)
                    .single() as any

                if (projectErr || !project) {
                    setError(`Project lookup failed: ${projectErr?.message || "Not found"}`)
                    return
                }
                
                setProjectId(project.id)
                setProjectName(project.name)
                
                const settings = project.settings || {}
                setFeatureEnabled(settings.features?.social_planner ?? false)
                setAllowedPlatforms(settings.features?.social_planner_platforms ?? [])

            } catch (err: any) {
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [slug, router])

    const handleSave = async () => {
        if (!projectId) return
        setIsSaving(true)
        setSaveSuccess(false)

        try {
            const supabase = createBrowserClient()
            
            const { data: currentProject } = await supabase
                .from("projects")
                .select("settings")
                .eq("id", projectId)
                .single() as any
            
            const currentSettings = currentProject?.settings || {}
            const updatedSettings = {
                ...currentSettings,
                features: {
                    ...(currentSettings.features || {}),
                    social_planner: featureEnabled,
                    social_planner_platforms: allowedPlatforms
                }
            }

            const { error } = await (supabase as any)
                .from("projects")
                .update({ settings: updatedSettings })
                .eq("id", projectId)

            if (error) throw error
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (err) {
            console.error("[AgencySocialPlanner] Save error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const togglePlatform = (id: string) => {
        setAllowedPlatforms(prev => 
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        )
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen">
            <AdminHeader 
                title="Tactical Social Planner" 
                subtitle={`${projectName} • Scheduling Architecture`}
            />

            <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
                {error && (
                    <div className="mb-8 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 mt-1 shrink-0" />
                        <div>
                            <h3 className="text-lg font-bold mb-1 tracking-tight">Access Protocol Error</h3>
                            <p className="text-sm opacity-80 leading-relaxed font-medium">{error}</p>
                            <Button variant="link" onClick={() => router.push("/admin/projects")} className="text-amber-400 p-0 h-auto mt-4 text-xs font-black uppercase tracking-widest">
                                Return to Portfolio
                            </Button>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <Link
                        href="/admin/projects"
                        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to Portfolio
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="md:col-span-2 space-y-6">
                        {/* Feature Toggle */}
                        <div className="p-8 rounded-3xl glass-panel border border-border relative overflow-hidden group">
                            <div className="flex items-start justify-between mb-6">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        Social Scheduling Hub
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Enable multi-platform post queuing and automated dispatch.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setFeatureEnabled(!featureEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                        featureEnabled ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-muted'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            featureEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border">
                                <div className="flex items-center gap-3 text-xs">
                                    <div className={`h-2 w-2 rounded-full ${featureEnabled ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                                    <span className={featureEnabled ? 'text-primary font-bold' : 'text-muted-foreground'}>
                                        {featureEnabled ? 'FEATURE ACTIVE: Client can now schedule posts' : 'FEATURE INACTIVE'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Activating this protocol grants the client access to the Social Planner dashboard, allowing them to queue content for automated publishing across their connected bridges.
                                </p>
                            </div>
                        </div>

                        {/* Platform Whitelist */}
                        {featureEnabled && (
                            <div className="p-8 rounded-3xl glass-panel border border-border space-y-8 animate-in fade-in slide-in-from-top-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                                        <Globe className="h-5 w-5" />
                                        Authorized Delivery Nodes
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Whitelist which platforms this portal is permitted to distribute content to.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {PLATFORM_OPTIONS.map((opt) => {
                                        const isSelected = allowedPlatforms.includes(opt.id);
                                        return (
                                            <div 
                                                key={opt.id}
                                                onClick={() => togglePlatform(opt.id)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-center ${
                                                    isSelected 
                                                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20 shadow-lg shadow-primary/5' 
                                                    : 'bg-muted/5 border-border hover:border-primary/20 hover:bg-muted/10'
                                                }`}
                                            >
                                                <div className={`p-3 rounded-2xl ${isSelected ? 'bg-primary/20 ' + opt.color : 'bg-muted text-muted-foreground'}`}>
                                                    <opt.icon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest">{opt.name}</h4>
                                                    {isSelected && <span className="text-[9px] text-primary font-bold">AUTHORIZED</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                    <Shield className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                                        Platforms selected here will appear as scheduling destinations in the Client Portal. Ensure the client has connected the corresponding External Bridges in their Connector settings.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Side Info */}
                    <div className="space-y-6">
                        <div className="p-6 rounded-3xl glass-panel border border-border">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                                <Zap className="h-3 w-3" />
                                Feature Dynamics
                            </h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Once enabled, the portal will gain access to a dedicated Social Planner interface. Scheduling logic is handled by the decentralized Edge Dispatcher.
                            </p>
                        </div>

                        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-3 flex items-center gap-2">
                                <Activity className="h-3 w-3" />
                                Operational Logs
                            </h4>
                            <p className="text-[11px] text-muted-foreground italic mb-4">
                                "This project currently has no active queues."
                            </p>
                            <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest rounded-xl border-border bg-transparent hover:bg-white/5 h-9">
                                View Dispatch History
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Save Footer */}
                <div className="sticky bottom-8 flex items-center gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all active:scale-95"
                    >
                        {isSaving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-3" /> Synchronizing...</>
                        ) : saveSuccess ? (
                            <><Check className="h-4 w-4 mr-3" /> Sequence Sealing</>
                        ) : (
                            <><Save className="h-4 w-4 mr-3" /> Save Changes</>
                        )}
                    </Button>

                    {saveSuccess && (
                        <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                            <CheckCircle2 className="h-3 w-3" />
                            Configuration Deployed Successfully
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
