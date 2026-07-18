import { MetadataRoute } from 'next'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const domain = host || 'agency.innergcomplete.com'

  return {
    rules: [
      {
        // .md is disallowed for general search engines — those URLs would
        // otherwise be indexable duplicate content sitting alongside the
        // real HTML profile pages. Named AI crawlers get an explicit
        // override below since that's exactly who this endpoint is for.
        userAgent: '*',
        allow: ['/', '/insights'],
        disallow: [
          '/login/',
          '/select-portal/',
          '/api/',
          '/auth/',
          '/admin/',
          '/dashboard/',
          '/*.md$',
        ],
      },
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'anthropic-ai', 'PerplexityBot', 'Google-Extended'],
        allow: ['/*.md$'],
      },
    ],
    sitemap: `${protocol}://${domain}/sitemap.xml`,
  }
}
