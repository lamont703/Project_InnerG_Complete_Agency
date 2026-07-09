const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function testGoogleMapsOGImage(query) {
  let browser;
  try {
    console.log(`Searching Google Maps (Stealth Mode) for: "${query}"...`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.screenshot({ path: 'gmaps_test.png', fullPage: true });
    
    // Extract all image URLs to see what Google Maps is rendering
    const domImages = await page.evaluate(() => {
      const urls = new Set();
      
      // All img tags
      document.querySelectorAll('img').forEach(img => {
        if (img.src && img.src.startsWith('http')) urls.add(img.src);
      });
      
      // All background images
      document.querySelectorAll('*').forEach(el => {
        const bg = window.getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none' && bg.includes('http')) {
          const match = bg.match(/url\("?([^"]+)"?\)/);
          if (match && match[1]) urls.add(match[1]);
        }
      });
      
      return Array.from(urls);
    });
    
    console.log("Extracted DOM images:", domImages);

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    if (browser) await browser.close();
  }
}

testGoogleMapsOGImage("Sir Sweeney Barbershop Dallas TX");
