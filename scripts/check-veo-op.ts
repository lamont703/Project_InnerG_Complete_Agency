
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

async function checkOp() {
    const apiKey = Deno.env.get("GOOGLE_VEO3_API_KEY");
    // Operation name from previous run:
    const opId = "1nsi6dou0ber";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001/operations/${opId}?key=${apiKey}`;

    console.log(`🔍 Checking Operation: ${opId}...`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

checkOp();
