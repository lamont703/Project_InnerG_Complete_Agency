import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export const metadata = {
  title: "Terms of Service | Inner G Complete Agency",
  description: "Terms of Service for Inner G Complete Agency services and platform.",
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-24 sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8">Terms of Service</h1>
        
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p className="mt-4">
              Welcome to Inner G Complete Agency. These Terms of Service ("Terms") govern your access to and use of our 
              website, products, and services ("Services"). By accessing or using our Services, you agree to be bound by 
              these Terms and our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">1. Description of Service</h2>
            <p className="mt-4">
              Inner G Complete Agency provides AI and Blockchain innovation services, consulting, and technological 
              solutions designed for small to medium businesses. Our services include but are not limited to AI strategy, 
              system implementation, and digital transformation consulting.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">2. User Accounts</h2>
            <p className="mt-4">
              To access certain features of our platform, you may be required to create an account. You are responsible 
              for maintaining the confidentiality of your account credentials and for all activities that occur under your account. 
              You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">3. Intellectual Property Rights</h2>
            <p className="mt-4">
              The Services and their original content, features, and functionality are and will remain the exclusive 
              property of Inner G Complete Agency and its licensors. Our trademarks and trade dress may not be used 
              in connection with any product or service without the prior written consent of Inner G Complete Agency.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">4. Prohibited Activities</h2>
            <p className="mt-4">
              You agree not to engage in any of the following prohibited activities:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Copying, distributing, or disclosing any part of the Services in any medium.</li>
              <li>Using any automated system, including "robots," "spiders," or "offline readers," to access the Services.</li>
              <li>Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Services.</li>
              <li>Taking any action that imposes an unreasonable or disproportionately large load on our infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">5. Termination</h2>
            <p className="mt-4">
              We may terminate or suspend your account and bar access to the Services immediately, without prior notice 
              or liability, under our sole discretion, for any reason whatsoever and without limitation, including but 
              not limited to a breach of the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">6. Limitation of Liability</h2>
            <p className="mt-4">
              In no event shall Inner G Complete Agency, nor its directors, employees, partners, agents, suppliers, or 
              affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including 
              without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your 
              access to or use of or inability to access or use the Services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">7. Governing Law</h2>
            <p className="mt-4">
              These Terms shall be governed and construed in accordance with the laws of the United States, without 
              regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms 
              will not be considered a waiver of those rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">8. Contact Us</h2>
            <p className="mt-4">
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Inner G Complete Agency</strong><br />
              Email: support@lamont.innergcomplete.com
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  )
}
