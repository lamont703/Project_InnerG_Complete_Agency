"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  ArrowRight, 
  Sparkles, 
  Loader2, 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createBrowserClient } from "@/lib/supabase/browser"
import { toast } from "sonner"
import { BarberSchoolSelector } from "./BarberSchoolSelector"
import { cn } from "@/lib/utils"

interface BarberRegisterFormProps {
    onSuccess?: (redirect: string) => void;
}

export function BarberRegisterForm({ onSuccess }: BarberRegisterFormProps) {
    const [isRegistering, setIsRegistering] = useState(false)
    const [userRole, setUserRole] = useState<'student' | 'instructor' | 'owner'>('student')
    const [schoolData, setSchoolData] = useState<any>(null)
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: ""
    })
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match.")
            return
        }

        if (!schoolData) {
            toast.error("Please select your barber school.")
            return
        }

        setIsRegistering(true)

        try {
            // 1. Provision Architecture
            const response = await fetch("/api/barber/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    schoolData,
                    role: userRole
                })
            })

            const data = await response.json()
            
            if (data.success) {
                toast.success("Account created! Finalizing your professional portal...")
                
                // 2. Perform Shadow Authentication Handshake
                const supabase = createBrowserClient()
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password
                })

                if (signInError) {
                    console.error("[Register] Shadow Auth Failed:", signInError)
                    window.location.href = "/login?redirect=" + data.redirect
                    return
                }

                if (onSuccess) {
                    onSuccess(data.redirect)
                } else {
                    window.location.href = data.redirect
                }
            } else {
                throw new Error(data.error || "Enrollment failed")
            }
        } catch (err: any) {
            console.error("[Register] Error:", err)
            toast.error(err.message || "Failed to join program.")
        } finally {
            setIsRegistering(false)
        }
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-bold">First Name</label>
                    <input 
                        type="text" 
                        required 
                        minLength={2} 
                        placeholder="Lamont" 
                        value={formData.firstName} 
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                        className="w-full bg-background border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-bold">Last Name</label>
                    <input 
                        type="text" 
                        required 
                        minLength={2} 
                        placeholder="Evans" 
                        value={formData.lastName} 
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                        className="w-full bg-background border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                    />
                </div>
            </div>

            <BarberSchoolSelector onSelect={(data) => setSchoolData(data)} />

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-bold">Email Address</label>
                <input 
                    type="email" 
                    required 
                    placeholder="lamont@example.com" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    className="w-full bg-background border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-bold">Professional Role</label>
                <div className="grid grid-cols-1 gap-2">
                    {[
                        { id: "student", label: "Barber Student", sub: "I'm training for my professional license" },
                        { id: "instructor", label: "Barber Instructor", sub: "I manage a student training cohort" },
                        { id: "owner", label: "Barber School Owner", sub: "I manage school operations & performance" }
                    ].map((role) => (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => setUserRole(role.id as any)}
                            className={cn(
                                "flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left",
                                userRole === role.id 
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/5" 
                                    : "border-slate-100 dark:border-white/5 bg-muted/10 hover:border-slate-200"
                            )}
                        >
                            <span className="text-xs font-black uppercase tracking-tight text-foreground">{role.label}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{role.sub}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-bold">Phone Number</label>
                <input 
                    type="tel" 
                    required 
                    placeholder="(555) 000-0000" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-background border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-bold">Create Password</label>
                <input 
                    type="password" 
                    required 
                    minLength={6}
                    placeholder="••••••••" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-background border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 font-bold">Confirm Password</label>
                <input 
                    type="password" 
                    required 
                    minLength={6}
                    placeholder="••••••••" 
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="w-full bg-background border-2 border-slate-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm font-bold focus:border-primary focus:ring-0 transition-all outline-none" 
                />
            </div>

            <div className="pt-4 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-200 text-primary focus:ring-primary" required />
                    <span className="text-[10px] text-muted-foreground font-bold leading-relaxed group-hover:text-foreground transition-colors cursor-pointer">
                        I agree to the <Link href="/terms-of-service" className="text-primary underline">Terms of Service</Link> and <Link href="/privacy-policy" className="text-primary underline">Privacy Policy</Link>. I consent to receive SMS updates regarding my portal performance.
                    </span>
                </label>

                <Button 
                    disabled={isRegistering}
                    className="w-full bg-primary text-white hover:bg-slate-950 py-7 lg:py-8 text-sm font-black uppercase tracking-[0.3em] rounded-xl lg:rounded-2xl transition-all shadow-xl"
                >
                    {isRegistering ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Finalizing Enrollment...
                        </>
                    ) : (
                        <>
                            Access My Dashboard
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
