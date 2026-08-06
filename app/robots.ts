import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { SITE_HOST, isIndexableHost } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const domain = host || SITE_HOST

  // On a non-production host (staging.shearquery.com, a preview on a custom
  // domain) the crawl rules stay exactly as they are — deliberately permissive,
  // because middleware is sending X-Robots-Tag: noindex and Google has to be
  // able to FETCH the page to read it. A Disallow here would block the fetch,
  // hide the noindex, and leave the URL eligible to appear in results anyway.
  //
  // What does change: no sitemap is advertised. A sitemap on staging is an
  // explicit invitation listing every staging URL, and there is no reason to
  // hand a crawler that list when the answer to each entry is "don't index me".
  const advertiseSitemap = isIndexableHost(host)

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
    ...(advertiseSitemap ? { sitemap: `${protocol}://${domain}/sitemap.xml` } : {}),
  }
}
