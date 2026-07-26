// IndexNow — instantly notify Bing (and Yandex, Seznam, etc. — they share one
// submission network) when a URL is created or changed, instead of waiting for
// a crawl. Ownership is proven by the key file served at KEY_LOCATION.
//
// The key is intentionally public (it's in the key file and every ping); it's
// an ownership token, not a secret. Keep INDEXNOW_KEY in sync with the file
// public/<key>.txt.
const HOST = "agency.innergcomplete.com";
export const INDEXNOW_KEY = "be496c558f8e80da0d818f4da8554c25";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

// Absolutize a path or URL onto the production host.
export function toAbsoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `https://${HOST}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

// Submit one or more URLs to IndexNow. Never throws — a failed ping must never
// break the publish flow that calls it. IndexNow accepts up to 10,000 URLs per
// request; callers submitting more should batch.
export async function pingIndexNow(urls: string[]): Promise<boolean> {
  const urlList = [...new Set(urls.filter(Boolean).map(toAbsoluteUrl))];
  if (urlList.length === 0) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    // 200 = accepted, 202 = accepted (validation pending). Anything else is a
    // soft failure we just log.
    if (res.status !== 200 && res.status !== 202) {
      console.warn(`[IndexNow] ${res.status} for ${urlList.length} url(s)`);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn("[IndexNow] ping failed:", e?.message);
    return false;
  }
}
