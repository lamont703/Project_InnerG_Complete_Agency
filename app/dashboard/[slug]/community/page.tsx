"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
    Users, 
    MessageSquare, 
    Zap, 
    Loader2, 
    Plus, 
    Info, 
    Activity,
    Brain,
    Bot,
    Edit2,
    CheckCircle2,
    XCircle,
    Plug,
    Link as LinkIcon,
    Shield,
    Target,
    BookOpen,
    Globe,
    Trash2,
    Sparkles,
    Terminal,
    Radio
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"
import { PersonaModal } from "@/features/community/components/PersonaModal"
import { ChannelModal } from "@/features/community/components/ChannelModal"

import { DeploymentModal } from "@/features/community/components/DeploymentModal"
import { EmojiForgeModal } from "@/features/community/components/EmojiForgeModal"
import { BroadcastModal } from "@/features/community/components/BroadcastModal"

interface CommunityAgent {
    id: string
    name: string
    role: string
    avatar_url: string | null
    is_active: boolean
    last_active_at: string | null
    persona_prompt: string
    mood: string
    mission_objective?: string
}

interface CommunityChannel {
    id: string
    name: string
    platform: string
    is_active: boolean
    created_at: string
}

interface CommunityDeployment {
    id: string
    agent_id: string
    channel_id: string
    is_active: boolean
    agent: { name: string, role: string }
    channel: { name: string, platform: string }
}

interface CommunityInteraction {
    id: string
    agent_id: string
    agent: { name: string, role: string, avatar_url: string | null }
    channel_id: string | null
    channel?: { name: string, platform: string } | null
    platform: string
    content: string
    message_type: string
    created_at: string
}

export default function CommunityHubPage() {
    const params = useParams()
    const router = useRouter()
    const slug = params.slug as string
    
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("roster")
    const [projectId, setProjectId] = useState<string | null>(null)
    
    const [agents, setAgents] = useState<CommunityAgent[]>([])
    const [channels, setChannels] = useState<CommunityChannel[]>([])
    const [deployments, setDeployments] = useState<CommunityDeployment[]>([])
    
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false)
    const [isChannelModalOpen, setIsChannelModalOpen] = useState(false)
    const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false)
    const [editingPersona, setEditingPersona] = useState<CommunityAgent | null>(null)
    const [editingChannel, setEditingChannel] = useState<CommunityChannel | null>(null)
    const [isEmojiForgeOpen, setIsEmojiForgeOpen] = useState(false)
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false)
    const [interactions, setInteractions] = useState<CommunityInteraction[]>([])
    const [isFetchingInteractions, setIsFetchingInteractions] = useState(false)

    const load = async () => {
        try {
            const supabase = createBrowserClient()
            
            // 1. Get project ID and feature flag
            const { data: project } = await supabase
                .from("projects")
                .select("id, settings")
                .eq("slug", slug)
                .single() as any
            
            if (!project) return
            setProjectId(project.id)

            // 2. Verify entitlement
            const isEnabled = project.settings?.features?.community_agents ?? false
            if (!isEnabled) {
                router.push(`/dashboard/${slug}`)
                return
            }

            // 3. Fetch agents, channels, & deployments in parallel
            const [agentRes, channelRes, deploymentRes] = await Promise.all([
                supabase
                    .from("community_agents")
                    .select("*")
                    .eq("project_id", project.id)
                    .order("created_at", { ascending: true }),
                supabase
                    .from("community_channels")
                    .select("*")
                    .eq("project_id", project.id)
                    .order("created_at", { ascending: true }),
                supabase
                    .from("community_agent_deployments")
                    .select("*, agent:agent_id(name, role), channel:channel_id(name, platform)")
                    .order("created_at", { ascending: true })
            ]) as any

            if (agentRes.data) {
                const whitelist = project.settings?.features?.community_persona_whitelist || [];
                
                // Isolation Protocol: Agency-provided agents must be whitelisted.
                // Portal-generated agents (is_agency_template = false) are always available to the creator project.
                const filteredAgents = whitelist.length > 0 
                    ? agentRes.data.filter((a: any) => !a.is_agency_template || whitelist.includes(a.id))
                    : agentRes.data;
                
                setAgents(filteredAgents);
                
                if (deploymentRes.data) {
                    // Filter deployments to only those belonging to the filtered agents
                    const filteredDeployments = deploymentRes.data.filter((d: any) => 
                        filteredAgents.some((a: any) => a.id === d.agent_id)
                    );
                    setDeployments(filteredDeployments);
                }
            }
            if (channelRes.data) setChannels(channelRes.data)

        } catch (err) {
            console.error("[CommunityHub] Load error:", err)
        } finally {
            setIsLoading(false)
        }
    }

    const fetchInteractions = async () => {
        if (!projectId) return
        setIsFetchingInteractions(true)
        try {
            const supabase = createBrowserClient()
            const { data, error } = await supabase
                .from("community_agent_interactions")
                .select("*, agent:agent_id(name, role, avatar_url), channel:channel_id(name, platform)")
                .eq("project_id", projectId)
                .order("created_at", { ascending: false })
                .limit(50) as any

            if (error) throw error
            setInteractions(data || [])
        } catch (err) {
            console.error("[CommunityHub] Fetch interactions error:", err)
        } finally {
            setIsFetchingInteractions(false)
        }
    }

    useEffect(() => {
        load()
    }, [slug])

    useEffect(() => {
        if (activeTab === 'monitor' && projectId) {
            fetchInteractions()
        }
    }, [activeTab, projectId])

    const toggleAgentStatus = async (id: string, currentStatus: boolean) => {
        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase as any)
                .from("community_agents")
                .update({ is_active: !currentStatus })
                .eq("id", id)

            if (error) throw error
            setAgents(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a))
            toast.success(`Agent ${!currentStatus ? 'activated' : 'deactivated'}`)
        } catch (err) {
            toast.error("Failed to update agent status")
        }
    }

    const deletePersona = async (id: string) => {
        if (!confirm("Caution: Deleting this persona will dismantle all active bridge links for this agent. Proceed?")) return

        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase as any)
                .from("community_agents")
                .delete()
                .eq("id", id)

            if (error) throw error
            
            setAgents(prev => prev.filter(a => a.id !== id))
            setDeployments(prev => prev.filter(d => d.agent_id !== id))
            toast.success("Persona node decommissioned and data purged.")
        } catch (err) {
            console.error("[CommunityHub] Delete error:", err)
            toast.error("Failed to decommission persona node.")
        }
    }

    const decommissionLink = async (id: string) => {
        try {
            const supabase = createBrowserClient()
            const { error } = await (supabase as any)
                .from("community_agent_deployments")
                .delete()
                .eq("id", id)

            if (error) throw error
            setDeployments(prev => prev.filter(d => d.id !== id))
            toast.success("Neural link decommissioned successfully")
        } catch (err) {
            console.error("[CommunityHub] Decommission error:", err)
            toast.error("Failed to dissolve bridge connection")
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const tabs = [
        { id: 'roster', label: 'Tactical Roster', icon: Users },
        { id: 'channels', label: 'Operation Channels', icon: Plug },
        { id: 'deployments', label: 'Deployment Matrix', icon: LinkIcon },
        { id: 'emoji', label: 'Emoji Forge', icon: Sparkles },
        { id: 'monitor', label: 'Interaction Monitor', icon: Activity },
    ]

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background overflow-hidden relative">
            <header className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                            Community <span className="text-primary font-light italic">Intelligence Hub</span>
                        </h1>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60 italic">Managed Autonomous Social Engagement (MASE)</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                    {tabs.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all h-10 border shrink-0 ${
                                activeTab === t.id 
                                ? 'bg-primary/10 border-primary/20 text-primary shadow-lg shadow-primary/5' 
                                : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/30'
                            }`}
                        >
                            <t.icon className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">{t.label}</span>
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                <div className="max-w-7xl mx-auto w-full pb-20">
                    
                    {/* TACTICAL ROSTER TAB */}
                    {activeTab === 'roster' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <Bot className="h-3 w-3" />
                                    Active Persona Nodes
                                </h2>
                                <Button 
                                    onClick={() => { setEditingPersona(null); setIsPersonaModalOpen(true); }}
                                    className="rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest text-[9px] h-9 bg-primary text-primary-foreground"
                                >
                                    <Plus className="h-3 w-3" />
                                    Provision Persona
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {agents.map(agent => (
                                    <div 
                                        key={agent.id}
                                        className={`p-6 rounded-3xl border transition-all relative overflow-hidden group ${
                                            agent.is_active ? 'glass-panel hover:border-primary/40' : 'bg-muted/5 opacity-60 border-border/50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center relative border ${
                                                    agent.is_active ? 'bg-primary/10 border-primary/20 text-primary shadow-lg shadow-primary/10' : 'bg-muted border-border'
                                                }`}>
                                                    <Brain className="h-6 w-6" />
                                                    {agent.is_active && <div className="absolute -top-1 -right-1 h-3 w-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold tracking-tight">{agent.name}</h3>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-primary/70">{agent.role}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => { setEditingPersona(agent); setIsPersonaModalOpen(true); }}
                                                    className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => deletePersona(agent.id)}
                                                    className="h-8 w-8 rounded-lg hover:bg-red-500/10 hover:text-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    onClick={() => toggleAgentStatus(agent.id, agent.is_active)}
                                                    className={`h-8 w-8 rounded-lg ${agent.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'}`}
                                                >
                                                    {agent.is_active ? <CheckCircle2 className="h-4 w-4 shadow-emerald-500/10" /> : <XCircle className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8 mb-4">
                                            {agent.persona_prompt}
                                        </p>

                                        {agent.mission_objective && (
                                            <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-primary block mb-1">Strategic Objective</span>
                                                <p className="text-[10px] text-foreground leading-tight italic">"{agent.mission_objective}"</p>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                                <Activity className="h-3 w-3" />
                                                {agent.last_active_at ? `Live: ${new Date(agent.last_active_at).toLocaleTimeString()}` : 'Neural Offline'}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">{agent.mood}</span>
                                        </div>
                                    </div>
                                ))}

                                {agents.length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-muted/5 text-center">
                                        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 text-primary opacity-20">
                                            <Bot className="h-8 w-8" />
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground uppercase tracking-tight">No Neural Activity</h4>
                                        <p className="text-xs text-muted-foreground max-w-[200px] mt-2 mb-6 opacity-60 italic">Your first agent persona will be the foundation of your autonomous growth engine.</p>
                                        <Button 
                                            onClick={() => { setEditingPersona(null); setIsPersonaModalOpen(true); }}
                                            variant="outline" className="h-10 rounded-xl px-8 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            Initiate Neural Protocol
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* OPERATION CHANNELS TAB */}
                    {activeTab === 'channels' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="flex items-center justify-between">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <Plug className="h-3 w-3" />
                                    Platform Ingress Points
                                </h2>
                                <Button 
                                    onClick={() => { setEditingChannel(null); setIsChannelModalOpen(true); }}
                                    className="rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest text-[9px] h-9 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 px-6"
                                >
                                    <Plus className="h-3 w-3" />
                                    Establish Bridge
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {channels.map(channel => (
                                    <div key={channel.id} className="p-5 rounded-3xl glass-panel border border-border group hover:border-emerald-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                                channel.platform === 'book_reader' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                channel.platform === 'discord' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                                'bg-primary/10 text-primary border border-primary/20'
                                            }`}>
                                                {channel.platform === 'book_reader' ? <BookOpen className="h-5 w-5" /> : 
                                                 channel.platform === 'discord' ? <MessageSquare className="h-5 w-5" /> : 
                                                 <Globe className="h-5 w-5" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-xs font-bold truncate tracking-tight">{channel.name}</h3>
                                                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground opacity-60 italic">{channel.platform}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                                                <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest italic">Live Sink</span>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingChannel(channel);
                                                    setIsChannelModalOpen(true);
                                                }}
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {channels.length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-muted/5">
                                        <Plug className="h-8 w-8 text-muted-foreground/30 mb-4" />
                                        <p className="text-xs text-muted-foreground font-medium italic">No bridges established. Link a community to synchronize.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* DEPLOYMENT MATRIX TAB */}
                    {activeTab === 'deployments' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                    <LinkIcon className="h-3 w-3" />
                                    Persona Deployment Matrix
                                </h2>
                                <Button 
                                    onClick={() => setIsDeploymentModalOpen(true)}
                                    className="rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest text-[9px] h-9 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                >
                                    <Zap className="h-3 w-3" />
                                    Initiate Deployment
                                </Button>
                            </div>

                            {deployments.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {deployments.map(d => (
                                        <div key={d.id} className="p-6 rounded-3xl glass-panel border border-primary/20 relative group">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                                                    Active Neural Link
                                                </div>
                                                <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest opacity-40 italic">ID: {d.id.slice(0,8)}</span>
                                            </div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                                        <Bot className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase mt-1 tracking-tight">{d.agent?.name}</span>
                                                </div>
                                                <div className="flex-1 h-px bg-border relative">
                                                    <Zap className="h-3 w-3 text-amber-500 absolute -top-1.5 left-1/2 -translate-x-1/2" />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                                                        {d.channel?.platform === 'book_reader' ? <BookOpen className="h-5 w-5" /> : 
                                                         d.channel?.platform === 'discord' ? <MessageSquare className="h-5 w-5" /> :
                                                         d.channel?.platform === 'slack' ? <Zap className="h-5 w-5" /> :
                                                         <Globe className="h-5 w-5" />}
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase mt-1 tracking-tight truncate max-w-[80px]">{d.channel?.name}</span>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-muted-foreground text-center italic mb-4">
                                                Persona <span className="text-foreground font-bold">{d.agent?.role}</span> is monitoring <span className="text-foreground font-bold">{d.channel?.platform}</span> threads.
                                            </p>

                                            <Button 
                                                variant="ghost" 
                                                onClick={() => decommissionLink(d.id)}
                                                className="w-full rounded-xl h-10 border border-border/50 text-[9px] font-black uppercase tracking-widest hover:text-red-400 hover:bg-red-400/10"
                                            >
                                                Decommission Link
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 rounded-3xl glass-panel border border-border border-dashed flex flex-col items-center text-center">
                                    <LinkIcon className="h-12 w-12 text-primary opacity-20 mb-6" />
                                    <h3 className="text-lg font-bold mb-2 uppercase tracking-tight italic">Synchronization Matrix Offline</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mb-8 leading-relaxed">
                                        You have {agents.length} personas and {channels.length} channels ready for deployment. Link them here to establish full operational autonomy.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                                        <div className="p-4 rounded-2xl bg-muted/5 border border-border flex flex-col items-center">
                                            <Bot className="h-6 w-6 text-primary mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">{agents.length} Personas Ready</span>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-muted/5 border border-border flex flex-col items-center">
                                            <Plug className="h-6 w-6 text-emerald-400 mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">{channels.length} Channels Ready</span>
                                        </div>
                                    </div>
                                    <Button 
                                        onClick={() => setIsDeploymentModalOpen(true)}
                                        className="mt-10 rounded-2xl h-14 px-10 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                                    >
                                        Initiate Cross-Protocol Deploy
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* INTERACTION MONITOR TAB */}
                    {activeTab === 'monitor' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                        <Activity className="h-3 w-3" />
                                        Live Interaction Audit Log
                                    </h2>
                                    <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 w-fit">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Live Bridge Synchronized
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => setIsBroadcastModalOpen(true)}
                                    disabled={deployments.length === 0}
                                    className="rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest text-[9px] h-10 bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/20 px-6"
                                >
                                    <Radio className="h-4 w-4" />
                                    New Broadcast
                                </Button>
                            </div>

                            <div className="rounded-3xl border border-border glass-panel overflow-hidden">
                                {isFetchingInteractions ? (
                                    <div className="p-20 flex flex-col items-center justify-center text-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20 mb-4" />
                                        <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Polling neural bridge...</p>
                                    </div>
                                ) : interactions.length > 0 ? (
                                    <div className="divide-y divide-border/50">
                                        {interactions.map(interaction => (
                                            <div key={interaction.id} className="p-6 hover:bg-primary/5 transition-all duration-300 group">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-border shrink-0 group-hover:border-primary/30 transition-colors overflow-hidden">
                                                        {interaction.agent?.avatar_url ? (
                                                            <img src={interaction.agent.avatar_url} alt={interaction.agent.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Brain className="h-5 w-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-bold tracking-tight">{interaction.agent?.name || "Unknown Agent"}</span>
                                                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest italic ${
                                                                    interaction.message_type === 'broadcast' ? 'bg-orange-500/10 text-orange-500' : 'bg-primary/10 text-primary'
                                                                }`}>
                                                                    {interaction.message_type} • {interaction.channel?.name || interaction.platform}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground/60 font-medium">
                                                                {new Date(interaction.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className={`text-xs leading-relaxed pr-12 ${interaction.message_type === 'broadcast' ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                                                            "{interaction.content}"
                                                        </p>
                                                        <div className="flex items-center gap-4 mt-4">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500/80">
                                                                <Shield className="h-3 w-3" />
                                                                Verified Session
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-400">
                                                                <Target className="h-3 w-3" />
                                                                Platform: {interaction.channel?.platform || interaction.platform}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-20 flex flex-col items-center justify-center border border-dashed border-border rounded-3xl bg-muted/5 text-center">
                                        <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4 text-primary opacity-20">
                                            <Activity className="h-8 w-8" />
                                        </div>
                                        <h4 className="text-sm font-bold text-foreground uppercase tracking-tight">Intelligence Log Empty</h4>
                                        <p className="text-xs text-muted-foreground max-w-[200px] mt-2 mb-6 opacity-60 italic">
                                            No community interactions detected yet. Active deployments will appear here once throughput begins.
                                        </p>
                                    </div>
                                )}
                                
                                {interactions.length > 0 && (
                                    <div className="p-6 bg-muted/20 border-t border-border flex justify-center">
                                        <Button 
                                            onClick={fetchInteractions}
                                            variant="ghost" 
                                            className="text-[10px] font-black uppercase tracking-widest h-10 px-8 hover:bg-primary/5 text-primary"
                                        >
                                            Refresh Live Audit Log
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* EMOJI FORGE TAB */}
                    {activeTab === "emoji" && (
                        <div className="p-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
                            <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 overflow-hidden">
                                <div className="p-8">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                                                <Sparkles className="h-6 w-6 text-indigo-400" />
                                            </div>
                                            <h2 className="text-xl font-black uppercase tracking-tight">Neural Emoji Forge</h2>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 opacity-60 italic">
                                                Deploy branded emojis to any connected Discord server.
                                            </p>
                                        </div>
                                        <Button
                                            onClick={() => setIsEmojiForgeOpen(true)}
                                            disabled={channels.filter(c => c.platform === 'discord').length === 0}
                                            className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-500/20"
                                        >
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Open Forge
                                        </Button>
                                    </div>

                                    {channels.filter(c => c.platform === 'discord').length === 0 ? (
                                        <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
                                            <p className="text-sm font-bold italic">No Discord bridges active.</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">Establish a Neural Bridge first from the Operation Channels tab.</p>
                                        </div>
                                    ) : (
                                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                            {["innerg_fire","innerg_sync","innerg_check","innerg_neural","innerg_rocket"].map((name, i) => (
                                                <div key={name} className="aspect-square rounded-2xl bg-background border border-border flex items-center justify-center overflow-hidden group hover:border-indigo-500/40 transition-all">
                                                    <img
                                                        src={`/emojis/${name}.png`}
                                                        alt={name}
                                                        className="w-16 h-16 object-contain group-hover:scale-110 transition-transform"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Slash Command Registration */}
                                    {channels.filter(c => c.platform === 'discord').length > 0 && (
                                        <div className="mt-8 pt-8 border-t border-indigo-500/10">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                                <Terminal className="h-3 w-3" />
                                                Slash Command Registration
                                            </h3>
                                            <div className="grid gap-3">
                                                {channels.filter(c => c.platform === 'discord').map((ch: any) => (
                                                    <div key={ch.id} className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border">
                                                        <div>
                                                            <p className="text-[11px] font-black uppercase">{ch.name}</p>
                                                            <p className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                                                                {ch.config?.commands_registered
                                                                    ? `✅ /ask · /audit · /agent registered`
                                                                    : "Commands not yet registered"}
                                                            </p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            disabled={ch.config?.commands_registered}
                                                            onClick={async () => {
                                                                const { createBrowserClient: cbc } = await import("@/lib/supabase/browser")
                                                                const sb = cbc()
                                                                const { error } = await (sb.functions.invoke as any)("register-discord-commands", {
                                                                    body: { channel_id: ch.id }
                                                                })
                                                                if (error) { toast.error("Command registration failed"); return }
                                                                toast.success(`/ask, /audit, /agent registered on ${ch.name}!`)
                                                                load()
                                                            }}
                                                            className="h-9 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-violet-600 hover:bg-violet-500 text-white"
                                                        >
                                                            {ch.config?.commands_registered ? "Registered" : "Register Now"}
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* MODALS */}
            <PersonaModal 
                isOpen={isPersonaModalOpen} 
                onClose={() => setIsPersonaModalOpen(false)} 
                projectId={projectId || ""}
                initialData={editingPersona}
                onSuccess={load}
            />
            <ChannelModal 
                isOpen={isChannelModalOpen} 
                onClose={() => setIsChannelModalOpen(false)} 
                projectId={projectId || ""}
                initialData={editingChannel as any}
                onSuccess={load}
            />
            <DeploymentModal
                isOpen={isDeploymentModalOpen}
                onClose={() => setIsDeploymentModalOpen(false)}
                agents={agents}
                channels={channels}
                onSuccess={load}
            />
            <EmojiForgeModal
                isOpen={isEmojiForgeOpen}
                onClose={() => setIsEmojiForgeOpen(false)}
                discordChannels={(channels as any[]).filter(c => c.platform === 'discord')}
            />
            <BroadcastModal
                isOpen={isBroadcastModalOpen}
                onClose={() => setIsBroadcastModalOpen(false)}
                agents={agents}
                deployments={deployments}
                projectId={projectId || ""}
                onSuccess={fetchInteractions}
            />

        </div>
    )
}
