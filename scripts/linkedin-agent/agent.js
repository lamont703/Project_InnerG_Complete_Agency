const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SESSION_FILE = path.join(__dirname, 'auth.json');
const SEARCH_KEYWORD = 'texas barber instructor';
const MAX_PAGES = 3; // Limit to 3 pages for the first test

// Human-like delay
const sleep = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));

(async () => {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error('❌ No auth.json found! Please run `node scripts/linkedin-agent/save-session.js` first.');
    process.exit(1);
  }

  console.log('🚀 Launching LinkedIn Agent...');
  const browser = await chromium.launch({ headless: false }); // keep false to avoid detection
  
  const context = await browser.newContext({
    storageState: SESSION_FILE,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  const extractedData = [];
  let currentPage = 1;

  while (currentPage <= MAX_PAGES) {
    console.log(`\n📄 --- STARTING PAGE ${currentPage} ---`);
    const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(SEARCH_KEYWORD)}&origin=GLOBAL_SEARCH_HEADER&page=${currentPage}`;
    
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000, 5000);

    // Scroll to load lazy elements
    await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
    await sleep(2000, 3000);

    console.log('📋 Extracting profile links...');
    
    // Extract profile links from the search results
    const profileLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href.includes('linkedin.com/in/') && !href.includes('/overlay/'));
      return [...new Set(links)]; // deduplicate
    });

    if (profileLinks.length === 0) {
      console.log('🏁 No more profiles found. Reached end of search results.');
      break;
    }

    console.log(`✅ Found ${profileLinks.length} potential profiles.`);
    console.log(`🔄 Cross-referencing with database to skip existing leads...`);

    const newProfiles = [];
    for (const link of profileLinks) {
        const cleanLink = link.split('?')[0];
        const { data } = await supabase
            .from('agent_barber_instuctor_leads')
            .select('profile_url')
            .eq('profile_url', cleanLink)
            .single();

        if (data) {
            // Already in DB
            continue;
        } else {
            newProfiles.push(cleanLink);
        }
    }

    console.log(`⏭️  Skipped ${profileLinks.length - newProfiles.length} profiles already in the database.`);
    console.log(`✨ ${newProfiles.length} brand new profiles left to scrape.`);

    if (newProfiles.length === 0) {
        currentPage++;
        continue;
    }

    for (let i = 0; i < newProfiles.length; i++) {
      const link = newProfiles[i];
      console.log(`[${i+1}/${newProfiles.length}] Navigating to: ${link}`);
      
      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(2000, 4000);

        // Extract Name, Headline, and About Section
        const profileData = await page.evaluate(() => {
          const titleName = document.title.split('|')[0].trim();
          const bodyText = document.body.innerText;
          
          let headline = 'No Headline';
          let about = 'No About Section';
          
          const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
          
          // Headline is usually right after the name
          const nameIndex = lines.indexOf(titleName);
          if (nameIndex !== -1 && nameIndex + 1 < lines.length) {
              headline = lines[nameIndex + 1];
          }
          
          // About section is usually after the exact word "About"
          const aboutIndex = lines.findIndex(l => l === 'About');
          if (aboutIndex !== -1 && aboutIndex + 1 < lines.length) {
              about = lines[aboutIndex + 1];
              // Try to grab a few lines if they belong to about
              if (aboutIndex + 2 < lines.length && !['Activity', 'Experience', 'Education'].includes(lines[aboutIndex + 2])) {
                 about += ' ' + lines[aboutIndex + 2];
              }
          }
          
          return {
            name: titleName,
            headline: headline,
            about: about
          };
        });

        console.log(`   👤 Name: ${profileData.name}`);
        console.log(`   💼 Headline: ${profileData.headline}`);
        if (profileData.about !== 'No About Section') {
           console.log(`   📝 About: ${profileData.about.substring(0, 60)}...`);
        }

        const cleanUrl = link.split('?')[0];
        extractedData.push({
          name: profileData.name,
          headline: profileData.headline,
          about: profileData.about,
          profile_url: cleanUrl
        });

        // Upsert into Supabase Database
        const { error } = await supabase
          .from('agent_barber_instuctor_leads')
          .upsert({
            name: profileData.name,
            headline: profileData.headline,
            about: profileData.about === 'No About Section' ? null : profileData.about,
            profile_url: cleanUrl,
            source: 'LinkedIn',
            status: 'pending_outreach'
          }, { onConflict: 'profile_url' });

        if (error) {
            console.error(`   ❌ Failed to save to DB: ${error.message}`);
        } else {
            console.log(`   💾 Saved to agent_barber_instructor_leads in Supabase!`);
        }

      } catch (err) {
        console.log(`   ⚠️ Failed to load profile: ${err.message}`);
      }
    }

    currentPage++;
  }

  console.log('\n=========================================');
  console.log('✅  FINAL RESULTS: LINKEDIN PROFILES EXTRACTED');
  console.log('=========================================\n');
  extractedData.forEach((d, i) => {
     console.log(`${i+1}. ${d.name}`);
     console.log(`   💼 ${d.headline}`);
     if (d.about !== 'No About Section') console.log(`   📝 ${d.about.substring(0, 100)}...`);
     console.log(`   🔗 ${d.profile_url}\n`);
  });

  await browser.close();
})();
