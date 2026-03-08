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

// Available tags for the knowledge CMS
const AVAILABLE_TAGS = [
    "services",
    "methodology",
    "sops",
    "best-practices",
    "strategy-templates",
    "client-onboarding",
    "pricing",
    "case-studies",
] as const

type KnowledgeTag = typeof AVAILABLE_TAGS[number]

const TAG_COLORS: Record<string, string> = {
    "services": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "methodology": "bg-violet-500/10 text-violet-400 border-violet-500/20",
    "sops": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "best-practices": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "strategy-templates": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    "client-onboarding": "bg-pink-500/10 text-pink-400 border-pink-500/20",
    "pricing": "bg-orange-500/10 text-orange-400 border-orange-500/20",
    "case-studies": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
}

// ─────────────────────────────────────────────
// TAG BADGE COMPONENT
// ─────────────────────────────────────────────

function TagBadge({ tag, onRemove, clickable }: { tag: string; onRemove?: () => void; clickable?: boolean }) {
    const colorClasses = TAG_COLORS[tag] || "bg-white/5 text-muted-foreground border-white/10"
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

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Title</label>
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Inner G Complete Growth Methodology"
                    className="bg-background/50 border-white/10 h-12 text-base"
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
                    className="w-full min-h-[300px] p-4 rounded-xl bg-background/50 border border-white/10 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                    required
                />
            </div>

            {/* Tags */}
            <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Tags <span className="text-muted-foreground/50 normal-case">(click to toggle)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition-all ${tags.includes(tag)
                                ? TAG_COLORS[tag]
                                : "bg-white/[0.02] text-muted-foreground/50 border-white/5 hover:border-white/10"
                                }`}
                        >
                            {tags.includes(tag) && <Check className="h-3 w-3" />}
                            {tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* Published Toggle */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setIsPublished(!isPublished)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${isPublished ? "bg-primary" : "bg-white/10"}`}
                >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${isPublished ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-sm text-foreground flex items-center gap-2">
                    {isPublished ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    {isPublished ? "Published — AI Agent can access this" : "Draft — Hidden from AI Agent"}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
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
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Show the editor form
    if (isCreating || editingEntry) {
        return (
            <div className="min-h-screen bg-[#020617] p-4 md:p-8">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => { setIsCreating(false); setEditingEntry(null) }}
                            className="h-10 w-10 rounded-lg glass-panel flex items-center justify-center hover:bg-white/5 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-foreground">
                                {editingEntry ? "Edit Knowledge Entry" : "New Knowledge Entry"}
                            </h1>
                            <p className="text-xs text-muted-foreground mt-1">
                                This content will be indexed by the Agency AI Agent.
                            </p>
                        </div>
                    </div>

                    {/* Editor */}
                    <div className="glass-panel rounded-2xl p-6 md:p-8 border border-white/5">
                        <KnowledgeEditor
                            entry={editingEntry || undefined}
                            onSave={editingEntry ? handleUpdate : handleCreate}
                            onCancel={() => { setIsCreating(false); setEditingEntry(null) }}
                            isSaving={isSaving}
                        />
                    </div>
                </div>
            </div>
        )
    }

    // Main list view
    return (
        <div className="min-h-screen bg-[#020617] p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard/innergcomplete"
                            className="h-10 w-10 rounded-lg glass-panel flex items-center justify-center hover:bg-white/5 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                                <BookOpen className="h-6 w-6 text-primary" />
                                Agency Knowledge
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Teach the Agency Agent about Inner G's services, methodology, and best practices.
                            </p>
                        </div>
                    </div>
                    <Button onClick={() => setIsCreating(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Entry
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
                            className="pl-10 bg-background/50 border-white/10 h-10"
                        />
                    </div>
                </div>

                {/* Tag Filter Row */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setSelectedTag(null)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border transition-all ${!selectedTag
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-white/[0.02] text-muted-foreground border-white/5 hover:border-white/10"
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
                                    : "bg-white/[0.02] text-muted-foreground border-white/5 hover:border-white/10"
                                    }`}
                            >
                                {tag} ({count})
                            </button>
                        )
                    })}
                </div>

                {/* Entries */}
                {filteredEntries.length === 0 ? (
                    <div className="glass-panel rounded-2xl p-12 border border-white/5 text-center">
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
                                className="glass-panel rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="text-base font-bold text-foreground truncate">{entry.title}</h3>
                                            {!entry.is_published && (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
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
                                            className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
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
                                                    className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                                                >
                                                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirmId(entry.id)}
                                                className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 text-[10px] text-muted-foreground">
                                    <span>Updated {new Date(entry.updated_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>Created {new Date(entry.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
