import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Recursive File-System crawler to autonomously map all active routes
function getRoutes(dir: string, baseRoute: string = ''): string[] {
  let routes: string[] = []
  
  if (!fs.existsSync(dir)) return routes

  const files = fs.readdirSync(dir)

  for (const file of files) {
    // Ignore backend APIs, Next.js hidden folders, and dynamic brackets
    if (file === 'api' || file.startsWith('_') || file.startsWith('.') || file.startsWith('[')) continue

    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // If it's a route group like (auth), ignore the parenthesis folder name in the URL
      const nextBaseRoute = file.startsWith('(') && file.endsWith(')') 
        ? baseRoute 
        : `${baseRoute}/${file}`
        
      routes = routes.concat(getRoutes(fullPath, nextBaseRoute))
    } else if (file === 'page.tsx' || file === 'page.js') {
      routes.push(baseRoute === '' ? '/' : baseRoute)
    }
  }

  return routes
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host || 'agency.innergcomplete.com'}`

  try {
    const appDir = path.join(process.cwd(), 'app')
    const rawRoutes = getRoutes(appDir)
    
    // Deduplicate and filter out redundant trailing slashes
    const uniqueRoutes = Array.from(new Set(rawRoutes))

    const staticSitemap = uniqueRoutes.map((route) => {
      // Dynamic SEO Prioritization Algorithm based on directory depth
      const depth = route.split('/').filter(Boolean).length
      let priority = 0.8
      let changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never" = 'weekly'

      if (route === '/') {
        priority = 1.0
        changeFrequency = 'daily'
      } else if (depth === 1) {
        priority = 0.9
        changeFrequency = 'weekly'
      } else if (depth >= 2) {
        priority = 0.7
        changeFrequency = 'monthly'
      }

      return {
        url: `${baseUrl}${route === '/' ? '' : route}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
      }
    });

    // Programmatic SEO: Fetch all Houston shops to generate Dynamic Market Analysis URLs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: shops } = await supabase
      .from('agent_barbershop_leads')
      .select('chair_pricing_tool_url')
      .ilike('city', '%houston%')
      .not('chair_pricing_tool_url', 'is', null);

    const dynamicSitemap = (shops || []).map((shop: any) => {
      // Extract the slug from the URL
      let slug = "";
      try {
        const urlObj = new URL(shop.chair_pricing_tool_url);
        const pathSegments = urlObj.pathname.split('/');
        slug = pathSegments[pathSegments.length - 1];
      } catch (e) {
        const parts = shop.chair_pricing_tool_url.split('?')[0].split('/');
        slug = parts[parts.length - 1];
      }

      return {
        url: `${baseUrl}/houston/insights/market-analysis/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      };
    });

    // Programmatic SEO: Generate URLs for the /shop/[id] public profiles
    // We limit to 20,000 to ensure the Vercel Serverless Function doesn't timeout while generating the XML
    const { data: allShops } = await supabase
      .from('agent_barbershop_leads')
      .select('id')
      .limit(20000);

    const shopProfileSitemap = (allShops || []).map((shop: any) => ({
      url: `${baseUrl}/shop/${shop.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6, // Lower priority than core static pages
    }));

    return [...staticSitemap, ...dynamicSitemap, ...shopProfileSitemap];
  } catch (error) {
    // Fallback static array just in case the production serverless environment strips the source folder
    console.warn("Autonomous sitemap crawler failed. Falling back to static route map.", error)
    
    const fallbackRoutes = [
      '', '/texas-barber-exam-intelligence-prep', '/barber-school-pilot-scholarship-fund',
      '/el-paso-barber-exam-intelligence-prep', '/tools/texas-barber-exam-practice-deck',
      '/barber-cos-continuing-education',
      '/insights', '/about', '/glossary', '/privacy-policy', '/terms-of-service',
      '/contact', '/careers', '/cookie-policy'
    ]

    return fallbackRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: route === '' ? 1 : 0.8,
    }))
  }
}
