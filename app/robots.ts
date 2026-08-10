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
        // The named AI crawlers the .md layer exists for.
        //
        // EVERY TOKEN HERE WAS READ FROM THE OPERATOR'S OWN DOCUMENTATION on
        // 2026-08-10, not recalled. That matters more than it sounds: a
        // misspelled or retired user-agent string does not error, it simply
        // never matches, so the allow rule silently does nothing and the
        // crawler keeps hitting the `Disallow: /*.md$` above. The failure is
        // invisible from this file.
        //
        //   Anthropic (support.claude.com/en/articles/8896518) publishes three:
        //     ClaudeBot        — collects content that may contribute to training
        //     Claude-User      — fetches a page because a user asked about it
        //     Claude-SearchBot — indexes for search result quality
        //   Only ClaudeBot was listed here before, which is the training
        //   crawler. The two that serve a person actually asking a question
        //   were being refused the Markdown.
        //
        //   OpenAI (developers.openai.com/api/docs/bots) publishes four:
        //     GPTBot, OAI-SearchBot, ChatGPT-User, OAI-AdsBot
        //   OAI-AdsBot is deliberately omitted — it validates submitted ads,
        //   which is not a discovery surface.
        //
        // `anthropic-ai` is kept as a legacy token. It does not appear in
        // Anthropic's current documentation, and an allow rule for a
        // user-agent nobody sends costs nothing.
        //
        // Not listed, on purpose: Applebot-Extended, Meta-ExternalAgent,
        // Bytespider, CCBot, Amazonbot and the rest. Adding a token from
        // memory is how the ClaudeBot-only gap happened. Each needs its
        // operator's own doc read first — then it belongs here.
        userAgent: [
          'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
          'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
          'PerplexityBot', 'Google-Extended',
        ],
        allow: ['/*.md$'],
      },
    ],
    ...(advertiseSitemap ? { sitemap: `${protocol}://${domain}/sitemap.xml` } : {}),
  }
}
