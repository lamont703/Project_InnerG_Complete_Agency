/**
 * scripts/trigger_barbershop_website_crawler_agent.ts
 *
 * Inner G Complete Agency — Autonomous Barbershop Website Crawler
 * Crawls barbershop websites to find email addresses and updates Supabase.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { config } from "https://deno.land/std@0.167.0/dotenv/mod.ts"

await config({ path: ".env.local", export: true })

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

// Robust Email Regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Exclude common false positives from websites (like images or template placeholders)
const INVALID_EMAILS = [
  'example', 'domain.com', 'sentry', '.png', '.jpg', '.jpeg', '.gif', 'wixpress', 'sitedomain'
];

function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase();
  for (const invalid of INVALID_EMAILS) {
    if (lower.includes(invalid)) return false;
  }
  return true;
}

async function fetchAndExtractEmail(url: string): Promise<string | null> {
  try {
    console.log(`   🌐 Fetching ${url}...`);
    // Add timeout to prevent hanging forever
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`   ⚠️ Failed to load ${url}: HTTP ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    const matches = html.match(EMAIL_REGEX);
    if (!matches) return null;

    // Filter valid, unique emails
    const uniqueEmails = [...new Set(matches.filter(isValidEmail))];
    
    if (uniqueEmails.length > 0) {
      // Prioritize info@, contact@, hello@, etc. if multiple exist
      const priorityPrefixes = ['info', 'contact', 'hello', 'support', 'booking'];
      
      uniqueEmails.sort((a, b) => {
        const aPrefix = a.split('@')[0].toLowerCase();
        const bPrefix = b.split('@')[0].toLowerCase();
        const aHasPriority = priorityPrefixes.includes(aPrefix);
        const bHasPriority = priorityPrefixes.includes(bPrefix);
        
        if (aHasPriority && !bHasPriority) return -1;
        if (!aHasPriority && bHasPriority) return 1;
        return 0;
      });

      return uniqueEmails[0];
    }
    
    return null;
  } catch (error) {
    console.log(`   ❌ Error scraping ${url}:`, error.message);
    return null;
  }
}

async function scrapeEmailFromDomain(baseUrl: string): Promise<string | null> {
  // Strip trailing slash if present
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const pathsToCheck = ["", "/contact", "/contact-us", "/about", "/about-us"];
  
  for (const path of pathsToCheck) {
    const target = `${cleanBase}${path}`;
    const email = await fetchAndExtractEmail(target);
    if (email) {
      return email;
    }
  }
  
  return null;
}

async function runCrawlerAgent(limit: number) {
  console.log("==================================================================")
  console.log(`🌐 INNER G COMPLETE AGENCY — BARBERSHOP CRAWLER AGENT (LIMIT: ${limit}) 🌐`)
  console.log("==================================================================\n")

  // Find shops that have a website but no valid email
  const { data: shops, error } = await supabase
    .from("agent_barbershop_leads")
    .select("id, shop_name, website, email")
    .not("website", "is", null)
    .neq("website", "")
    .or("email.is.null,email.eq.")
    .limit(limit * 3); // Fetch more in case we filter out NOT_FOUND

  if (error) {
    console.error("❌ Failed to query database:", error);
    return;
  }

  // Filter out the ones we previously couldn't find an email for to prevent infinite looping
  const pendingShops = shops?.filter(s => s.email !== "NOT_FOUND").slice(0, limit) || [];

  if (pendingShops.length === 0) {
    console.log("✅ No pending shops found with websites missing an email.");
    return;
  }

  console.log(`🔍 Found ${pendingShops.length} shops to crawl...\n`);

  for (const shop of pendingShops) {
    console.log(`🤖 Processing ${shop.shop_name}...`);
    
    // Ensure URL has http/https
    let targetUrl = shop.website;
    if (!targetUrl.startsWith("http")) {
      targetUrl = "https://" + targetUrl;
    }

    const foundEmail = await scrapeEmailFromDomain(targetUrl);

    if (foundEmail) {
      console.log(`   🎯 Success! Found email: ${foundEmail}`);
      
      const { error: updateError } = await supabase
        .from("agent_barbershop_leads")
        .update({ email: foundEmail })
        .eq("id", shop.id);
        
      if (updateError) {
        console.error(`   ❌ Failed to save email to DB:`, updateError);
      } else {
        console.log(`   💾 Saved ${foundEmail} to database for ${shop.shop_name}`);
      }
    } else {
      console.log(`   🤷 No valid email found across ${targetUrl} pages.`);
      
      // Mark as NOT_FOUND so we don't scrape it over and over every 5 minutes
      const { error: updateError } = await supabase
        .from("agent_barbershop_leads")
        .update({ email: "NOT_FOUND" })
        .eq("id", shop.id);

      if (!updateError) {
        console.log(`   💾 Marked as NOT_FOUND in database`);
      }
    }
    console.log("------------------------------------------------------");
  }
  
  console.log("🏁 Crawler Agent run complete.\n");
}

const arg = Deno.args[0];
const limitArg = parseInt(arg, 10) || 5;

runCrawlerAgent(limitArg);
