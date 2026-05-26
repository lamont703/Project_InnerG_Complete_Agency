/**
 * Booksy Session Saver
 *
 * Run this ONCE manually to save your authenticated session to auth.json.
 * The agent will then use auth.json on every future run to skip login entirely.
 *
 * Usage: node save-session.js
 *
 * Instructions:
 *   1. A browser window will open to booksy.com
 *   2. Log in normally (email, password, any 2FA)
 *   3. Once you see your profile icon in the top right, come back here
 *   4. Press ENTER in this terminal
 *   5. Your session is saved — the agent will never need to log in again
 */

const { chromium } = require('playwright');
const path = require('path');
const readline = require('readline');

const SESSION_FILE = path.join(__dirname, 'auth.json');

const waitForEnter = () =>
  new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\n✋  Press ENTER once you are logged into Booksy...\n\n', () => {
      rl.close();
      resolve();
    });
  });

(async () => {
  console.log('\n🔐  Booksy Session Saver');
  console.log('════════════════════════════════════════');
  console.log('A browser window is opening. Log into Booksy, then come back here and press ENTER.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--start-maximized',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });

  // Mask the webdriver flag
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Navigate to Booksy
  await page.goto('https://booksy.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the user to log in manually
  await waitForEnter();

  // Verify they are actually logged in before saving
  const currentUrl = page.url();
  const pageContent = await page.content();
  const looksLoggedIn =
    !pageContent.includes('"isLoggedIn":false') &&
    (pageContent.includes('"isLoggedIn":true') ||
     currentUrl.includes('booksy.com') && !currentUrl.includes('login'));

  // Save the full storage state: cookies + localStorage + sessionStorage
  await context.storageState({ path: SESSION_FILE });

  console.log('\n════════════════════════════════════════');
  console.log(`✅  Session saved to: scripts/booksy-agent/auth.json`);
  console.log('   Cookies + localStorage + sessionStorage all captured.');
  console.log('\n🚀  You can now run the agent normally:');
  console.log('   node scripts/booksy-agent/agent.js');
  console.log('\n   The agent will skip login automatically on every future run.');
  console.log('════════════════════════════════════════\n');

  await browser.close();
})();
