"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Mail, Sparkles, Loader2, CheckCircle2, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordInput>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    })

    const onForgotSubmit = async (values: ForgotPasswordInput) => {
        setIsLoading(true)

        try {
            const supabase = createBrowserClient()
            const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })

            if (error) {
                toast.error(error.message)
                setIsLoading(false)
                return
            }

            setIsSubmitted(true)
            toast.success("Reset instructions sent to your email.")
        } catch (err) {
            console.error("[ForgotPassword] Unexpected error:", err)
            toast.error("An unexpected error occurred. Please try again.")
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/4 -left-32 h-96 w-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 h-96 w-96 bg-accent/8 rounded-full blur-3xl" />

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
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Inner G Complete Agency
                        </span>
                    </Link>
                    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-4">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary uppercase tracking-wider">Account Recovery</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">
                        {isSubmitted ? "Check Your Email" : "Reset Password"}
                    </h1>
                    <p className="mt-2 text-muted-foreground text-sm text-balance">
                        {isSubmitted
                            ? "We've sent password reset instructions to your inbox. Please follow the link to continue."
                            : "Enter your work email address and we'll send you a link to reset your password."}
                    </p>
                </div>

                <div className="glass-panel-strong rounded-2xl p-8 shadow-2xl border-white/5">
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit(onForgotSubmit)} className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-foreground ml-1">Work Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        {...register("email")}
                                        placeholder="name@company.com"
                                        className={`bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary ${errors.email ? "border-destructive focus:border-destructive" : ""}`}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-destructive mt-1 ml-1">{errors.email.message}</p>
                                )}
                            </div>

                            <Button
                                id="btn-reset-password"
                                type="submit"
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] glow-primary mt-2"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Sending Link...
                                    </>
                                ) : (
                                    <>
                                        Send Reset Link
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
                                <Link href="/login">Return to Login</Link>
                            </Button>
                        </div>
                    )}

                    <div className="mt-8 text-center border-t border-border pt-6">
                        <Link
                            href="/login"
                            className="inline-flex items-center text-sm text-primary font-semibold hover:underline gap-1.5"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Sign In
                        </Link>
                    </div>
                </div>

                <p className="text-center mt-8 text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} Inner G Complete Agency. All rights reserved.
                </p>
            </div>
        </main>
    )
}
