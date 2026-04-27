"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Mail, Lock, Sparkles, Loader2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createBrowserClient } from "@/lib/supabase/browser"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { BarberRegisterForm } from "@/components/forms/BarberRegisterForm"

function LoginContent() {
    const [isLoading, setIsLoading] = useState(false)
    const [isRegisterView, setIsRegisterView] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get("redirect") || "/api/auth/provision"

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const onLoginSubmit = async (values: LoginInput) => {
        setIsLoading(true)

        try {
            const supabase = createBrowserClient()
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: values.email,
                password: values.password,
            })

            if (authError) {
                toast.error(authError.message)
                setIsLoading(false)
                return
            }

            toast.success("Welcome back! Redirecting...")
            router.push(redirectTo)
            router.refresh()
        } catch (err) {
            console.error("[Login] Unexpected error:", err)
            toast.error("An unexpected error occurred. Please try again.")
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/4 -left-32 h-96 w-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
            <div className="absolute bottom-1/4 -right-32 h-96 w-96 bg-accent/8 rounded-full blur-3xl opacity-50" />

            <div className={cn("w-full transition-all duration-500 relative z-10", isRegisterView ? "max-w-2xl py-12" : "max-w-md")}>
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105 overflow-hidden shadow-lg shadow-primary/20">
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
                    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-4 border-white/5">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                            {isRegisterView ? "Institutional Enrollment" : "Professional Access"}
                        </span>
                    </div>
                    <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">
                        {isRegisterView ? "Join Your Program" : "Sign In"}
                    </h1>
                    <p className="mt-2 text-muted-foreground text-sm font-medium tracking-tight">
                        {isRegisterView 
                            ? "Complete your professional profile to unlock your dashboard access." 
                            : "Enter your account details to access your tools and school portal."
                        }
                    </p>
                </div>

                <div className="glass-panel-strong rounded-[2.5rem] p-8 lg:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border-white/5">
                    {isRegisterView ? (
                        <BarberRegisterForm onSuccess={(url) => router.push(url)} />
                    ) : (
                        <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <Input
                                        id="email"
                                        type="email"
                                        {...register("email")}
                                        placeholder="name@example.com"
                                        className={`bg-background border-2 border-slate-100 dark:border-white/5 pl-12 h-14 text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl transition-all ${errors.email ? "border-destructive focus:border-destructive" : ""}`}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-destructive mt-1 ml-1 font-bold">{errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</label>
                                    <Link
                                        href="/forgot-password"
                                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <Input
                                        id="password"
                                        type="password"
                                        {...register("password")}
                                        placeholder="••••••••"
                                        className={`bg-background border-2 border-slate-100 dark:border-white/5 pl-12 h-14 text-foreground placeholder:text-muted-foreground focus:border-primary rounded-xl transition-all ${errors.password ? "border-destructive focus:border-destructive" : ""}`}
                                        disabled={isLoading}
                                    />
                                </div>
                                {errors.password && (
                                    <p className="text-xs text-destructive mt-1 ml-1 font-bold">{errors.password.message}</p>
                                )}
                            </div>

                            <Button
                                id="btn-sign-in"
                                type="submit"
                                className="w-full bg-primary text-white hover:bg-slate-950 h-14 text-sm font-black uppercase tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-primary/20 rounded-xl mt-4"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Checking...
                                    </>
                                ) : (
                                    <>
                                        Access My Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    <div className="mt-8 text-center border-t border-border pt-8">
                        <div className="flex flex-col items-center gap-4">
                            <button 
                                onClick={() => setIsRegisterView(!isRegisterView)}
                                className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline transition-colors"
                            >
                                {isRegisterView 
                                    ? "Already have an account? Sign In" 
                                    : "Need to join a school? Register Now"
                                }
                            </button>
                            <p className="text-[10px] text-muted-foreground font-bold tracking-tight uppercase px-8 opacity-50">
                                {isRegisterView 
                                    ? "Registration provides immediate access to your portal materials." 
                                    : "Secure access is provided by Inner G Complete Agency."
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-center mt-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    &copy; {new Date().getFullYear()} Inner G Complete Agency. All systems operational.
                </p>
            </div>
        </main>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <LoginContent />
        </Suspense>
    )
}
