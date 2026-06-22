import { createClient } from "@supabase/supabase-js"
import ClientRadarDashboard from "../client-radar-dashboard"
import { notFound } from "next/navigation"

export const revalidate = 0; // Dynamic component

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function FootTrafficRadarShop(props: { params: Promise<{ shop_name: string }> }) {
  const params = await props.params;
  const slug = params.shop_name;

  // Fetch target shop from database using the generated URL column (similar to ai-booth-station)
  const { data: targetShopData, error: targetError } = await supabase
    .from('agent_barbershop_leads')
    .select('*')
    .ilike('chair_pricing_tool_url', `%${slug}`)
    .limit(1)
    .single();

  if (targetError || !targetShopData) {
    // If we can't find by chair_pricing_tool_url, try falling back to id match just in case
    const { data: fallbackShopData, error: fallbackError } = await supabase
      .from('agent_barbershop_leads')
      .select('*')
      .eq('id', slug)
      .limit(1)
      .single();

    if (fallbackError || !fallbackShopData) {
      console.error("Shop not found in Foot Traffic Radar:", slug);
      notFound();
    }
    return <ClientRadarDashboard shopData={fallbackShopData} />;
  }

  return <ClientRadarDashboard shopData={targetShopData} />;
}
