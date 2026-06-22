import { createClient } from "@supabase/supabase-js"
import ClientDashboard from "../client-dashboard"
import { notFound } from "next/navigation"

export const revalidate = 0; // Dynamic component

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    0.5 - Math.cos(dLat)/2 + 
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    (1 - Math.cos(dLon))/2;

  return R * 2 * Math.asin(Math.sqrt(a));
}

export default async function AIBoothStationTool(props: { params: Promise<{ shop_name: string }> }) {
  const params = await props.params;
  const slug = params.shop_name;

  // Fetch target shop from database using the generated URL column
  const { data: targetShopData, error: targetError } = await supabase
    .from('agent_barbershop_leads')
    .select('*')
    .ilike('chair_pricing_tool_url', `%/${slug}%`)
    .limit(1)
    .single();

  if (targetError || !targetShopData) {
    console.error("Shop not found:", slug);
    notFound();
  }

  const targetLat = targetShopData.latitude ? parseFloat(targetShopData.latitude) : 29.6530581; // fallback to Houston
  const targetLng = targetShopData.longitude ? parseFloat(targetShopData.longitude) : -95.5613039;

  // Fetch active barbers looking for placement
  const { data: barbers } = await supabase
    .from('agent_barber_leads')
    .select('*')
    .eq('status', 'interested_in_placement')
    .neq('is_actively_looking', false);

  let processedBarbers: any[] = [];
  
  if (barbers) {
    processedBarbers = barbers.map(barber => {
      let distance = null;
      if (barber.latitude && barber.longitude) {
        distance = calculateDistance(
          targetLat, 
          targetLng, 
          parseFloat(barber.latitude), 
          parseFloat(barber.longitude)
        );
      }
      return {
        ...barber,
        distance,
      };
    })
    .sort((a, b) => (a.distance || 99) - (b.distance || 99)); // Sort by closest
  }

  // Fetch local barbershops for rent/commission averages
  const { data: shops } = await supabase
    .from('agent_barbershop_leads')
    .select('id, shop_name, rent_rate, rent_type, latitude, longitude')
    .neq('id', targetShopData.id); // Exclude the target shop from averages

  let processedShops: any[] = [];
  if (shops) {
    processedShops = shops.map(shop => {
      let distance = null;
      if (shop.latitude && shop.longitude) {
        distance = calculateDistance(
          targetLat, 
          targetLng, 
          parseFloat(shop.latitude), 
          parseFloat(shop.longitude)
        );
      }
      return {
        ...shop,
        distance,
      };
    });
  }

  const targetShopUIInfo = {
    ownerName: targetShopData.owner_name || "Shop Owner",
    shopName: targetShopData.shop_name || "Barbershop",
    cityInfo: targetShopData.city || "Houston, TX",
    rentRate: targetShopData.rent_rate || "$250/week",
    rentType: targetShopData.rent_type || "Booth Rent",
    boothCountAvailable: targetShopData.booth_count_available || 1,
    initials: (targetShopData.owner_name || "S O").substring(0, 2).toUpperCase()
  };

  return <ClientDashboard initialBarbers={processedBarbers} initialShops={processedShops} targetShop={targetShopUIInfo} />
}
