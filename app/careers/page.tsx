"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowRight, Sparkles, Brain, Code2, Globe, Shield, Zap, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function GlowOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  )
}

export default function CareersPage() {
  return (
    <main className="min-h-screen bg-background light text-foreground">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-32 pb-20">
        <GlowOrb className="top-1/4 -left-32 h-96 w-96 bg-primary/20 animate-float" />
        <GlowOrb className="bottom-1/4 -right-32 h-80 w-80 bg-primary/15 animate-float-delayed" />
        
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full glass-panel px-5 py-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary tracking-wide uppercase">Inner G Complete Agency</span>
          </div>
          
          <h1 className="text-5xl font-black leading-[1.1] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl uppercase italic">
            <span className="text-balance block text-foreground">
              Build the Future
            </span>
            <span className="text-balance block text-primary mt-2">
              Of Intelligence
            </span>
          </h1>
          
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl text-balance font-medium">
            We don't just use AI—we architect the cognitive infrastructures that power the next generation of global industry. Join a team of elite engineers and product managers delivering high-grade custom AI and Blockchain solutions to global enterprises and mature startups.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 px-10 py-8 text-lg font-bold glow-primary uppercase tracking-widest"
              asChild
            >
              <Link href="#roles">
                Explore Elite Roles
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Values / Culture Section */}
      <section className="relative py-24 bg-secondary/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl uppercase italic">Institutional Philosophy</h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              We operate at the intersection of Deep Work and Strategic Freedom. Our culture is optimized for high-agency individuals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Brain,
                title: "Cognitive Excellence",
                desc: "We prioritize deep, focused work over busyness. Our systems are built using the highest standards of CPMAI methodology."
              },
              {
                icon: Target,
                title: "Strategic Autonomy",
                desc: "We hire elite talent and grant full ownership. At InnerG, you own your outcomes and the path to achieving them."
              },
              {
                icon: Zap,
                title: "Velocity & Impact",
                desc: "We move at the speed of the neural web. We value rapid iteration and the measurable business impact of our architecture."
              }
            ].map((value) => (
              <div key={value.title} className="glass-panel p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-24 border-y border-border">
        <div className="mx-auto max-w-7xl px-6 lg:flex lg:items-center lg:gap-16">
          <div className="lg:flex-1">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-4 block">The Opportunity</span>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-8 leading-tight">Architect Enterprise-Grade AI & Blockchain Solutions</h2>
            <div className="space-y-6">
              {[
                { icon: Globe, label: "Remote-First Global Infrastructure", desc: "Work from anywhere on the planet with our high-synchronicity digital workspace." },
                { icon: Shield, label: "Equity & Ownership", desc: "We are building the future, and we want our builders to own a piece of it." },
                { icon: Code2, label: "State-of-the-Art Tech", desc: "Gain mastery over LLM Chaining, SMC/ICT Intelligence, and Cross-Chain Blockchain systems." }
              ].map((item) => (
                <div key={item.label} className="flex gap-4 p-4 rounded-xl hover:bg-secondary/30 transition-colors">
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center border border-border">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{item.label}</div>
                    <div className="text-sm text-muted-foreground mt-1">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-16 lg:mt-0 lg:flex-1">
             <div className="relative glass-panel aspect-square rounded-3xl overflow-hidden shadow-2xl glow-primary">
                {/* Visual Representation of Agentic System */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/10" />
                <div className="absolute inset-0 bg-grid-white/[0.02]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full p-8">
                   <Brain className="h-32 w-32 text-primary mx-auto mb-6 opacity-80" />
                   <div className="text-2xl font-black text-foreground uppercase tracking-widest italic mb-2">Neural Operations</div>
                   <div className="text-xs text-muted-foreground font-mono uppercase tracking-[0.2em] animate-pulse">Synchronizing Intelligence...</div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Open Roles Section */}
      <section id="roles" className="py-24 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <div className="inline-block p-1 rounded-full bg-secondary/50 border border-border mb-8">
                <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary tracking-widest uppercase">Open Positions</div>
            </div>
            <h2 className="text-4xl font-bold text-foreground mb-6 uppercase tracking-tight italic text-primary">Join the Elite 1%</h2>
            <p className="text-muted-foreground mb-12 max-w-xl mx-auto">
                We are currently expanding our institutional intelligence team. We are looking for architects, and innovators who thrive in the transition from deterministic to probabilistic systems.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            {/* Senior PM */}
            <Link 
              href="/careers/senior-product-manager-ai"
              className="group glass-panel p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.01] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 rounded bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">Product</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Full-Time / Remote</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">Senior Product Manager, AI & Agentic Systems</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl text-balance">
                  Lead the shift from deterministic software to probabilistic AI. Own the lifecycle from "vague research" to "production-grade agentic deployment."
                </p>
              </div>
              <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-[0.2em] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
                View Role <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            {/* Senior ML Engineer */}
            <Link 
              href="/careers/senior-ml-engineer-scaling"
              className="group glass-panel p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.01] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 rounded bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">Engineering</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Full-Time / Remote</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">Senior Machine Learning Engineer (Foundational Systems)</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl text-balance">
                  Architect neural systems and scale inference pipelines. Lead the technical charge from distributed training to CUDA-level performance optimization.
                </p>
              </div>
              <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-[0.2em] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
                View Role <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            {/* Senior Blockchain Architect */}
            <Link 
              href="/careers/senior-blockchain-architect-zk"
              className="group glass-panel p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-all hover:scale-[1.01] flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-1 rounded bg-primary/10 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">Web3 / ZK</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Full-Time / Remote</span>
                </div>
                <h3 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">Senior Blockchain Architect (Protocol & ZK Systems)</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl text-balance">
                  Own the structural integrity of our decentralized systems. Architect immutable infrastructure, consensus mechanisms, and Layer-2 scaling solutions.
                </p>
              </div>
              <div className="flex items-center gap-2 text-primary font-bold uppercase text-xs tracking-[0.2em] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-4 sm:mt-0">
                View Role <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>

          <div className="mt-20 p-8 glass-panel border border-primary/20 rounded-2xl relative overflow-hidden max-w-3xl mx-auto text-center">
                <div className="absolute top-0 right-0 p-3 opacity-20">
                    <Zap className="h-24 w-24 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">Don't see your fit?</h3>
                <p className="text-sm text-muted-foreground mb-8">
                    We are always searching for the top 1% of talent even if a role isn't listed. Join our private talent pool for early access to future institutional openings.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                    <input 
                        type="email" 
                        placeholder="your@email.com" 
                        className="flex-1 px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary/50 outline-none transition-colors text-foreground text-sm"
                    />
                    <Button className="px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs">Join Pool</Button>
                </div>
            </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
