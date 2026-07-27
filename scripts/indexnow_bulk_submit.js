/**
 * Bulk-submit URLs to IndexNow (Bing / Yandex / Seznam share one network).
 * Pulls the live sitemap, optionally filters, and POSTs in batches of 10,000
 * (IndexNow's per-request cap). Dry run by default.
 *
 *   node scripts/indexnow_bulk_submit.js                     # PREVIEW everything in the sitemap
 *   node scripts/indexnow_bulk_submit.js --commit            # submit everything
 *   node scripts/indexnow_bulk_submit.js --filter=california # only URLs containing "california"
 *   node scripts/indexnow_bulk_submit.js --filter=california --commit
 *   node scripts/indexnow_bulk_submit.js --urls-file=urls.txt --commit  # explicit list
 *
 * --urls-file reads one URL per line (blank lines and # comments ignored) and
 * bypasses the sitemap entirely — use it for a specific set of changed pages
 * that no substring filter can select.
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
const fileArg = process.argv.find((a) => a.startsWith("--urls-file="));
const URLS_FILE = fileArg ? fileArg.split("=")[1] : null;

async function main() {
  let urls;

  if (URLS_FILE) {
    // Explicit list mode — for submitting a specific set of changed pages that
    // a sitemap substring filter can't express (e.g. the 330 entity pages whose
    // review counts were repaired, which span /shop/, /salons/, /stores/ and
    // /schools/ and share no common slug pattern).
    const fs = require("fs");
    urls = fs
      .readFileSync(URLS_FILE, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    console.log(`Read ${urls.length} URL(s) from ${URLS_FILE}`);
    const foreign = urls.filter((u) => !u.startsWith(`https://${HOST}/`));
    if (foreign.length) {
      // IndexNow rejects a whole submission whose urlList contains a host other
      // than the declared one, so fail loudly rather than send a doomed batch.
      console.error(`ERROR: ${foreign.length} URL(s) are not on ${HOST}, e.g. ${foreign[0]}`);
      process.exit(1);
    }
  } else {
    console.log(`Fetching https://${HOST}/sitemap.xml ...`);
    const xml = await fetch(`https://${HOST}/sitemap.xml`).then((r) => r.text());
    urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
    console.log(`  sitemap URLs: ${urls.length}`);
  }

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
