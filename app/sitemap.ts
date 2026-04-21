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
      url: `${baseUrl}/insights`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...insights,
  ]
}
