/**
 * scripts/loop_veo_poll_agent.ts
 *
 * Polls Google API for long-running Veo 3 video generations.
 * Saves the resulting videos to /public/videos/ and updates Supabase.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"
import * as path from "https://deno.land/std@0.167.0/path/mod.ts"

await config({ path: ".env.local", export: true })

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

const VEO_API_KEY = Deno.env.get("GOOGLE_VEO3_API_KEY");

// Ensure videos directory exists
const VIDEOS_DIR = path.join(Deno.cwd(), "public", "videos");
try {
  await Deno.mkdir(VIDEOS_DIR, { recursive: true });
} catch(e) {}

async function checkOperations() {
  console.log(`\n======================================================`)
  console.log(`🔄 POLLING VEO 3 OPERATIONS`)
  console.log(`======================================================`)

  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, veo_op_id")
    .eq("veo_status", "generating")

  if (error) {
    console.error("❌ Failed to query pending operations:", error.message)
    return
  }

  if (!shops || shops.length === 0) {
    console.log("No videos currently generating.")
    return
  }

  console.log(`Found ${shops.length} videos currently generating. Checking status...`)

  for (const shop of shops) {
    const opId = shop.veo_op_id;
    // opId is usually "models/veo-3.0-generate-001/operations/xxxx"
    // The endpoint is simply https://generativelanguage.googleapis.com/v1beta/{operation_name}
    const url = `https://generativelanguage.googleapis.com/v1beta/${opId}?key=${VEO_API_KEY}`;
    
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        console.error(`❌ Operation Error for ${shop.shop_name}:`, data.error.message);
        await supabase.from("agent_barbershop_leads").update({ veo_status: "failed" }).eq("id", shop.id);
        continue;
      }

      if (data.done) {
        console.log(`✅ Video complete for: ${shop.shop_name}`);
        
        // Handle Video Output
        const output = data.response; 
        const videoUri = output?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        let localPath = "";
        
        if (videoUri) {
             const fileName = `shop_${shop.id.replace(/-/g, '')}.mp4`;
             const fullPath = path.join(VIDEOS_DIR, fileName);
             
             try {
               const videoRes = await fetch(`${videoUri}&key=${VEO_API_KEY}`);
               if (!videoRes.ok) throw new Error(`Failed to fetch video: ${videoRes.status}`);
               
               const arrayBuffer = await videoRes.arrayBuffer();
               const bytes = new Uint8Array(arrayBuffer);
               
               await Deno.writeFile(fullPath, bytes);
               console.log(`💾 Saved video to ${fullPath}`);
               localPath = `/videos/${fileName}`;
             } catch (err) {
               console.error("❌ Failed to download the video file:", err);
               localPath = "Complete - Download Failed";
             }
        } else {
             // Fallback if the structure is different
             localPath = "Complete - Check Google Cloud Console";
             console.log("⚠️ Video marked as done, but couldn't parse URI from response. Raw response saved to status.", JSON.stringify(output).substring(0, 200));
        }

        await supabase.from("agent_barbershop_leads").update({ 
            veo_status: "completed",
            veo_video_url: localPath
        }).eq("id", shop.id);

      } else {
        console.log(`⏳ Still rendering: ${shop.shop_name} (${opId})`);
      }

    } catch (err) {
      console.error(`❌ Fetch Error for ${shop.shop_name}:`, err.message);
    }

    // Throttle
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function loop() {
  const INTERVAL_MINUTES = 5;
  while (true) {
    await checkOperations();
    console.log(`\n💤 Sleeping for ${INTERVAL_MINUTES} minutes...`);
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MINUTES * 60 * 1000));
  }
}

loop();
