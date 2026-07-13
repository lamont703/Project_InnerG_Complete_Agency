// Discovery-only pass (no DB writes) for real, currently-searched-for
// businesses that came up in Keyword Planner data but don't exist in our
// tables at all — distinct from scrape_google_maps_broken_targets.js,
// which only repairs images on rows we already have. This just confirms
// whether each business is real and pulls back its actual name, address,
// rating, and review count so a human can review before anything gets
// inserted into production tables.
//
// Usage: node scripts/discover_missing_businesses.js

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const TARGETS = [
  { name: "Fanatics Barber Shop", city: "Pearland TX" },
  { name: "Barbers on the Lake", city: "Pearland TX" },
  { name: "Joe Black Barbershop", city: "Pearland TX" },
  { name: "Level Up Barbershop", city: "Pearland TX" },
  { name: "Roosters Haircut", city: "Pearland TX" },
  { name: "Shaving Grace Barber Shop", city: "Pearland TX" },
  { name: "Trinity Salon", city: "Pearland TX" },
  { name: "Vintage Barber Shop", city: "Pearland TX" },
  { name: "Diesel Barbershop", city: "Katy Ranch TX" },
  { name: "Katy's Barber Parlor", city: "Katy TX" },
  { name: "StudioBrowsEtc", city: "Katy TX" },
  { name: "La Centerra Hair Salon", city: "Katy TX" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });
  await page.setViewport({ width: 1366, height: 900 });

  const results = [];

  for (const target of TARGETS) {
    const query = `${target.name} ${target.city}`;
    console.log(`\nSearching: "${query}"`);
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    try {
      await sleep(2500);
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(4000);

      const matches = await page.evaluate(() => {
        // Single-result place page: one h1, one rating/review block near it.
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent && h1.textContent.trim().length > 0) {
          const container = h1.closest('div')?.parentElement;
          const text = container ? container.innerText : document.body.innerText;
          return [{ name: h1.textContent.trim(), context: text.slice(0, 300) }];
        }
        // List-of-results search page: repeated result cards.
        const cards = Array.from(document.querySelectorAll('a[aria-label]'))
          .filter((a) => a.getAttribute('aria-label') && a.getAttribute('aria-label').length > 2)
          .slice(0, 3);
        return cards.map((c) => ({ name: c.getAttribute('aria-label'), context: c.closest('div')?.innerText?.slice(0, 300) || '' }));
      });

      if (matches.length === 0) {
        console.log("  No results found.");
        results.push({ ...target, found: false });
      } else {
        console.log(`  Found ${matches.length} candidate(s):`);
        matches.forEach((m) => console.log(`    - ${m.name}`));
        results.push({ ...target, found: true, matches });
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      results.push({ ...target, found: false, error: err.message });
    }
  }

  await browser.close();

  console.log("\n\n=== SUMMARY ===");
  console.log(JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
