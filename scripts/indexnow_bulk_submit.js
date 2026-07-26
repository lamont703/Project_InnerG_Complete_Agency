/**
 * Bulk-submit URLs to IndexNow (Bing / Yandex / Seznam share one network).
 * Pulls the live sitemap, optionally filters, and POSTs in batches of 10,000
 * (IndexNow's per-request cap). Dry run by default.
 *
 *   node scripts/indexnow_bulk_submit.js                     # PREVIEW everything in the sitemap
 *   node scripts/indexnow_bulk_submit.js --commit            # submit everything
 *   node scripts/indexnow_bulk_submit.js --filter=california # only URLs containing "california"
 *   node scripts/indexnow_bulk_submit.js --filter=california --commit
 *
 * Requires the key file be live at KEY_LOCATION (deploy first) or IndexNow
 * rejects the submission.
 */
const HOST = "agency.innergcomplete.com";
const KEY = "e352d1c5dee74b9084f780187d522a3a"; // Bing-issued IndexNow key; keep in sync with lib/indexnow.ts + public/<key>.txt
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";
const BATCH = 10000;

const COMMIT = process.argv.includes("--commit");
const filterArg = process.argv.find((a) => a.startsWith("--filter="));
const FILTER = filterArg ? filterArg.split("=")[1].toLowerCase() : null;

async function main() {
  console.log(`Fetching https://${HOST}/sitemap.xml ...`);
  const xml = await fetch(`https://${HOST}/sitemap.xml`).then((r) => r.text());
  let urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  console.log(`  sitemap URLs: ${urls.length}`);
  if (FILTER) {
    urls = urls.filter((u) => u.toLowerCase().includes(FILTER));
    console.log(`  after filter "${FILTER}": ${urls.length}`);
  }
  urls = [...new Set(urls)];

  if (urls.length === 0) {
    console.log("Nothing to submit.");
    return;
  }
  console.log("  sample:", urls.slice(0, 5));

  if (!COMMIT) {
    console.log(`\nPREVIEW ONLY — would submit ${urls.length} url(s) in ${Math.ceil(urls.length / BATCH)} batch(es). Re-run with --commit.`);
    console.log(`(Make sure ${KEY_LOCATION} is live in production first.)`);
    return;
  }

  let ok = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const urlList = urls.slice(i, i + BATCH);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    const body = await res.text().catch(() => "");
    console.log(`  batch ${i / BATCH + 1}: ${urlList.length} urls -> HTTP ${res.status} ${res.status === 200 || res.status === 202 ? "OK" : body.slice(0, 120)}`);
    if (res.status === 200 || res.status === 202) ok += urlList.length;
  }
  console.log(`\nDone. ${ok}/${urls.length} url(s) accepted by IndexNow.`);
}

main().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
