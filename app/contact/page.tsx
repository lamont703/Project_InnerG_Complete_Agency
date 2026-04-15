"use client"

import { useState } from "react"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { 
  Mail, 
  MessageSquare, 
  Send, 
  Building2, 
  Globe, 
  ArrowRight, 
  CheckCircle2, 
  Loader2,
  Clock,
  Sparkles,
  ShieldCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  return (
    <main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">
      <Navbar />

      {/* Header Section */}
      <section className="relative py-20 sm:py-32 overflow-hidden border-b border-border/50">
        <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/10 animate-float" />
        <GlowOrb className="bottom-1/4 -right-32 h-80 w-80 bg-primary/5 animate-float-delayed" />
        
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 border border-primary/20 bg-primary/5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">Architecture Inquiry</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-foreground sm:text-7xl uppercase italic leading-none">
              Initiate <span className="text-primary italic">Intelligence</span> Deployment
            </h1>
            <p className="mt-8 text-xl text-muted-foreground leading-relaxed text-balance font-medium">
              Ready to architect your sovereign intelligence layer? Our team handles complex ADI deployments 
              for elite grooming, beauty, and wellness enterprises.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="relative flex-1 py-16 sm:py-24 bg-secondary/5">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            
            {/* Left side: Info */}
            <div className="space-y-12">
              <div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-foreground mb-6">
                  Communication Channels
                </h2>
                <div className="grid gap-6">
                  <div className="group flex items-center gap-4 p-6 rounded-2xl border border-border bg-white hover:shadow-xl transition-all duration-300">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <Mail className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contact Support</div>
                      <div className="text-lg font-bold text-foreground tracking-tight">info@innergcomplete.com</div>
                    </div>
                  </div>
                  
                  <div className="group flex items-center gap-4 p-6 rounded-2xl border border-border bg-white hover:shadow-xl transition-all duration-300">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <Globe className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Global Headquarters</div>
                      <div className="text-lg font-bold text-foreground tracking-tight">Atlanta, Georgia</div>
                    </div>
                  </div>

                  <div className="group flex items-center gap-4 p-6 rounded-2xl border border-border bg-white hover:shadow-xl transition-all duration-300">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      <Clock className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Response Time</div>
                      <div className="text-lg font-bold text-foreground tracking-tight">Within 12 Business Hours</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="p-8 rounded-3xl border border-primary/20 bg-primary/5 relative overflow-hidden group">
                <ShieldCheck className="absolute -right-8 -bottom-8 h-32 w-32 text-primary/5 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Engagement Security</h3>
                  <p className="text-sm text-balance text-muted-foreground font-medium leading-relaxed">
                    All initial discovery communications are governed by our CPMAI Phase I methodology. 
                    We maintain strict HIPAA-compliant data boundaries for all potential clinical and wellness partners.
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: Form */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/5 blur-3xl -z-10 rounded-full opacity-50" />
              <div className="glass-panel p-8 sm:p-12 rounded-3xl border-border/50 bg-white/80 backdrop-blur-xl shadow-2xl relative">
                
                {isSubmitted ? (
                  <div className="py-12 text-center animate-in fade-in zoom-in duration-500">
                    <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                      <CheckCircle2 className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic text-foreground mb-4">Protocol Initiated</h2>
                    <p className="text-muted-foreground font-medium mb-8">
                      Your transmission has been received. Our lead architect will review your data and respond shortly.
                    </p>
                    <Button 
                      onClick={() => setIsSubmitted(false)}
                      variant="outline"
                      className="border-primary/20 text-primary hover:bg-primary/5 px-8 font-black uppercase tracking-widest"
                    >
                      New Transmission
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Full Name</label>
                        <input 
                          required
                          type="text" 
                          placeholder="John Doe"
                          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Enterprise Email</label>
                        <input 
                          required
                          type="email" 
                          placeholder="ceo@enterprise.com"
                          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Organization Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <input 
                          required
                          type="text" 
                          placeholder="e.g. aesthetic.ai"
                          className="w-full bg-secondary/30 border border-border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Market Sector</label>
                      <select className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all font-medium appearance-none cursor-pointer">
                        <option>Barber Grooming</option>
                        <option>Medical Spa</option>
                        <option>Luxury Salon</option>
                        <option>Fitness Franchise</option>
                        <option>Other Wellness Enterprise</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Message / Deployment Context</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/40" />
                        <textarea 
                          required
                          rows={4}
                          placeholder="Tell us about the intelligence gap you're looking to bridge..."
                          className="w-full bg-secondary/30 border border-border rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/30 font-medium resize-none"
                        ></textarea>
                      </div>
                    </div>

                    <Button 
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-8 text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-primary/20 group transition-all active:scale-[0.98]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-3" />
                          Calibrating Transmission...
                        </>
                      ) : (
                        <>
                          Send Message
                          <ArrowRight className="h-4 w-4 ml-3 group-hover:translate-x-2 transition-transform" />
                        </>
                      )}
                    </Button>

                    <p className="text-[9px] text-center text-muted-foreground font-black uppercase tracking-widest mt-6">
                      By submitting you agree to our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>
                    </p>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
