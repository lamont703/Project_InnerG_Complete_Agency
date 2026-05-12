"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
    MessageSquare,
    Loader2,
    Save,
    Check,
    ArrowLeft,
    Shield,
    Users,
    Activity,
    Settings,
    AlertTriangle,
    Globe,
    BookOpen,
    Zap,
    CheckCircle2,
    Plus,
    Minus,
    Brain,
    Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { AdminHeader } from "@/features/agency/components/AdminHeader"
import { PersonaModal } from "@/features/community/components/PersonaModal"
import { toast } from "sonner"

export default function AgencyCommunityConfigPage() {
    const router = useRouter()
    const params = useParams()
    const slug = params.slug as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [projectName, setProjectName] = useState("")
    const [projectId, setProjectId] = useState<string | null>(null)
    const [featureEnabled, setFeatureEnabled] = useState(false)
    const [allowedInfrastructure, setAllowedInfrastructure] = useState<string[]>([])
    const [allowedPersonas, setAllowedPersonas] = useState<string[]>([])
    const [roster, setRoster] = useState<any[]>([])
    const [library, setLibrary] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false)
    const [editingPersona, setEditingPersona] = useState<any>(null)

    const INFRA_OPTIONS = [
        { 
            id: 'link', 
            name: 'Link Community Infrastructure', 
            desc: 'Establish an external bridge for AI personas.',
            icon: Globe
        },
        { 
            id: 'book_reader', 
            name: 'Book Reader App', 
            desc: 'Connect internal discussion threads.',
            icon: BookOpen
        },
        { 
            id: 'discord', 
            name: 'Discord Webhook', 
            desc: 'Reply to messages in specific channels.',
            icon: MessageSquare
        },
        { 
            id: 'slack', 
            name: 'Slack Internal', 
            desc: 'Monitor workspaces and key threads.',
            icon: Activity
        },
        { 
            id: 'telegram', 
            name: 'Telegram Bot', 
            desc: 'Broadcast and engage with groups.',
            icon: Zap
        },
        { 
            id: 'ghl', 
            name: 'GoHighLevel Community', 
            desc: 'Manage GHL community posts and member engagement.',
            icon: MessageSquare
        }
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
                setFeatureEnabled(settings.features?.community_agents ?? false)
                setAllowedInfrastructure(settings.features?.community_infrastructure_whitelist ?? [])
                setAllowedPersonas(settings.features?.community_persona_whitelist ?? [])

                // Fetch library agents (global templates)
                const { data: libraryAgents } = await supabase
                    .from("community_agents")
                    .select("*")
                    .is("project_id", null)

                setLibrary(libraryAgents || [])

                // Fetch current agent roster for this project
                const { data: agents } = await supabase
                    .from("community_agents")
                    .select("id, name, role, is_active, is_agency_template")
                    .eq("project_id", project.id)

                setRoster(agents || [])

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
                    community_agents: featureEnabled,
                    community_infrastructure_whitelist: allowedInfrastructure,
                    community_persona_whitelist: allowedPersonas
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
            console.error("[AgencyCommunityConfig] Save error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const toggleInfra = (id: string) => {
        setAllowedInfrastructure((prev: string[]) => 
            prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]
        )
    }

    const assignToProject = async (template: any) => {
        if (!projectId) return
        try {
            const supabase = createBrowserClient()
            const payload = {
                project_id: projectId,
                name: template.name,
                role: template.role,
                persona_prompt: template.persona_prompt,
                mood: template.mood,
                mission_objective: template.mission_objective,
                is_active: true,
                is_agency_template: true,
                active_platforms: template.active_platforms || ['book-reader'],
                platform_identities: {}
            }

            const { data: newAgent, error } = await (supabase as any)
                .from("community_agents")
                .insert(payload)
                .select()
                .single()

            if (error) throw error
            
            setRoster(prev => [...prev, newAgent])
            toast.success(`${template.name} assigned to project portfolio.`)
        } catch (err) {
            toast.error("Failed to assign library agent.")
        }
    }

    const deleteAgent = async (agentId: string) => {
        if (!confirm("Are you sure you want to unassign/delete this persona from the project? This cannot be undone.")) return
        try {
            const supabase = createBrowserClient()
            const { error } = await supabase
                .from("community_agents")
                .delete()
                .eq("id", agentId)
            
            if (error) throw error
            
            setRoster(prev => prev.filter(a => a.id !== agentId))
            setAllowedPersonas(prev => prev.filter(id => id !== agentId))
            toast.success("Persona unassigned from project.")
        } catch (err) {
            toast.error("Failed to unassign persona.")
        }
    }

    const toggleAgentStatus = async (agentId: string, currentStatus: boolean) => {
        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase as any)
                .from("community_agents")
                .update({ is_active: !currentStatus })
                .eq("id", agentId)

            if (error) throw error
            setRoster(prev => prev.map(a => a.id === agentId ? { ...a, is_active: !currentStatus } : a))
            toast.success(`Agent ${!currentStatus ? 'activated' : 'deactivated'}`)
        } catch (err) {
            toast.error("Failed to update agent status")
        }
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
                title="Community Engagement Architecture" 
                subtitle={`${projectName} • Feature Entitlements`}
            />

            <main className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full">
                {error && (
                    <div className="mb-8 p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 mt-1 shrink-0" />
                        <div>
                            <h3 className="text-lg font-bold mb-1 tracking-tight">System Access Protocol Error</h3>
                            <p className="text-sm opacity-80 leading-relaxed font-medium">{error}</p>
                            <Button 
                                variant="link" 
                                onClick={() => router.push("/admin/projects")}
                                className="text-amber-400 p-0 h-auto mt-4 text-xs font-black uppercase tracking-widest"
                            >
                                Re-initialize Neural Connection (Return back)
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
                        <div className="p-8 rounded-3xl glass-panel border border-border relative overflow-hidden group">
                            <div className="flex items-start justify-between mb-6">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Users className="h-5 w-5 text-emerald-400" />
                                        Community Agent Management
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Enable AI-driven community personas for this project.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setFeatureEnabled(!featureEnabled)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                        featureEnabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-muted'
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
                                    <div className={`h-2 w-2 rounded-full ${featureEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
                                    <span className={featureEnabled ? 'text-emerald-400 font-bold' : 'text-muted-foreground'}>
                                        {featureEnabled ? 'FEATURE ACTIVE: Client can now access the Community Hub' : 'FEATURE INACTIVE'}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Activating this feature grants the client access to the Persona Lab, Agent Roster, and Community Monitoring tools within their portal. 
                                    Ensure the appropriate database bridges are established before enabling.
                                </p>
                            </div>

                            {/* Decorative gradient */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-500" />
                        </div>

                        {/* Infrastructure Configuration */}
                        {featureEnabled && (
                            <div className="p-8 rounded-3xl glass-panel border border-border space-y-8 animate-in fade-in slide-in-from-top-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
                                        <Zap className="h-5 w-5" />
                                        Infrastructure Configuration
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Select which external bridges the client is permitted to establish.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {INFRA_OPTIONS.map((opt) => {
                                        const isSelected = allowedInfrastructure.includes(opt.id);
                                        return (
                                            <div 
                                                key={opt.id}
                                                onClick={() => toggleInfra(opt.id)}
                                                className={`p-4 rounded-2xl border transition-all cursor-pointer group/opt ${
                                                    isSelected 
                                                    ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20' 
                                                    : 'bg-muted/5 border-border hover:border-primary/20 hover:bg-muted/10'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className={`p-2 rounded-xl ${isSelected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground group-hover/opt:text-primary transition-colors'}`}>
                                                        <opt.icon className="h-5 w-5" />
                                                    </div>
                                                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                                                        isSelected ? 'bg-primary border-primary text-white' : 'border-border'
                                                    }`}>
                                                        {isSelected && <CheckCircle2 className="h-3 w-3" />}
                                                    </div>
                                                </div>
                                                <h4 className="text-sm font-bold tracking-tight mb-1">{opt.name}</h4>
                                                <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                    <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                                        Whitelisting these protocols ensures that client-side users only see relevant connection options in their Community Hub setup.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Persona Entitlements */}
                        {featureEnabled && (
                            <div className="p-8 rounded-3xl glass-panel border border-border space-y-8 animate-in fade-in slide-in-from-top-4">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
                                        <Shield className="h-5 w-5" />
                                        Persona Entitlements
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Authorize specific AI personas to be active in this portal's Community Hub.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Project Specific Roster</span>
                                        <Button 
                                            onClick={() => { setEditingPersona(null); setIsPersonaModalOpen(true); }}
                                            variant="ghost" 
                                            className="h-7 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5 px-3"
                                        >
                                            <Plus className="h-3 w-3 mr-2" />
                                            Provision New Persona
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {roster.length > 0 ? (
                                            roster.map((agent) => {
                                                const isSelected = allowedPersonas.includes(agent.id);
                                                return (
                                                    <div 
                                                        key={agent.id}
                                                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between group/persona ${
                                                            isSelected 
                                                            ? 'bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/20' 
                                                            : 'bg-muted/5 border-border hover:border-emerald-500/20 hover:bg-muted/10'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <div 
                                                                onClick={() => {
                                                                    setAllowedPersonas((prev: string[]) => 
                                                                        prev.includes(agent.id) ? prev.filter((p: string) => p !== agent.id) : [...prev, agent.id]
                                                                    )
                                                                }}
                                                                className={`h-10 w-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                                                                    isSelected ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-muted text-muted-foreground group-hover/persona:text-emerald-400 transition-colors'
                                                                }`}
                                                            >
                                                                {isSelected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className="text-sm font-bold tracking-tight">{agent.name}</h4>
                                                                    {agent.is_active ? (
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                                                                    ) : (
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                                                                    )}
                                                                    {agent.is_agency_template ? (
                                                                        <span className="ml-2 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[7px] font-black uppercase border border-emerald-500/20">Agency Logic</span>
                                                                    ) : (
                                                                        <span className="ml-2 px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[7px] font-black uppercase border border-indigo-500/20">Portal Native</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">{agent.role}</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 opacity-0 group-hover/persona:opacity-100 transition-opacity">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => { setEditingPersona(agent); setIsPersonaModalOpen(true); }}
                                                                className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400"
                                                            >
                                                                <Activity className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => toggleAgentStatus(agent.id, agent.is_active)}
                                                                className={`h-8 w-8 rounded-lg transition-all ${agent.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'text-muted-foreground hover:bg-muted'}`}
                                                            >
                                                                <Zap className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => deleteAgent(agent.id)}
                                                                className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-400"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-10 rounded-3xl border border-dashed border-border text-center">
                                                <p className="text-sm text-muted-foreground">No personas provisioned for this project yet.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Agency Template Library */}
                                    <div className="pt-8 space-y-4">
                                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Agency Intelligence Library</span>
                                            <span className="text-[9px] font-bold text-muted-foreground/40 italic">Available for Assignment</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 gap-2">
                                            {library.map(template => (
                                                <div key={template.id} className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between group/lib relative overflow-hidden">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover/lib:scale-110 transition-transform">
                                                            <Brain className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold tracking-tight">{template.name}</h4>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">{template.role}</p>
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        onClick={() => assignToProject(template)}
                                                        className="h-9 px-6 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                                    >
                                                        Assign to Project
                                                    </Button>
                                                    
                                                    {/* Decorative background text */}
                                                    <div className="absolute -right-4 -bottom-2 text-[40px] font-black text-primary/5 pointer-events-none select-none italic uppercase">
                                                        Template
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {library.length === 0 && (
                                                <div className="p-6 rounded-2xl border border-dashed border-border text-center">
                                                    <p className="text-xs text-muted-foreground italic opacity-50">Global Librarian: No templates registered.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                        Isolation Protocol: Only whitelisted personas will be loaded into the client's Persona Lab. This prevents unauthorized exposure of agency-wide intelligence modules.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3 flex items-center gap-2">
                                <Activity className="h-3 w-3" />
                                Portfolio Impact
                            </h4>
                            <ul className="space-y-3">
                                <li className="text-[11px] text-muted-foreground flex items-start gap-2">
                                    <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                                    Enables Persona Lab Sidebar Item
                                </li>
                                <li className="text-[11px] text-muted-foreground flex items-start gap-2">
                                    <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                                    Grants R/W access to community_agents
                                </li>
                                <li className="text-[11px] text-muted-foreground flex items-start gap-2">
                                    <Check className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                                    Activates Platform Bridge Workers
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Security Protocol
                            </h4>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Feature toggles are restricted to Super Admins. Modifications are logged to the Audit Archive for compliance.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-8 flex items-center gap-4">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-10 h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        {isSaving ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-3" /> Updating Protocol...</>
                        ) : saveSuccess ? (
                            <><Check className="h-4 w-4 mr-3" /> Sequence Updated</>
                        ) : (
                            <><Save className="h-4 w-4 mr-3" /> Deploy Feature Change</>
                        )}
                    </Button>

                    {saveSuccess && (
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                            <Settings className="h-3 w-3 animate-spin-slow" />
                            Client Registry Updated Successfully
                        </div>
                    )}
                </div>
            </main>

            <PersonaModal 
                isOpen={isPersonaModalOpen} 
                onClose={() => setIsPersonaModalOpen(false)} 
                projectId={projectId || ""}
                initialData={editingPersona || undefined}
                isAgencyMode={true}
                onSuccess={async () => {
                    if (!projectId) return
                    const supabase = createBrowserClient()
                    const { data: agents } = await supabase
                        .from("community_agents")
                        .select("id, name, role, is_active, is_agency_template")
                        .eq("project_id", projectId)
                    setRoster(agents || [])
                }}
            />
        </div>
    )
}
