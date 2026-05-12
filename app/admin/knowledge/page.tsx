"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    BookOpen,
    Plus,
    Search,
    Edit3,
    Trash2,
    X,
    Check,
    AlertTriangle,
    Loader2,
    Tag,
    Eye,
    EyeOff,
    ArrowLeft,
    Save
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"
import type { AgencyKnowledge } from "@/types"
import { AdminHeader } from "@/features/agency/components/AdminHeader"

// Available tags for the knowledge CMS
const AVAILABLE_TAGS = [
    "mission",
    "philosophy",
    "services",
    "ai-strategy",
    "blockchain",
    "methodology",
    "sops",
    "retail",
    "finance",
    "healthcare",
    "best-practices",
    "case-studies",
] as const

type KnowledgeTag = typeof AVAILABLE_TAGS[number]

const TAG_COLORS: Record<string, string> = {
    "mission": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    "philosophy": "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    "services": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "ai-strategy": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "blockchain": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "methodology": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "sops": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "retail": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    "finance": "bg-emerald-600/10 text-emerald-500 border-emerald-600/20",
    "healthcare": "bg-sky-500/10 text-sky-400 border-sky-500/20",
    "best-practices": "bg-teal-500/10 text-teal-400 border-teal-500/20",
    "case-studies": "bg-orange-500/10 text-orange-400 border-orange-500/20",
}

// ─────────────────────────────────────────────
// TAG BADGE COMPONENT
// ─────────────────────────────────────────────

function TagBadge({ tag, onRemove, clickable }: { tag: string; onRemove?: () => void; clickable?: boolean }) {
    const colorClasses = TAG_COLORS[tag] || "bg-muted/10 text-muted-foreground border-border"
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${colorClasses} ${clickable ? "cursor-pointer hover:opacity-80" : ""}`}>
            {tag}
            {onRemove && (
                <button onClick={onRemove} className="ml-0.5 hover:text-white transition-colors">
                    <X className="h-2.5 w-2.5" />
                </button>
            )}
        </span>
    )
}

// ─────────────────────────────────────────────
// KNOWLEDGE EDITOR FORM
// ─────────────────────────────────────────────

interface KnowledgeEditorProps {
    entry?: AgencyKnowledge
    onSave: (entry: Partial<AgencyKnowledge>) => Promise<void>
    onCancel: () => void
    isSaving: boolean
}

function KnowledgeEditor({ entry, onSave, onCancel, isSaving }: KnowledgeEditorProps) {
    const [title, setTitle] = useState(entry?.title || "")
    const [body, setBody] = useState(entry?.body || "")
    const [tags, setTags] = useState<string[]>(entry?.tags || [])
    const [isPublished, setIsPublished] = useState(entry?.is_published ?? true)
    const [customTagInput, setCustomTagInput] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !body.trim()) return
        await onSave({ title, body, tags, is_published: isPublished })
    }

    const toggleTag = (tag: string) => {
        setTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        )
    }

    const addCustomTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && customTagInput.trim()) {
            e.preventDefault()
            const tag = customTagInput.trim().toLowerCase()
            if (!tags.includes(tag)) {
                setTags(prev => [...prev, tag])
            }
            setCustomTagInput("")
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Title</label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Inner G Complete Growth Methodology"
                    className="bg-background border-border h-12 text-base"
                    required
                />
            </div>

            {/* Body */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Content</label>
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write the knowledge content here. Supports plain text and markdown formatting..."
                    className="w-full min-h-[300px] p-4 rounded-xl bg-background border border-border text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                    required
                />
            </div>

            {/* Tags */}
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Core Agency Tags <span className="text-muted-foreground/50 normal-case">(click to toggle)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_TAGS.map((tag) => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition-all ${tags.includes(tag)
                                    ? TAG_COLORS[tag]
                                    : "bg-muted/5 text-muted-foreground/50 border-border/50 hover:border-border"
                                    }`}
                            >
                                {tags.includes(tag) && <Check className="h-3 w-3" />}
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        Custom Tags & Applied Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {tags.filter(t => !AVAILABLE_TAGS.includes(t as any)).length === 0 && (
                            <p className="text-[10px] text-muted-foreground opacity-50 italic">No custom tags added yet.</p>
                        )}
                        {tags.filter(t => !AVAILABLE_TAGS.includes(t as any)).map(tag => (
                            <TagBadge
                                key={tag}
                                tag={tag}
                                onRemove={() => toggleTag(tag)}
                            />
                        ))}
                    </div>
                    <div className="relative max-w-xs">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            onKeyDown={addCustomTag}
                            placeholder="Add custom tag (Press Enter)..."
                            className="bg-muted/10 border-border pl-9 h-9 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setIsPublished(!isPublished)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${isPublished ? "bg-primary" : "bg-muted"}`}
                >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isPublished ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-sm text-foreground flex items-center gap-2">
                    {isPublished ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    {isPublished ? "Published — AI Agent can access this" : "Draft — Hidden from AI Agent"}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button
                    type="submit"
                    disabled={isSaving || !title.trim() || !body.trim()}
                    className="px-6"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {entry ? "Update Entry" : "Create Entry"}
                </Button>
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export default function KnowledgeCMSPage() {
    const router = useRouter()
    const [entries, setEntries] = useState<AgencyKnowledge[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [editingEntry, setEditingEntry] = useState<AgencyKnowledge | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    const supabase = createBrowserClient()

    // Auth check + load entries
    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push("/login")
                    return
                }

                const { data: profile } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single() as any

                if (!profile || profile.role !== "super_admin") {
                    router.push("/select-portal")
                    return
                }

                await fetchEntries()
            } catch (err) {
                console.error("[KnowledgeCMS] Error:", err)
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchEntries = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
            .from("agency_knowledge")
            .select("*")
            .order("updated_at", { ascending: false }) as any

        setEntries(data || [])
    }

    const handleCreate = async (entryData: Partial<AgencyKnowledge>) => {
        setIsSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from("agency_knowledge")
                .insert({
                    title: entryData.title,
                    body: entryData.body,
                    tags: entryData.tags || [],
                    is_published: entryData.is_published ?? true,
                    created_by: user.id
                })

            if (error) throw error

            await fetchEntries()
            setIsCreating(false)
        } catch (err) {
            console.error("[KnowledgeCMS] Create error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdate = async (entryData: Partial<AgencyKnowledge>) => {
        if (!editingEntry) return
        setIsSaving(true)
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from("agency_knowledge")
                .update({
                    title: entryData.title,
                    body: entryData.body,
                    tags: entryData.tags || [],
                    is_published: entryData.is_published,
                    updated_at: new Date().toISOString()
                })
                .eq("id", editingEntry.id)

            if (error) throw error

            await fetchEntries()
            setEditingEntry(null)
        } catch (err) {
            console.error("[KnowledgeCMS] Update error:", err)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from("agency_knowledge")
                .delete()
                .eq("id", id)

            if (error) throw error

            await fetchEntries()
            setDeleteConfirmId(null)
        } catch (err) {
            console.error("[KnowledgeCMS] Delete error:", err)
        }
    }

    // Filter entries
    const filteredEntries = entries.filter(entry => {
        const matchesSearch = !searchQuery ||
            entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.body.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTag = !selectedTag || entry.tags.includes(selectedTag)
        return matchesSearch && matchesTag
    })

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Show the editor form
    if (isCreating || editingEntry) {
        return (
            <>
                <AdminHeader 
                    title={editingEntry ? "Edit Knowledge Entry" : "New Knowledge Entry"} 
                    subtitle="Neural Indexing & Training Data"
                />

                <div className="flex-1 p-6 md:p-10 relative z-10 max-w-4xl mx-auto w-full">
                    {/* Header Actions */}
                    <div className="mb-8">
                        <button
                            onClick={() => { setIsCreating(false); setEditingEntry(null) }}
                            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-all uppercase tracking-widest group"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back to Knowledge Repository
                        </button>
                    </div>

                    {/* Editor */}
                    <div className="glass-panel-strong rounded-2xl p-6 md:p-8 border border-border">
                        <KnowledgeEditor
                            entry={editingEntry || undefined}
                            onSave={editingEntry ? handleUpdate : handleCreate}
                            onCancel={() => { setIsCreating(false); setEditingEntry(null) }}
                            isSaving={isSaving}
                        />
                    </div>
                </div>
            </>
        )
    }

    // Main list view
    return (
        <>
            <AdminHeader 
                title="Agency Knowledge Repository" 
                subtitle="Neuromorphic Training & Core Intelligence"
            />

            <div className="flex-1 p-6 md:p-10 relative z-10 max-w-6xl mx-auto w-full">
                {/* Header Actions */}
                <div className="flex items-start justify-between mb-10">
                    <div>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                            Teach the Agency Agent about Inner G's services, methodology, and best practices.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setIsCreating(true)} 
                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-3 rounded-xl h-12 px-6 shadow-xl shadow-primary/20"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Add Index Entry</span>
                    </Button>
                </div>

                {/* Search + Tag Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search knowledge entries..."
                            className="pl-10 bg-background border-border h-10"
                        />
                    </div>
                </div>

                {/* Tag Filter Row */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setSelectedTag(null)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition-all ${!selectedTag
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted/5 text-muted-foreground border-border/50 hover:border-border"
                            }`}
                    >
                        All ({entries.length})
                    </button>
                    {AVAILABLE_TAGS.map(tag => {
                        const count = entries.filter(e => e.tags.includes(tag)).length
                        if (count === 0) return null
                        return (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition-all ${selectedTag === tag
                                    ? TAG_COLORS[tag]
                                    : "bg-muted/5 text-muted-foreground border-border/50 hover:border-border"
                                    }`}
                            >
                                {tag} ({count})
                            </button>
                        )
                    })}
                </div>

                {/* Entries */}
                {filteredEntries.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-12 border border-border text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            {entries.length === 0 ? "No Knowledge Entries Yet" : "No Matching Entries"}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            {entries.length === 0
                                ? "Start building the Agency Agent's knowledge base by adding your first entry."
                                : "Try adjusting your search or tag filters."
                            }
                        </p>
                        {entries.length === 0 && (
                            <Button onClick={() => setIsCreating(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Create First Entry
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredEntries.map(entry => (
                            <div
                                key={entry.id}
                                className="glass-panel rounded-2xl p-6 border border-border hover:border-border transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-base font-bold text-foreground truncate">{entry.title}</h3>
                                            {!entry.is_published && (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted/10 text-muted-foreground border border-border">
                                                    Draft
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{entry.body}</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {entry.tags.map(tag => (
                                                <TagBadge key={tag} tag={tag} />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <button
                                            onClick={() => setEditingEntry(entry)}
                                            className="h-8 w-8 rounded-lg bg-muted/5 flex items-center justify-center hover:bg-muted/10 transition-colors"
                                        >
                                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                                        </button>
                                        {deleteConfirmId === entry.id ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDelete(entry.id)}
                                                    className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors"
                                                >
                                                    <Check className="h-3.5 w-3.5 text-red-400" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(null)}
                                                    className="h-8 w-8 rounded-lg bg-muted/5 flex items-center justify-center hover:bg-muted/10 transition-colors"
                                                >
                                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirmId(entry.id)}
                                                className="h-8 w-8 rounded-lg bg-muted/5 flex items-center justify-center hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
                                    <span>Updated {new Date(entry.updated_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>Created {new Date(entry.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
