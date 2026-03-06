"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Lock, Sparkles, Loader2, CheckCircle2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth"
import { toast } from "sonner"

export default function ResetPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [checkingSession, setCheckingSession] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkSession = async () => {
            const supabase = createBrowserClient()
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                // If no session, it might be a direct visit or an expired link
                // We should check if the hash has access_token (standard Supabase redirect)
                // but getSession usually picks that up.
                toast.error("Invalid or expired reset session. Please request a new link.")
                router.push("/forgot-password")
            } else {
                setCheckingSession(false)
            }
        }

        checkSession()
    }, [router])

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordInput>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    })

    const onResetSubmit = async (values: ResetPasswordInput) => {
        setIsLoading(true)

        try {
            const supabase = createBrowserClient()
            const { error } = await supabase.auth.updateUser({
                password: values.password
            })

            if (error) {
                toast.error(error.message)
                setIsLoading(false)
                return
            }

            setIsSuccess(true)
            toast.success("Password updated successfully!")

            // Auto redirect after success
            setTimeout(() => {
                router.push("/login")
            }, 3000)
        } catch (err) {
            console.error("[ResetPassword] Unexpected error:", err)
            toast.error("An unexpected error occurred. Please try again.")
            setIsLoading(false)
        }
    }

    if (checkingSession) {
        return (
            <main className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Initializing secure session...</p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/4 -left-32 h-96 w-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 h-96 w-96 bg-accent/8 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                            <span className="text-xl font-bold">G</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Inner G Complete Agency
                        </span>
                    </Link>
                    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-4">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary uppercase tracking-wider">Securing Account</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">
                        {isSuccess ? "Update Complete" : "Secure Password Reset"}
                    </h1>
                    <p className="mt-2 text-muted-foreground text-sm text-balance">
                        {isSuccess
                            ? "Your password has been reset. You will be redirected to the login page momentarily."
                            : "Create a strong new password to protect your agency portal access."}
                    </p>
                </div>

                <div className="glass-panel-strong rounded-2xl p-8 shadow-2xl border-white/5">
                    {!isSuccess ? (
                        <form onSubmit={handleSubmit(onResetSubmit)} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-foreground ml-1">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        {...register("password")}
                                        placeholder="Min. 8 characters"
                                        className={`bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.password ? "border-destructive focus:border-destructive" : ""}`}
                                        disabled={isLoading}
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
                                        placeholder="Repeat your new password"
                                        className={`bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.confirmPassword ? "border-destructive focus:border-destructive" : ""}`}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-xs text-destructive mt-1 ml-1">{errors.confirmPassword.message}</p>
                                )}
                            </div>

                            <Button
                                id="btn-update-password"
                                type="submit"
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] glow-primary mt-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Update Password
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center py-6">
                            <div className="h-16 w-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                            </div>
                            <Button asChild variant="outline" className="w-full h-12">
                                <Link href="/login">Return to Login Now</Link>
                            </Button>
                        </div>
                    )}

                    {!isSuccess && (
                        <div className="mt-8 text-center border-t border-border pt-6">
                            <Link
                                href="/login"
                                className="inline-flex items-center text-sm text-primary font-semibold hover:underline gap-1.5"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Cancel & Back to Sign In
                            </Link>
                        </div>
                    )}
                </div>

                <p className="text-center mt-8 text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} Inner G Complete Agency. All rights reserved.
                </p>
            </div>
        </main>
    )
}
