import { createClient } from "@supabase/supabase-js";
import { Metadata, ResolvingMetadata } from "next";
import { Footer } from "@/components/layout/footer";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, Scissors, CheckCircle2, ShieldCheck, Lock, Award, Users, ChevronLeft, Map as MapIcon, Mail, Phone, Info } from "lucide-react";
import Image from "next/image";
import { RequestShopDayButton } from "@/components/shared/request-shop-day-button";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { PassportCarousel } from "@/components/shared/passport-carousel";
import { DynamicBackButton } from "@/components/shared/dynamic-back-button";

export const dynamic = 'force-dynamic';

type Props = {
  params: { id: string }
};

// Create a standard client for public SSR fetches
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
  {
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: 'no-store' });
      }
    }
  }
);

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_barbershop_leads?id=eq.${resolvedParams.id}&select=shop_name,city,shop_image_url`;
  const response = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
    },
    cache: 'no-store'
  });

  const data = await response.json();
  const shop = data && data.length > 0 ? data[0] : null;

  if (!shop) {
    return {
      title: "Shop Not Found | Shop Day Network",
    };
  }

  const title = `${shop.shop_name} is Hiring on Shop Day Network`;
  const description = `Check out ${shop.shop_name} in ${shop.city} on the Barber & Beauty Network. Request a Shop Day to try out a chair today!`;
  const image = shop.shop_image_url || "/shop_day_card.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ShopProfilePage({ params }: Props) {
  const resolvedParams = await params;
  
  // Use native fetch to bypass any Supabase client caching bugs in Next.js 15+
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/agent_barbershop_leads?id=eq.${resolvedParams.id}&select=*`;
  const response = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
    },
    cache: 'no-store'
  });

  const data = await response.json();
  let shop = data && Array.isArray(data) && data.length > 0 ? data[0] : null;

  if (!shop || Object.keys(shop).length === 0) {
    notFound();
  }

  const tagList = shop.place_types 
    ? shop.place_types.split('|').map((t: string) => t.trim().replace('_', ' ')).filter((t: string) => t !== 'point of interest' && t !== 'establishment' && t !== 'service' && t !== 'health')
    : [];

  const maskEmail = (email: string) => email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
  const maskPhone = (phone: string) => phone ? phone.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, '(***) ***-****') : '';

  // Prepare images array, fallback to shop_image_url
  const images = shop.google_images && Array.isArray(shop.google_images) && shop.google_images.length > 0
    ? shop.google_images
    : [shop.shop_image_url || "/images/default_shop_image.png"];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-blue-500/20 flex flex-col overflow-x-hidden">

      <div className="flex-grow pt-8 pb-20 px-4 md:px-8 max-w-7xl mx-auto w-full">
        
        <DynamicBackButton />

        {/* Header Title & Badges */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
          <div>
            <h1 className="font-black text-3xl md:text-5xl text-slate-900 tracking-tight leading-tight mb-2">
              {shop.shop_name}
            </h1>
            <div className="flex items-center gap-4 text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 underline decoration-slate-300 underline-offset-4 cursor-pointer hover:text-slate-900">
                <MapPin className="w-4 h-4" />
                {shop.formatted_address || `${shop.city}, TX`}
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold text-slate-900">{shop.rating || "4.8"}</span>
                <span className="text-slate-500 underline decoration-slate-300 underline-offset-4 cursor-pointer">({shop.total_reviews || 0} reviews)</span>
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <ClaimShopButton shop={shop} />
          </div>
        </div>

        {/* Real Estate Image Gallery (Masonry on Desktop, Swipe Carousel on Mobile) */}
        <div className="flex md:grid overflow-x-auto md:overflow-hidden snap-x snap-mandatory md:snap-none md:grid-cols-4 md:grid-rows-2 gap-2 h-64 md:h-[60vh] rounded-none md:rounded-3xl mb-8 md:mb-12 scrollbar-hide -mx-4 md:mx-0 px-4 md:px-0">
          <div className="md:col-span-2 row-span-2 relative h-full shrink-0 aspect-square md:aspect-auto md:w-auto snap-center rounded-2xl md:rounded-none overflow-hidden border border-slate-200 md:border-none shadow-sm md:shadow-none">
            <img src={images[0]} alt="Shop Primary" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer" />
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              {shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1) ? (
                <span className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                  {shop.booth_count_available || 1} Chairs Available
                </span>
              ) : (
                <span className="px-3 py-1 bg-white text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                  Off Market
                </span>
              )}
            </div>
          </div>
          {images.slice(1, 5).map((imgUrl: string, idx: number) => (
            <div key={idx} className="relative h-full overflow-hidden shrink-0 aspect-square md:aspect-auto md:w-auto snap-center rounded-2xl md:rounded-none border border-slate-200 md:border-none shadow-sm md:shadow-none">
              <img src={imgUrl} alt={`Shop view ${idx + 2}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 cursor-pointer" />
            </div>
          ))}
          {/* Fill empty spots if less than 5 images (Desktop Only) */}
          {images.length < 5 && Array.from({ length: 5 - images.length }).map((_, idx) => (
             <div key={`empty-${idx}`} className="hidden md:flex relative h-full bg-slate-100 items-center justify-center border border-slate-200/50">
               <Scissors className="w-8 h-8 text-slate-300 opacity-50" />
             </div>
          ))}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column (Details) */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-10 border-b border-slate-200">
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-semibold mb-1">Rent Type</span>
                <span className="text-slate-900 font-bold capitalize flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
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

            {/* Description / Vibe */}
            <div className="pb-10 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 mb-6">About this shop</h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                Welcome to {shop.shop_name}, a premier grooming destination located in the heart of {shop.city}. We are currently seeking professional, driven individuals to join our growing team.
                With high foot traffic, excellent local ratings ({shop.rating} stars across {shop.total_reviews} reviews), and a modern atmosphere, this is the perfect location to build and scale your clientele.
              </p>
              
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 flex gap-4">
                <Info className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-blue-900 mb-1">Why work here?</h4>
                  <p className="text-blue-800/80 text-sm">We provide an inclusive, professional environment that empowers barbers and stylists to maximize their earning potential. Located in a high-visibility area, this shop is ideal for walk-ins and organic growth.</p>
                </div>
              </div>
            </div>

            {/* Amenities & Tags */}
            <div className="pb-10 border-b border-slate-200">
              <h2 className="text-2xl font-black text-slate-900 mb-6">Amenities & Tags</h2>
              <div className="flex flex-wrap gap-3">
                {tagList.map((tag: string, idx: number) => (
                  <span key={idx} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold capitalize flex items-center gap-2 border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    {tag}
                  </span>
                ))}
                {tagList.length === 0 && (
                  <span className="text-slate-500 italic">No specific tags provided.</span>
                )}
              </div>
            </div>

          </div>

          {/* Right Column (Sticky Sidebar) */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 bg-white border border-slate-200 rounded-[2rem] shadow-2xl p-8">
              
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-2xl text-slate-900 mb-1">
                    {shop.rent_rate ? `$${shop.rent_rate}` : "Pricing"}
                  </h3>
                  <p className="text-slate-500 font-semibold">{shop.rent_rate ? "per week" : "Contact Owner"}</p>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider">
                  Available
                </div>
              </div>

              {/* Owner Box */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Managed By</p>
                <h4 className="font-black text-slate-900 text-lg mb-4">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed (Claim to add)"}</h4>
                
                {(shop.email || shop.phone) && (
                  <div className={`grid gap-3 mt-4 relative z-10 ${shop.email && shop.phone ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {shop.email && (
                      <a href={`mailto:${shop.email}`} className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        Email
                      </a>
                    )}
                    {shop.phone && (
                      <a href={`tel:${shop.phone}`} className="w-full py-3 px-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm rounded-xl transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        Call
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Lock className="w-3 h-3" />
                Secure contact via Barber & Beauty Network
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="bg-slate-50 border-t border-slate-200 py-20 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full overflow-hidden">
          <h2 className="text-2xl md:text-3xl px-2 font-black text-slate-900 mb-2 text-center break-words">Top Candidates Seeking Placement</h2>
          <p className="text-center text-slate-500 mb-10 max-w-2xl mx-auto">Discover highly vetted professionals who are currently actively seeking placement in your area.</p>
          <div className="w-full overflow-visible">
            <PassportCarousel />
          </div>
        </div>
      </div>

      <div className="light bg-slate-50 text-slate-900">
        <Footer />
      </div>
    </div >
  );
}
