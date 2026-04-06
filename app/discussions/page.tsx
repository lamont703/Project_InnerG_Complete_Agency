"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { Button } from "@/components/ui/button"
import { ArrowRight, PlayCircle, Calendar, Users, Sparkles } from "lucide-react"
import Link from "next/link"

export default function DiscussionsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute top-1/4 -left-32 h-96 w-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 h-96 w-96 bg-accent/8 rounded-full blur-3xl animate-float-delayed" />
        
        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full glass-panel px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Thought Leadership</span>
            </div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl text-balance">
              Panel <span className="text-gradient">Discussions</span> & Strategic Insights
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl text-balance">
              We host regular virtual panel discussions designed to educate developers and provide strategic guidance for startups and enterprise-level projects. 
              Explore our latest thoughts on AI, Blockchain, and the future of digital innovation.
            </p>
          </div>
        </div>
      </section>

      {/* Main Discussion Section */}
      <section className="py-20 relative bg-secondary/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            
            {/* Video Player */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel-strong rounded-3xl overflow-hidden shadow-2xl border-white/5 aspect-video relative group">
                <iframe 
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/xJpAXsQmwyc" 
                  title="Inner G Complete Agency Discussion" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                ></iframe>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <PlayCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Initial Panel Discussion</h2>
                        <p className="text-sm text-muted-foreground">Premiered on School of Freelancer Freedom</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground bg-background/50 px-4 py-2 rounded-full border border-border">
                    <Calendar className="h-3.5 w-3.5" />
                    Latest Broadcast
                </div>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-8">
              <div className="glass-panel-strong rounded-2xl p-6 border-white/5">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Target Audience
                </h3>
                <ul className="space-y-4">
                    <li className="flex gap-3">
                        <div className="mt-1 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Developers</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Educational guidance and industry best practices.</p>
                        </div>
                    </li>
                    <li className="flex gap-3">
                        <div className="mt-1 h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">Startups & Enterprises</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Strategic insights for high-level project scaling.</p>
                        </div>
                    </li>
                </ul>
              </div>

              <div className="glass-panel-strong rounded-2xl p-6 border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-[60px] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                <h3 className="text-lg font-bold text-foreground mb-2 relative z-10">Next Steps</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed relative z-10">
                    Interested in how our AI and Blockchain expertise can specifically help your company achieve its growth targets?
                </p>
                <Button 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2 glow-primary"
                    asChild
                >
                    <Link href="/#contact">
                        Schedule Growth Audit
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to <span className="text-gradient">Innovate</span> Your Business?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Our panel discussions are just the beginning. We partner with leaders to architect solutions that drive real results.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="bg-primary text-primary-foreground gap-2 px-8 py-6 text-base glow-primary" asChild>
                <Link href="/#contact">
                    Get Started with a Growth Audit
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-border hover:bg-secondary/50 gap-2 px-8 py-6 text-base" asChild>
                <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
