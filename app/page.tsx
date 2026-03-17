import { Navbar } from "@/components/layout/navbar"
import { HeroSection } from "@/components/landing/hero-section"
import { ServicesSection } from "@/components/landing/services-section"
import { ProcessSection } from "@/components/landing/process-section"
import { FeatureHighlight } from "@/components/landing/feature-highlight"
import { FoundersVision } from "@/components/landing/founders-vision"
import { SolutionsSection } from "@/components/landing/solutions-section"
import { ResultsSection } from "@/components/landing/results-section"
import { TestimonialsSection } from "@/components/landing/testimonials-section"
import { CtaSection } from "@/components/landing/cta-section"
import { Footer } from "@/components/layout/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <ProcessSection />
      <FeatureHighlight />
      <FoundersVision />
      <SolutionsSection />
      <ResultsSection />
      <TestimonialsSection />
      <CtaSection />
      <Footer />
    </main>
  )
}
