import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"

export const metadata = {
  title: "Privacy Policy | Inner G Complete Agency App",
  description: "Privacy Policy for Inner G Complete Agency App services and platform.",
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-24 sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <p><strong>Last Updated:</strong> March 20, 2026</p>
            <p className="mt-4">
              At Inner G Complete Agency, we value your privacy and are committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our 
              website or use the <strong>Inner G Complete Agency App</strong>, a proprietary software built and managed by Inner G Complete Agency.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">1. Information We Collect</h2>
            <p className="mt-4">
              We may collect information about you in a variety of ways. The information we may collect includes:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, that you voluntarily give to us when you register with the site or when you choose to participate in various activities related to the site.</li>
              <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">2. Use of Your Information</h2>
            <p className="mt-4">
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the site to:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Create and manage your account.</li>
              <li>Deliver targeted advertising, coupons, newsletters, and other information regarding promotions and the site to you.</li>
              <li>Email you regarding your account or order.</li>
              <li>Fulfill and manage purchases, orders, payments, and other transactions related to the site.</li>
              <li>Increase the efficiency and operation of the site.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">3. Third-Party Social Media Integrations</h2>
            <p className="mt-4">
              Our Services allow you to connect third-party social media accounts, including TikTok, to sync and manage your content and analytics.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Information We Access:</strong> When you connect your TikTok account, we access your basic profile information (display name, avatar), account statistics (follower and heart counts), and your video content list via the TikTok Open API.</li>
              <li><strong>How We Use This Data:</strong> This information is used solely to provide integrated analytics, content drafting, and performance tracking within our platform.</li>
              <li><strong>Data Retention & Revocation:</strong> We store this information as long as your account is connected. You can disconnect your TikTok account at any time through our platform's Connectors page or by revoking access in your TikTok account settings. Upon disconnection, we will cease fetching new data and, upon request, delete previously synced content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">4. Disclosure of Your Information</h2>
            <p className="mt-4">
              We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
              <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">5. Security of Your Information</h2>
            <p className="mt-4">
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">6. Contact Us</h2>
            <p className="mt-4">
              If you have questions or comments about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              <strong>Inner G Complete Agency App</strong><br />
              Email: support@lamont.innergcomplete.com
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  )
}
