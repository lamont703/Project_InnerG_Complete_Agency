import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { ProcessSection } from "@/components/process-section"
import { FeatureHighlight } from "@/components/feature-highlight"
import { FoundersVision } from "@/components/founders-vision"
import { SolutionsSection } from "@/components/solutions-section"
import { ResultsSection } from "@/components/results-section"
import { TestimonialsSection } from "@/components/testimonials-section"
import { CtaSection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

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
