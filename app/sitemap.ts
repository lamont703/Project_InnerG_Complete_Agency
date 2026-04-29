import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host || 'agency.innergcomplete.com'}`

  // Dynamic routes (Insights)
  const insights = [
    'abc-fitness-sovereign-intelligence-audit',
    'autonomous-concierge-roi-analysis',
    'booksy-sovereign-intelligence-audit',
    'cognitive-architecture-blueprint',
    'cognitive-feedstock-15-data-sources',
    'el-paso-barber-market-rescue-report',
    'mindbody-sovereign-intelligence-audit',
    'rebooking-intelligence-pilot',
    'the-feasibility-premium',
    'the-sovereign-intelligence-layer',
    'thecut-sovereign-intelligence-audit',
  ].map((slug) => ({
    url: `${baseUrl}/insights/${slug}`,
    lastModified: new Date('2026-04-12T08:00:00Z'),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/texas-barber-exam-intelligence-prep`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/barber-school-pilot-scholarship-fund`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/el-paso-barber-exam-intelligence-prep`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/tools/texas-barber-exam-practice-deck`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/insights`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/insights/texas-barber-licensure-crisis`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...insights,
  ]
}
