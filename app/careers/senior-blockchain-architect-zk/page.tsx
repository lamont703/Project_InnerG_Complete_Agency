"use client"

import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { ArrowLeft, CheckCircle2, Target, Cpu, Users, Zap, ShieldAlert, BadgeDollarSign, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SeniorBlockchainArchitectRolePage() {
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
                 <MapPin className="h-3 w-3 text-primary" /> Remote / Global Hubs
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest font-bold">
                 <BadgeDollarSign className="h-3 w-3 text-primary" /> Top-tier Base + Token/Equity Grants
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl uppercase italic leading-tight">
              Senior Blockchain Architect,<br />
              <span className="text-primary">Protocol & ZK Systems</span>
            </h1>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-16">
              
              {/* Role Summary */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6 uppercase tracking-tight flex items-center gap-3">
                  <Target className="h-6 w-6 text-primary" /> Role Summary
                </h2>
                <div className="prose max-w-none text-muted-foreground leading-relaxed space-y-4">
                  <p>
                    We are seeking a Senior Blockchain Architect to own the structural integrity of our decentralized systems. You will not just be deploying contracts; you will be architecting immutable infrastructure that secures high-value assets.
                  </p>
                  <p>
                    You will lead the decision-making process on consensus mechanisms, Layer-2 scaling solutions (ZK-Rollups/Optimistic), and cross-chain interoperability. You must possess the mathematical depth to audit cryptographic primitives and the engineering pragmatism to ship production-grade code.
                  </p>
                </div>
              </section>

              {/* Key Responsibilities */}
              <section className="space-y-10">
                <h2 className="text-2xl font-bold text-foreground uppercase tracking-tight flex items-center gap-3">
                  <Zap className="h-6 w-6 text-primary" /> Key Responsibilities
                </h2>

                <div className="space-y-8">
                  <div className="glass-panel p-6 rounded-2xl border border-border/50">
                    <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-primary" />
                       1. Protocol Architecture & Consensus
                    </h3>
                    <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Design the Trust Layer:</strong> Define the core architectural patterns—choosing between Layer 1 execution vs. Layer 2 scaling based on game-theoretic security analysis, not just hype.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Interoperability Strategy:</strong> Architect secure bridging solutions (using standards like IBC or LayerZero) to ensure our ecosystem creates composability without introducing "honey pot" vulnerabilities.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Tokenomics Engineering:</strong> Partner with economists to code the monetary policy directly into the protocol. Ensure mechanism design prevents Sybil attacks and incentivizes honest validator behavior.</li>
                    </ul>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-border/50">
                    <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-primary" />
                       2. Advanced Cryptography & Security
                    </h3>
                    <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Zero-Knowledge Implementation:</strong> Lead the integration of zk-SNARKs/STARKs for privacy-preserving transactions and scalability. You should understand the trade-offs between proof generation time and verification cost.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Institutional Security:</strong> Design MPC (Multi-Party Computation) custody solutions and hardware security module (HSM) integrations. You are the final gatekeeper against key exfiltration.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Formal Verification:</strong> Move beyond unit tests. Implement formal verification methods (using tools like Certora or K Framework) to mathematically prove smart contract correctness before mainnet deployment.</li>
                    </ul>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-border/50">
                    <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                       <div className="h-2 w-2 rounded-full bg-primary" />
                       3. High-Performance Systems
                    </h3>
                    <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Gas Optimization:</strong> Architect contracts that are hyper-optimized for the EVM (or SVM/WASM), utilizing inline assembly (Yul) where necessary to minimize execution costs for users.</li>
                      <li className="flex gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" /> <strong>Off-Chain/On-Chain Hybrid:</strong> Design high-throughput architectures that intelligently offload computation to off-chain sequencers or oracles (e.g., Chainlink DONs) while maintaining on-chain verifiability.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Elite Qualifications */}
              <section>
                <h2 className="text-2xl font-bold text-foreground mb-6 uppercase tracking-tight flex items-center gap-3">
                  <ShieldAlert className="h-6 w-6 text-primary" /> Elite Qualifications
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { label: "Experience", desc: "7+ years in distributed systems, with 4+ years specifically architecting protocols in production (DeFi, L1/L2 Infrastructure)." },
                    { label: "The Stack", desc: "Mastery of Solidity (Yul) and Rust (for Solana/Substrate). Deep familiarity with Go (Geth forks) for node infrastructure." },
                    { label: "Cryptographic Depth", desc: "Understand elliptic curve pairing, polynomial commitments, and can explain trusted setup ceremony requirements for a ZK circuit." },
                    { label: "EVM Internals", desc: "Understand EVM at the opcode level. Know exactly how storage slots are packed and how DELEGATECALL changes context." },
                    { label: "War Stories", desc: "Successfully navigated a mainnet launch, handled a live incident (war room), and conducted post-mortems on smart contract exploits." }
                  ].map((qual) => (
                    <div key={qual.label} className="p-5 rounded-xl bg-secondary/30 border border-border">
                       <div className="text-primary font-black uppercase text-[10px] tracking-widest mb-2">{qual.label}</div>
                       <div className="text-foreground text-sm font-medium leading-relaxed">{qual.desc}</div>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* Sidebar Sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                <div className="glass-panel p-8 rounded-2xl border border-primary/20 glow-primary text-center">
                   <Users className="h-12 w-12 text-primary mx-auto mb-6" />
                   <h3 className="text-xl font-bold text-foreground mb-2">Ready to Build?</h3>
                   <p className="text-sm text-muted-foreground mb-8">
                     We are only accepting applications from high-agency individuals who can demonstrate a track record of institutional-grade Blockchain architecture.
                   </p>
                   <Button size="lg" className="w-full font-bold uppercase tracking-widest py-6 bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                     <Link href="/careers/apply?role=senior-blockchain-architect-zk">Apply for Role</Link>
                   </Button>
                </div>
                
                <div className="p-6 rounded-2xl border border-border bg-secondary/20">
                   <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Interview Process</h4>
                   <div className="space-y-4">
                      {[
                        "Institutional Alignment Call",
                        "Technical Architecture Assessment",
                        "Cryptographic & Protocol Deep Dive",
                        "Founder's Vision Session"
                      ].map((step, i) => (
                        <div key={step} className="flex gap-3 items-center">
                           <div className="h-6 w-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-primary">0{i+1}</div>
                           <div className="text-xs font-semibold text-foreground">{step}</div>
                        </div>
                      ))}
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
