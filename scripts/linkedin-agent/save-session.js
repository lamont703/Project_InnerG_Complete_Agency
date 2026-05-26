const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'auth.json');

(async () => {
  console.log('🚀 Launching LinkedIn Session Saver...');
  
  // Launch visible browser so you can solve CAPTCHAs and log in manually
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🌐 Navigating to LinkedIn login page...');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  console.log('\n=========================================');
  console.log('⚠️  ACTION REQUIRED:');
  console.log('1. Log into your LinkedIn account in the browser window.');
  console.log('2. Solve any CAPTCHAs that appear.');
  console.log('3. Once you see your LinkedIn Feed, come back here and press ENTER.');
  console.log('=========================================\n');

  // Wait for user to press ENTER in the terminal
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });

  // Save the authenticated cookies/storage to auth.json
  const state = await context.storageState();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(state));
  console.log(`✅ Session successfully saved to: ${SESSION_FILE}`);

  await browser.close();
  process.exit(0);
})();
