const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const tools = [
  { name: "Barber & Cosmetology Placement", url: "/barber-beauty-network", description: "The premier Barber & Beauty Network for discovering career opportunities, applying for jobs, and networking with top-tier shop owners." },
  { name: "Texas Barber Exam Intelligence Prep", url: "/texas-barber-exam-intelligence-prep", description: "An AI-powered study guide and exam preparation tool designed specifically for the Texas Barber written and practical exams to ensure passing scores." },
  { name: "Accreditation Advisory Committee Toolkit", url: "/program-advisory-committee-kit", description: "A comprehensive toolkit and guide for Barber and Cosmetology schools to maintain Title IV compliance and manage their Program Advisory Committees effectively." },
  { name: "Shop Day Map", url: "/shop-day-map", description: "An interactive map displaying all available barbershops and salons participating in the Shop Day program, allowing professionals to visually search for placement opportunities in their area." },
  { name: "Shop Day Matches", url: "/shop-day-matches", description: "An AI-driven matchmaking dashboard that connects barbers and cosmetologists with shops that perfectly align with their skills, culture preferences, and career goals." },
  { name: "Shop Day Requests", url: "/shop-day-requests", description: "A management portal for shop owners to review, accept, or decline incoming requests from professionals wanting to try out a chair at their shop." },
  { name: "Texas Barber Exam Intelligence Deck", url: "/tools/texas-barber-exam-practice-deck", description: "Interactive flashcards and practice questions to help students master the material for the Texas Barber licensing exam." },
  { name: "Texas Barber Instructor Intelligence Dashboard", url: "/tools/texas-barber-instructor-intelligence-dashboard", description: "A powerful analytics and tracking dashboard for instructors to monitor student progress, identify weak areas, and optimize curriculum delivery." },
  { name: "Texas Barber School Benchmarking Intelligence", url: "/texas-school-benchmarking", description: "A data-driven tool that allows Barber schools in Texas to compare their enrollment, graduation rates, and performance metrics against state averages and competitors." },
  { name: "Texas Barber School Historical Performance Tracker", url: "/texas-barber-school-historical-performance", description: "Access years of historical data on Texas barber school pass/fail rates, state board results, and overall institutional performance trends." },
  { name: "Texas Barbershop Placement Matcher & Agent", url: "/texas-barbershop-placement-matcher", description: "An autonomous AI agent that proactively matches licensed professionals with high-end shops in Texas, negotiating terms and facilitating introductions." },
  { name: "Texas Barber & Cosmetology Continuing Education Portal", url: "/barber-cos-continuing-education", description: "The official portal for licensed professionals to complete their required continuing education hours and maintain active license status in Texas." },
  { name: "Pixel Analytics", url: "/pixel-analytics", description: "Advanced web analytics and tracking tool that monitors user engagement, conversion funnels, and marketing performance across your shop's digital presence." },
  { name: "Shop Day Connections", url: "/shop-day-connections", description: "A messaging and networking hub where shop owners and professionals can communicate directly to discuss placement and career opportunities." },
  { name: "Shop Site Template", url: "/s/a6cd48e5-2b32-4062-8284-c100cccdefc3", description: "A highly optimized, high-converting website template designed specifically for barbershops and salons to attract more clients and streamline bookings." },
  { name: "Shop Site AI Customizer", url: "/tools/shop-site-template/shop-website-customizer/a6cd48e5-2b32-4062-8284-c100cccdefc3/customizer", description: "An AI-powered website builder that allows shop owners to instantly customize their digital storefront, update menus, and change designs without coding." },
  { name: "AI Booth Station Tool", url: "/tools/ai-booth-station", description: "A smart management system for shop owners to track booth rental payments, monitor station utilization, and maximize revenue per square foot." },
  { name: "Foot Traffic Radar Tool", url: "/tools/foot-traffic-radar", description: "A local SEO and marketing tool that analyzes neighborhood data to help barbershops increase walk-in clientele, boost local visibility, and get more clients." },
  { name: "Barbershop Search Engine", url: "/search", description: "The ultimate hybrid search engine for finding the best barbershops, salons, industry news, and career opportunities using advanced AI semantic matching." },
  { name: "Web Crawler Domain Management", url: "/tools/domain-management", description: "An administrative console to configure the AI web crawler, manage seed domains, and generate vector embeddings for intelligent content indexing." }
];

async function seedTools() {
  console.log('Starting seed process for platform tools...');
  for (const tool of tools) {
    console.log(`Generating embedding for: ${tool.name}`);
    try {
      const res = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: `${tool.name}. ${tool.description}`,
        config: { outputDimensionality: 768 }
      });
      
      const embedding = res.embeddings[0].values;
      
      const { error } = await supabase.from('platform_tools').insert({
        name: tool.name,
        url: tool.url,
        description: tool.description,
        embedding: `[${embedding.join(',')}]`
      });
      
      if (error) {
        console.error(`Error inserting ${tool.name}:`, error);
      } else {
        console.log(`Successfully inserted ${tool.name}`);
      }
      
      // Delay to respect rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`Failed to process ${tool.name}:`, err);
    }
  }
  console.log('Finished seeding platform tools!');
}

seedTools();
