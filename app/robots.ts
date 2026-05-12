import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const domain = host || 'agency.innergcomplete.com'

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/insights'],
      disallow: [
        '/login/',
        '/select-portal/',
        '/api/',
        '/auth/'
      ],
    },
    sitemap: `${protocol}://${domain}/sitemap.xml`,
  }
}
