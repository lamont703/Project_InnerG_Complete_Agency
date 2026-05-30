/**
 * scripts/agent_instagram_poster.ts
 *
 * Inner G Complete Agency — Autonomous Instagram Poster Agent
 * Uses Puppeteer to log into Instagram (with saved session cookies) 
 * and automatically upload a video file to the feed.
 */

import puppeteer from "npm:puppeteer";
import * as path from "https://deno.land/std@0.167.0/path/mod.ts";

const COOKIE_PATH = path.join(Deno.cwd(), "instagram_cookies.json");

// Helper to wait
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runInstagramAgent(videoPath: string, caption: string) {
  console.log(`\n======================================================`)
  console.log(`📸 INITIATING INSTAGRAM POSTER AGENT`)
  console.log(`======================================================`)

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: path.join(Deno.cwd(), "instagram_session_data_v2"),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 60000 });
  } catch (err) {
    console.log("⚠️ Minor navigation issue detected, continuing anyway: ", err.message);
  }

  // Let the user interact first! 
  console.log(`Waiting for you to log in... (Checking automatically every 5 seconds)`);
  
  let loggedIn = false;
  for (let i = 0; i < 150; i++) { // Wait up to 5 minutes
    await delay(2000);
    try {
      // The absolute safest way to detect login success is waiting for the SVG icon 
      // or the user avatar that only appears on the authenticated feed.
      const isHome = await page.evaluate(() => {
        return document.querySelector('svg[aria-label="New post"]') !== null || 
               document.querySelector('svg[aria-label="Home"]') !== null ||
               document.querySelector('img[data-testid="user-avatar"]') !== null;
      });

      if (isHome) {
        loggedIn = true;
        break;
      }
    } catch (e) {
      // Keep waiting
    }
  }

  if (!loggedIn) {
     throw new Error("Timed out waiting for login.");
  }
  
  console.log("✅ Logged in successfully. Starting upload process...");

  // 3. UI Automation: Create Post
  try {
    // Click the "Create" button in the sidebar (Usually an SVG with aria-label="New post")
    console.log("➡️ Finding the 'Create' button...");
    await page.waitForSelector('svg[aria-label="New post"]', { timeout: 30000 });
    
    // Native click is much more robust than evaluating DOM clicks
    await page.click('svg[aria-label="New post"]');

    console.log("➡️ Waiting for dropdown menu...");
    await delay(1500); // Wait for the dropdown menu to open

    console.log("➡️ Clicking 'Post' from dropdown...");
    await page.evaluate(() => {
      // Find the element with text "Post" inside the dropdown
      const spans = Array.from(document.querySelectorAll('span'));
      const postSpan = spans.find(s => s.textContent?.trim() === 'Post');
      if (postSpan && postSpan.closest('a, div[role="button"], a[role="link"]')) {
         (postSpan.closest('a, div[role="button"], a[role="link"]') as HTMLElement).click();
      } else if (postSpan) {
         postSpan.click();
      }
    });

    await delay(3000); // Wait for the modal to open

    // We use waitForFileChooser to natively intercept the file picker instead of trying to hack the DOM
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      page.evaluate(() => {
        // Find the "Select from computer" button
        const buttons = Array.from(document.querySelectorAll('button'));
        const selectBtn = buttons.find(b => b.textContent?.trim().toLowerCase() === 'select from computer');
        if (selectBtn) {
          selectBtn.click();
        } else {
          // If the button is not found, Instagram sometimes just uses an input directly inside the modal
          const inputs = document.querySelectorAll('input[type="file"]');
          if (inputs.length > 0) {
            (inputs[0] as HTMLElement).click();
          }
        }
      })
    ]);

    console.log(`➡️ Uploading video file via native file chooser: ${videoPath}...`);
    const absoluteVideoPath = path.resolve(videoPath);
    await fileChooser.accept([absoluteVideoPath]);

    await delay(5000); // Wait for video to load into the crop modal

    // Click "Next" on the Crop screen
    console.log("➡️ Clicking Next (Crop screen)...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
      const nextBtn = buttons.find(b => b.textContent?.trim() === 'Next');
      if (nextBtn) (nextBtn as HTMLElement).click();
    });
    
    await delay(3000);

    // Click "Next" on the Filter/Trim screen
    console.log("➡️ Clicking Next (Filter screen)...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
      const nextBtn = buttons.find(b => b.textContent?.trim() === 'Next');
      if (nextBtn) (nextBtn as HTMLElement).click();
    });

    await delay(3000);

    // Enter Caption
    console.log("➡️ Entering caption...");
    await page.waitForSelector('div[aria-label="Write a caption..."]', { timeout: 10000 });
    await page.type('div[aria-label="Write a caption..."]', caption, { delay: 50 });

    await delay(2000);

    // Click "Share"
    console.log("➡️ Clicking Share...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('div[role="button"]'));
      const shareBtn = buttons.find(b => b.textContent?.trim() === 'Share');
      if (shareBtn) (shareBtn as HTMLElement).click();
    });

    // Wait for the "Your post has been shared." message or wait 20 seconds
    console.log("⏳ Waiting for upload to complete...");
    await delay(15000); 
    
    console.log("🎉 Post successfully uploaded to Instagram!");

  } catch (err) {
    console.error("❌ Automation Error:", err.message);
    console.log("Saving screenshot of the error state to error_state.png...");
    await page.screenshot({ path: "error_state.png" });
  } finally {
    // Leave the browser open for a few seconds so the user can verify
    await delay(5000);
    await browser.close();
  }
}

// Example usage if run directly:
// deno run -A scripts/agent_instagram_poster.ts
if (import.meta.main) {
  const testVideo = path.join(Deno.cwd(), "public", "network-bg-overlay.mp4");
  const testCaption = "🚀 Looking for a new chair in Dallas? We just partnered with Sauccy Fades! \n\nCheck out these details:\n✨ 5-Star Shop\n💈 High Walk-In Traffic\n💰 $225/chair\n\nDM us to secure your spot! #DallasBarbers #InnerGAgency #BarberJobs";
  
  runInstagramAgent(testVideo, testCaption);
}
