const fs = require('fs');
const path = require('path');

const config = {
  "abc-fitness-sovereign-intelligence-audit": "/abc_fitness_sovereign_intelligence_audit.png",
  "autonomous-concierge-roi-analysis": "/autonomous_concierge_roi_cover_1776043024026.png",
  "booksy-sovereign-intelligence-audit": "/booksy_sovereign_intelligence_audit.png",
  "cognitive-architecture-blueprint": "/cpmai_framework_cover.png",
  "cognitive-feedstock-15-data-sources": "/cognitive_feedstock_brief_cover_1776041859371.png",
  "mindbody-sovereign-intelligence-audit": "/mindbody_sovereign_intelligence_audit.png",
  "rebooking-intelligence-pilot": "/rebooking_intelligence_pilot_brief.png",
  "the-feasibility-premium": "/the_feasibility_premium_cover_1776042291644.png",
  "the-sovereign-intelligence-layer": "/adi_sovereign_layer_cover_1776108008232.png",
  "thecut-sovereign-intelligence-audit": "/thecut_sovereign_intelligence_audit.png",
};

for (const [slug, imgPath] of Object.entries(config)) {
  const dirPath = path.join(__dirname, 'app', 'insights', slug);
  let targetFile = path.join(dirPath, 'layout.tsx');
  
  if (!fs.existsSync(targetFile)) {
    targetFile = path.join(dirPath, 'page.tsx');
  }

  if (!fs.existsSync(targetFile)) continue;

  let content = fs.readFileSync(targetFile, 'utf8');

  // Skip if already contains images array
  if (content.includes('images: [') && content.includes(imgPath)) {
    console.log(`Skipping ${slug}, already configured.`);
    continue;
  }

  // Inject OG images
  // We want to insert inside openGraph: { ... }
  const urlRegex = /(url:\s*'.+?',)/g;
  
  let match;
  let lastUrlPos = -1;
  let lastUrlLen = 0;
  
  while ((match = urlRegex.exec(content)) !== null) {
      // Find the URL inside the openGraph block (usually the last url: before the end of the block)
      lastUrlPos = match.index;
      lastUrlLen = match[0].length;
  }

  if (lastUrlPos !== -1) {
    const insertPos = lastUrlPos + lastUrlLen;
    const ogInjection = `
    siteName: 'Inner G Complete Agency',
    images: [
      {
        url: '${imgPath}',
        width: 1200,
        height: 630,
      },
    ],`;
    
    content = content.slice(0, insertPos) + ogInjection + content.slice(insertPos);
    
    // Now add the twitter block right before the closing bracket of metadata
    content = content.replace(/(  },\n)(}?)$/m, (full, p1) => {
        // Find the last occurrence of   }, before the end of metadata
        return p1; 
    });

    // Instead of complex regex for Twitter, let's just insert it right before the final closing brace of metadata export
    const metaEndRegex = /(export const metadata: Metadata = {[\s\S]+?)(};)/;
    if (metaEndRegex.test(content)) {
        content = content.replace(metaEndRegex, `$1  twitter: {
    card: 'summary_large_image',
    images: ['${imgPath}'],
  },
$2`);
    }

    fs.writeFileSync(targetFile, content);
    console.log(`Injected OG data into ${targetFile}`);
  }
}
