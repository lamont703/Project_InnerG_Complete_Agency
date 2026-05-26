const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://booksy.com/en-us/s/haircut-beard/36800_houston?locationHash=here%253Acm%253Anamedplace%253A21015993', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  
  const paginationElements = await page.evaluate(() => {
    // Look for links or buttons that contain next or page numbers
    const elements = Array.from(document.querySelectorAll('a, button'));
    return elements
      .filter(el => el.innerText.trim().toLowerCase().includes('next') || el.innerText.trim() === '2' || el.getAttribute('aria-label')?.toLowerCase().includes('next'))
      .map(el => ({ tag: el.tagName, text: el.innerText.trim(), href: el.href, ariaLabel: el.getAttribute('aria-label'), class: el.className }));
  });
  
  console.log("Pagination Elements Found:", JSON.stringify(paginationElements, null, 2));
  
  await browser.close();
})();
