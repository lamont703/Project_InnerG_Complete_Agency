async function searchDDG(shopName: string, city: string) {
  const query = `site:instagram.com "${shopName}" "${city}"`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  };
  const res = await fetch(url, { headers });
  const html = await res.text();
  const regex = /instagram\.com\/([a-zA-Z0-9_.]+)\/?["']/g;
  let match;
  const handles = new Set<string>();
  const excludes = ['p', 'explore', 'tags', 'reel', 'tv', 'stories', 'oauth'];
  while ((match = regex.exec(html)) !== null) {
    const handle = match[1];
    if (!excludes.includes(handle) && handle.length > 2) {
      handles.add(handle);
    }
  }
  console.log(`Results for ${shopName}:`, Array.from(handles));
}
searchDDG("Buzzard's Barbershop", "Houston 77070");
