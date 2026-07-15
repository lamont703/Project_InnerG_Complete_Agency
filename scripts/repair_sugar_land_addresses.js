// One-time repair for the 69 Sugar Land rows imported by
// discover_by_category.js before its panel-scoping bug was fixed —
// formatted_address and phone came back null for all of them (the real
// data was on the page, just outside the too-narrow scoped ancestor).
// Re-searches each by name and backfills the two fields with the corrected
// extraction. Usage: node scripts/repair_sugar_land_addresses.js

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function extractAddressPhone(page, name, city) {
  const query = `${name} ${city}`;
  await sleep(1500);
  await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await sleep(4000);

  return page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return { address: null, phone: null };
    let panel = h1.parentElement;
    for (let i = 0; i < 10 && panel; i++) {
      if ((panel.innerText || '').length >= 300) break;
      panel = panel.parentElement;
    }
    const panelText = panel ? panel.innerText : '';
    const lines = panelText.split('\n').map((l) => l.trim()).filter(Boolean);
    const addressLine = lines.find((l) => /\d/.test(l) && /(TX|Texas)\b|\b\d{5}\b/.test(l) && l.length < 90 && !/^\(/.test(l));
    const phoneLine = lines.find((l) => /^\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(l));
    return { address: addressLine || null, phone: phoneLine || null };
  });
}

async function run() {
  const [{ data: shops }, { data: salons }] = await Promise.all([
    supabase.from('agent_barbershop_leads').select('id, shop_name').ilike('city', '%sugar land%').is('formatted_address', null),
    supabase.from('agent_salon_leads').select('id, shop_name').ilike('city', '%sugar land%').is('formatted_address', null),
  ]);
  const targets = [
    ...(shops || []).map((r) => ({ ...r, table: 'agent_barbershop_leads' })),
    ...(salons || []).map((r) => ({ ...r, table: 'agent_salon_leads' })),
  ];
  console.log(`Repairing ${targets.length} rows...`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let fixed = 0, stillMissing = 0;

  for (const t of targets) {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewport({ width: 1366, height: 900 });
    try {
      const { address, phone } = await extractAddressPhone(page, t.shop_name, 'Sugar Land TX');
      if (address) {
        await supabase.from(t.table).update({ formatted_address: address, phone: phone || undefined }).eq('id', t.id);
        console.log(`  Fixed "${t.shop_name}": ${address}${phone ? ` | ${phone}` : ''}`);
        fixed++;
      } else {
        console.log(`  Still no address for "${t.shop_name}"`);
        stillMissing++;
      }
    } catch (err) {
      console.error(`  Error on "${t.shop_name}": ${err.message}`);
      stillMissing++;
    }
    await page.close();
  }

  await browser.close();
  console.log(`\nDone. Fixed: ${fixed}, still missing: ${stillMissing}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
