
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

async function testEmbedding() {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = "gemini-embedding-001";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
    
    console.log(`🧪 Testing embedding with model: ${model}`);
    
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: `models/${model}`,
            content: { parts: [{ text: "Hello world" }] },
            outputDimensionality: 768
        })
    });
    
    const data = await res.json();
    if (data.embedding) {
        console.log("✅ Success! Embedding dims:", data.embedding.values.length);
    } else {
        console.error("❌ Failed:", JSON.stringify(data));
    }
}

testEmbedding();
