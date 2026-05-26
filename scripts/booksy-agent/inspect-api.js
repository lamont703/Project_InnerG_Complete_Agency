/**
 * Booksy API Inspector
 *
 * Visits a single Booksy profile and dumps ALL intercepted JSON API responses
 * to a local file (api-dump.json) for inspection.
 *
 * Run: node inspect-api.js
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// ─── Config ──────────────────────────────────────────────────────────────────
const EMAIL    = process.env.BOOKSY_LOGIN;
const PASSWORD = process.env.BOOKSY_PASSWORD;

// Change this to any Booksy profile URL you want to inspect
const TARGET_PROFILE = 'https://booksy.com/en-us/780396_barber-serjio_barber-shop_134663_willows';

const OUTPUT_FILE = path.join(__dirname, 'api-dump.json');

const sleep = (min, max) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, ms));
};

if (!EMAIL || !PASSWORD) {
  console.error('\n❌  Missing credentials in .env.local\n');
  process.exit(1);
}

(async () => {
  console.log('\n🔬  Booksy API Inspector starting...');
  console.log(`🎯  Target profile: ${TARGET_PROFILE}\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 60,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // ── Wiretap: Capture every JSON API response ──────────────────────────────
  const capturedResponses = [];

  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    const contentType = response.headers()['content-type'] || '';

    if (
      status === 200 &&
      contentType.includes('application/json') &&
      (url.includes('booksy.com') || url.includes('api.'))
    ) {
      try {
        const json = await response.json();
        capturedResponses.push({
          url,
          status,
          contentType,
          body: json,
        });
        console.log(`  ✅ Captured: ${url.substring(0, 100)}`);
      } catch (_) {
        // Skip non-parseable responses
      }
    }
  });

  try {
    // ── Login ─────────────────────────────────────────────────────────────────
    console.log('🌐  Logging in...');
    await page.goto('https://booksy.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(1500, 2500);

    const loginBtn = page.locator('text=Log in').first();
    await loginBtn.waitFor({ timeout: 10000 });
    await loginBtn.click();
    await sleep(1000, 2000);

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.click();
    await emailInput.type(EMAIL, { delay: 80 });
    await sleep(500, 1000);
    await emailInput.press('Enter');
    await sleep(1500, 2500);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ timeout: 10000 });
    await passwordInput.click();
    await passwordInput.type(PASSWORD, { delay: 90 });
    await sleep(500, 1000);

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await sleep(3000, 4000);
    console.log('✅  Logged in.\n');

    // ── Visit target profile ──────────────────────────────────────────────────
    console.log(`🚀  Navigating to target profile...`);
    console.log('📡  Listening for API responses...\n');

    try {
      await page.goto(TARGET_PROFILE, { waitUntil: 'networkidle', timeout: 25000 });
    } catch (_) {
      console.log('⚠️  networkidle timed out, continuing with load fallback...');
      await page.goto(TARGET_PROFILE, { waitUntil: 'load', timeout: 20000 });
      await sleep(4000, 6000);
    }

    // Scroll to trigger lazy-loaded requests
    await page.evaluate(async () => {
      await new Promise(resolve => {
        let totalHeight = 0;
        const timer = setInterval(() => {
          window.scrollBy(0, 400);
          totalHeight += 400;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });

    await sleep(3000, 4000); // Final wait for all deferred requests to land

    // ── Write output ──────────────────────────────────────────────────────────
    const output = {
      profile_url: TARGET_PROFILE,
      captured_at: new Date().toISOString(),
      total_api_calls: capturedResponses.length,
      responses: capturedResponses,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

    console.log(`\n📦  Captured ${capturedResponses.length} JSON API responses.`);
    console.log(`💾  Full dump saved to: scripts/booksy-agent/api-dump.json\n`);
    console.log('──────────────────────────────────────────────────────────');
    console.log('📋  Summary of API endpoints hit:');
    capturedResponses.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.url.substring(0, 100)}`);
    });
    console.log('──────────────────────────────────────────────────────────\n');

  } catch (err) {
    console.error('\n❌  Inspector encountered an error:', err.message);
    const errScreenshot = path.join(__dirname, 'inspect-error.png');
    await page.screenshot({ path: errScreenshot });
    console.log(`📸  Screenshot saved to: scripts/booksy-agent/inspect-error.png`);
  } finally {
    await browser.close();
    console.log('🏁  Inspector finished.');
  }
})();
