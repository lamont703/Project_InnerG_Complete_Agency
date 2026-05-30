/**
 * scripts/trigger_veo_agent.ts
 *
 * Inner G Complete Agency — Autonomous Veo Video Creation Agent
 * Targets 'agent_barbershop_leads' where hiring_need is true and veo_status is null.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

await config({ path: ".env.local", export: true })

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const VEO_API_KEY = Deno.env.get("GOOGLE_VEO3_API_KEY");
const MODEL_ID = "veo-3.0-generate-001";
const VEO_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:predictLongRunning?key=${VEO_API_KEY}`;

async function loadPendingShops(limit: number) {
  const { data, error } = await supabase
    .from("agent_barbershop_leads")
    .select("*")
    .gt("booth_count_available", 0)
    .not("rent_rate", "is", null)
    .is("veo_status", null)
    .limit(limit)

  if (error) throw error
  return data || []
}

async function startVeoGeneration(shop: any) {
  console.log(`\n======================================================`)
  console.log(`🎥 INITIATING VEO 3 GENERATION FOR: ${shop.shop_name}`)
  console.log(`======================================================`)

  // The MASTER FORMULA ensures aesthetic regularity across all videos
  const veoPrompt = `A smooth gimbal tracking shot moving slowly forward down the center aisle of a high-end, modern barbershop. Symmetrical framing, cinematic lighting, shallow depth of field. The shop is energetic with a modern aesthetic, representing the vibe of ${shop.shop_name} in ${shop.city}. An empty, pristine vintage black leather barber chair sits in the foreground bathed in a soft spotlight. The video features an upbeat instrumental background music track with absolutely no vocals or speaking.`;

  console.log(`\nGenerated Prompt:\n"${veoPrompt}"\n`);

  const targetApproval = Deno.env.get("AUTO_APPROVE") ? "y" : prompt(`Approve sending this prompt to Veo 3? (y/N): `)
  if (targetApproval?.trim().toLowerCase() !== 'y') {
    console.log(`⚠️ Generation skipped by human.\n`)
    return
  }

  const payload = {
    instances: [
      { prompt: veoPrompt }
    ],
    parameters: {
      aspectRatio: "9:16"
    }
  };

  const res = await fetch(VEO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`VEO_API_ERROR: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const operationName = data.name;

  if (!operationName) {
      throw new Error(`NO_OPERATION_NAME_RETURNED: ${JSON.stringify(data)}`);
  }

  console.log(`✅ Generation started! Operation ID: ${operationName}`);
  
  // Update the database
  const { error } = await supabase
    .from("agent_barbershop_leads")
    .update({
      veo_op_id: operationName,
      veo_status: "generating"
    })
    .eq("id", shop.id);

  if (error) throw error;
  console.log(`💾 Saved to Supabase.`);
}

async function runAgent(limit: number) {
  try {
    if (!VEO_API_KEY) throw new Error("Missing GOOGLE_VEO3_API_KEY in environment");

    const shops = await loadPendingShops(limit);
    if (shops.length === 0) {
      console.log("No shops currently waiting for video generation.");
      return;
    }

    for (const shop of shops) {
      try {
        await startVeoGeneration(shop);
      } catch (err) {
        console.error(`❌ Failed to start generation for ${shop.shop_name}:`, err.message);
      }
      
      // Throttle slightly between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (err) {
    console.error("Critical Failure:", err.message);
  }
}

const limitArg = parseInt(Deno.args[0], 10) || 1;
runAgent(limitArg);
