const { searchImages } = require('duck-duck-scrape');

async function run() {
  try {
    console.log("Searching DDG Images for 'Sir Sweeney Barbershop Houston'...");
    const results = await searchImages('Sir Sweeney Barbershop Houston');
    console.log("Found image results:", JSON.stringify(results.slice(0, 3), null, 2));
  } catch (err) {
    console.error("DDG Image search failed:", err);
  }
}

run();
