"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Sparkles, Loader2, AlertCircle, CheckCircle2, Lock, User, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { acceptInviteSchema, type AcceptInviteInput } from "@/lib/validations/invite"
import { toast } from "sonner"

function AcceptInviteContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const router = useRouter()

    const [isValidating, setIsValidating] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null)
    const [validationError, setValidationError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AcceptInviteInput>({
        resolver: zodResolver(acceptInviteSchema),
        defaultValues: {
            full_name: "",
            password: "",
            confirmPassword: "",
        },
    })

    useEffect(() => {
        if (!token) {
            setValidationError("No invite token provided. Please check your link.")
            setIsValidating(false)
            return
        }

        const validateToken = async () => {
            try {
                const supabase = createBrowserClient()
                const { data, error } = await supabase.functions.invoke("validate-invite", {
                    body: { token }
                })

                if (error || !data) {
                    setValidationError(error?.message || "Invalid or expired invite link.")
                } else {
                    setInviteData(data)
                }
            } catch (err) {
                setValidationError("Unable to validate invite at this time.")
            } finally {
                setIsValidating(false)
            }
        }

        validateToken()
    }, [token])

    const onAcceptSubmit = async (values: AcceptInviteInput) => {
        setIsSubmitting(true)

        try {
            const supabase = createBrowserClient()
            const { error: inviteError } = await supabase.functions.invoke("complete-invite", {
                body: {
                    token,
                    password: values.password,
                    full_name: values.full_name
                }
            })

            if (inviteError) {
                toast.error(inviteError.message || "Failed to create account.")
                setIsSubmitting(false)
            } else {
                setSuccess(true)
                toast.success("Account activated! Redirecting to login...")
                setTimeout(() => {
                    router.push("/login")
                }, 3000)
            }
        } catch (err) {
            console.error("[AcceptInvite] Unexpected error:", err)
            toast.error("An unexpected error occurred. Please try again.")
            setIsSubmitting(false)
        }
    }

    if (isValidating) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Validating your invitation...</p>
                </div>
            </main>
        )
    }

    if (validationError) {
        return (
            <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-balance">
                <div className="max-w-md w-full glass-panel-strong p-8 rounded-2xl text-center border-destructive/20">
                    <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-foreground mb-2 text-balance">Invite Error</h1>
                    <p className="text-muted-foreground mb-6 text-balance">{validationError}</p>
                    <Button asChild className="w-full">
                        <Link href="/">Back to Home</Link>
                    </Button>
                </div>
            </main>
        )
    }

    if (success) {
        return (
            <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <div className="max-w-md w-full glass-panel-strong p-10 rounded-2xl border-emerald-500/20 glow-emerald/10">
                    <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Account Activated</h1>
                    <p className="text-muted-foreground mb-8 text-balance">
                        Your account for <strong>{inviteData?.email}</strong> has been successfully created. Redirecting you to login...
                    </p>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login">Go to Login Now</Link>
                    </Button>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/4 -left-32 h-96 w-96 bg-primary/10 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden">
                            <Image 
                                src="/icon-light-32x32.png" 
                                alt="Inner G Logo" 
                                width={32} 
                                height={32}
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">Inner G Complete</span>
                    </Link>
                    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-4 border-primary/20">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Invitation Accepted</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Finish Your Setup</h1>
                    <p className="mt-2 text-muted-foreground text-sm text-balance">
                        Welcome to the agency portal. Create your profile for <span className="text-foreground font-medium">{inviteData?.email}</span>.
                    </p>
                </div>

                <div className="glass-panel-strong rounded-2xl p-8 shadow-2xl border-white/5">
                    <form onSubmit={handleSubmit(onAcceptSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="full_name" className="text-sm font-medium text-foreground ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="full_name"
                                    {...register("full_name")}
                                    placeholder="Enter your full name"
                                    className={`bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.full_name ? "border-destructive focus:border-destructive" : ""}`}
                                    disabled={isSubmitting}
                                />
                            </div>
                            {errors.full_name && (
                                <p className="text-xs text-destructive mt-1 ml-1">{errors.full_name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-foreground ml-1">Set Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    {...register("password")}
                                    placeholder="Min. 8 characters"
                                    className={`bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.password ? "border-destructive focus:border-destructive" : ""}`}
                                    disabled={isSubmitting}
                                />
                            </div>
                            {errors.password && (
                                <p className="text-xs text-destructive mt-1 ml-1">{errors.password.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground ml-1">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    {...register("confirmPassword")}
                                    placeholder="Repeat your password"
                                    className={`bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.confirmPassword ? "border-destructive focus:border-destructive" : ""}`}
                                    disabled={isSubmitting}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="text-xs text-destructive mt-1 ml-1">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] glow-primary mt-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating Profile...
                                </>
                            ) : (
                                <>
                                    Activate Account
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                <p className="text-center mt-8 text-[11px] text-muted-foreground leading-relaxed">
                    By activating your account, you agree to Inner G Complete&apos;s <br />
                    <Link href="/terms-of-service" className="underline">Terms of Service</Link> and <Link href="#" className="underline">Security Protocols</Link>.
                </p>
            </div>
        </main>
    )
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <AcceptInviteContent />
        </Suspense>
    )
}
