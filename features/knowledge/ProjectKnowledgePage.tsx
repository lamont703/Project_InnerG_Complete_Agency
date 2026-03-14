"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    BookOpen,
    Plus,
    Search,
    Edit3,
    Trash2,
    X,
    Check,
    Loader2,
    Tag,
    Eye,
    EyeOff,
    ArrowLeft,
    Save,
    Brain
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"
import { DashboardHeader } from "@/components/dashboard/header"

// Project Knowledge Tag Colors
const TAG_COLORS: Record<string, string> = {
    "strategy": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "branding": "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    "market": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "technical": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "legal": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "operations": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "sop": "bg-amber-500/10 text-amber-400 border-amber-500/20",
}

function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
    const colorClasses = TAG_COLORS[tag] || "bg-muted/10 text-muted-foreground border-border"
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${colorClasses}`}>
            {tag}
            {onRemove && (
                <button onClick={onRemove} className="ml-0.5 hover:text-white transition-colors">
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </span>
    )
}

interface KnowledgeEntry {
    id: string
    project_id: string
    title: string
    body: string
    tags: string[]
    is_published: boolean
    created_at: string
    updated_at: string
}

export function ProjectKnowledgePage() {
    const params = useParams()
    const router = useRouter()
    const slug = (params?.slug as string) ?? "innergcomplete"

    const [userData, setUserData] = useState<{ name: string; role: string } | null>(null)
    const [projectName, setProjectName] = useState("")
    const [projectId, setProjectId] = useState<string | null>(null)
    const [entries, setEntries] = useState<KnowledgeEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // Form State
    const [formTitle, setFormTitle] = useState("")
    const [formBody, setFormBody] = useState("")
    const [formTags, setFormTags] = useState<string[]>([])
    const [formIsPublished, setFormIsPublished] = useState(true)
    const [tagInput, setTagInput] = useState("")

    const [currentTime, setCurrentTime] = useState(new Date())
    const [mounted, setMounted] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    const supabase = createBrowserClient()

    useEffect(() => {
        setMounted(true)
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push("/login")
                    return
                }

                // Fetch Profile
                const { data: profile } = await supabase
                    .from("users")
                    .select("full_name, role")
                    .eq("id", user.id)
                    .maybeSingle() as any

                setUserData({
                    name: profile?.full_name || user.user_metadata?.full_name || "User",
                    role: profile?.role?.replace("_", " ").toUpperCase() || "CLIENT"
                })

                // Fetch Project
                const { data: project } = await supabase
                    .from("projects")
                    .select("id, name")
                    .eq("slug", slug)
                    .maybeSingle() as any

                if (project) {
                    setProjectName(project.name)
                    setProjectId(project.id)
                    await fetchEntries(project.id)
                }

            } catch (err) {
                console.error("[ProjectKnowledge] Init error:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [slug])

    const fetchEntries = async (pid: string) => {
        const { data } = await (supabase as any)
            .from("project_knowledge")
            .select("*")
            .eq("project_id", pid)
            .order("updated_at", { ascending: false })

        setEntries(data || [])
    }

    const resetForm = () => {
        setFormTitle("")
        setFormBody("")
        setFormTags([])
        setFormIsPublished(true)
        setIsCreating(false)
        setEditingEntry(null)
    }

    const startEditing = (entry: KnowledgeEntry) => {
        setFormTitle(entry.title)
        setFormBody(entry.body)
        setFormTags(entry.tags)
        setFormIsPublished(entry.is_published)
        setEditingEntry(entry)
        setIsCreating(false)
    }

    const handleSave = async () => {
        if (!projectId || !formTitle.trim() || !formBody.trim()) return
        setIsSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const entryData = {
                project_id: projectId,
                title: formTitle,
                body: formBody,
                tags: formTags,
                is_published: formIsPublished,
                created_by: user.id
            }

            if (editingEntry) {
                const { error } = await (supabase as any)
                    .from("project_knowledge")
                    .update({
                        ...entryData,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", editingEntry.id)
                if (error) throw error
            } else {
                const { error } = await (supabase as any)
                    .from("project_knowledge")
                    .insert(entryData)
                if (error) throw error
            }

            await fetchEntries(projectId)
            resetForm()
        } catch (err) {
            console.error("[ProjectKnowledge] Save error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const { error } = await (supabase as any)
                .from("project_knowledge")
                .delete()
                .eq("id", id)
            if (error) throw error
            if (projectId) await fetchEntries(projectId)
            setDeleteConfirmId(null)
        } catch (err) {
            console.error("[ProjectKnowledge] Delete error:", err)
        }
    }

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault()
            const tag = tagInput.trim().toLowerCase()
            if (!formTags.includes(tag)) {
                setFormTags(prev => [...prev, tag])
            }
            setTagInput("")
        }
    }

    const filteredEntries = entries.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden relative">
            {/* Background ambient gradients */}
            <div className="absolute top-0 right-[10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[140px] opacity-20 animate-pulse pointer-events-none z-0" />
            <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] opacity-10 pointer-events-none z-0" />

            <DashboardHeader
                userName={userData?.name || "User"}
                userRole={userData?.role || "CLIENT"}
                currentTime={currentTime}
                mounted={mounted}
                onMenuOpen={() => setIsSidebarOpen(true)}
                projectName={projectName}
            />

            <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 w-full custom-scrollbar">
                <div className="max-w-6xl mx-auto w-full pb-20">
                    
                    {(isCreating || editingEntry) ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="mb-8 flex items-center justify-between">
                                <button
                                    onClick={resetForm}
                                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group"
                                >
                                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                    Back to Repository
                                </button>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setFormIsPublished(!formIsPublished)}
                                            className={`relative h-6 w-11 rounded-full transition-colors ${formIsPublished ? "bg-primary" : "bg-muted"}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${formIsPublished ? "translate-x-5" : ""}`} />
                                        </button>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                            {formIsPublished ? "AI Searchable" : "Draft Mode"}
                                        </span>
                                    </div>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={isSaving || !formTitle.trim() || !formBody.trim()}
                                        className="h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest"
                                    >
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                        Save Knowledge
                                    </Button>
                                </div>
                            </div>

                            <div className="glass-panel-strong rounded-3xl p-8 border border-border">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Context Title</label>
                                        <Input
                                            value={formTitle}
                                            onChange={(e) => setFormTitle(e.target.value)}
                                            placeholder="e.g., Q1 Marketing Strategy Overlays"
                                            className="bg-background/50 border-border h-14 text-lg font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Intelligence Body</label>
                                        <textarea
                                            value={formBody}
                                            onChange={(e) => setFormBody(e.target.value)}
                                            placeholder="Paste SOPs, meeting notes, or strategic context for the AI agent..."
                                            className="w-full min-h-[400px] p-6 rounded-2xl bg-background/50 border border-border text-sm leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">Focus Tags</label>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {formTags.map(tag => (
                                                <TagBadge key={tag} tag={tag} onRemove={() => setFormTags(prev => prev.filter(t => t !== tag))} />
                                            ))}
                                        </div>
                                        <div className="relative max-w-sm">
                                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={addTag}
                                                placeholder="Add tag and press Enter..."
                                                className="bg-background/50 border-border pl-11 h-11 text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-700">
                            {/* Header Section */}
                            <div className="mb-12">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                                    <div>
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                                            Project <span className="text-primary font-light italic">& Intelligence Base</span>
                                        </h1>
                                        <p className="text-muted-foreground text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
                                            The Neural CMS for your project. Upload SOPs, strategy docs, and branding guidelines to train your dedicated AI agent on your specific business logic.
                                        </p>
                                    </div>
                                    <Button 
                                        onClick={() => setIsCreating(true)} 
                                        className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20"
                                    >
                                        <Plus className="h-5 w-5 mr-2" />
                                        Initialize New Context
                                    </Button>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="relative mb-10 max-w-xl">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search the neural repository..."
                                    className="pl-12 bg-card/30 border-border h-12 rounded-xl text-sm"
                                />
                            </div>

                            {/* Grid View */}
                            {filteredEntries.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4">
                                    {filteredEntries.map(entry => (
                                        <div
                                            key={entry.id}
                                            className="group glass-panel rounded-3xl p-6 border border-border hover:border-primary/30 transition-all duration-500 relative"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className={`h-2 w-2 rounded-full ${entry.is_published ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500'}`} />
                                                        <h3 className="text-lg font-bold text-foreground truncate group-hover:text-primary transition-colors">{entry.title}</h3>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-4">{entry.body}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {entry.tags.map(tag => (
                                                            <TagBadge key={tag} tag={tag} />
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => startEditing(entry)}
                                                        className="h-10 w-10 rounded-xl bg-muted/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    {deleteConfirmId === entry.id ? (
                                                        <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                                                            <button
                                                                onClick={() => handleDelete(entry.id)}
                                                                className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirmId(null)}
                                                                className="h-10 w-10 rounded-xl bg-muted/5 flex items-center justify-center hover:bg-muted/10 transition-all"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDeleteConfirmId(entry.id)}
                                                            className="h-10 w-10 rounded-xl bg-muted/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                                <div className="flex items-center gap-4">
                                                    <span>Last Indexed: {new Date(entry.updated_at).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>Status: {entry.is_published ? 'AI Integrated' : 'Staging'}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-primary opacity-20">
                                                    <Brain className="h-3 w-3" />
                                                    <span>Neural Slot {entry.id.substring(0, 4)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-32 flex flex-col items-center justify-center bg-muted/5 rounded-[40px] border border-dashed border-border">
                                    <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mb-6 border border-primary/10">
                                        <BookOpen className="h-8 w-8 text-primary/40" />
                                    </div>
                                    <h3 className="font-bold text-xl text-foreground">Neural Repository Empty</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-xs text-center leading-relaxed">
                                        Your project agent is currently operating on base primitives. Upload specific knowledge to activate advanced context.
                                    </p>
                                    <Button onClick={() => setIsCreating(true)} variant="outline" className="mt-8 rounded-xl px-10 border-primary/20 hover:border-primary/40">
                                        Add First Knowledge Pack
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
