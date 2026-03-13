
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function resetAndRunJobs() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl!, supabaseKey!);

    console.log("🔄 Resetting failed jobs to pending...");
    const { error: resetError } = await adminClient
        .from("embedding_jobs")
        .update({ status: "pending", error_message: null })
        .eq("status", "failed");

    if (resetError) {
        console.error("❌ Failed to reset jobs:", resetError.message);
        return;
    }

    console.log("🚀 Invoking process-embedding-jobs function...");
    const response = await fetch(`${supabaseUrl}/functions/v1/process-embedding-jobs`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ limit: 50 })
    });

    const result = await response.json();
    console.log("📊 Sync Result:", JSON.stringify(result, null, 2));
}

resetAndRunJobs();
