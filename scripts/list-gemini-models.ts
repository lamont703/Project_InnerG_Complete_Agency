
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

async function listGeminiModels() {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    console.log("🔍 Fetching available Gemini models...");
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.models) {
        console.log("✅ Models found:");
        data.models.forEach((m: any) => {
            console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(", ")})`);
        });
    } else {
        console.error("❌ No models found or error:", data);
    }
}

listGeminiModels();
