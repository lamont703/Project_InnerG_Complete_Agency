import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Radar, MapPin, Building2 } from "lucide-react"
import BackButton from "./BackButton"

export const revalidate = 0; // Dynamic route

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

import { fetchBarberMatches } from "@/app/shop-day-matches/actions";

export default async function FootTrafficRadarDirectory({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  let shops = [];
  const { phone } = await searchParams;

  if (phone) {
    // Filter to only show shops in their 10-mile radius matches
    const result = await fetchBarberMatches(phone);
    if (result.matches) {
      // Filter out shops that don't have radar data yet
      shops = result.matches.filter((s: any) => s.radar_last_updated_at !== null);
    }
  } else {
    // Default: Fetch all shops that have radar data
    const { data } = await supabase
      .from('agent_barbershop_leads')
      .select('id, shop_name, city, chair_pricing_tool_url, opportunity_status, radar_last_updated_at')
      .not('radar_last_updated_at', 'is', null)
      .order('shop_name');
    if (data) shops = data;
  }

  return (
    <div className="min-h-screen bg-secondary/20">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-24">
        
        {/* Navigation / Header */}
        <div className="mb-12">
          {phone && (
            <div className="mb-8">
              <BackButton />
            </div>
          )}
          
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Radar className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Foot Traffic Radar
            </h1>
          </div>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Explore the competitive intelligence and local foot traffic data for barbershops across the network. Find the perfect chair with data-backed confidence.
          </p>
        </div>

        {/* Directory Grid */}
        {shops && shops.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => {
              // Extract the slug from the chair_pricing_tool_url, ignoring any query parameters
              const urlWithoutQuery = shop.chair_pricing_tool_url ? shop.chair_pricing_tool_url.split('?')[0] : null;
              const slugMatch = urlWithoutQuery ? urlWithoutQuery.match(/([^/]+)\/?$/) : null;
              const slug = slugMatch ? slugMatch[1] : shop.id;

              return (
                <Link 
                  key={shop.id} 
                  href={`/tools/foot-traffic-radar/${slug}`}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-background p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span className="text-sm font-medium uppercase tracking-wider">{shop.city || 'Unknown Location'}</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {shop.shop_name}
                  </h3>
                  
                  <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {shop.opportunity_status || 'Data Pending'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last Scanned: {new Date(shop.radar_last_updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border border-dashed p-12 text-center bg-background/50">
            <Radar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Radar Data Available</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              We are currently running our intelligence scripts. Check back later to see the latest foot traffic radar data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
