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
// Routes that must never appear in the public sitemap: admin surfaces,
// auth-gated internal tools (mirrors middleware.ts's INTERNAL_TOOL_ROUTES /
// PROTECTED_ROUTES / AUTH_ROUTES), and logged-in dashboards that are
// noindex'd at the page level. Bing/Google were being pointed at these by
// the filesystem crawler below, which then graded their (short, functional)
// meta descriptions — the source of Bing's "meta description too short"
// warnings. Prefix match, so a folder excludes its whole subtree. The list
// now lives in lib/public-routes.ts so the Markdown (.md) layer can't drift
// from what the sitemap considers public.
import { isExcludedFromSitemap } from '@/lib/public-routes'
import { landingAudiences } from '@/lib/audiences'
import { SITE_HOST } from "@/lib/site";
import {
  isSchoolIndexable, isShopIndexable, isProIndexable,
  SHOP_INDEX_COLUMNS, PRO_INDEX_COLUMNS,
} from "@/lib/indexable";

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
    /*
     * getRoutes() skips any directory starting with '[', which is right for
     * entity routes — their URLs come from the database below, not the
     * filesystem. But /membership/[audience] is a dynamic segment whose values
     * are a fixed, build-time list, so nothing else in this file would ever
     * emit them and the walk alone would leave three real pages out of the
     * sitemap entirely. Sourced from the registry so a new audience appears
     * here the moment it gets a landing page.
     */
    const rawRoutes = [
      ...getRoutes(appDir),
      ...landingAudiences().map((a) => `/membership/${a.landing!.path}`),
    ]
    const uniqueRoutes = Array.from(new Set(rawRoutes)).filter(
      (route) => !isExcludedFromSitemap(route)
    )

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      ceProviders,
    ] = await Promise.all([
      // The extra columns are what isShopIndexable/isProIndexable read. Same
      // trap the school queries carry below: drop one and the field arrives
      // undefined, the predicate fails, and the section silently empties.
      fetchAllRows(supabase, 'agent_barbershop_leads', `slug, updated_at, ${SHOP_INDEX_COLUMNS.join(', ')}`),
      fetchAllRows(supabase, 'agent_barber_school_leads', 'slug, updated_at, formatted_address, google_business_status'),
      fetchAllRows(supabase, 'agent_cosmetology_school_leads', 'slug, updated_at, formatted_address, google_business_status'),
      fetchAllRows(supabase, 'agent_barber_leads', `slug, updated_at, ${PRO_INDEX_COLUMNS.join(', ')}`),
      fetchAllRows(supabase, 'agent_barber_supply_store_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_beauty_supply_store_leads', 'slug, updated_at'),
      fetchAllRows(supabase, 'agent_salon_leads', `slug, updated_at, ${SHOP_INDEX_COLUMNS.join(', ')}`),
      fetchAllRows(supabase, 'agent_cosmetologist_leads', `slug, updated_at, ${PRO_INDEX_COLUMNS.join(', ')}`),
      fetchAllRows(supabase, 'events', 'slug, updated_at'),
      // is_active comes along so the sitemap can submit only live providers.
      fetchAllRows(supabase, 'agent_texas_ce_provider_leads', 'slug, updated_at, is_active'),
    ]);

    return {
      uniqueRoutes,
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
      ceProviders,
    };
  },
  ['sitemap-data'],
  { revalidate: 3600 }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host || SITE_HOST}`

  try {
    const {
      uniqueRoutes,
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
      ceProviders,
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

    // Programmatic SEO: the generic crawler above skips `[bracket]` dynamic
    // folders entirely (see getRoutes), so /texas's own /[city] and
    // /[city]/[zip] children never show up on their own — a manual pattern
    // applied to every qualifying city. (The deprecated Houston
    // market-analysis URLs used to be emitted here too; those pages now 301 to
    // each shop's /shop/<slug> profile, so they were removed from the sitemap.)
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
    const shopProfileSitemap = allShops
      .filter((shop: any) => isShopIndexable(shop))
      .map((shop: any) => ({
      url: `${baseUrl}/shop/${shop.slug}`,
      lastModified: shop.updated_at ? new Date(shop.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6, // Lower priority than core static pages
    }));

    // (/schools/[slug]) across both the barber and cosmetology directories.
    // These were previously invisible to the sitemap entirely — Google could
    // only discover them via internal links/crawl, not a submitted URL list.
    const schoolProfileSitemap = [...barberSchools, ...cosmetologySchools]
      // Same predicate the page uses for robots. Submitting a URL we noindex is
      // a contradiction, and Search Console reports it as one.
      //
      // The two school queries above select formatted_address SOLELY for this
      // filter. Drop the column and every school silently disappears from the
      // sitemap, because undefined fails the check.
      .filter((school: any) => isSchoolIndexable(school))
      .map((school: any) => ({
      url: `${baseUrl}/schools/${school.slug}`,
      lastModified: school.updated_at ? new Date(school.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.65,
    }));

    const barberProfileSitemap = allBarbers
      .filter((barber: any) => isProIndexable(barber))
      .map((barber: any) => ({
      url: `${baseUrl}/barbers/${barber.slug}`,
      lastModified: barber.updated_at ? new Date(barber.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    // barber supply + beauty supply, both served by the shared /stores/[slug] route.
    //
    // EMPTY ON PURPOSE. Every store column is a Google Maps field, so these
    // pages carry nothing of ours and all 910 are noindex — see
    // isStoreIndexable in lib/indexable.ts. The rows are still fetched because
    // the counts below report them, and an empty array here keeps the sitemap
    // agreeing with the robots directive instead of submitting URLs we refuse.
    const storeProfileSitemap: MetadataRoute.Sitemap = [];

    const salonProfileSitemap = allSalons
      .filter((salon: any) => isShopIndexable(salon))
      .map((salon: any) => ({
      url: `${baseUrl}/salons/${salon.slug}`,
      lastModified: salon.updated_at ? new Date(salon.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    const cosmetologistProfileSitemap = allCosmetologists
      .filter((person: any) => isProIndexable(person))
      .map((person: any) => ({
      url: `${baseUrl}/cosmetologists/${person.slug}`,
      lastModified: person.updated_at ? new Date(person.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    // Active CE providers only — expired ones carry robots noindex, and a
    // sitemap entry for a noindex URL asks Google to index what we told it not
    // to. They stay reachable by internal link from the sibling callout.
    const ceProviderProfileSitemap = (ceProviders as any[])
      .filter((r) => r.slug && r.is_active)
      .map((r: any) => ({
        url: `${baseUrl}/ce-providers/${r.slug}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
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
      // Active only — the browse pages should not paginate over providers
      // whose profile carries robots noindex.
      { key: 'ce-providers', rows: (ceProviders as any[]).filter((r) => r.is_active) },
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
      ...ceProviderProfileSitemap,
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
