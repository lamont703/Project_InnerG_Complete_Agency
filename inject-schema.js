const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'app', 'insights');

const getFiles = (dir, filesList = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else if (file === 'page.tsx') {
      filesList.push(filePath);
    }
  }
  return filesList;
};

const pages = getFiles(baseDir);

for (const pagePath of pages) {
  let content = fs.readFileSync(pagePath, 'utf8');
  
  // Only target the specific insight articles, skip root insights/page.tsx
  if (pagePath === path.join(baseDir, 'page.tsx')) {
      continue;
  }

  // Remove existing JSON-LD script if it exists to replace it cleanly
  content = content.replace(/<script\s+type="application\/ld\+json"[\s\S]*?<\/script>/, '');

  // Skip the two files I manually did already which may have had it in a different place
  if (pagePath.includes('rebooking-intelligence-pilot') || pagePath.includes('the-sovereign-intelligence-layer')) {
      continue;
  }

  // Extract title and description from either the page.tsx or its layout.tsx using a more robust method
  let titleMatch = content.match(/title:\s*(['"`])(.*?)\1/);
  let descMatch = content.match(/description:\s*(['"`])(.*?)\1/);
  
  if (!titleMatch || !descMatch) {
      // Check layout.tsx
      const layoutPath = path.join(path.dirname(pagePath), 'layout.tsx');
      if (fs.existsSync(layoutPath)) {
          const layoutContent = fs.readFileSync(layoutPath, 'utf8');
          titleMatch = layoutContent.match(/title:\s*(['"`])(.*?)\1/);
          descMatch = layoutContent.match(/description:\s*(['"`])(.*?)\1/);
      }
  }

  if (titleMatch && descMatch) {
    let title = titleMatch[2];
    let desc = descMatch[2];
    
    // Unescape anything from the original string so we have pure text
    title = title.replace(/\\'/g, "'").replace(/\\"/g, '"');
    desc = desc.replace(/\\'/g, "'").replace(/\\"/g, '"');

    const slug = path.basename(path.dirname(pagePath));
    const url = `https://innergcomplete.com/insights/${slug}`;
    
    const schemaScript = `      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": "${url}"
            },
            "headline": ${JSON.stringify(title)},
            "description": ${JSON.stringify(desc)},
            "author": {
              "@type": "Person",
              "name": "Lamont Evans",
              "url": "https://innergcomplete.com/about"
            },
            "publisher": {
              "@type": "Organization",
              "name": "Inner G Complete Agency",
              "logo": {
                "@type": "ImageObject",
                "url": "https://innergcomplete.com/icon-dark-32x32.png"
              }
            },
            "datePublished": "2026-04-12T08:00:00Z"
          })
        }}
      />\n`;

    // Inject after <main...
    const mainMatch = content.match(/<main[^>]*>/);
    if (mainMatch) {
        const insertIndex = mainMatch.index + mainMatch[0].length + 1;
        content = content.slice(0, insertIndex) + schemaScript + content.slice(insertIndex);
        fs.writeFileSync(pagePath, content, 'utf8');
        console.log(`Fixed schema in ${slug}`);
    } else {
        console.log(`Could not find <main> tag in ${slug}`);
    }
  } else {
    console.log(`Could not find metadata for ${pagePath}`);
  }
}
