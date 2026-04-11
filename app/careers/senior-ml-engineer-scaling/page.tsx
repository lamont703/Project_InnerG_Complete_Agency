"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowLeft, CheckCircle2, Cpu, Server, Zap, ShieldAlert, BadgeDollarSign, MapPin, Database, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SeniorMLEngineerPage() {
  return (
    <main className="min-h-screen bg-background light text-foreground">
      <Navbar />

      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="mx-auto max-w-5xl px-6">
          <Link 
            href="/careers" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Careers
          </Link>

          <header className="mb-12">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-[10px] font-black text-primary uppercase tracking-[0.2em] border border-primary/20">Institutional Role</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest font-bold">
                 <MapPin className="h-3 w-3 text-primary" /> Remote-First
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest font-bold">
                 <BadgeDollarSign className="h-3 w-3 text-primary" /> Top-of-Market + Equity
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl uppercase italic leading-tight">
              Senior Machine Learning Engineer,<br />
              <span className="text-primary underline decoration-primary/30 underline-offset-8">Foundational Systems</span>
            </h1>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-16">
              
              {/* Role Summary */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6 uppercase tracking-tight flex items-center gap-3">
                  <Cpu className="h-6 w-6 text-primary" /> Role Summary
                </h2>
                <div className="prose max-w-none text-muted-foreground leading-relaxed space-y-4 font-medium">
                  <p>
                    We are looking for a Senior Machine Learning Engineer to lead the technical architecture and scaling of our AI systems. This is not a "plug-and-play" role using off-the-shelf APIs. 
                  </p>
                  <p>
                    You will design, build, and optimize the core engines of our product—ranging from fine-tuning large-scale models to architecting high-throughput, low-latency inference pipelines. You are an engineer first, a scientist second, and a systems thinker always.
                  </p>
                </div>
              </section>

              {/* Key Responsibilities */}
              <section className="space-y-12">
                <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight flex items-center gap-3">
                  <Zap className="h-6 w-6 text-primary" /> Key Responsibilities
                </h2>

                <div className="space-y-10">
                  <div className="glass-panel p-7 rounded-2xl border border-border/50 bg-secondary/5">
                    <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                       <Database className="h-5 w-5 text-primary" />
                       1. Model Development & Fine-Tuning
                    </h3>
                    <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Architect Neural Systems:</strong> Select, adapt, and implement state-of-the-art architectures (Transformers, Diffusion, SSMs).</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Advanced Tuning:</strong> Lead implementation of fine-tuning strategies including LoRA/QLoRA, RLHF, and DPO.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>RAG & Retrieval:</strong> Build sophisticated Retrieval-Augmented Generation (RAG) systems, optimizing vector DB indexing and hybrid search.</li>
                    </ul>
                  </div>

                  <div className="glass-panel p-7 rounded-2xl border border-border/50 bg-secondary/5">
                    <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                       <Server className="h-5 w-5 text-primary" />
                       2. Engineering & Infrastructure (Scaling)
                    </h3>
                    <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Distributed Training:</strong> Manage training runs across multi-GPU/TPU clusters using PyTorch FSDP, DeepSpeed, or Ray.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Production Inference:</strong> Optimize models (Quantization, Distillation) for sub-second latency and high concurrency.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Data Flywheels:</strong> Build automated pipelines for synthetic data generation and gold-standard evaluation sets.</li>
                    </ul>
                  </div>

                  <div className="glass-panel p-7 rounded-2xl border border-border/50 bg-secondary/5">
                    <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                       <ShieldAlert className="h-5 w-5 text-primary" />
                       3. Evaluation & Reliability
                    </h3>
                    <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Quantifying Quality:</strong> Build rigorous, product-aligned evaluation harnesses (perplexity, factual accuracy, safety).</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Observability:</strong> Implement monitoring for model drift and silent failures in production.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Elite Qualifications */}
              <section>
                <div className="flex items-center gap-3 mb-8">
                    <Code2 className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight">Elite Qualifications</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: "Experience", desc: "6+ years software engineering, 4+ years building/deploying ML models at scale." },
                    { label: "The Stack", desc: "Deep mastery of PyTorch or JAX. Expert Python + C++/Rust/CUDA experience." },
                    { label: "Infrastructure", desc: "Cloud-native. Hands-on with K8s, Docker, SageMaker, or Vertex AI." },
                    { label: "Mathematical Depth", desc: "Strong linear algebra/calculus. Can implement ArXiv papers from scratch in 48h." },
                    { label: "Execution", desc: "Deep debug capability. Can identify bottlenecks in gradient flow or data loaders." }
                  ].map((qual) => (
                    <div key={qual.label} className="p-6 rounded-2xl bg-secondary/30 border border-border hover:bg-secondary/40 transition-colors">
                       <div className="text-primary font-black uppercase text-[10px] tracking-widest mb-2">{qual.label}</div>
                       <div className="text-foreground text-sm font-bold leading-relaxed">{qual.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* Sidebar Sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div className="glass-panel p-8 rounded-2xl border border-primary/20 glow-primary text-center bg-primary/5">
                   <Server className="h-12 w-12 text-primary mx-auto mb-6 opacity-80" />
                   <h3 className="text-xl font-bold text-foreground mb-2">Architect the Engine</h3>
                   <p className="text-sm text-muted-foreground mb-8">
                     We are seeking systems thinkers who view code as infrastructure. Join us in building the most robust AI OS in existence.
                   </p>
                   <Button size="lg" className="w-full font-bold uppercase tracking-widest py-6 bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                     <Link href="/careers/apply?role=senior-ml-engineer-scaling">Apply for Role</Link>
                   </Button>
                </div>
                
                <div className="p-6 rounded-2xl border border-border bg-secondary/20 font-mono text-xs">
                   <div className="text-muted-foreground uppercase mb-4">// Deployment_Stack</div>
                   <div className="space-y-2">
                       <div className="flex justify-between border-b border-border/50 pb-2">
                           <span className="text-primary">Framework:</span>
                           <span className="text-foreground">PyTorch / JAX</span>
                       </div>
                       <div className="flex justify-between border-b border-border/50 pb-2">
                           <span className="text-primary">Optimization:</span>
                           <span className="text-foreground">TRT / ONNX</span>
                       </div>
                       <div className="flex justify-between border-b border-border/50 pb-2">
                           <span className="text-primary">Orchestration:</span>
                           <span className="text-foreground">K8s / Ray</span>
                       </div>
                       <div className="flex justify-between">
                           <span className="text-primary">Hardware:</span>
                           <span className="text-foreground">H100 Clusters</span>
                       </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
