
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const SUPABASE_URL = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

/**
 * scripts/test-instagram-media-insights.ts
 * 
 * Run with: deno run -A scripts/test-instagram-media-insights.ts
 */
const API_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

async function testIGInsights() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error("❌ Missing Supabase credentials in environment");
        return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Use the project ID from your logs
    const projectId = "00000000-0000-0000-0000-000000000001";
    
    console.log(`🔍 [DIAGNOSTIC] Checking Instagram Insights for Project: ${projectId}`);
    
    const { data: connection, error: connError } = await supabase
        .from("client_db_connections")
        .select("sync_config")
        .eq("project_id", projectId)
        .eq("db_type", "instagram")
        .eq("is_active", true)
        .maybeSingle();

    if (connError || !connection) {
        console.error("❌ Could not find an active Instagram connection for this project.");
        return;
    }

    const config = connection.sync_config || {};
    const token = config.access_token;
    const igId = config.instagram_business_account_id;

    if (!token) {
        console.error("❌ No access token found in database for this project.");
        return;
    }

    console.log(`✅ Token Found (ends in ...${token.substring(token.length - 10)})`);
    console.log(`✅ Instagram Business ID: ${igId}`);

    // --- NEW: Verify token permissions ---
    console.log(`\n[0] Verifying Token Scopes...`);
    const permRes = await fetch(`${BASE_URL}/me/permissions?access_token=${token}`);
    const permData = await permRes.json();
    if (permData.data) {
        console.log("   Active Scopes:");
        permData.data.forEach((p: any) => {
            console.log(`   - ${p.permission}: ${p.status}`);
        });
    } else {
        console.log("   ❌ Error checking permissions:", JSON.stringify(permData));
    }

    // Media IDs from your request
    const mediaIds = ["17859472425562908", "18092025935113462"];

    for (const mId of mediaIds) {
        console.log(`\n====================================================`);
        console.log(`TESTING MEDIA ID: ${mId}`);
        console.log(`====================================================`);
        
        // 1. Fetch BASIC Fields (Likes, Comments)
        console.log("\n[1] Fetching Basic Fields...");
        const fieldsRes = await fetch(`${BASE_URL}/${mId}?fields=id,like_count,comments_count,media_type,timestamp,caption&access_token=${token}`);
        const fieldsData = await fieldsRes.json();
        
        if (fieldsData.error) {
            console.error("❌ FIELDS ERROR:", fieldsData.error.message);
        } else {
            console.log(`   Likes: ${fieldsData.like_count}`);
            console.log(`   Comments: ${fieldsData.comments_count}`);
            console.log(`   Type: ${fieldsData.media_type}`);
        }

        // 2. Fetch INSIGHTS (Reach, Impressions, Saved)
        console.log("\n[2] Fetching Deep Insights...");
        const metrics = ['reach', 'impressions', 'saved'];
        if (fieldsData.media_type === 'VIDEO') metrics.push('play_count');

        const insightsRes = await fetch(`https://graph.facebook.com/v19.0/${mId}/insights?metric=${metrics.join(',')}&access_token=${token}`);
        const insightsData = await insightsRes.json();
        
        if (insightsData.error) {
            console.error("   ❌ INSIGHTS ERROR:", insightsData.error.message);
            if (insightsData.error.code === 100 || insightsData.error.message.includes('permission')) {
                console.log("\n   💡 DIAGNOSIS: Missing 'instagram_manage_insights' permission.");
                console.log("   The token was likely generated without the required scope to view reach/impressions.");
            }
        } else {
            console.log("   ✅ Data received from Meta:");
            insightsData.data?.forEach((m: any) => {
                console.log(`   - ${m.name}: ${m.values[0]?.value}`);
            });
        }
    }
}

testIGInsights();
