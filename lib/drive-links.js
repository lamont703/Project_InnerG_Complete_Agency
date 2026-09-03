/**
 * GOOGLE DRIVE LINKS IN INBOUND MAIL — the way files actually arrive.
 *
 * WHY THIS EXISTS AT ALL. The intake was written expecting MIME attachments and
 * found none, on a message that plainly had an image and a video on it. Gmail
 * had converted both to Drive links: the MIME tree was multipart/alternative
 * with text/plain and text/html and nothing else. Gmail does this whenever a
 * file is too big to attach (>25MB) or was inserted from Drive, so for exactly
 * the files a video pipeline cares about, LINKS ARE THE NORMAL CASE and
 * attachments are the exception. Handle both; do not assume either.
 *
 * This also settles the channel choice retroactively. The first real video sent
 * here was 112,728,164 bytes — over three times what Postmark's inbound
 * attachment cap would have carried. A link has no such ceiling.
 *
 * NO DRIVE API, NO EXTRA SCOPE. When Gmail converts an attachment it shares the
 * file as "anyone with the link", so these fetch anonymously. That matters: a
 * Drive scope is RESTRICTED, and adding one would mean re-minting the mailbox
 * token and widening what this app is reviewed for. If a fetch ever 403s, the
 * file was shared narrowly — report it and ask the sender to fix sharing rather
 * than reaching for drive.readonly.
 *
 * A 200 FROM DRIVE IS NOT A FILE. Above the virus-scan threshold Drive answers
 * with HTTP 200 and an HTML interstitial — "Google Drive can't scan this file
 * for viruses" — carrying a confirm token in a form. Treat that page as bytes
 * and you write a 2KB HTML file named something.mp4 and nothing errors. Always
 * branch on Content-Type, never on the status code.
 */

/** Every distinct Drive file id in a message body. */
function extractDriveLinks(text) {
  if (!text) return [];
  const ids = new Set();
  // Both shapes Gmail emits: /file/d/<id> and open?id=<id> / uc?...id=<id>.
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{20,})/g,
    /drive\.google\.com\/(?:uc|open)\?[^"\s]*id=([a-zA-Z0-9_-]{20,})/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) ids.add(m[1]);
  }
  return [...ids].map((fileId) => ({
    fileId,
    viewUrl: `https://drive.google.com/file/d/${fileId}`,
  }));
}

/** Pull the filename and byte size Drive prints on its own warning page. */
function parseInterstitial(html) {
  const form = {};
  for (const m of html.matchAll(/name="([^"]+)"\s+value="([^"]*)"/g)) form[m[1]] = m[2];
  /*
   * The filename is ANCHOR TEXT, not a bare string. The markup is:
   *
   *   <span class="uc-name-size"><a href="/open?id=…">FILE.mp4</a> (108M)</span>
   *     is too large for Google to scan for viruses.
   *
   * A first attempt matched `>NAME (108M) is too large` as one run and returned
   * null on every real page, because `</a>` sits between the name and the size
   * and `</span>` between the size and the sentence. Measured against the actual
   * interstitial rather than assumed.
   */
  const named =
    html.match(/uc-name-size"><a[^>]*>([^<>]+)<\/a>/) ||
    html.match(/<a[^>]*>([^<>]+?)<\/a>\s*\(\d+(?:\.\d+)?[KMG]\)/);
  return {
    confirmUrl: form.uuid
      ? `https://drive.usercontent.google.com/download?id=${form.id}&export=download&confirm=t&uuid=${form.uuid}`
      : null,
    filename: named ? named[1].trim() : null,
  };
}

/**
 * What a Drive file is, without committing to downloading it.
 *
 * HEAD-LIKE ON PURPOSE. It asks for the first two bytes with a Range request
 * rather than fetching the file, so a 100MB video costs nothing to identify.
 * Drive honours Range and reports the true length in Content-Range, which is
 * where sizeBytes comes from.
 */
async function probeDriveFile(fileId) {
  const first = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, {
    headers: { Range: "bytes=0-1" },
    redirect: "follow",
  });

  const type = (first.headers.get("content-type") || "").split(";")[0].trim();

  if (type === "text/html") {
    // Either the virus-scan interstitial (recoverable) or a permission page.
    const html = await first.text();
    const { confirmUrl, filename } = parseInterstitial(html);
    if (!confirmUrl) {
      return {
        fileId,
        ok: false,
        reason: html.includes("Sign in") || first.status === 403
          ? "not shared publicly — ask the sender to set link sharing"
          : "Drive returned HTML with no confirm token",
      };
    }
    const confirmed = await fetch(confirmUrl, { headers: { Range: "bytes=0-1" }, redirect: "follow" });
    return {
      fileId,
      ok: true,
      filename,
      downloadUrl: confirmUrl,
      contentType: (confirmed.headers.get("content-type") || "").split(";")[0].trim(),
      sizeBytes: totalFromRange(confirmed.headers.get("content-range")),
    };
  }

  return {
    fileId,
    ok: true,
    filename: filenameFromDisposition(first.headers.get("content-disposition")),
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    contentType: type,
    sizeBytes: totalFromRange(first.headers.get("content-range")),
  };
}

/** "bytes 0-1/112728164" -> 112728164 */
function totalFromRange(header) {
  const m = (header || "").match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

function filenameFromDisposition(header) {
  const m = (header || "").match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  return m ? decodeURIComponent(m[1].replace(/"$/, "")) : null;
}

/**
 * The bytes, for files small enough to be worth holding in memory.
 *
 * REFUSES RATHER THAN TRUNCATES above maxBytes. The caller is a serverless
 * function; a 100MB buffer there does not fail gracefully, it takes the whole
 * poll down. Large files are meant to stay as a recorded URL and be fetched by
 * the local renderer, which has a disk and no 300-second ceiling.
 */
async function downloadDriveFile(probe, { maxBytes = 25 * 1024 * 1024 } = {}) {
  if (!probe.ok) throw new Error(`drive ${probe.fileId}: ${probe.reason}`);
  if (probe.sizeBytes && probe.sizeBytes > maxBytes) {
    throw new Error(
      `drive ${probe.fileId}: ${Math.round(probe.sizeBytes / 1e6)}MB exceeds the ${Math.round(maxBytes / 1e6)}MB inline limit — keep the URL instead`
    );
  }
  const res = await fetch(probe.downloadUrl, { redirect: "follow" });
  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  if (type === "text/html") throw new Error(`drive ${probe.fileId}: got the interstitial, not the file`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { extractDriveLinks, probeDriveFile, downloadDriveFile };
