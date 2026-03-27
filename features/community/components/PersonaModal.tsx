"use client"

import { useState, useEffect } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { 
    Brain, 
    Target, 
    Smile, 
    Shield, 
    Save, 
    Loader2, 
    Bot,
    Sparkles,
    Info,
    Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"

interface PersonaModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onSuccess: () => void
    initialData?: any
}

export function PersonaModal({ isOpen, onClose, projectId, onSuccess, initialData }: PersonaModalProps) {
    const [step, setStep] = useState(1)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        role: "",
        mood: "analytical",
        persona_prompt: "",
        mission_objective: "",
        knowledge_ids: [] as string[]
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || "",
                role: initialData.role || "",
                mood: initialData.mood || "analytical",
                persona_prompt: initialData.persona_prompt || "",
                mission_objective: initialData.mission_objective || "",
                knowledge_ids: initialData.knowledge_ids || []
            })
            setStep(1)
        } else {
            setFormData({
                name: "",
                role: "",
                mood: "analytical",
                persona_prompt: "",
                mission_objective: "",
                knowledge_ids: []
            })
            setStep(1)
        }
    }, [initialData, isOpen])

    const handleSave = async () => {
        if (!formData.name || !formData.role) {
            toast.error("Please provide a name and role for the persona.")
            return
        }

        setIsSaving(true)
        try {
            const supabase = createBrowserClient()
            if (initialData) {
                // Update
                const { error } = await (supabase as any)
                    .from("community_agents")
                    .update(formData)
                    .eq("id", initialData.id)
                if (error) throw error
                toast.success("Persona intelligence recalibrated.")
            } else {
                // Create
                const payload = { 
                    ...formData, 
                    project_id: projectId, 
                    is_active: true,
                    active_platforms: ['book-reader'], // Satisfy NOT NULL constraint explicitly
                    platform_identities: {} // Satisfy NOT NULL constraint explicitly
                }

                console.log("[PersonaModal] Provisioning Payload:", payload)

                const { error } = await (supabase as any)
                    .from("community_agents")
                    .insert(payload)
                if (error) throw error
                toast.success("New persona provisioned.")
            }
            onSuccess()
            onClose()
        } catch (err: any) {
            console.error("[PersonaModal] Full Save Error:", {
                message: err.message,
                details: err.details,
                hint: err.hint,
                code: err.code,
                obj: err
            })
            
            const errorMsg = err.details || err.message || "Failed to synchronize persona intelligence."
            toast.error(errorMsg)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-background border border-border rounded-3xl overflow-hidden glass-panel p-0 gap-0">
                <div className="flex h-1.5 w-full bg-muted">
                    <div 
                        className="h-full bg-primary transition-all duration-500" 
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                <div className="p-8">
                    <DialogHeader className="mb-8">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
                            <Bot className="h-6 w-6" />
                        </div>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tight">
                            {initialData ? 'Intelligence Recalibration' : 'Persona Provisioning Protocol'}
                        </DialogTitle>
                        <DialogDescription className="text-xs uppercase font-bold tracking-[0.2em] text-muted-foreground/60">
                            Neural Sync: Step {step} of 3
                        </DialogDescription>
                    </DialogHeader>

                    {/* STEP 1: Core Identity */}
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Codename</label>
                                    <Input 
                                        placeholder="e.g. Scholar" 
                                        className="rounded-xl h-12"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Functional Role</label>
                                    <Input 
                                        placeholder="e.g. Technical Skeptic" 
                                        className="rounded-xl h-12"
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Personality Spectrum (Mood)</label>
                                <Select 
                                    value={formData.mood} 
                                    onValueChange={val => setFormData({...formData, mood: val})}
                                >
                                    <SelectTrigger className="rounded-xl h-12">
                                        <SelectValue placeholder="Select Mood" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-border">
                                        <SelectItem value="analytical">Analytical & Precise</SelectItem>
                                        <SelectItem value="friendly">Enthusiastic & Friendly</SelectItem>
                                        <SelectItem value="skeptical">Logical & Skeptical (The Critic)</SelectItem>
                                        <SelectItem value="sassy">Sharp & Witty (Bold)</SelectItem>
                                        <SelectItem value="professional">Formal & Direct (Executive)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Mission & Objectives */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Target className="h-3 w-3" />
                                    Strategic Mission Objective
                                </label>
                                <Input 
                                    placeholder="e.g. Drive education about the Solana book club tokens" 
                                    className="rounded-xl h-12"
                                    value={formData.mission_objective}
                                    onChange={e => setFormData({...formData, mission_objective: e.target.value})}
                                />
                                <p className="text-[9px] text-muted-foreground/60 italic px-1">This high-level goal guides the AI's long-term behavior.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                    <Brain className="h-3 w-3" />
                                    Persona Cognitive Prompt
                                </label>
                                <Textarea 
                                    placeholder="Describe how the agent should talk, what it knows, and what it avoids..." 
                                    className="rounded-xl min-h-[120px] resize-none py-4"
                                    value={formData.persona_prompt}
                                    onChange={e => setFormData({...formData, persona_prompt: e.target.value})}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Knowledge Synchronization */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 border-dashed text-center">
                                <Sparkles className="h-8 w-8 text-primary mx-auto mb-3 opacity-50" />
                                <h4 className="text-sm font-bold mb-1 uppercase tracking-tight">RAG Context Mapping</h4>
                                <p className="text-xs text-muted-foreground max-w-[300px] mx-auto">
                                    This agent will automatically retrieve context from your project knowledge base when responding to community queries.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/20">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    <div className="flex-1">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest">Global Knowledge Linked</h5>
                                        <p className="text-[10px] text-muted-foreground leading-tight">Project documentation sync enabled.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-xl border border-border opacity-50 bg-muted/10 grayscale">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest italic">Selective Access</h5>
                                        <p className="text-[10px] text-muted-foreground leading-tight italic">Coming soon: Pick specific folders.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-12 flex flex-col md:flex-row gap-4 border-t border-border pt-8 sm:justify-between items-center">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest order-2 md:order-1">
                            <Info className="h-3 w-3" />
                            Provisioning with 128k context window
                        </div>
                        <div className="flex items-center gap-3 order-1 md:order-2 w-full md:w-auto">
                            {step > 1 && (
                                <Button 
                                    variant="outline" 
                                    onClick={() => setStep(step - 1)}
                                    className="rounded-xl flex-1 md:flex-none border-border"
                                >
                                    Previous Phase
                                </Button>
                            )}
                            {step < 3 ? (
                                <Button 
                                    onClick={() => setStep(step + 1)}
                                    className="rounded-xl flex-1 md:flex-none bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                >
                                    Proceed to Phase {step + 1}
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleSave} 
                                    disabled={isSaving}
                                    className="rounded-xl flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 px-8"
                                >
                                    {isSaving ? (
                                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Syncing...</>
                                    ) : (
                                        <><Save className="h-4 w-4 mr-2" /> Deploy Persona</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    )
}
