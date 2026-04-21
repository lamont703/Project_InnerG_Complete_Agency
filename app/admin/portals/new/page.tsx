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
import { AdminHeader } from "@/features/agency/components/AdminHeader"

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
            industry: "barbering",
            primaryContactName: "",
            primaryContactEmail: "",
            projectName: "",
            slug: "",
            projectType: "agency_view",
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
            <main className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </main>
        )
    }

    return (
        <>
            <AdminHeader 
                title="Initialize Growth Architecture" 
                subtitle="Instance Provisioning & Neural Mapping"
            />

            <div className="flex-1 p-6 md:p-10 relative z-10 max-w-4xl mx-auto w-full">
                <div className="mb-12">
                    <p className="mt-4 text-muted-foreground text-lg max-w-2xl leading-relaxed">
                        Initialize a fresh client ecosystem and dedicated growth dashboard. This will reserve the instance slug and prepare AI models.
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Section 1: Client Metadata */}
                    <div className="glass-panel-strong rounded-3xl p-8 border border-border shadow-2xl">
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
                                    className="bg-muted/10 border-border h-12 rounded-xl focus:border-primary"
                                />
                                {errors.clientName && <p className="text-[10px] text-destructive ml-2">{errors.clientName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Industry Vertical</label>
                                <select
                                    {...register("industry")}
                                    className="w-full bg-background border border-border h-12 rounded-xl px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                                >
                                    <option value="barbering">Barbering</option>
                                    <option value="cosmetology">Cosmetology</option>
                                    <option value="wellness">Wellness</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Primary Contact Name</label>
                                <Input
                                    {...register("primaryContactName")}
                                    placeholder="Executive Point of Contact"
                                    className="bg-muted/10 border-border h-12 rounded-xl focus:border-primary"
                                />
                                {errors.primaryContactName && <p className="text-[10px] text-destructive ml-2">{errors.primaryContactName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium ml-1">Primary Email</label>
                                <Input
                                    {...register("primaryContactEmail")}
                                    placeholder="email@client.com"
                                    className="bg-muted/10 border-border h-12 rounded-xl focus:border-primary"
                                />
                                {errors.primaryContactEmail && <p className="text-[10px] text-destructive ml-2">{errors.primaryContactEmail.message}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Dashboard/Portal Config */}
                    <div className="glass-panel-strong rounded-3xl p-8 border border-border shadow-2xl">
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
                                    className="bg-muted/10 border-border h-12 rounded-xl focus:border-primary"
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
                                        className="bg-muted/10 border-border h-12 rounded-xl focus:border-primary font-mono text-sm"
                                    />
                                    {errors.slug && <p className="text-[10px] text-destructive ml-2">{errors.slug.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium ml-1">Deployment Blueprint</label>
                                    <select
                                        {...register("projectType")}
                                        className="w-full bg-background border border-border h-12 rounded-xl px-4 text-sm focus:ring-1 focus:ring-primary focus:border-primary appearance-none"
                                    >
                                        <option value="agency_view">Agency View (Standard)</option>
                                        <option value="barber_student">Barber Student Architecture</option>
                                        <option value="barber_instructor">Barber Instructor Architecture</option>
                                        <option value="barber_owner">Barber School Owner Architecture</option>
                                    </select>
                                    <p className="text-[10px] text-muted-foreground ml-1">Sets the primary UI layout and intelligence persona</p>
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
        </>
    )
}
