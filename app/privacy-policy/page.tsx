import { Navbar } from "@/components/layout/navbar"
import { headers } from 'next/headers'
import Link from 'next/link'
import type { Metadata } from 'next'
import { SITE_HOST } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || SITE_HOST
  const isTexasBarbering = host.includes('texasbarbering')
  const tenantName = isTexasBarbering ? 'Texas Barbering Intelligence' : 'Inner G Complete Agency'

  return {
    title: `Privacy Policy | ${tenantName}`,
    description: `Official institutional policy and governance documentation for ${tenantName}.`,
    openGraph: {
      title: `Privacy Policy | ${tenantName}`,
      description: `Official institutional policy and governance documentation.`,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: tenantName }],
    },
    twitter: {
      card: "summary_large_image",
      images: ['/og-image.png'],
    },
  }
}

export default async function PrivacyPolicyPage() {
  const headersList = await headers()
  const host = headersList.get('host') || SITE_HOST
  const isTexasBarbering = host.includes('texasbarbering')
  const tenantName = isTexasBarbering ? 'Texas Barbering Intelligence' : 'Inner G Complete Agency'
  const supportEmail = isTexasBarbering ? 'support@texasbarbering.innergcomplete.com' : 'support@agency.innergcomplete.com'

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-24 sm:py-32">
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8">Privacy Policy</h1>
        
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-8 text-muted-foreground">
          <section>
            <p><strong>Last Updated:</strong> April 12, 2026</p>
            <p className="mt-4">
              At {tenantName}, we value your privacy and are committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our 
              website or use the <strong>{tenantName} Platform</strong>, a proprietary software built and managed by Inner G Complete Agency.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">1. HIPAA & Protected Health Information (PHI)</h2>
            <p className="mt-4">
              For clients in the healthcare, medical aesthetics, and wellness industries, we may handle Protected Health Information (PHI) as defined under the Health Insurance Portability and Accountability Act (HIPAA).
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2 text-sm sm:text-base">
              <li><strong>Business Associate Status:</strong> When Inner G Complete Agency provides services to a "Covered Entity," we act as a "Business Associate." Our handling of PHI is governed by a formal Business Associate Agreement (BAA) which must be executed prior to the transmission of any sensitive health data.</li>
              <li><strong>Technical Safeguards:</strong> For all HIPAA-governed environments, we implement rigorous safeguards including AES-256 data encryption at rest, TLS 1.2+ encryption in transit, Multi-Factor Authentication (MFA), and detailed audit logging.</li>
              <li><strong>Purpose-Bound Discovery:</strong> We do not use PHI for any purpose other than those explicitly specified in the client engagement or BAA. We do not sell or monetize PHI.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
            <p className="mt-4">
              We may collect information about you in a variety of ways. The information we may collect includes:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, that you voluntarily give to us when you register with the site or when you choose to participate in various activities related to the site.</li>
              <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">3. Use of Your Information</h2>
            <p className="mt-4">
              Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the site to:
            </p>
            <p className="mt-4">
              <strong>Scope:</strong> This section covers information you give us directly and information our servers
              collect from your use of the site. It does <strong>not</strong> apply to data obtained from a connected
              third-party account — data from a connected TikTok or Google Business Profile account is used only for the
              specific, limited purposes described in Sections 4 and 5 below, and never for advertising.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li>Create and manage your account.</li>
              <li>Deliver coupons, newsletters, and other information about promotions and the site, and show you relevant advertising based on your site activity and the contact details you provide. We do not use data obtained from a connected Google or TikTok account for advertising, and we do not use it to build advertising profiles.</li>
              <li>Email you regarding your account or order.</li>
              <li>Fulfill and manage purchases, orders, payments, and other transactions related to the site.</li>
              <li>Increase the efficiency and operation of the site.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the site.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">4. Third-Party Social Media Integrations</h2>
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
            <h2 className="text-2xl font-semibold text-foreground">5. Google Business Profile Integration</h2>
            <p className="mt-4">
              If you own or manage a business listed on ShearQuery, you may optionally connect your Google Business
              Profile to verify your ownership of that listing. This connection is entirely voluntary — the platform is
              fully usable without it — and it is granted through Google&apos;s own consent screen, which shows you
              exactly what you are approving before you approve it.
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>Information We Access:</strong> With your permission, we use the Google Business Profile APIs (the <code>business.manage</code> scope) to read the business listings your Google account manages — the business name, address, phone number, website, opening hours, business categories, and Google&apos;s identifier for the place. We also read the email address of the connecting Google account so we can show you which account is connected. We do not request or receive your Google password, your Gmail, your Drive files, your contacts, or any other Google data.</li>
              <li><strong>How We Use This Data:</strong> Solely to (a) confirm that you are the verified owner of a business listing on ShearQuery and link it to your account, (b) create your listing if the business is not in our directory yet, and (c) keep that listing&apos;s details accurate. We do not sell this data, share it with third parties for their own purposes, or use it for advertising or to build advertising profiles.</li>
              <li><strong>Data Storage:</strong> We store the business information listed above and the access and refresh tokens Google issues, so the connection can stay current without asking you to sign in repeatedly. Tokens are held server-side and are never exposed to browsers or to other users.</li>
              <li><strong>Data Retention &amp; Revocation:</strong> We keep this information for as long as your account stays connected. You can disconnect at any time from your account page, or revoke our access directly at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="underline">myaccount.google.com/permissions</a>. On disconnection we stop fetching new data from Google and delete the stored tokens; on request we will delete the business information we synced from your profile.</li>
              <li><strong>Limited Use:</strong> Our use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="underline">Google API Services User Data Policy</a>, including its Limited Use requirements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">6. Disclosure of Your Information</h2>
            <p className="mt-4">
              We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
            </p>
            <ul className="list-disc pl-6 mt-4 space-y-2">
              <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
              <li><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">7. Security of Your Information</h2>
            <p className="mt-4">
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground">8. Contact Us</h2>
            <p className="mt-4">
              If you have questions or comments about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2">
              <strong>{tenantName}</strong><br />
              Email: {supportEmail}
            </p>
          </section>
        </div>
      </div>

    </main>
  )
}
