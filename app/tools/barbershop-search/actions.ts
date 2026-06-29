"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function searchBarbershops(query: string) {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    const searchTerm = `%${query.trim()}%`;

    const { data, error } = await supabase
      .from('agent_barbershop_leads')
      .select('id, shop_name, city, formatted_address, phone')
      .or(`shop_name.ilike.${searchTerm},city.ilike.${searchTerm}`)
      .limit(20);

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("Error in searchBarbershops:", err);
    return { success: false, error: err.message };
  }
}
