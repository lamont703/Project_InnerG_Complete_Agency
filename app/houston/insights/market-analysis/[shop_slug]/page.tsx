import { createClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"
import { Metadata, ResolvingMetadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { MapPin, Star, TrendingUp, Search, DollarSign, Building2 } from "lucide-react"

// Import the custom natively integrated charts for this page
import MarketAnalysisCharts from "./MarketAnalysisCharts"

export const revalidate = 0; // Dynamic component

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

type Props = {
  params: Promise<{ shop_slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.shop_slug;

  const { data: shop } = await supabase
    .from('agent_barbershop_leads')
    .select('shop_name, city, state')
    .ilike('chair_pricing_tool_url', `%/${slug}%`)
    .eq('city', 'Houston')
    .limit(1)
    .single();

  if (!shop) return { title: 'Market Analysis | InnerG Complete' };

  return {
    title: `${shop.shop_name} - Houston Barbershop Market Analysis & Foot Traffic`,
    description: `Deep market analysis and foot traffic radar for ${shop.shop_name} in ${shop.city}, ${shop.state}. See hiring status, booth rent pricing, and competitor density.`,
  }
}

export default async function HoustonMarketAnalysisPage(props: Props) {
  const params = await props.params;
  const slug = params.shop_slug;

  // 1. Fetch Target Shop & Verify Houston
  const { data: shop, error } = await supabase
    .from('agent_barbershop_leads')
    .select('*')
    .ilike('chair_pricing_tool_url', `%/${slug}%`)
    .limit(1)
    .single();

  if (error || !shop || !shop.city?.toLowerCase().includes('houston')) {
    // If not found by URL, fallback to ID match (and still enforce Houston)
    const { data: fallbackShop } = await supabase
      .from('agent_barbershop_leads')
      .select('*')
      .eq('id', slug)
      .ilike('city', '%houston%')
      .limit(1)
      .single();

    if (!fallbackShop) {
      notFound();
    }
    return <AnalysisLayout shop={fallbackShop} />;
  }

  return <AnalysisLayout shop={shop} />;
}

// 2. The Hybrid SEO Layout
function AnalysisLayout({ shop }: { shop: any }) {
  // Generate JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Report",
    "name": `${shop.shop_name} - Houston Market Analysis`,
    "description": `Market intelligence and foot traffic analysis for ${shop.shop_name} located in Houston, Texas.`,
    "about": {
      "@type": "LocalBusiness",
      "name": shop.shop_name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": shop.formatted_address,
        "addressLocality": "Houston",
        "addressRegion": "TX"
      },
      "aggregateRating": shop.rating ? {
        "@type": "AggregateRating",
        "ratingValue": shop.rating,
        "reviewCount": shop.total_reviews || 1
      } : undefined
    }
  };

  // Prepare images array, fallback to shop_image_url
  const images = shop.google_images && Array.isArray(shop.google_images) && shop.google_images.length > 0
    ? shop.google_images
    : [shop.shop_image_url || "/images/default_shop_image.png"];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* SEO Magnet Header (Shop Profile Hook) */}
      <div className="bg-white border-b border-slate-200 pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="flex flex-col md:flex-row justify-between gap-12">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold tracking-wider uppercase border border-blue-100">
                <TrendingUp className="w-3.5 h-3.5" />
                Houston Market Analysis Report
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                {shop.shop_name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {shop.formatted_address || "Houston, TX"}
                </span>
                {shop.rating && (
                  <span className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">{shop.rating}</span>
                    <span>({shop.total_reviews} reviews)</span>
                  </span>
                )}
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                {shop.rent_type && (
                  <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl text-sm font-semibold text-slate-700">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Structure: {shop.rent_type}
                  </div>
                )}
                {shop.is_hiring && (
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold text-emerald-700 border border-emerald-100">
                    <Building2 className="w-4 h-4" />
                    Actively Hiring Barbers
                  </div>
                )}
              </div>
            </div>

            {/* Contact Box (Trust Signals) */}
            <div className="w-full md:w-96 bg-slate-50 rounded-2xl p-6 border border-slate-100 relative overflow-hidden shadow-sm shrink-0">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Managed By</p>
              <h4 className="font-black text-slate-900 text-lg mb-4">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed"}</h4>
              
              {(shop.email || shop.phone) && (
                <div className={`grid gap-3 mt-4 relative z-10 ${shop.email && shop.phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {shop.email && (
                    <a href={`mailto:${shop.email}`} className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                      Email
                    </a>
                  )}
                  {shop.phone && (
                    <a href={`tel:${shop.phone}`} className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                      Call
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Image Gallery (Masonry) */}
          {images.length > 0 && (
             <div className="flex md:grid overflow-x-auto md:overflow-hidden snap-x snap-mandatory md:snap-none md:grid-cols-4 md:grid-rows-2 gap-2 h-64 md:h-[60vh] rounded-none md:rounded-3xl scrollbar-hide -mx-6 md:mx-0 px-6 md:px-0">
               <div className="md:col-span-2 row-span-2 relative h-full shrink-0 aspect-square md:aspect-auto md:w-auto snap-center rounded-2xl md:rounded-none overflow-hidden border border-slate-200 md:border-none shadow-sm md:shadow-none">
                 <img src={images[0]} alt="Shop Primary" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer" />
               </div>
               {images.slice(1, 5).map((imgUrl: string, idx: number) => (
                 <div key={idx} className="relative h-full overflow-hidden shrink-0 aspect-square md:aspect-auto md:w-auto snap-center rounded-2xl md:rounded-none border border-slate-200 md:border-none shadow-sm md:shadow-none">
                   <img src={imgUrl} alt={`Shop view ${idx + 2}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer" />
                 </div>
               ))}
             </div>
          )}

          {/* Quick Stats & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-8">
            <div className="lg:col-span-2 space-y-12">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-10 border-b border-slate-200">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-sm font-semibold mb-1">Rent Type</span>
                  <span className="text-slate-900 font-bold capitalize flex items-center gap-2">
                    {shop.rent_type || "Booth Rent"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-sm font-semibold mb-1">Weekly Rate</span>
                  <span className="text-slate-900 font-bold">
                    {shop.rent_rate ? `$${shop.rent_rate}` : "Contact for Pricing"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-sm font-semibold mb-1">Availability</span>
                  <span className="text-slate-900 font-bold">
                    {shop.booth_count_available ? `${shop.booth_count_available} Chairs` : "Inquire"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-sm font-semibold mb-1">Specialties Needed</span>
                  <span className="text-slate-900 font-bold truncate" title={shop.specialty_desired || "General"}>
                    {shop.specialty_desired || "General"}
                  </span>
                </div>
              </div>

              <div className="pb-10">
                <h2 className="text-2xl font-black text-slate-900 mb-6">About this shop</h2>
                <p className="text-slate-600 text-lg leading-relaxed mb-6">
                  {shop.shop_name} is a premier grooming destination located in {shop.city}. 
                  With high foot traffic, excellent local ratings ({shop.rating || "4.8"} stars), and a modern atmosphere, this is the perfect location to build and scale your clientele.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Native Market Analysis Charts */}
      <div className="max-w-7xl mx-auto px-6">
        <MarketAnalysisCharts shopData={shop} />
      </div>

      {/* The Search Engine Funnel CTA (Acquisition Hook) */}
      <div className="bg-white text-slate-900 py-20 px-6 mt-auto border-t border-slate-200 relative overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
        {/* Background Accents */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">
            Want to see how {shop.shop_name} compares to the rest of Houston?
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium">
            Stop guessing. Use our AI-powered Search Engine to instantly find the best barbershops hiring in Houston based on foot traffic, booth rent, and competitor density.
          </p>
          
          <Link href="/tools/barbershop-search" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-1">
            <Search className="w-5 h-5" />
            Launch AI Search Engine
          </Link>
        </div>
      </div>

    </div>
  );
}
