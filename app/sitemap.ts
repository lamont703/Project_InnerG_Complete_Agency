import { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/supabase-fetch-all'
import { getQualifyingCities, BESPOKE_CITY_ROUTES } from '@/lib/city-readiness'
import { getQualifyingCitiesCA, CA_BESPOKE_CITY_ROUTES } from '@/lib/california-city-readiness'
import { getCityZipCodes } from '@/lib/city-hub-data'
import { PAGE_SIZE as DIRECTORY_PAGE_SIZE } from '@/lib/directory-config'

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

// The expensive part of this route — a filesystem walk plus 9 full-table
// Supabase scans (barbershops, both school tables, barbers, both supply
// store tables, salons, cosmetologists, events) plus the qualifying-cities
// and per-city zip lookups — was re-run on literally every request because
// the whole route was `force-dynamic`, including every Googlebot sitemap
// fetch. That's the real crawl-budget cost here (not sitemap file size,
// which is nowhere near the 50k/50MB split threshold). Splitting the fetch
// out into unstable_cache means it only actually re-queries once per
// revalidate window; `baseUrl` (which varies by which of this site's
// domains made the request — see the Host-header read below) stays outside
// the cache entirely so a cached fetch never bakes in the wrong domain's
// hostname for a different domain's sitemap request.
const getCachedSitemapData = unstable_cache(
  async () => {
    const appDir = path.join(process.cwd(), 'app')
    const rawRoutes = getRoutes(appDir)
    const uniqueRoutes = Array.from(new Set(rawRoutes))

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: shops } = await supabase
      .from('agent_barbershop_leads')
      .select('chair_pricing_tool_url, updated_at')
      .ilike('city', '%houston%')
      .not('chair_pricing_tool_url', 'is', null);

    const qualifyingCities = await getQualifyingCities(supabase);
    const nonBespokeQualifying = qualifyingCities.filter((c) => c.qualifies && !BESPOKE_CITY_ROUTES[c.slug]);

    const cityZipResults = await Promise.all(
      nonBespokeQualifying.map(async (c) => ({
        slug: c.slug,
        zips: await getCityZipCodes(c.city),
      }))
    );

    const qualifyingCitiesCA = await getQualifyingCitiesCA(supabase);
    const nonBespokeQualifyingCA = qualifyingCitiesCA.filter((c) => c.qualifies && !CA_BESPOKE_CITY_ROUTES[c.slug]);

    const cityZipResultsCA = await Promise.all(
      nonBespokeQualifyingCA.map(async (c) => ({
        slug: c.slug,
        zips: await getCityZipCodes(c.city),
      }))
    );

    const [
      allShops,
      barberSchools,
      cosmetologySchools,
      allBarbers,
      barberSupplyStores,
      beautySupplyStores,
      allSalons,
      allCosmetologists,
      allEvents,
    ] = await Promise.all([
      fetchAllRows(supabase, 'agent_barbershop_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_barber_school_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_cosmetology_school_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_barber_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_barber_supply_store_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_beauty_supply_store_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_salon_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_cosmetologist_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'events', 'slug, updated_at'),
    ]);

    return {
      uniqueRoutes,
      shops: shops || [],
      nonBespokeQualifying,
      cityZipResults,
      nonBespokeQualifyingCA,
      cityZipResultsCA,
      allShops,
      barberSchools,
      cosmetologySchools,
      allBarbers,
      barberSupplyStores,
      beautySupplyStores,
      allSalons,
      allCosmetologists,
      allEvents,
    };
  },
  ['sitemap-data'],
  { revalidate: 3600 }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host || 'agency.innergcomplete.com'}`

  try {
    const {
      uniqueRoutes,
      shops,
      nonBespokeQualifying,
      cityZipResults,
      nonBespokeQualifyingCA,
      cityZipResultsCA,
      allShops,
      barberSchools,
      cosmetologySchools,
      allBarbers,
      barberSupplyStores,
      beautySupplyStores,
      allSalons,
      allCosmetologists,
      allEvents,
    } = await getCachedSitemapData();

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

    // Programmatic SEO: Houston shops' Dynamic Market Analysis URLs (data now sourced from the cached bundle above)
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
        url: `${baseUrl}/texas/houston/insights/market-analysis/${slug}`,
        lastModified: shop.updated_at ? new Date(shop.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.85,
      };
    });

    // Programmatic SEO: the generic crawler above skips `[bracket]` dynamic
    // folders entirely (see getRoutes), so /texas's own /[city] and
    // /[city]/[zip] children never show up on their own — same manual
    // pattern as the Houston market-analysis block above, generalized to
    // every qualifying city. (Data now sourced from the cached bundle above.)
    const cityHubSitemap = nonBespokeQualifying.map((c: any) => ({
      url: `${baseUrl}/texas/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

    const cityZipSitemap = cityZipResults.flatMap(({ slug, zips }: any) =>
      zips.map((zip: string) => ({
        url: `${baseUrl}/texas/${slug}/${zip}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    );

    // Same manual pattern as the Texas city-hub/zip blocks above, for
    // /california's own [city] and [city]/[zip] dynamic children.
    const cityHubSitemapCA = nonBespokeQualifyingCA.map((c: any) => ({
      url: `${baseUrl}/california/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.75,
    }));

    const cityZipSitemapCA = cityZipResultsCA.flatMap(({ slug, zips }: any) =>
      zips.map((zip: string) => ({
        url: `${baseUrl}/california/${slug}/${zip}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    );

    // Programmatic SEO: URLs for every profile page across all 7 entity
    // families (data now sourced from the cached bundle above — see
    // fetchAllRows's own comment there for why PostgREST's 1000-row cap
    // needs the pagination helper in the first place).
    // lastModified reflects each row's real updated_at (not the moment the
    // sitemap happens to regenerate) — otherwise every URL claims to have
    // "just changed" on every request, giving Google no signal for which
    // pages actually need recrawling and diluting crawl budget across
    // thousands of unchanged URLs.
    const shopProfileSitemap = allShops.map((shop: any) => ({
      url: `${baseUrl}/shop/${shop.slug}`,
      lastModified: shop.updated_at ? new Date(shop.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6, // Lower priority than core static pages
    }));

    // (/schools/[slug]) across both the barber and cosmetology directories.
    // These were previously invisible to the sitemap entirely — Google could
    // only discover them via internal links/crawl, not a submitted URL list.
    const schoolProfileSitemap = [...barberSchools, ...cosmetologySchools].map((school: any) => ({
      url: `${baseUrl}/schools/${school.slug}`,
      lastModified: school.updated_at ? new Date(school.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }));

    const barberProfileSitemap = allBarbers.map((barber: any) => ({
      url: `${baseUrl}/barbers/${barber.slug}`,
      lastModified: barber.updated_at ? new Date(barber.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    // barber supply + beauty supply, both served by the shared /stores/[slug] route
    const storeProfileSitemap = [...barberSupplyStores, ...beautySupplyStores].map((store: any) => ({
      url: `${baseUrl}/stores/${store.slug}`,
      lastModified: store.updated_at ? new Date(store.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.55,
    }));

    const salonProfileSitemap = allSalons.map((salon: any) => ({
      url: `${baseUrl}/salons/${salon.slug}`,
      lastModified: salon.updated_at ? new Date(salon.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    const cosmetologistProfileSitemap = allCosmetologists.map((person: any) => ({
      url: `${baseUrl}/cosmetologists/${person.slug}`,
      lastModified: person.updated_at ? new Date(person.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    const eventProfileSitemap = allEvents.map((event: any) => ({
      url: `${baseUrl}/events/${event.slug}`,
      lastModified: event.updated_at ? new Date(event.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    // Crawlable browse directory (/directory → /directory/<type> → /<type>/<n>).
    // This is the internal-link backbone that hands Google a real path to every
    // profile page — one paginated URL per PAGE_SIZE block of each family, so
    // the deep pages (page 2, 3, …) are submitted, not just page 1.
    const directoryFamilies: { key: string; rows: any[] }[] = [
      { key: 'barbershops', rows: allShops },
      { key: 'salons', rows: allSalons },
      { key: 'barbers', rows: allBarbers },
      { key: 'cosmetologists', rows: allCosmetologists },
      { key: 'barber-schools', rows: barberSchools },
      { key: 'cosmetology-schools', rows: cosmetologySchools },
      { key: 'barber-supply-stores', rows: barberSupplyStores },
      { key: 'beauty-supply-stores', rows: beautySupplyStores },
      { key: 'events', rows: allEvents },
    ];
    const directorySitemap = [
      {
        url: `${baseUrl}/directory`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
      ...directoryFamilies.flatMap(({ key, rows }) => {
        const count = rows.filter((r: any) => r.slug).length;
        const totalPages = Math.max(1, Math.ceil(count / DIRECTORY_PAGE_SIZE));
        return Array.from({ length: totalPages }, (_, i) => ({
          url: i === 0 ? `${baseUrl}/directory/${key}` : `${baseUrl}/directory/${key}/${i + 1}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: i === 0 ? 0.65 : 0.5,
        }));
      }),
    ];

    return [
      ...staticSitemap,
      ...dynamicSitemap,
      ...directorySitemap,
      ...cityHubSitemap,
      ...cityZipSitemap,
      ...cityHubSitemapCA,
      ...cityZipSitemapCA,
      ...shopProfileSitemap,
      ...schoolProfileSitemap,
      ...barberProfileSitemap,
      ...storeProfileSitemap,
      ...salonProfileSitemap,
      ...cosmetologistProfileSitemap,
      ...eventProfileSitemap,
    ];
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
