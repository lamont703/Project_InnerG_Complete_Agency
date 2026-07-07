/**
 * Booksy Search & Login Agent
 * 
 * Phase 1: Login + Search for Texas barbers.
 * Run: node agent.js
 * 
 * Requirements:
 *   - Copy .env.example to .env and fill in your Booksy credentials
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
// Load from root .env.local (where Booksy credentials live)
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// Mirrors lib/slug.ts — scripts run as plain CommonJS and can't import from lib/.
function slugify(input) {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}
function buildSlug(name, city, id) {
  return `${slugify(name || 'entity')}-${slugify(city || 'tx')}-${id.replace(/-/g, '').slice(0, 8)}`;
}

// ─── Config ──────────────────────────────────────────────────────────────────
const EMAIL    = process.env.BOOKSY_LOGIN;
const PASSWORD = process.env.BOOKSY_PASSWORD;
const SEARCH_QUERY    = process.env.SEARCH_QUERY    || 'Haircut & Beard';
const SEARCH_LOCATION = process.env.SEARCH_LOCATION || 'Texas, TX';
const MAX_PAGES       = parseInt(process.env.MAX_PAGES || '10', 10);
const SESSION_FILE = path.join(__dirname, 'auth.json');

// Supabase Init
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

// Human-like random delay between min and max ms
const sleep = (min, max) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ─── Validation ───────────────────────────────────────────────────────────────
if (!EMAIL || !PASSWORD) {
  console.error('\n❌  Missing credentials. Make sure BOOKSY_LOGIN and BOOKSY_PASSWORD are set in your root .env.local\n');
  process.exit(1);
}

// ─── Main Agent ───────────────────────────────────────────────────────────────
(async () => {
  console.log('\n🚀  Booksy Agent starting...');
  console.log(`📍  Searching for: "${SEARCH_QUERY}" near "${SEARCH_LOCATION}"\n`);

  const browser = await chromium.launch({
    headless: false,          // Set to true for production; false so you can watch it work
    slowMo: 80,               // Slightly slows all actions to appear more human
    args: [
      '--disable-blink-features=AutomationControlled',  // Hide automation flag
      '--no-sandbox',
      '--start-maximized',
    ],
  });

  const contextOptions = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  };

  const hasSession = fs.existsSync(SESSION_FILE);
  if (hasSession) {
    console.log('📦  Found saved session (auth.json). Agent will be logged in instantly.');
    contextOptions.storageState = SESSION_FILE;
  }

  const context = await browser.newContext(contextOptions);

  const page = await context.newPage();

  // Mask webdriver flag so anti-bot checks don't flag us immediately
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    if (!hasSession) {
      // ── Step 1: Navigate to Booksy ───────────────────────────────────────────
      console.log('🌐  Navigating to Booksy...');
      await page.goto('https://booksy.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(1500, 3000);

      // ── Step 2: Click "Log in" ────────────────────────────────────────────────
      console.log('🔍  Looking for Log in button...');
      const loginBtn = page.locator('text=Log in').first();
      await loginBtn.waitFor({ timeout: 10000 });
      await loginBtn.click();
      await sleep(1000, 2000);

      // ── Step 3: Enter email ───────────────────────────────────────────────────
      console.log('📧  Entering email...');
      const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
      await emailInput.waitFor({ timeout: 10000 });
      await emailInput.click();
      await sleep(300, 700);
      await emailInput.type(EMAIL, { delay: 80 });    // Type character by character
      await sleep(500, 1000);
      
      // Press Enter in case it's a multi-step login form (Email -> Next -> Password)
      await emailInput.press('Enter');
      await sleep(1500, 3000);

      // ── Step 4: Enter password ────────────────────────────────────────────────
      console.log('🔒  Entering password...');
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.waitFor({ timeout: 10000 });
      await passwordInput.click();
      await sleep(300, 600);
      await passwordInput.type(PASSWORD, { delay: 90 });
      await sleep(500, 1000);

      // ── Step 5: Submit login ──────────────────────────────────────────────────
      console.log('✅  Submitting login...');
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await sleep(3000, 5000);

      // Check for potential 2FA / error
      const url = page.url();
      if (url.includes('login') || url.includes('signin')) {
        console.warn('⚠️   Still on login page — check credentials or 2FA in the browser window.');
      } else {
        console.log('✅  Logged in successfully!\n');
      }
    } else {
      console.log('⏩  Skipping manual login flow, using saved auth.json state...\n');
    }



    // ── Sniff API Key ─────────────────────────────────────────────────────────
    let booksyApiKey = null;
    page.on('request', request => {
      const headers = request.headers();
      if (headers['x-api-key']) {
        booksyApiKey = headers['x-api-key'];
      }
    });

    // ── Pagination Loop ───────────────────────────────────────────────────────────
    const extractedData = [];
    let hasMorePages = true;
    let currentPage = 1;

    while (currentPage <= MAX_PAGES && hasMorePages) {
      console.log(`\n📄 --- STARTING PAGE ${currentPage} ---`);

      // ── Step 6: Navigate to search ────────────────────────────────────────────
      let searchUrl = process.env.SEARCH_URL;
      
      if (searchUrl) {
        const separator = searchUrl.includes('?') ? '&' : '?';
        const pagedUrl = searchUrl.includes('businessesPage=') 
          ? searchUrl.replace(/businessesPage=\d+/, `businessesPage=${currentPage}`) 
          : `${searchUrl}${separator}businessesPage=${currentPage}`;
        console.log(`🔎  Navigating directly to custom SEARCH_URL (Page ${currentPage}): ${pagedUrl}`);
        searchUrl = pagedUrl;
      } else {
        console.log(`🔎  Searching for "${SEARCH_QUERY}" in "${SEARCH_LOCATION}" (Page ${currentPage})...`);
        searchUrl = `https://booksy.com/en-us/s?query=${encodeURIComponent(SEARCH_QUERY)}&location=${encodeURIComponent(SEARCH_LOCATION)}&businessesPage=${currentPage}`;
      }

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000, 5000);

    // Scroll to force an API call if we haven't sniffed the key yet
    if (!booksyApiKey) {
      await page.evaluate(() => window.scrollBy(0, 500));
      await sleep(1500, 2000);
    }


    // ── Step 7: Scrape visible business listings ──────────────────────────────
    console.log('📋  Extracting profile links from search results...\n');

    let profileLinks = await page.evaluate(() => {
      // Find all anchor tags that look like Booksy profiles (usually have an ID followed by an underscore)
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href.includes('booksy.com/en-us/') && /\d+_/.test(href) && !href.includes('?') && !href.includes('/s/'));
      return [...new Set(links)]; // deduplicate
    });
    
    // Fallback if the regex is too strict
    if (profileLinks.length === 0) {
       profileLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'))
            .map(a => a.href)
            .filter(href => href.includes('booksy.com/en-us/') && !href.includes('/s?') && !href.includes('/s/') && !href.includes('login') && !href.includes('signup'));
          return [...new Set(links)];
       });
    }

    if (profileLinks.length === 0) {
       console.log('🏁  No profiles found on this page. We reached the end of search results.\n');
       hasMorePages = false;
       continue;
    }

    console.log(`✅  Found ${profileLinks.length} potential profiles.`);
    
    // ── Deduplicate against Supabase database ─────────────────────────────────
    if (supabaseUrl && supabaseKey) {
      console.log('🔄  Cross-referencing with database to skip existing leads...');
      try {
        const { data: existingLeads, error } = await supabase
          .from('agent_barber_leads')
          .select('profile_url');
          
        if (error) throw error;
        
        const existingUrls = new Set(existingLeads.map(l => l.profile_url));
        const originalCount = profileLinks.length;
        
        profileLinks = profileLinks.filter(link => !existingUrls.has(link));
        
        const skippedCount = originalCount - profileLinks.length;
        console.log(`⏭️   Skipped ${skippedCount} profiles already in the database.`);
        console.log(`✨  ${profileLinks.length} brand new profiles left to scrape.\n`);
        
        if (profileLinks.length === 0) {
          console.log('🏁  All profiles on this page are duplicates. Moving to next page...\n');
          currentPage++;
          continue;
        }
      } catch (dbErr) {
        console.log(`   ⚠️ Failed to query DB for deduplication: ${dbErr.message}`);
      }
    }
    
    // Process all remaining new profiles (Scaling up!)
    const targets = profileLinks;
    console.log(`🎯  Navigating to ${targets.length} new profiles to extract real phone numbers from the UI...\n`);

    // ── Step 8: Loop through profiles ─────────────────────────────────────────
    for (let i = 0; i < targets.length; i++) {
      const link = targets[i];
      console.log(`[${i+1}/${targets.length}] ${link.substring(0, 80)}...`);

      const idMatch = link.match(/\/en-us\/(\d+)_/);
      const businessId = idMatch ? idMatch[1] : null;

      let name  = null;
      let address = null;
      let phoneReal = null;

      // ── Step A: Direct API (Name & Address only) ────────────────────────────
      if (businessId) {
        try {
          const apiUrl = `https://us.booksy.com/core/v2/customer_api/businesses/${businessId}/`;
          const cookies = await context.cookies();
          const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

          const headersObj = {
            'Accept': 'application/json',
            'Cookie': cookieHeader,
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://booksy.com/',
            'Origin':  'https://booksy.com',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          };
          if (booksyApiKey) headersObj['x-api-key'] = booksyApiKey;

          const apiRequest = await context.request.get(apiUrl, { headers: headersObj });

          if (apiRequest.ok()) {
            const result = await apiRequest.json();
            const b = result.business || result;
            name    = b.name  || b.business_name || null;
            address = b.location?.address || b.address || null;
            console.log(`   ✅ API Name & Address loaded`);
          }
        } catch (apiErr) {
          console.log(`   ⚠️  API call failed: ${apiErr.message}`);
        }
      }

      // ── Step B: Render Page & Extract Real Phone from DOM ───────────────────
      try {
        let loadedClean = false;
        try {
          await page.goto(link, { waitUntil: 'networkidle', timeout: 20000 });
          loadedClean = true;
        } catch (timeoutErr) {
          await page.goto(link, { waitUntil: 'load', timeout: 20000 });
          await sleep(3000, 5000);
        }

        await sleep(loadedClean ? 1500 : 500, loadedClean ? 2500 : 1500);

        // Scroll slightly to render
        await page.evaluate(() => window.scrollBy(0, 800));
        await sleep(1500, 2000);

        // Scan full DOM for the 10-digit number
        const domResult = await page.evaluate(() => {
          // Look for any standard 10 digit US number format
          const bodyText = document.body.innerText;
          const match = bodyText.match(/(?:\+?1[-.●\s]?)?\(?([0-9]{3})\)?[-.●\s]?([0-9]{3})[-.●\s]?([0-9]{4})/);
          return match ? match[0] : null;
        });
        
        if (domResult) {
          phoneReal = domResult;
          console.log(`   📞 Real Phone from UI: ${phoneReal}\n`);
        } else {
          console.log(`   ❌ No phone found in the UI for this shop.\n`);
        }

        const leadData = { 
          name: name || await page.title().then(t => t.split('|')[0].trim()), 
          phone: phoneReal || 'No phone found', 
          address: address || 'N/A', 
          profile_url: link, 
          source: 'Booksy',
          status: 'pending_outreach'
        };

        extractedData.push(leadData);

        // Insert into database if phone exists
        if (leadData.phone !== 'No phone found' && supabaseUrl && supabaseKey) {
          try {
            const { data: row, error } = await supabase
              .from('agent_barber_leads')
              .upsert(
                {
                  name: leadData.name,
                  phone: leadData.phone,
                  address: leadData.address,
                  profile_url: leadData.profile_url,
                  source: leadData.source,
                  status: leadData.status,
                  updated_at: new Date().toISOString()
                },
                { onConflict: 'phone' }
              )
              .select('id, slug')
              .single();

            if (error) throw error;
            if (row && !row.slug) {
              const slug = buildSlug(leadData.name, leadData.address, row.id);
              await supabase.from('agent_barber_leads').update({ slug }).eq('id', row.id);
            }
            console.log(`   💾 Saved to agent_barber_leads in Supabase!`);
          } catch (dbErr) {
            console.log(`   ⚠️ Failed to save to DB: ${dbErr.message}`);
          }
        }

      } catch (err) {
        console.log(`   ❌ Failed to load profile UI: ${err.message}\n`);
      }
    }
    
      currentPage++;
    } // End of Pagination Loop


    console.log('\n=========================================');
    console.log('✅  FINAL RESULTS: BUSINESS PROFILES EXTRACTED');
    console.log('=========================================\n');
    extractedData.forEach((d, i) => {
       console.log(`${i+1}. ${d.name}`);
       console.log(`   📞 Phone:   ${d.phone}`);
       if (d.address) console.log(`   📍 Address: ${d.address}`);
       console.log(`   🔗 ${d.profile_url}`);
       console.log(`   ⚡ Source:  ${d.source || 'hybrid_dom_api'}\n`);
    });

    const screenshotPath = path.join(__dirname, 'extraction-complete.png');
    await page.screenshot({ path: screenshotPath });


  } catch (err) {
    console.error('\n❌  Agent encountered an error:', err.message);

    // Always save a screenshot on failure to debug what went wrong
    const errScreenshot = path.join(__dirname, 'error-screenshot.png');
    await page.screenshot({ path: errScreenshot });
    console.log(`📸  Error screenshot saved to: scripts/booksy-agent/error-screenshot.png`);

  } finally {
    await browser.close();
    console.log('\n🏁  Agent finished.');
  }
})();
