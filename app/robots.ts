import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { SITE_HOST, isIndexableHost } from '@/lib/site'
import { buildRobotsRules } from '@/lib/robots-rules'

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

  // The rules themselves live in lib/robots-rules.ts so they can be unit
  // tested without mocking next/headers — and because the invariant that
  // matters (every group repeats the private-path disallows, since robots.txt
  // does NOT merge a named group with the `*` group) is the kind of thing that
  // breaks silently and looks fine in the served file.
  return {
    rules: buildRobotsRules(),
    ...(advertiseSitemap ? { sitemap: `${protocol}://${domain}/sitemap.xml` } : {}),
  }
}
