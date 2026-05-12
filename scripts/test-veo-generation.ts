
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

async function testVeo() {
    const apiKey = Deno.env.get("GOOGLE_VEO3_API_KEY");
    if (!apiKey) {
        console.error("❌ MISSING GOOGLE_VEO3_API_KEY");
        return;
    }

    const modelId = "veo-3.0-generate-001";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`;

    const payload = {
        instances: [
            {
                prompt: "A witty, fast-paced brand intro for an AI agency. Dark sleek aesthetic, neon violet accents, 8 seconds long, cinematic motion, attention-grabbing.",
            }
        ]
    };

    console.log(`🚀 Sending request to Veo 3.0 (${modelId})...`);
    
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("📥 Response received:");
        console.log(JSON.stringify(data, null, 2));

        if (data.name) {
            console.log(`\n✅ Operation Name: ${data.name}`);
        }
    } catch (e) {
        console.error("❌ Request Failed:", e);
    }
}

testVeo();
