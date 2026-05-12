
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

/**
 * scripts/test-newsapi.ts
 * Test script to verify NewsAPI integration for technology news.
 */
async function testNewsAPI() {
    const apiKey = Deno.env.get("NEWS_API_KEY");

    if (!apiKey) {
        console.error("❌ NEWS_API_KEY not found in .env.local");
        return;
    }

    console.log("🚀 Testing NewsAPI for Technology Sources...");

    try {
        // 1. Fetch Technology Sources
        const url = `https://newsapi.org/v2/top-headlines/sources?category=technology&apiKey=${apiKey}`;
        console.log(`\nFetching: ${url.replace(apiKey, "xxx-key")}`);

        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== "ok") {
            console.error("❌ NewsAPI Error:", data.message || "Unknown error");
            return;
        }

        console.log(`\n✅ Successfully fetched ${data.sources.length} technology sources.`);

        // 2. Display Sources
        console.log("\n--- Technology News Sources ---");
        data.sources.forEach((source: any, index: number) => {
            console.log(`${index + 1}. [${source.id}] ${source.name}`);
            console.log(`   URL: ${source.url}`);
            console.log(`   Description: ${source.description.substring(0, 100)}...`);
            console.log("");
        });

        // 3. (Optional) Fetch some headlines for the first source
        if (data.sources.length > 0) {
            const firstSource = data.sources[0].id;
            console.log(`\n--- Recent Headlines from ${firstSource} ---`);
            const headlinesUrl = `https://newsapi.org/v2/top-headlines?sources=${firstSource}&apiKey=${apiKey}`;
            const headlinesRes = await fetch(headlinesUrl);
            const headlinesData = await headlinesRes.json();

            if (headlinesData.status === "ok") {
                headlinesData.articles.slice(0, 3).forEach((article: any, i: number) => {
                    console.log(`${i + 1}. ${article.title}`);
                    console.log(`   ${article.publishedAt} | ${article.url}\n`);
                });
            }
        }

        console.log("\n✅ NewsAPI sources test completed!");

        // 4. Test Top Headlines (Technology + AI/Blockchain)
        console.log("\n🚀 Testing Top Headlines for 'Technology' + 'AI/Blockchain'...");
        
        // NewsAPI /v2/top-headlines with category=technology and keywords
        const query = encodeURIComponent('AI OR Blockchain OR Crypto');
        const headlinesUrl = `https://newsapi.org/v2/top-headlines?category=technology&q=${query}&language=en&apiKey=${apiKey}`;
        
        console.log(`\nFetching: ${headlinesUrl.replace(apiKey, "xxx-key")}`);

        const headlinesRes = await fetch(headlinesUrl);
        const headlinesData = await headlinesRes.json();

        if (headlinesData.status === "ok") {
            console.log(`\n✅ Found ${headlinesData.totalResults} top headlines.`);
            console.log("\n--- Top Technology Headlines (Filtered) ---");
            headlinesData.articles.slice(0, 10).forEach((article: any, i: number) => {
                console.log(`${i + 1}. ${article.title}`);
                console.log(`   Source: ${article.source.name} | ${article.publishedAt}`);
                console.log(`   URL: ${article.url}\n`);
            });
        } else {
            console.error("❌ NewsAPI Error:", headlinesData.message || "Unknown error");
        }

        // 5. Test General Top Headlines (Technology) - No keywords
        console.log("\n🚀 Testing General Top Headlines for 'Technology' (No Keywords)...");
        const generalUrl = `https://newsapi.org/v2/top-headlines?category=technology&language=en&apiKey=${apiKey}`;
        console.log(`\nFetching: ${generalUrl.replace(apiKey, "xxx-key")}`);

        const generalRes = await fetch(generalUrl);
        const generalData = await generalRes.json();

        if (generalData.status === "ok") {
            console.log(`\n✅ Found ${generalData.totalResults} general tech headlines.`);
            console.log("\n--- Top Technology Headlines (General) ---");
            generalData.articles.slice(0, 5).forEach((article: any, i: number) => {
                console.log(`${i + 1}. ${article.title}`);
                console.log(`   Source: ${article.source.name} | ${article.publishedAt}`);
                console.log(`   URL: ${article.url}\n`);
            });
        }

        // 6. Strategic Engagement Matrix Test
        console.log("\n" + "=".repeat(50));
        console.log("🚀 TESTING STRATEGIC ENGAGEMENT MATRIX");
        console.log("=".repeat(50));

        const buckets = [
            {
                name: "Big Tech Battle (Rivalry/Strategy)",
                query: '"OpenAI" OR "Google Gemini" OR "Anthropic" OR "Microsoft AI"'
            },
            {
                name: "Future of Work (ROI/Productivity)",
                query: 'AI AND (Enterprise OR Productivity OR Workforce OR Automation)'
            },
            {
                name: "Ethics & Regulation (Controversy/Hot Takes)",
                query: 'AI AND (Ethics OR Regulation OR Policy OR Bias OR Copyright)'
            },
            {
                name: "Institutional Web3 (Authority/Finance)",
                query: 'Blockchain AND (Institutional OR "Real World Assets" OR Finance)'
            }
        ];

        for (const bucket of buckets) {
            console.log(`\n📂 Bucket: ${bucket.name}`);
            const encodedQuery = encodeURIComponent(bucket.query);
            const bucketUrl = `https://newsapi.org/v2/everything?q=${encodedQuery}&pageSize=3&sortBy=relevancy&language=en&apiKey=${apiKey}`;
            
            const res = await fetch(bucketUrl);
            const data = await res.json();

            if (data.status === "ok") {
                console.log(`✅ Found ${data.totalResults} articles.`);
                data.articles.forEach((article: any, i: number) => {
                    console.log(`   ${i + 1}. ${article.title}`);
                    // console.log(`      Source: ${article.source.name}`);
                });
            } else {
                console.log(`❌ Error: ${data.message}`);
            }
        }

        console.log("\n" + "=".repeat(50));
        console.log("✅ Strategic Matrix Test Completed!");
        console.log("=".repeat(50));

    } catch (err: any) {
        console.error("\n❌ Unexpected error:");
        console.error(err.message);
    }
}

testNewsAPI();
