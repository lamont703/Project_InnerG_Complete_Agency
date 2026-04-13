"use client"

import { Quote } from "lucide-react"

export function FoundersVision() {
    return (
        <section className="relative py-32 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-3xl rounded-full" aria-hidden="true" />

            <div className="relative z-10 mx-auto max-w-5xl px-6">
                <div className="glass-panel-strong rounded-3xl p-8 md:p-16 text-center group">
                    <div className="mb-8 inline-flex items-center justify-center rounded-full bg-primary/10 p-4 text-primary">
                        <Quote className="h-8 w-8" />
                    </div>

                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-primary mb-8">Architectural Vision</h2>
                    
                    <div className="mt-8 space-y-6">
                        <p className="text-2xl md:text-3xl lg:text-4xl leading-tight text-foreground font-black uppercase italic tracking-tighter">
                            "We are building the sovereign <span className="text-primary italic">Intelligence Layer</span> of the global aesthetic industry."
                        </p>

                        <p className="max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed font-medium">
                            Our mission is to architect the core **Artificial Domain Intelligence (ADI)** models that will power every elite wellness workflow, clinical diagnostic, and luxury client journey of the next decade.
                        </p>
                    </div>

                    <div className="mt-12 flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary to-accent mb-4" />
                        <div className="text-center">
                            <span className="block text-lg font-bold text-foreground">Inner G Complete Leadership</span>
                            <span className="text-sm text-primary font-medium uppercase tracking-widest">Bridging Innovation & Reality</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
