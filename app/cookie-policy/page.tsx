import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export const metadata = {
  title: "Cookie Policy | Inner G Complete Agency",
  description: "Official institutional policy and governance documentation for Inner G Complete Agency.",
  openGraph: {
    title: "Cookie Policy | Inner G Complete Agency",
    description: "Official institutional policy and governance documentation.",
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Inner G Complete Agency' }],
  },
  twitter: {
    card: "summary_large_image",
    images: ['/og-image.png'],
  },
}

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-24 sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8">Cookie Policy</h1>
        
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p className="mt-4">
              This Cookie Policy explains how Inner G Complete Agency ("we", "us", and "our") uses cookies and similar 
              technologies to recognize you when you visit our website. It explains what these technologies are and 
              why we use them, as well as your rights to control our use of them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">1. What are Cookies?</h2>
            <p className="mt-4">
              Cookies are small data files that are placed on your computer or mobile device when you visit a website. 
              Cookies are widely used by website owners in order to make their websites work, or to work more efficiently, 
              as well as to provide reporting information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">2. Why do we use Cookies?</h2>
            <p className="mt-4">
              We use first-party and third-party cookies for several reasons. Some cookies are required for technical 
              reasons in order for our website to operate, and we refer to these as "essential" or "strictly necessary" 
              cookies. Other cookies also enable us to track and target the interests of our users to enhance the 
              experience on our Online Sections.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">3. Types of Cookies we use</h2>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Essential Cookies:</strong> These cookies are strictly necessary to provide you with services available through our website and to use some of its features, such as access to secure areas.</li>
              <li><strong>Analytics and Customization Cookies:</strong> These cookies collect information that is used either in aggregate form to help us understand how our website is being used or how effective our marketing campaigns are.</li>
              <li><strong>Functionality Cookies:</strong> These are used to recognize you when you return to our website. This enables us to personalize our content for you and remember your preferences.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">4. How can I control Cookies?</h2>
            <p className="mt-4">
              You have the right to decide whether to accept or reject cookies. You can set or amend your web browser 
              controls to accept or refuse cookies. If you choose to reject cookies, you may still use our website 
              though your access to some functionality and areas of our website may be restricted.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">5. Updates to this Cookie Policy</h2>
            <p className="mt-4">
              We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies 
              we use or for other operational, legal or regulatory reasons. Please therefore re-visit this Cookie Policy 
              regularly to stay informed about our use of cookies and related technologies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">6. Contact Us</h2>
            <p className="mt-4">
              If you have any questions about our use of cookies or other technologies, please email us at:
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
