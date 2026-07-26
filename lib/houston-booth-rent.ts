import { createClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase-fetch-all";
import { extractZip } from "@/lib/geo-enrichment";
import { parseWeeklyRent, median } from "@/lib/shop-ecosystem";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const HOUSTON_FILTER = "%houston%";

export interface ZipRent {
  zip: string;
  weekly: number; // per-ZIP median weekly booth rent, rounded
}

export interface HoustonBoothRentStats {
  avgWeeklyRent: number; // rounded mean of every parseable weekly booth rent
  lowBandRent: number; // lowest per-ZIP median (falls back to overall min)
  highBandRent: number; // highest per-ZIP median (falls back to overall max)
  sampleSize: number; // shops + salons reporting a parseable booth rent
  swingMultiple: string; // highBand / lowBand, 1 decimal — e.g. "2.4"
  cheapestZips: ZipRent[]; // up to 5 lowest-median ZIPs (empty if too few qualify)
  priciestZips: ZipRent[]; // up to 3 highest-median ZIPs (empty if too few qualify)
}

// Last known-good tracked figures. Used only if the live query is unreachable
// or returns too few data points to trust, so the article always renders.
export const HOUSTON_BOOTH_RENT_FALLBACK: HoustonBoothRentStats = {
  avgWeeklyRent: 197,
  lowBandRent: 125,
  highBandRent: 300,
  sampleSize: 25,
  swingMultiple: "2.4",
  cheapestZips: [
    { zip: "77071", weekly: 125 },
    { zip: "77077", weekly: 135 },
    { zip: "77025", weekly: 140 },
    { zip: "77338", weekly: 145 },
    { zip: "77067", weekly: 150 },
  ],
  priciestZips: [
    { zip: "77449", weekly: 260 },
    { zip: "77002", weekly: 280 },
    { zip: "77079", weekly: 300 },
  ],
};

// Pulls only the shop + salon rent_rate columns for Houston and derives the
// booth-rent stats the "Opening Your Own Shop in Texas" profit section cites.
// Mirrors the parseWeeklyRent / median / extractZip pipeline already used by
// app/texas/houston/data.ts so numbers stay consistent across the site.
export async function getHoustonBoothRentStats(): Promise<HoustonBoothRentStats> {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const [shops, salons] = await Promise.all([
      fetchAllRows(supabase, "agent_barbershop_leads", "city, rent_rate", (q) => q.ilike("city", HOUSTON_FILTER)),
      fetchAllRows(supabase, "agent_salon_leads", "city, formatted_address, rent_rate", (q) => q.ilike("city", HOUSTON_FILTER)),
    ]);

    const allRents: number[] = [];
    const rentsByZip = new Map<string, number[]>();
    const add = (zipSource: string | null, rentRate: string | null) => {
      const rent = parseWeeklyRent(rentRate);
      if (rent == null) return;
      allRents.push(rent);
      const z = extractZip(zipSource);
      if (z) {
        if (!rentsByZip.has(z)) rentsByZip.set(z, []);
        rentsByZip.get(z)!.push(rent);
      }
    };
    for (const s of shops as any[]) add(s.city, s.rent_rate);
    for (const s of salons as any[]) add(s.formatted_address || s.city, s.rent_rate);

    // Too thin to publish as "tracked data" — fall back to last known-good.
    if (allRents.length < 5) return HOUSTON_BOOTH_RENT_FALLBACK;

    const avgWeeklyRent = Math.round(allRents.reduce((a, b) => a + b, 0) / allRents.length);

    // Per-ZIP medians (only ZIPs with >=2 points) give stable neighborhood
    // bands; fall back to overall min/max if too few ZIPs qualify.
    const zipPairs: ZipRent[] = Array.from(rentsByZip.entries())
      .filter(([, arr]) => arr.length >= 2)
      .map(([zip, arr]) => ({ zip, weekly: Math.round(median(arr) as number) }))
      .filter((p) => Number.isFinite(p.weekly))
      .sort((a, b) => a.weekly - b.weekly);

    const zipMedians = zipPairs.map((p) => p.weekly);
    const lowBandRent = zipMedians.length >= 2 ? zipMedians[0] : Math.round(Math.min(...allRents));
    const highBandRent = zipMedians.length >= 2 ? zipMedians[zipMedians.length - 1] : Math.round(Math.max(...allRents));

    const swingMultiple = lowBandRent > 0 ? (highBandRent / lowBandRent).toFixed(1) : HOUSTON_BOOTH_RENT_FALLBACK.swingMultiple;

    // Break out cheapest/priciest neighborhood ZIPs only when enough ZIPs
    // qualify to split without overlap; otherwise leave empty and the article
    // shows the band numbers without a specific ZIP list.
    let cheapestZips: ZipRent[] = [];
    let priciestZips: ZipRent[] = [];
    if (zipPairs.length >= 4) {
      const nCheap = Math.min(5, Math.floor(zipPairs.length / 2));
      const nPrice = Math.min(3, zipPairs.length - nCheap);
      cheapestZips = zipPairs.slice(0, nCheap);
      priciestZips = zipPairs.slice(zipPairs.length - nPrice).reverse();
    }

    return { avgWeeklyRent, lowBandRent, highBandRent, sampleSize: allRents.length, swingMultiple, cheapestZips, priciestZips };
  } catch {
    return HOUSTON_BOOTH_RENT_FALLBACK;
  }
}
