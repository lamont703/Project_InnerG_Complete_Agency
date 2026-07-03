/**
 * Booksy Search Agent — Cosmetologists (Houston)
 *
 * Same approach as agent.js (which populated agent_barber_leads), pointed at
 * Booksy's "Hair" category in Houston and writing to agent_cosmetologist_leads.
 * Reuses the saved session in auth.json, so no interactive login is needed.
 *
 * Run: node agent-cosmetologist.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// ─── Config ──────────────────────────────────────────────────────────────────
const EMAIL    = process.env.BOOKSY_LOGIN;
const PASSWORD = process.env.BOOKSY_PASSWORD;
const SEARCH_QUERY    = process.env.SEARCH_QUERY    || 'Hair Styling';
const SEARCH_LOCATION = process.env.SEARCH_LOCATION || 'Houston, TX';
const MAX_PAGES       = parseInt(process.env.MAX_PAGES || '10', 10);
const SESSION_FILE = path.join(__dirname, 'auth.json');
const TARGET_TABLE = 'agent_cosmetologist_leads';

// Supabase Init
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
}
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const sleep = (min, max) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
};

if (!EMAIL || !PASSWORD) {
  console.error('\n❌  Missing credentials. Make sure BOOKSY_LOGIN and BOOKSY_PASSWORD are set in your root .env.local\n');
  process.exit(1);
}

(async () => {
  console.log('\n🚀  Booksy Cosmetologist Agent starting...');
  console.log(`📍  Searching for: "${SEARCH_QUERY}" near "${SEARCH_LOCATION}"\n`);

  const browser = await chromium.launch({
    headless: true, // No interactive display in this environment; the saved session handles auth.
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
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

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    if (!hasSession) {
      console.error('❌  No saved session found and this environment has no interactive display for a fresh login.');
      process.exit(1);
    }
    console.log('⏩  Using saved auth.json session state...\n');

    let booksyApiKey = null;
    page.on('request', request => {
      const headers = request.headers();
      if (headers['x-api-key']) booksyApiKey = headers['x-api-key'];
    });

    const extractedData = [];
    let hasMorePages = true;
    let currentPage = 1;

    while (currentPage <= MAX_PAGES && hasMorePages) {
      console.log(`\n📄 --- STARTING PAGE ${currentPage} ---`);

      const searchUrl = `https://booksy.com/en-us/s?query=${encodeURIComponent(SEARCH_QUERY)}&location=${encodeURIComponent(SEARCH_LOCATION)}&businessesPage=${currentPage}`;
      console.log(`🔎  Searching for "${SEARCH_QUERY}" in "${SEARCH_LOCATION}" (Page ${currentPage})...`);

      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000, 5000);

      if (!booksyApiKey) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await sleep(1500, 2000);
      }

      console.log('📋  Extracting profile links from search results...\n');

      let profileLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'))
          .map(a => a.href)
          .filter(href => href.includes('booksy.com/en-us/') && /\d+_/.test(href) && !href.includes('?') && !href.includes('/s/'));
        return [...new Set(links)];
      });

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

      // Dedup against both this table AND agent_barber_leads (a "Hair" category
      // search can surface businesses already tracked as barbers).
      if (supabaseUrl && supabaseKey) {
        console.log('🔄  Cross-referencing with database to skip existing leads...');
        try {
          const [{ data: existingCosmet, error: cosmetErr }, { data: existingBarbers, error: barberErr }] = await Promise.all([
            supabase.from(TARGET_TABLE).select('profile_url'),
            supabase.from('agent_barber_leads').select('profile_url'),
          ]);
          if (cosmetErr) throw cosmetErr;
          if (barberErr) throw barberErr;

          const existingUrls = new Set([
            ...existingCosmet.map(l => l.profile_url),
            ...existingBarbers.map(l => l.profile_url),
          ]);
          const originalCount = profileLinks.length;

          profileLinks = profileLinks.filter(link => !existingUrls.has(link));

          const skippedCount = originalCount - profileLinks.length;
          console.log(`⏭️   Skipped ${skippedCount} profiles already in the database (cosmetologist or barber).`);
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

      const targets = profileLinks;
      console.log(`🎯  Navigating to ${targets.length} new profiles to extract real phone numbers from the UI...\n`);

      for (let i = 0; i < targets.length; i++) {
        const link = targets[i];
        console.log(`[${i + 1}/${targets.length}] ${link.substring(0, 80)}...`);

        const idMatch = link.match(/\/en-us\/(\d+)_/);
        const businessId = idMatch ? idMatch[1] : null;

        let name = null;
        let address = null;
        let phoneReal = null;

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
              'Origin': 'https://booksy.com',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            };
            if (booksyApiKey) headersObj['x-api-key'] = booksyApiKey;

            const apiRequest = await context.request.get(apiUrl, { headers: headersObj });

            if (apiRequest.ok()) {
              const result = await apiRequest.json();
              const b = result.business || result;
              name = b.name || b.business_name || null;
              address = b.location?.address || b.address || null;
              console.log(`   ✅ API Name & Address loaded`);
            }
          } catch (apiErr) {
            console.log(`   ⚠️  API call failed: ${apiErr.message}`);
          }
        }

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
          await page.evaluate(() => window.scrollBy(0, 800));
          await sleep(1500, 2000);

          const domResult = await page.evaluate(() => {
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

          if (leadData.phone !== 'No phone found' && supabaseUrl && supabaseKey) {
            try {
              const { error } = await supabase
                .from(TARGET_TABLE)
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
                );

              if (error) throw error;
              console.log(`   💾 Saved to ${TARGET_TABLE} in Supabase!`);
            } catch (dbErr) {
              console.log(`   ⚠️ Failed to save to DB: ${dbErr.message}`);
            }
          }
        } catch (err) {
          console.log(`   ❌ Failed to load profile UI: ${err.message}\n`);
        }
      }

      currentPage++;
    }

    console.log('\n=========================================');
    console.log('✅  FINAL RESULTS: COSMETOLOGIST PROFILES EXTRACTED');
    console.log('=========================================\n');
    extractedData.forEach((d, i) => {
      console.log(`${i + 1}. ${d.name}`);
      console.log(`   📞 Phone:   ${d.phone}`);
      if (d.address) console.log(`   📍 Address: ${d.address}`);
      console.log(`   🔗 ${d.profile_url}`);
      console.log(`   ⚡ Source:  ${d.source || 'hybrid_dom_api'}\n`);
    });
  } catch (err) {
    console.error('\n❌  Agent encountered an error:', err.message);
    try {
      const errScreenshot = path.join(__dirname, 'error-screenshot-cosmetologist.png');
      await page.screenshot({ path: errScreenshot });
      console.log(`📸  Error screenshot saved to: scripts/booksy-agent/error-screenshot-cosmetologist.png`);
    } catch {}
  } finally {
    await browser.close();
    console.log('\n🏁  Agent finished.');
  }
})();
