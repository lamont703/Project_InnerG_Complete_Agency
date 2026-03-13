
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function checkFailedJobs() {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl!, supabaseKey!);

    const { data, error } = await adminClient
        .from("embedding_jobs")
        .select("source_table, error_message")
        .eq("status", "failed")
        .limit(5);

    if (error) {
        console.error("Error fetching failed jobs:", error.message);
        return;
    }

    console.log("--- Failed Embedding Jobs ---");
    data.forEach((job, i) => {
        console.log(`${i+1}. Table: ${job.source_table} | Error: ${job.error_message}`);
    });
}

checkFailedJobs();
