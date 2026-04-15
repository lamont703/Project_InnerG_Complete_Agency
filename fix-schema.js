const fs = require('fs');
const path = require('path');

const data = {
  "abc-fitness-sovereign-intelligence-audit": {
    title: "ABC Fitness's Intelligence Ceiling | Strategic View | Inner G Complete",
    desc: "A strategic audit of the intelligence gap at the heart of the world's largest fitness platform and how ADI bridges it."
  },
  "autonomous-concierge-roi-analysis": {
    title: "Autonomous Concierge ROI Analysis | Inner G Complete",
    desc: "A quantitative breakdown of the revenue recovered through ADI-driven scheduling automations."
  },
  "booksy-sovereign-intelligence-audit": {
    title: "Booksy's Intelligence Ceiling | Strategic View | Inner G Complete",
    desc: "A platform audit of Booksy's architecture, and why its enterprise clients face an intelligence ceiling they must solve themselves."
  },
  "cognitive-architecture-blueprint": {
    title: "Cognitive Architecture Blueprint | Technical View | Inner G Complete",
    desc: "The fundamental engineering blueprint for transitioning a wellness enterprise from traditional systems to advanced sovereign AI."
  },
  "cognitive-feedstock-15-data-sources": {
    title: "Cognitive Feedstock: The 15 Enterprise Data Sources | Inner G Complete",
    desc: "A breakdown of the 15 critical data streams that fuel an enterprise Artificial Domain Intelligence model."
  },
  "mindbody-sovereign-intelligence-audit": {
    title: "MindBody's Intelligence Ceiling | Strategic View | Inner G Complete",
    desc: "A strategic audit of MindBody's enterprise limits and why the top 1% of wellness brands must build intelligence layers on top of it."
  },
  "the-feasibility-premium": {
    title: "The Feasibility Premium | Strategic View | Inner G Complete",
    desc: "Why execution feasibility is the new barrier to entry in enterprise AI integration."
  },
  "thecut-sovereign-intelligence-audit": {
    title: "theCut's Intelligence Ceiling | Strategic View | Inner G Complete",
    desc: "An architectural review of theCut's platform dynamics and the necessity for sovereign AI layers for top grooming franchises."
  }
};

for (const [slug, meta] of Object.entries(data)) {
  const filePath = path.join(__dirname, 'app', 'insights', slug, 'page.tsx');
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Find the exact positions
  const mainStartPos = content.indexOf('<main className="min-h-screen bg-background light text-foreground flex flex-col pt-20">');
  const navbarPos = content.indexOf('<Navbar />');

  if (mainStartPos === -1 || navbarPos === -1) {
    console.log("Could not parse", slug);
    continue;
  }

  // The text to keep at the start (including the <main> tag)
  const prefix = content.substring(0, mainStartPos + 91); // length of the <main> tag string above
  const suffix = content.substring(navbarPos);

  const url = `https://innergcomplete.com/insights/${slug}`;
  
  const schemaScript = `\n      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "TechArticle",
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": "${url}"
            },
            "headline": ${JSON.stringify(meta.title)},
            "description": ${JSON.stringify(meta.desc)},
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
      />\n      `;

  const newContent = prefix + schemaScript + suffix;
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log("Fixed", slug);
}
