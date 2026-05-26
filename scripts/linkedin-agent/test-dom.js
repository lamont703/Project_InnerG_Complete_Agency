const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const path = require('path');

const SESSION_FILE = path.join(__dirname, 'auth.json');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: SESSION_FILE });
  const page = await context.newPage();
  
  await page.goto('https://www.linkedin.com/in/shawna-m-harrison-69953553/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  
  const data = await page.evaluate(() => {
    // LinkedIn Name is usually in an h1 tag
    const h1 = document.querySelector('h1')?.innerText;
    
    // Headline is usually a div with text-body-medium right after the name
    let headline = document.querySelector('.text-body-medium.break-words')?.innerText;
    if (!headline) {
        headline = document.querySelector('div[data-generated-suggestion-target]')?.innerText;
    }
    
    // About is usually in a section that has a span/h2 saying "About"
    let about = null;
    const aboutHeader = Array.from(document.querySelectorAll('span')).find(el => el.innerText.trim() === 'About');
    if (aboutHeader) {
        const container = aboutHeader.closest('section');
        if (container) {
           const texts = Array.from(container.querySelectorAll('span[aria-hidden="true"]')).map(s => s.innerText);
           about = texts.join(' ').replace('About', '').trim();
        }
    }
    
    return { h1, headline, about, title: document.title, bodySample: document.body.innerText.substring(0, 300) };
  });
  
  console.log("Extraction Result:", JSON.stringify(data, null, 2));
  await browser.close();
})();
