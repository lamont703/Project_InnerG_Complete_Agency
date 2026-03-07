"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inviteSchema, type InviteInput } from "@/lib/validations/invite"
import { toast } from "sonner"
import {
    Mail,
    ShieldCheck,
    Link as LinkIcon,
    Copy,
    Loader2,
    ArrowLeft,
    Sparkles,
    Building2,
    CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/browser"

export default function InviteGenerationPage() {
    const supabase = createBrowserClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [generatedLink, setGeneratedLink] = useState<string | null>(null)
    const [clients, setClients] = useState<{ id: string, name: string }[]>([])
    const [isLoadingClients, setIsLoadingClients] = useState(true)

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        watch,
    } = useForm<InviteInput>({
        resolver: zodResolver(inviteSchema),
        defaultValues: {
            email: "",
            intended_role: "client_viewer",
            client_id: null,
        },
    })

    const selectedRole = watch("intended_role")

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data, error } = await supabase
                    .from("clients")
                    .select("id, name")
                    .order("name")

                if (error) throw error
                setClients(data || [])
            } catch (err) {
                console.error("[Invites] Error fetching clients:", err)
                toast.error("Failed to load clients list.")
            } finally {
                setIsLoadingClients(false)
            }
        }
        fetchClients()
    }, [])

    const onInviteSubmit = async (values: InviteInput) => {
        setIsSubmitting(true)
        setGeneratedLink(null)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                toast.error("Session expired. Please log in again.")
                return
            }

            const { data, error } = await supabase.functions.invoke("generate-invite-link", {
                body: {
                    invited_email: values.email,
                    intended_role: values.intended_role,
                    client_id: values.client_id
                }
            })

            if (error) throw error

            if (data?.data?.invite_url) {
                setGeneratedLink(data.data.invite_url)
                toast.success("Invite link generated successfully!")
                reset()
            }
        } catch (err: any) {
            console.error("[Invites] Generation error:", err)
            toast.error(err.message || "Failed to generate invite link.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyToClipboard = () => {
        if (generatedLink) {
            navigator.clipboard.writeText(generatedLink)
            toast.success("Copied to clipboard!")
        }
    }

    return (
        <main className="min-h-screen bg-[#020617] text-foreground relative p-6 md:p-12 overflow-hidden">
            {/* Background Orbs */}
            <div className="absolute top-0 right-0 h-96 w-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-72 w-72 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto">
                <Link
                    href="/select-portal"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10 group"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Portals
                </Link>

                <div className="mb-10">
                    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-4 border-primary/20">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Agency Administration</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Generate Portal Invite</h1>
                    <p className="mt-3 text-muted-foreground leading-relaxed">
                        Create a unique, single-use authentication link for new team members or clients.
                        Invites expire automatically after 7 days.
                    </p>
                </div>

                <div className="glass-panel-strong rounded-3xl p-8 border border-white/5 shadow-2xl">
                    <form onSubmit={handleSubmit(onInviteSubmit)} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground ml-1">Recipient Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    {...register("email")}
                                    placeholder="colleague@client.com"
                                    className={`bg-white/5 border-white/10 pl-12 h-14 rounded-2xl focus:border-primary ${errors.email ? "border-destructive focus:border-destructive" : ""}`}
                                    disabled={isSubmitting}
                                />
                            </div>
                            {errors.email && <p className="text-[10px] text-destructive ml-2">{errors.email.message}</p>}
                        </div>

                        {/* Role Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground ml-1">Intended Role</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { value: "developer", label: "Developer", desc: "Full Access" },
                                    { value: "client_admin", label: "Admin", desc: "Project Mgmt" },
                                    { value: "client_viewer", label: "Viewer", desc: "Read Only" },
                                ].map((role) => (
                                    <label
                                        key={role.value}
                                        className={`relative flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${selectedRole === role.value
                                            ? "bg-primary/10 border-primary shadow-lg shadow-primary/5"
                                            : "bg-white/5 border-white/10 hover:border-white/20"
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            value={role.value}
                                            {...register("intended_role")}
                                            className="sr-only"
                                        />
                                        <span className={`text-sm font-bold ${selectedRole === role.value ? "text-primary" : "text-foreground"}`}>
                                            {role.label}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground mt-1">{role.desc}</span>
                                        {selectedRole === role.value && (
                                            <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
                                        )}
                                    </label>
                                ))}
                            </div>
                            {errors.intended_role && <p className="text-[10px] text-destructive ml-2">{errors.intended_role.message}</p>}
                        </div>

                        {/* Client Selection (Optional) */}
                        {(selectedRole === "client_admin" || selectedRole === "client_viewer") && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="text-sm font-medium text-foreground ml-1">Associate with Client</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <select
                                        {...register("client_id")}
                                        className="w-full bg-white/5 border-white/10 pl-12 h-14 rounded-2xl focus:ring-1 focus:ring-primary focus:border-primary appearance-none text-foreground text-sm"
                                        disabled={isSubmitting || isLoadingClients}
                                    >
                                        <option value="" className="bg-[#0f172a]">Select a client (required for client roles)</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id} className="bg-[#0f172a]">{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-base font-bold transition-all hover:scale-[1.01] active:scale-[0.99] glow-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Generating Secure Link...
                                </>
                            ) : (
                                <>
                                    Generate Invite Link
                                    <Sparkles className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Result */}
                    {generatedLink && (
                        <div className="mt-10 p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 animate-in zoom-in-95 duration-500">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <LinkIcon className="h-4 w-4 text-emerald-500" />
                                </div>
                                <h4 className="font-bold text-emerald-500">Secure Link Ready</h4>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-xs font-mono text-muted-foreground break-all flex items-center">
                                    {generatedLink}
                                </div>
                                <Button
                                    onClick={copyToClipboard}
                                    variant="outline"
                                    className="h-12 border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-500 gap-2 shrink-0 rounded-2xl"
                                >
                                    <Copy className="h-4 w-4" />
                                    Copy
                                </Button>
                            </div>
                            <p className="mt-4 text-[10px] text-muted-foreground text-center">
                                Send this link to the recipient. They will be prompted to create their profile.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}
