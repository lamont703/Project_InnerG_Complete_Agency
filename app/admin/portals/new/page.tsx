"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { portalSchema, type PortalInput } from "@/lib/validations/portal"
import { toast } from "sonner"
import {
    Layout,
    Building2,
    ArrowLeft,
    Sparkles,
    Loader2,
    ShieldCheck,
    Globe,
    Zap,
    CheckCircle2,
    AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { createBrowserClient } from "@/lib/supabase/browser"

export default function CreatePortalPage() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)
    const router = useRouter()
    const supabase = createBrowserClient()

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
    } = useForm<PortalInput>({
        resolver: zodResolver(portalSchema),
        defaultValues: {
            clientName: "",
            industry: "other",
            primaryContactName: "",
            primaryContactEmail: "",
            projectName: "",
            slug: "",
            projectType: "ecommerce",
        },
    })

    const projectName = watch("projectName")
    const clientName = watch("clientName")

    // Auto-generate slug and project name from client name
    useEffect(() => {
        if (clientName && !projectName) {
            setValue("projectName", `${clientName} Growth Portal`)
        }
        if (clientName && !watch("slug")) {
            const generatedSlug = clientName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "")
            setValue("slug", generatedSlug)
        }
    }, [clientName, setValue, projectName, watch])

    useEffect(() => {
        const checkAdmin = async () => {
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

            if (profile?.role !== "super_admin") {
                toast.error("Unauthorized. Super Admin access required.")
                router.push("/select-portal")
            } else {
                setIsCheckingAdmin(false)
            }
        }
        checkAdmin()
    }, [router, supabase])

    const onSubmit = async (values: PortalInput) => {
        setIsSubmitting(true)
        try {
            // 1. Create Client
            const { data: client, error: clientError } = await (supabase
                .from("clients") as any)
                .insert({
                    name: values.clientName,
                    industry: values.industry,
                    primary_contact_name: values.primaryContactName,
                    primary_contact_email: values.primaryContactEmail,
                    ghl_location_id: values.ghlLocationId,
                    status: "onboarding"
                })
                .select()
                .single()

            if (clientError) throw clientError

            // 2. Create Project
            const { data: project, error: projectError } = await (supabase
                .from("projects") as any)
                .insert({
                    client_id: client.id,
                    name: values.projectName,
                    slug: values.slug,
                    type: values.projectType,
                    status: "building"
                })
                .select()
                .single()

            if (projectError) throw projectError

            toast.success("Growth Architecture deployed successfully!")
            router.push(`/dashboard/${project.slug}`)
        } catch (err: any) {
            console.error("[CreatePortal] Error:", err)
            toast.error(err.message || "Failed to deploy architecture.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isCheckingAdmin) {
        return (
            <main className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[#020617] text-foreground relative p-6 md:p-12 overflow-x-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 h-[600px] w-[600px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-[400px] w-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-4xl mx-auto">
                <Link
                    href="/select-portal"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-10 group"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Portals
                </Link>

                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-4 border-primary/20">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Growth Engineering</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Deploy New Architecture</h1>
                    <p className="mt-4 text-muted-foreground text-lg max-w-2xl leading-relaxed">
                        Initialize a fresh client ecosystem and dedicated growth dashboard. This will reserve the instance slug and prepare AI models.
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Section 1: Client Metadata */}
                    <div className="glass-panel-strong rounded-3xl p-8 border border-white/5 shadow-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Client Metadata</h2>
                                <p className="text-xs text-muted-foreground">Master identity for the agency roster</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Company legal Name</label>
                                <Input
                                    {...register("clientName")}
                                    placeholder="Enter client name"
                                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary"
                                />
                                {errors.clientName && <p className="text-[10px] text-destructive ml-2">{errors.clientName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Industry Vertical</label>
                                <select
                                    {...register("industry")}
                                    className="w-full bg-[#0f172a] border border-white/10 h-12 rounded-xl px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                                >
                                    <option value="ecommerce">E-Commerce</option>
                                    <option value="retail">Retail</option>
                                    <option value="ebook_publishing">Ebook Publishing</option>
                                    <option value="social_community">Social Community</option>
                                    <option value="dating">Dating</option>
                                    <option value="hospitality">Hospitality</option>
                                    <option value="technology">Technology</option>
                                    <option value="healthcare">Healthcare</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Primary Contact Name</label>
                                <Input
                                    {...register("primaryContactName")}
                                    placeholder="Executive Point of Contact"
                                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary"
                                />
                                {errors.primaryContactName && <p className="text-[10px] text-destructive ml-2">{errors.primaryContactName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Primary Email</label>
                                <Input
                                    {...register("primaryContactEmail")}
                                    placeholder="email@client.com"
                                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary"
                                />
                                {errors.primaryContactEmail && <p className="text-[10px] text-destructive ml-2">{errors.primaryContactEmail.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Dashboard/Portal Config */}
                    <div className="glass-panel-strong rounded-3xl p-8 border border-white/5 shadow-2xl">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                                <Layout className="h-5 w-5 text-accent" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Portal Configuration</h2>
                                <p className="text-xs text-muted-foreground">URL slugs and visual architecture</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Dashboard Display Name</label>
                                <Input
                                    {...register("projectName")}
                                    placeholder="e.g. Acme Worldwide Growth Portal"
                                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary"
                                />
                                {errors.projectName && <p className="text-[10px] text-destructive ml-2">{errors.projectName.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="text-sm font-medium">Instance Slug</label>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Globe className="h-3 w-3" />
                                            agency.innergcomplete.com/dashboard/
                                        </div>
                                    </div>
                                    <Input
                                        {...register("slug")}
                                        placeholder="acme-corp"
                                        className="bg-white/5 border-white/10 h-12 rounded-xl focus:border-primary font-mono text-sm"
                                    />
                                    {errors.slug && <p className="text-[10px] text-destructive ml-2">{errors.slug.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium ml-1">Architecture Type</label>
                                    <select
                                        {...register("projectType")}
                                        className="w-full bg-[#0f172a] border border-white/10 h-12 rounded-xl px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                                    >
                                        <option value="ecommerce">Ecommerce Hub</option>
                                        <option value="retail">Retail Infrastructure</option>
                                        <option value="dating">Relationship Dynamics</option>
                                        <option value="community">Social community</option>
                                        <option value="general">General Agency Portal</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pre-flight Check */}
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-4">
                        <Zap className="h-6 w-6 text-primary mt-1" />
                        <div>
                            <p className="text-sm font-bold text-foreground mb-1">Architecture Pre-flight Check</p>
                            <ul className="text-[11px] text-muted-foreground space-y-1">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    SSL certificates will be provisioned for <strong>{watch("slug") || "slug"}.innergcomplete.com</strong>
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                    Dedicated RAG vector storage will be initialized for {clientName || "Client"}
                                </li>
                            </ul>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-16 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-lg font-bold transition-all hover:scale-[1.01] active:scale-[0.99] glow-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                Deploying growth Systems...
                            </>
                        ) : (
                            <>
                                Initialize Growth Architecture
                                <Sparkles className="ml-3 h-5 w-5" />
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <AlertCircle className="h-3 w-3" />
                        This operation cannot be undone. Slugs are permanently reserved once initialized.
                    </p>
                </div>
            </div>
        </main>
    )
}
