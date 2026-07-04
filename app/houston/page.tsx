import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Scissors,
  GraduationCap,
  UserCheck,
  Building2,
  ShoppingBag,
  Star,
  ArrowRight,
  Award,
} from "lucide-react";

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// City fields are inconsistently formatted across tables ("Houston 77096",
// "Houston, TX", "Houston", etc.) — exact match on "Houston" misses the
// large majority of rows (confirmed: barbershops alone go from 28 exact
// matches to 584 with ilike). Every query here uses ilike for that reason.
const HOUSTON_FILTER = "%houston%";

async function getHoustonData() {
  const [
    shopsCountRes,
    topShopsRes,
    barberSchoolsCountRes,
    topBarberSchoolsRes,
    cosmetSchoolsCountRes,
    topCosmetSchoolsRes,
    barbersCountRes,
    topBarbersRes,
    cosmetologistsCountRes,
    topCosmetologistsRes,
    salonsCountRes,
    topSalonsRes,
    supplyStoresCountRes,
    topSupplyStoresRes,
  ] = await Promise.all([
    supabase.from("agent_barbershop_leads").select("*", { count: "exact", head: true }).ilike("city", HOUSTON_FILTER),
    supabase.from("agent_barbershop_leads").select("id, shop_name, city, rating, total_reviews, shop_image_url, hiring_need, booth_count_available")
      .ilike("city", HOUSTON_FILTER).not("rating", "is", null).order("rating", { ascending: false }).order("total_reviews", { ascending: false }).limit(6),

    supabase.from("agent_barber_school_leads").select("*", { count: "exact", head: true }).ilike("city", HOUSTON_FILTER),
    supabase.from("agent_barber_school_leads").select("id, school_name, city, rating, school_leaderboard_score_2026, accreditation_status")
      .ilike("city", HOUSTON_FILTER).not("school_leaderboard_score_2026", "is", null).order("school_leaderboard_score_2026", { ascending: false }).limit(6),

    supabase.from("agent_cosmetology_school_leads").select("*", { count: "exact", head: true }).ilike("city", HOUSTON_FILTER),
    supabase.from("agent_cosmetology_school_leads").select("id, school_name, city, rating, cosmetology_school_leaderboard_score_2026, accreditation_status")
      .ilike("city", HOUSTON_FILTER).not("cosmetology_school_leaderboard_score_2026", "is", null).order("cosmetology_school_leaderboard_score_2026", { ascending: false }).limit(6),

    supabase.from("agent_barber_leads").select("*", { count: "exact", head: true }).ilike("metro_area", HOUSTON_FILTER),
    supabase.from("agent_barber_leads").select("id, name, metro_area, booksy_rating, booksy_review_count, specialty_type, booksy_photo_url")
      .ilike("metro_area", HOUSTON_FILTER).not("booksy_rating", "is", null).order("booksy_rating", { ascending: false }).order("booksy_review_count", { ascending: false }).limit(6),

    supabase.from("agent_cosmetologist_leads").select("*", { count: "exact", head: true }).ilike("metro_area", HOUSTON_FILTER),
    supabase.from("agent_cosmetologist_leads").select("id, name, metro_area, booksy_rating, booksy_review_count, specialty_type, booksy_photo_url")
      .ilike("metro_area", HOUSTON_FILTER).not("booksy_rating", "is", null).order("booksy_rating", { ascending: false }).order("booksy_review_count", { ascending: false }).limit(6),

    supabase.from("agent_salon_leads").select("*", { count: "exact", head: true }).ilike("city", HOUSTON_FILTER),
    supabase.from("agent_salon_leads").select("id, shop_name, city, rating, total_reviews")
      .ilike("city", HOUSTON_FILTER).not("rating", "is", null).order("rating", { ascending: false }).order("total_reviews", { ascending: false }).limit(6),

    Promise.all([
      supabase.from("agent_barber_supply_store_leads").select("*", { count: "exact", head: true }).ilike("city", HOUSTON_FILTER),
      supabase.from("agent_beauty_supply_store_leads").select("*", { count: "exact", head: true }).ilike("city", HOUSTON_FILTER),
    ]),
    Promise.all([
      supabase.from("agent_barber_supply_store_leads").select("id, name, city, rating, total_reviews")
        .ilike("city", HOUSTON_FILTER).not("rating", "is", null).order("rating", { ascending: false }).order("total_reviews", { ascending: false }).limit(6),
      supabase.from("agent_beauty_supply_store_leads").select("id, name, city, rating, total_reviews")
        .ilike("city", HOUSTON_FILTER).not("rating", "is", null).order("rating", { ascending: false }).order("total_reviews", { ascending: false }).limit(6),
    ]),
  ]);

  const [barberSupplyCount, beautySupplyCount] = supplyStoresCountRes;
  const [topBarberSupplyRes, topBeautySupplyRes] = topSupplyStoresRes;
  const topSupplyStores = [...(topBarberSupplyRes.data || []), ...(topBeautySupplyRes.data || [])]
    .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0) || (b.total_reviews || 0) - (a.total_reviews || 0))
    .slice(0, 6);

  const barberSchools = topBarberSchoolsRes.data || [];
  const cosmetSchools = topCosmetSchoolsRes.data || [];
  const allSchoolScores = [
    ...barberSchools.map((s: any) => s.school_leaderboard_score_2026),
    ...cosmetSchools.map((s: any) => s.cosmetology_school_leaderboard_score_2026),
  ].filter((v) => v != null);
  const avgSchoolScore = allSchoolScores.length > 0
    ? allSchoolScores.reduce((a: number, b: number) => a + b, 0) / allSchoolScores.length
    : null;

  return {
    shopsCount: shopsCountRes.count || 0,
    topShops: topShopsRes.data || [],
    barberSchoolsCount: barberSchoolsCountRes.count || 0,
    topBarberSchools: barberSchools,
    cosmetSchoolsCount: cosmetSchoolsCountRes.count || 0,
    topCosmetSchools: cosmetSchools,
    barbersCount: barbersCountRes.count || 0,
    topBarbers: topBarbersRes.data || [],
    cosmetologistsCount: cosmetologistsCountRes.count || 0,
    topCosmetologists: topCosmetologistsRes.data || [],
    salonsCount: salonsCountRes.count || 0,
    topSalons: topSalonsRes.data || [],
    supplyStoresCount: (barberSupplyCount.count || 0) + (beautySupplyCount.count || 0),
    topSupplyStores,
    avgSchoolScore,
    totalEntities:
      (shopsCountRes.count || 0) +
      (barberSchoolsCountRes.count || 0) +
      (cosmetSchoolsCountRes.count || 0) +
      (barbersCountRes.count || 0) +
      (cosmetologistsCountRes.count || 0) +
      (salonsCountRes.count || 0) +
      (barberSupplyCount.count || 0) +
      (beautySupplyCount.count || 0),
  };
}

export const metadata: Metadata = {
  title: "Houston Barber & Cosmetology Directory — Shops, Schools, Pros | Inner G Complete",
  description: "The full Houston barber and beauty landscape in one place: barbershops, salons, licensed pros, and barber/cosmetology schools ranked by real 2026 licensing exam pass rates — data not available on Google.",
};

function scoreColor(score: number) {
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

export default async function HoustonHubPage() {
  const data = await getHoustonData();

  const sections = [
    {
      key: "shops",
      label: "Barbershops",
      icon: Scissors,
      color: "blue",
      count: data.shopsCount,
      searchTab: "Barbershops",
      items: data.topShops.map((s: any) => ({
        id: s.id,
        name: s.shop_name,
        href: `/shop/${s.id}`,
        rating: s.rating,
        reviews: s.total_reviews,
        badge: s.hiring_need || (s.booth_count_available || 0) >= 1 ? "Hiring" : null,
      })),
    },
    {
      key: "salons",
      label: "Salons",
      icon: Building2,
      color: "orange",
      count: data.salonsCount,
      searchTab: "Salons",
      items: data.topSalons.map((s: any) => ({
        id: s.id,
        name: s.shop_name,
        href: `/salons/${s.id}`,
        rating: s.rating,
        reviews: s.total_reviews,
      })),
    },
    {
      key: "barbers",
      label: "Barbers",
      icon: UserCheck,
      color: "green",
      count: data.barbersCount,
      searchTab: "Barbers",
      items: data.topBarbers.map((b: any) => ({
        id: b.id,
        name: b.name,
        href: `/barbers/${b.id}`,
        rating: b.booksy_rating,
        reviews: b.booksy_review_count,
        badge: b.specialty_type,
      })),
    },
    {
      key: "cosmetologists",
      label: "Cosmetologists",
      icon: UserCheck,
      color: "pink",
      count: data.cosmetologistsCount,
      searchTab: "Cosmetologist",
      items: data.topCosmetologists.map((c: any) => ({
        id: c.id,
        name: c.name,
        href: `/cosmetologists/${c.id}`,
        rating: c.booksy_rating,
        reviews: c.booksy_review_count,
        badge: c.specialty_type,
      })),
    },
    {
      key: "barberSchools",
      label: "Barber Schools",
      icon: GraduationCap,
      color: "red",
      count: data.barberSchoolsCount,
      searchTab: "Schools",
      items: data.topBarberSchools.map((s: any) => ({
        id: s.id,
        name: s.school_name,
        href: `/schools/${s.id}`,
        score: s.school_leaderboard_score_2026,
        badge: s.accreditation_status,
      })),
    },
    {
      key: "cosmetSchools",
      label: "Cosmetology Schools",
      icon: GraduationCap,
      color: "purple",
      count: data.cosmetSchoolsCount,
      searchTab: "Schools",
      items: data.topCosmetSchools.map((s: any) => ({
        id: s.id,
        name: s.school_name,
        href: `/schools/${s.id}`,
        score: s.cosmetology_school_leaderboard_score_2026,
        badge: s.accreditation_status,
      })),
    },
    {
      key: "stores",
      label: "Supply Stores",
      icon: ShoppingBag,
      color: "amber",
      count: data.supplyStoresCount,
      searchTab: "Stores",
      items: data.topSupplyStores.map((s: any) => ({
        id: s.id,
        name: s.name,
        href: `/stores/${s.id}`,
        rating: s.rating,
        reviews: s.total_reviews,
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-4">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
            Houston Barber &amp; Cosmetology Directory
          </h1>
          <p className="text-slate-600">
            {data.totalEntities.toLocaleString()} barbershops, salons, schools, and licensed professionals across
            Houston — including school rankings from real 2026 Texas licensing exam outcomes, not available on
            Google.
          </p>
        </div>

        {data.avgSchoolScore != null && (
          <div className="max-w-md mx-auto mb-10 bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-4 flex items-center gap-3 justify-center">
            <Award className="w-5 h-5 text-indigo-600 shrink-0" />
            <p className="text-sm text-slate-600">
              Houston barber &amp; cosmetology schools average a{" "}
              <span className={`font-black ${scoreColor(data.avgSchoolScore)}`}>{Math.round(data.avgSchoolScore)}</span>{" "}
              2026 leaderboard score.
            </p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.key} className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <section.icon className="w-5 h-5 text-slate-700" />
                  <h2 className="text-lg font-black text-slate-900">{section.label}</h2>
                  <span className="text-sm font-bold text-slate-400">({section.count.toLocaleString()})</span>
                </div>
                <Link
                  href={`/tools/barbershop-search?tab=${encodeURIComponent(section.searchTab)}&q=Houston`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {section.items.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {section.items.map((item: any) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-colors p-4 block"
                    >
                      <p className="font-bold text-slate-900 text-sm truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {item.rating != null && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {Number(item.rating).toFixed(1)}
                            {item.reviews ? <span className="text-slate-400 font-medium">({item.reviews})</span> : null}
                          </span>
                        )}
                        {item.score != null && (
                          <span className={`text-xs font-black ${scoreColor(item.score)}`}>
                            {Math.round(item.score)} score
                          </span>
                        )}
                        {item.badge && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {section.count > 0
                    ? `${section.count} in Houston — browse them all in the search engine.`
                    : "None found yet."}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/tools/barbershop-search?q=Houston"
            className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    </div>
  );
}
