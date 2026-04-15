import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/insights'],
      disallow: [
        '/login/',
        '/select-portal/',
        '/privacy-policy/',
        '/terms-of-service/',
        '/api/',
        '/auth/'
      ],
    },
    sitemap: 'https://innergcomplete.com/sitemap.xml',
  }
}
