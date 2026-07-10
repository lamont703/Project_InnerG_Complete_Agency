const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function extractTextFromPage(page, url) {
  console.log(`  -> Visiting: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract visible text
    const text = await page.evaluate(() => {
      // Remove scripts, styles, nav, footers to clean up
      document.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove());
      return document.body.innerText.replace(/\n\s*\n/g, '\n').trim();
    });

    // Extract internal links to find sub-pages
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      const hrefs = new Set();
      anchors.forEach(a => {
        if (a.href && a.href.startsWith(window.location.origin)) {
          hrefs.add(a.href);
        }
      });
      return Array.from(hrefs);
    });

    return { text, links };
  } catch (err) {
    console.error(`  ❌ Failed to load ${url}:`, err.message);
    return { text: '', links: [] };
  }
}

async function testKnowledgeExtraction(startUrl) {
  console.log(`\n🚀 Starting Knowledge Extraction Test for: ${startUrl}`);
  
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  let allExtractedText = "";
  const visitedUrls = new Set();
  
  // 1. Scrape Homepage
  const homeData = await extractTextFromPage(page, startUrl);
  allExtractedText += `\n--- PAGE: ${startUrl} ---\n${homeData.text}\n`;
  visitedUrls.add(startUrl);

  // 2. Sub-page Discovery
  const keywords = ['about', 'service', 'price', 'pricing', 'menu', 'faq', 'policy', 'book'];
  const relevantLinks = homeData.links.filter(link => {
    const lowerLink = link.toLowerCase();
    // avoid pdfs or weird links, check for keywords
    if (lowerLink.includes('.pdf') || lowerLink.includes('.jpg')) return false;
    return keywords.some(kw => lowerLink.includes(kw));
  }).filter(link => !visitedUrls.has(link)).slice(0, 3); // Grab top 3 max

  if (relevantLinks.length > 0) {
    console.log(`  -> Found ${relevantLinks.length} highly relevant sub-pages. Scraping them...`);
    for (const link of relevantLinks) {
      const subData = await extractTextFromPage(page, link);
      allExtractedText += `\n--- PAGE: ${link} ---\n${subData.text}\n`;
      visitedUrls.add(link);
      await sleep(1000); // Politeness delay
    }
  } else {
    console.log("  -> No highly relevant sub-pages found. Proceeding with homepage only.");
  }

  await browser.close();

  console.log(`\n✅ Finished crawling. Extracted ${allExtractedText.length} characters of raw text.`);
  console.log(`🧠 Handing off to Gemini for structuring...`);

  // 3. AI Data Structuring
  const prompt = `
You are an expert AI data extractor. I am going to give you the raw scraped text from a barbershop, salon, or beauty school's website (including some sub-pages). 
The text is incredibly messy, unstructured, and might contain junk formatting.

Your job is to read this text and extract a clean JSON object containing the Knowledge Profile of this business.
If a piece of information is NOT found in the text, put null or an empty array. DO NOT INVENT DATA.

Output ONLY valid JSON.

Schema:
{
  "business_name": "Name of the business",
  "business_type": "barbershop | salon | school | supply_store | unknown",
  "walk_ins_accepted": boolean or null,
  "appointments_required": boolean or null,
  "cancellation_policy": "Brief summary of cancellation rules, or null",
  "hours_of_operation": "String describing hours, or null",
  "services": [
    {
      "name": "Service Name",
      "price": "Price or Price Range (string)",
      "description": "Brief description if available"
    }
  ],
  "specialties": ["list", "of", "specialties", "mentioned"],
  "faq": [
    {
      "question": "Question inferred or found",
      "answer": "Answer found"
    }
  ]
}

Raw Website Text:
${allExtractedText.substring(0, 60000)} // cap at 60k chars for safety
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    console.log("\n================================================");
    console.log("🎯 AI EXTRACTED KNOWLEDGE PROFILE (JSON)");
    console.log("================================================");
    console.log(response.text);
    console.log("================================================\n");

  } catch (err) {
    console.error("❌ Gemini API Error:", err.message);
  }
}

// Run the test
const targetUrl = process.argv[2] || 'https://www.vagaro.com/boardroomsalonformen-galleria';
testKnowledgeExtraction(targetUrl);
