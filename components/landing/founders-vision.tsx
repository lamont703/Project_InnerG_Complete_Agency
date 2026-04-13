"use client"

import { Quote } from "lucide-react"

export function FoundersVision() {
    return (
        <section className="relative py-32 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-3xl rounded-full" aria-hidden="true" />

            <div className="relative z-10 mx-auto max-w-5xl px-6">
                <div className="glass-panel-strong rounded-3xl p-8 md:p-16 text-center">
                    <div className="mb-8 inline-flex items-center justify-center rounded-full bg-primary/10 p-4 text-primary">
                        <svg
                            className="h-8 w-8"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V12C14.017 12.5523 13.5693 13 13.017 13H11.017C10.4647 13 10.017 12.5523 10.017 12V9C10.017 7.34315 11.3601 6 13.017 6H19.017C20.6739 6 22.017 7.34315 22.017 9V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM4.01695 21L4.01695 18C4.01695 16.8954 4.91238 16 6.01695 16H9.01695C9.56924 16 10.0169 15.5523 10.0169 15V9C10.0169 8.44772 9.56924 8 9.01695 8H5.01695C4.46467 8 4.01695 8.44772 4.01695 9V12C4.01695 12.5523 3.56924 13 3.01695 13H1.01695C0.46467 13 -3.05176e-05 12.5523 -3.05176e-05 12V9C-3.05176e-05 7.34315 1.34312 6 3.01695 6H9.01695C10.6738 6 12.0169 7.34315 12.0169 9V15C12.0169 18.3137 9.33066 21 6.01695 21H4.01695Z" />
                        </svg>
                    </div>

                    <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Our Vision</h2>

                    <div className="mt-8 space-y-6">
                        <p className="text-xl md:text-2xl leading-relaxed text-foreground font-medium italic">
                            "At Inner G Complete Agency, we believe that the intersection of technology and personal service is the next frontier of enterprise growth. Our mission is to bridge the gap between complex AI and Blockchain innovation and the aesthetic needs of the world's most elite wellness and grooming brands."
                        </p>

                        <p className="text-lg text-muted-foreground leading-relaxed">
                            We focus on service-centric integration—ensuring that every line of code we write and every strategy we architect enhances the human touch that defines your brand's market authority.
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
