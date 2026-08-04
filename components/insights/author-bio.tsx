import Image from "next/image"
import { ShieldCheck, Linkedin, ArrowRight } from "lucide-react"
import { AUTHOR } from "@/lib/author"

export function AuthorBio() {
  return (
    <div className="mt-20 py-12 border-t border-border/50">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="relative shrink-0">
          <div className="h-24 w-24 rounded-2xl overflow-hidden shadow-xl shadow-primary/20 border-2 border-primary/10">
            <Image
              src={AUTHOR.image}
              alt={AUTHOR.name}
              width={96}
              height={96}
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-md border border-border">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
            <h3 className="text-xl font-black uppercase italic tracking-tighter text-foreground">
              {AUTHOR.name}
            </h3>
            <span className="hidden md:block text-border">|</span>
            <span className="text-xs font-black uppercase tracking-widest text-primary">
              {AUTHOR.jobTitle}
            </span>
          </div>
          
          <p className="text-base text-muted-foreground leading-relaxed font-medium mb-6 max-w-2xl">
            {AUTHOR.description}
          </p>
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <a 
              href={AUTHOR.linkedin} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors"
            >
              <Linkedin className="h-4 w-4" />
              Professional Profile
            </a>
            <span className="text-border">/</span>
            <a 
              href="/#contact"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground hover:text-primary transition-colors"
            >
              Inquire for Architecture Consulting
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
