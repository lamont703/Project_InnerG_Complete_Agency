"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowRight, Mail, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        // Simulate mock authentication
        setTimeout(() => {
            router.push("/select-portal")
        }, 1000)
    }

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background orbs */}
            <div className="absolute top-1/4 -left-32 h-96 w-96 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 -right-32 h-96 w-96 bg-accent/8 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
                            <span className="text-xl font-bold">G</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-foreground">
                            Inner G
                        </span>
                    </Link>
                    <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-4">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-primary uppercase tracking-wider">Client Portal Access</span>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
                    <p className="mt-2 text-muted-foreground text-sm">
                        Please enter your credentials to access your growth dashboard.
                    </p>
                </div>

                <div className="glass-panel-strong rounded-2xl p-8 shadow-2xl border-white/5">
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground ml-1">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@company.com"
                                    className="bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-foreground">Password</label>
                                <Link href="#" className="text-xs text-primary hover:underline">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-background/50 border-border pl-10 text-foreground placeholder:text-muted-foreground focus:border-primary"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] glow-primary mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing in..." : "Sign Into Portal"}
                            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </form>

                    <div className="mt-8 text-center border-t border-border pt-6">
                        <p className="text-sm text-muted-foreground">
                            Don't have access yet?{" "}
                            <Link href="/#contact" className="text-primary font-semibold hover:underline">
                                Request a Growth Audit
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center mt-8 text-xs text-muted-foreground">
                    &copy; {new Date().getFullYear()} Inner G Complete Agency. All rights reserved.
                </p>
            </div>
        </main>
    )
}
