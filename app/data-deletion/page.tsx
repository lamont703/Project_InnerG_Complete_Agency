import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export const metadata = {
  title: "Data Deletion Instructions | Inner G Complete Agency",
  description: "Instructions on how to request the deletion of your data from Inner G Complete Agency.",
}

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="relative pt-32 pb-20 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 opacity-50" />
        <div className="absolute bottom-40 left-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] -z-10 opacity-30" />

        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
              Data Deletion Instructions
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              At Inner G Complete Agency, we value your privacy and provide you with full control over the data shared through our applications, including those connected via Meta (Facebook/Instagram).
            </p>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="bg-secondary/20 border border-border/50 rounded-2xl p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-foreground mb-4">How to Request Data Deletion</h2>
              <p className="text-muted-foreground mb-6">
                If you wish to delete your user data associated with our application, you may do so at any time by sending a formal request to our support team.
              </p>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-background/50 rounded-xl border border-primary/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Email your request to:</p>
                  <a 
                    href="mailto:info@innergcomplete.com" 
                    className="text-primary font-bold hover:underline transition-all"
                  >
                    info@innergcomplete.com
                  </a>
                </div>
                <div className="h-px w-full sm:h-12 sm:w-px bg-border sm:block hidden" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Please include "Data Deletion Request" in the subject line for faster processing.</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">What happens next?</h2>
              <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                <li>Upon receiving your email, our team will verify your identity to ensure the security of your data.</li>
                <li>We will process your request within 30 days of verification.</li>
                <li>Once the deletion is complete, we will send you a confirmation email.</li>
                <li>Please note that some data may be retained if required by law or for legitimate business purposes as outlined in our <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">Facebook Platform Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have connected our application through Facebook, you can also manage your data permissions directly through your Facebook settings:
              </p>
              <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
                <li>Go to your Facebook Profile's <strong>Settings & Privacy</strong>.</li>
                <li>Click <strong>Settings</strong>.</li>
                <li>Go to <strong>Apps and Websites</strong> and you will see all of the apps and websites you've linked to your Facebook.</li>
                <li>Find <strong>Inner G Complete Agency</strong> and click <strong>Remove</strong>.</li>
              </ol>
            </section>

            <div className="pt-10 border-t border-border">
              <p className="text-sm text-muted-foreground italic">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
