import { createClient } from "@supabase/supabase-js";
import { Metadata, ResolvingMetadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, Scissors, CheckCircle2, ShieldCheck, Lock, Award, Users, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { RequestShopDayButton } from "@/components/shared/request-shop-day-button";
import { ClaimShopButton } from "@/components/shared/claim-shop-button";
import { PassportCarousel } from "@/components/shared/passport-carousel";

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

  console.log("SERVER ENV URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("SERVER ENV KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "EXISTS" : "MISSING");
  console.log("SERVER RAW RESPONSE:", JSON.stringify(data));
  console.log("SERVER FETCH FOR ID:", resolvedParams.id);
  console.log("SERVER FETCH DATA KEYS:", shop ? Object.keys(shop) : "null");

  if (!shop || Object.keys(shop).length === 0) {
    notFound();
  }

  const tagList = shop.place_types 
    ? shop.place_types.split('|').map((t: string) => t.trim().replace('_', ' ')).filter((t: string) => t !== 'point of interest' && t !== 'establishment' && t !== 'service' && t !== 'health')
    : [];

  const maskEmail = (email: string) => email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
  const maskPhone = (phone: string) => phone ? phone.replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/, '(***) ***-****') : '';

  return (
    <main className="min-h-screen light bg-slate-50 text-slate-900 selection:bg-blue-500/20 flex flex-col overflow-x-hidden">
      <Navbar />

      <div className="flex-grow pt-32 pb-20 px-6 max-w-4xl mx-auto w-full">
        
        <Link 
          href="/barber-beauty-network"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Network
        </Link>

        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          {/* Header Image */}
          <div className="relative h-64 md:h-80 w-full bg-slate-100">
            <img 
              src={shop.shop_image_url || "/images/default_shop_image.png"} 
              alt={shop.shop_name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent pointer-events-none" />
            
            {/* Badges */}
            <div className="absolute top-6 right-6 z-10 flex gap-2">
              {shop.hiring_need || (shop.booth_count_available && shop.booth_count_available >= 1) ? (
                <span className="px-4 py-2 bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                  Hiring: {shop.booth_count_available || 1}+ Chairs
                </span>
              ) : (
                <span className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-full shadow-lg">
                  Lead Profile
                </span>
              )}
            </div>

            <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 shadow-lg">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-extrabold text-slate-800">{shop.city || "Texas"}</span>
            </div>
          </div>

          <div className="p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 border-b border-slate-100 pb-8">
              <div>
                <h1 className="font-black text-4xl text-slate-900 tracking-tight leading-snug mb-2">
                  {shop.shop_name}
                </h1>
                {shop.formatted_address && (
                  <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    {shop.formatted_address}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-2xl border border-amber-200 shrink-0">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span className="text-lg font-black text-amber-800">{shop.rating || "4.8"}</span>
                <span className="text-amber-600/70 text-sm font-bold ml-1">({shop.total_reviews || 0})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Shop Details</h3>
                  <div className="flex flex-wrap gap-2">
                    {tagList.map((tag: string, idx: number) => (
                      <span key={idx} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold capitalize">
                        {tag}
                      </span>
                    ))}
                    {shop.rent_type && (
                      <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-black capitalize">
                        {shop.rent_type}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Desired Specialties</h3>
                  <span className="font-bold text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl inline-block text-sm">
                    {shop.specialty_desired && shop.specialty_desired !== "Unknown" ? shop.specialty_desired : "General Fades, Lineups & Shaves"}
                  </span>
                </div>
              </div>

              {/* Owner Info */}
              <div className="border border-slate-200 rounded-3xl p-6 bg-slate-50/50 relative overflow-hidden">
                <div className="absolute top-4 right-4 text-slate-300">
                  <Lock className="w-5 h-5" />
                </div>
                
                <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-wider mb-4">
                  <ShieldCheck className="w-5 h-5" />
                  Owner Information
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Owner Name</p>
                    <p className="text-slate-800 font-extrabold text-lg mt-0.5">{shop.owner_name && shop.owner_name !== "Unknown Owner" ? shop.owner_name : "Unclaimed (Claim to add)"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Email</p>
                    <p className="text-slate-800 font-bold font-mono mt-0.5">{maskEmail(shop.email) || 'Not Provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Phone</p>
                    <p className="text-slate-800 font-bold font-mono mt-0.5">{maskPhone(shop.phone) || 'Not Provided'}</p>
                  </div>
                </div>
                
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <ClaimShopButton shop={shop} />
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="bg-blue-600 rounded-3xl p-8 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
              <div className="relative z-10">
                <Award className="w-12 h-12 text-blue-300 mx-auto mb-4" />
                <h2 className="text-3xl font-black mb-3">Want to try out a chair here?</h2>
                <p className="text-blue-100 font-medium mb-8 max-w-lg mx-auto">
                  Submit your Career Passport to request a risk-free Shop Day. The owner will review your portfolio and invite you in!
                </p>
                <RequestShopDayButton shop={shop} />
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 mt-10 w-full overflow-hidden">
        <h2 className="text-2xl md:text-3xl px-2 font-black text-slate-900 mb-6 text-center break-words">Top Candidates Seeking Placement</h2>
        <div className="w-full overflow-visible">
          <PassportCarousel />
        </div>
      </div>

      <Footer />
    </main>
  );
}
