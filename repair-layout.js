const fs = require('fs');
const path = require('path');

const config = {
  "abc-fitness-sovereign-intelligence-audit": ["/abc_fitness_sovereign_intelligence_audit.png", "ABC Fitness's Intelligence Ceiling"],
  "autonomous-concierge-roi-analysis": ["/autonomous_concierge_roi_cover_1776043024026.png", "Autonomous Concierge ROI Analysis"],
  "booksy-sovereign-intelligence-audit": ["/booksy_sovereign_intelligence_audit.png", "Booksy's Intelligence Ceiling"],
  "cognitive-architecture-blueprint": ["/cpmai_framework_cover.png", "Cognitive Architecture Blueprint"],
  "cognitive-feedstock-15-data-sources": ["/cognitive_feedstock_brief_cover_1776041859371.png", "Cognitive Feedstock: 15 Data Sources"],
  "mindbody-sovereign-intelligence-audit": ["/mindbody_sovereign_intelligence_audit.png", "MindBody's Intelligence Ceiling"],
  "rebooking-intelligence-pilot": ["/rebooking_intelligence_pilot_brief.png", "Rebooking Intelligence Pilot"],
  "the-feasibility-premium": ["/the_feasibility_premium_cover_1776042291644.png", "The Feasibility Premium"],
  "the-sovereign-intelligence-layer": ["/adi_sovereign_layer_cover_1776108008232.png", "The Sovereign Intelligence Layer"],
  "thecut-sovereign-intelligence-audit": ["/thecut_sovereign_intelligence_audit.png", "theCut's Intelligence Ceiling"],
};

for (const [slug, data] of Object.entries(config)) {
  const [imgPath, titleStr] = data;
  const dirPath = path.join(__dirname, 'app', 'insights', slug);
  let targetFile = path.join(dirPath, 'layout.tsx');
  
  if (!fs.existsSync(targetFile)) {
    targetFile = path.join(dirPath, 'page.tsx');
  }

  if (!fs.existsSync(targetFile)) continue;

  let content = fs.readFileSync(targetFile, 'utf8');

  // Fix Layout.tsx broken syntax
  if (content.includes('  },\n\n\nexport default ') || content.includes('  },\n\nexport default ')) {
      content = content.replace(/(    \],\n  \},)(\n+export default)/g, `$1\n  twitter: {\n    card: "summary_large_image",\n    title: "${titleStr}",\n    images: ['${imgPath}'],\n  },\n}$2`);
      fs.writeFileSync(targetFile, content);
      console.log(`Repaired layout block in ${targetFile}`);
  }
}
