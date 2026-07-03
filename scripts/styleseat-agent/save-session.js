/**
 * StyleSeat Session Saver
 *
 * Opens a real, visible browser window to styleseat.com. Log in manually
 * (email, password, any 2FA) — the script polls automatically and saves
 * your session to auth.json the moment it detects you're logged in. No
 * keypress needed; just log in and wait.
 *
 * Run: node save-session.js
 */

const { chromium } = require('playwright');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'auth.json');
const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes to log in

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log('\n🔐  StyleSeat Session Saver');
  console.log('════════════════════════════════════════');
  console.log('A browser window is opening. Log into StyleSeat (as a client, not a pro account).');
  console.log('This script will detect the login automatically — no need to come back here.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 30,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--start-maximized'],
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

  await page.goto('https://www.styleseat.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('⏳  Waiting for you to log in (checking automatically every 2 seconds, up to 10 minutes)...\n');

  let loggedIn = false;
  const deadline = Date.now() + MAX_WAIT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    try {
      // Logged-out StyleSeat always shows a plain "Log In" text link/button near
      // the top nav. Once that's gone (replaced by an account menu), we're in.
      const stillLoggedOut = await page.evaluate(() => document.body.innerText.includes('Log In'));
      if (!stillLoggedOut) {
        loggedIn = true;
        break;
      }
    } catch {
      // keep polling (page may be mid-navigation)
    }
  }

  if (!loggedIn) {
    console.log('\n⏱️   Timed out waiting for login. Run this script again when ready.');
    await browser.close();
    process.exit(1);
  }

  await context.storageState({ path: SESSION_FILE });

  console.log('\n════════════════════════════════════════');
  console.log(`✅  Login detected! Session saved to: scripts/styleseat-agent/auth.json`);
  console.log('🚀  You can now run the discovery agent.');
  console.log('════════════════════════════════════════\n');

  await browser.close();
})();
