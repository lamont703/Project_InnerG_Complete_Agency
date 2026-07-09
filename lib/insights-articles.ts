// Single source of truth for every insights article's metadata — shared
// between the /insights index page and the RelatedArticles component so
// related-content suggestions can't drift out of sync with what's actually
// listed on the index.
export interface InsightsArticle {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readingTime: string;
  category: string;
  featured?: boolean;
}

export const insightsArticles: InsightsArticle[] = [
  {
    slug: "highest-paying-barbershops-houston",
    title: "Highest Paying Barbershops in Houston: Best Pay Terms, Real Listings",
    excerpt: "Not earnings data — the real terms that actually determine what you keep: the lowest booth rents and highest commission splits among Houston barbershops currently reporting pay structure.",
    date: "July 10, 2026",
    readingTime: "6 min read",
    category: "Technical Brief",
    featured: true,
  },
  {
    slug: "booth-rent-taxes-and-llc-texas",
    title: "Booth Rent Taxes & Do You Need an LLC in Texas?",
    excerpt: "Booth renters are independent contractors, not employees — what that means for deductions, 1099s, and self-employment tax, and why Texas doesn't actually require an LLC to rent a booth.",
    date: "July 10, 2026",
    readingTime: "7 min read",
    category: "Technical Brief",
    featured: true,
  },
  {
    slug: "texas-barber-school-length-vs-apprenticeship",
    title: "How Long Does Barber School Take in Texas? (And Why There's No Apprenticeship Path)",
    excerpt: "Barber school in Texas requires 1,000 hours — typically 6-9 months full-time. Texas has no barber apprenticeship pathway at all, but there's a real 300-hour accelerated path for licensed cosmetologists.",
    date: "July 10, 2026",
    readingTime: "6 min read",
    category: "Technical Brief",
    featured: true,
  },
  {
    slug: "booth-rent-vs-commission",
    title: "Booth Rent vs. Commission: What the Real Houston Numbers Say",
    excerpt: "Booth rent vs. commission, decided with real Houston barbershop data — median weekly rent, typical commission splits, and the exact breakeven revenue where one model beats the other. Includes a free calculator.",
    date: "July 9, 2026",
    readingTime: "7 min read",
    category: "Technical Brief",
    featured: true,
  },
  {
    slug: "booth-rental-contract-requirements-texas",
    title: "Booth Rental Requirements in Texas: Mini-Establishment License, Contract & Insurance",
    excerpt: "What Texas actually requires for booth rental — the TDLR Mini-Establishment license, who applies for it, what belongs in your rental contract, and the insurance shop owners expect you to carry.",
    date: "July 9, 2026",
    readingTime: "8 min read",
    category: "Technical Brief",
    featured: true,
  },
  {
    slug: "texas-barber-cosmetology-license-requirements",
    title: "Texas Barber & Cosmetology License Requirements: Application, Renewal, Reciprocity",
    excerpt: "The canonical guide to getting and keeping a Texas barber or cosmetology license — application, the 2-year renewal cycle, new CE and lawful-presence requirements, and reciprocity from other states. Sourced directly from TDLR.",
    date: "July 8, 2026",
    readingTime: "9 min read",
    category: "Technical Brief",
    featured: true,
  },
  {
    slug: "opening-your-own-shop-in-texas",
    title: "Opening Your Own Shop in Texas: TDLR Establishment License Requirements",
    excerpt: "What TDLR actually requires to open a barbershop or salon in Texas — establishment license, premises and equipment rules, required postings, and how inspections work. Sourced directly from TDLR.",
    date: "July 8, 2026",
    readingTime: "8 min read",
    category: "Technical Brief",
    featured: true,
  },
  {
    slug: "national-ai-classroom-accreditation-impact-report",
    title: "The National AI Classroom Impact Report: Protecting NACCAS & ACCSC Accreditation Standards",
    excerpt: "How classroom AI is transforming trade school pass rates and NACCAS/ACCSC accreditation compliance. Discover the data behind Title-IV safety.",
    date: "May 20, 2026",
    readingTime: "17 min read",
    category: "Industry Report",
    featured: true,
  },
  {
    slug: "el-paso-barber-market-rescue-report",
    title: "El Paso Barber Market Rescue Report: A Strategic Recovery Audit",
    excerpt: "El Paso exhibits a critical 58.0% aggregate fail rate, driven by high-volume institutions like Socorro HS. An industry rescue report mapping the path to licensure stabilization.",
    date: "April 28, 2026",
    readingTime: "15 min read",
    category: "Industry Report",
    featured: true,
  },
  {
    slug: "texas-barber-licensure-crisis",
    title: "The Texas Barber Licensure Crisis: A $15M Institutional Risk Analysis",
    excerpt: "Texas barber schools are facing a 'Licensure Cliff' with written fail rates exceeding 45% in major metros. An audit of why school accreditation is at risk and how the Texas ADI Pilot is architected to defend it.",
    date: "April 20, 2026",
    readingTime: "18 min read",
    category: "Industry Report",
    featured: true,
  },
  {
    slug: "barber-education-intelligence-roi",
    title: "Overcoming the Blockade: Barber Education Intelligence",
    excerpt: "Barber students invest $16,800+ into an education that prepares them physically but repeatedly fails them theoretically. A definitive ROI analysis on the Cognitive RAG solution to guarantee licensure velocity.",
    date: "April 19, 2026",
    readingTime: "16 min read",
    category: "Industry Report",
    featured: true,
  },
  {
    slug: "the-sovereign-intelligence-layer",
    title: "The Sovereign Intelligence Layer: Why ADI Wins",
    excerpt: "The enterprise that builds a proprietary Artificial Domain Intelligence doesn't just win market share—it becomes the industry standard that everyone else licenses.",
    date: "April 13, 2026",
    readingTime: "14 min read",
    category: "Strategic View",
    featured: true,
  },
  {
    slug: "mindbody-sovereign-intelligence-audit",
    title: "MindBody's Intelligence Ceiling",
    excerpt: "A platform audit of why MindBody's 700-integration architecture is generating data without generating intelligence — and how a sovereign AI layer changes everything.",
    date: "April 14, 2026",
    readingTime: "24 min read",
    category: "Strategic View",
  },
  {
    slug: "abc-fitness-sovereign-intelligence-audit",
    title: "ABC Fitness's Intelligence Ceiling",
    excerpt: "ABC Fitness built the operational backbone for enterprise gym networks. But managing members is not the same as understanding them. A strategic audit of the intelligence gap at the heart of the world's largest fitness platform.",
    date: "April 14, 2026",
    readingTime: "22 min read",
    category: "Strategic View",
  },
  {
    slug: "thecut-sovereign-intelligence-audit",
    title: "theCut's Intelligence Ceiling",
    excerpt: "theCut processed over $2 billion in barber transactions and became the most trusted booking platform in Black and Brown barbershop culture. A strategic audit of what the model that doesn't exist yet would change for every professional on the platform.",
    date: "April 14, 2026",
    readingTime: "22 min read",
    category: "Strategic View",
  },
  {
    slug: "booksy-sovereign-intelligence-audit",
    title: "Booksy's Intelligence Ceiling",
    excerpt: "Booksy processes $10B+ in annual GMV across 140,000 global businesses and 40 million consumers. A strategic audit of the intelligence layer that this data is ready to support — and why the platform that builds it first defines the category that comes after booking.",
    date: "April 14, 2026",
    readingTime: "24 min read",
    category: "Strategic View",
  },
  {
    slug: "rebooking-intelligence-pilot",
    title: "Rebooking Appointment Intelligence: Barber Grooming ADI Pilot",
    excerpt: "A CPMAI-governed pilot architecture for deploying an ADI model that autonomously keeps a barber's calendar full, maintains a floor revenue target per chair, and drives retention through precision-timed client engagement — without changing the barber's daily workflow.",
    date: "April 14, 2026",
    readingTime: "26 min read",
    category: "Technical Brief",
  },
  {
    slug: "cognitive-architecture-blueprint",
    title: "The Cognitive Architecture Blueprint: Delivering Institutional-Grade AI with CPMAI",
    excerpt: "How Inner G Complete applies the PMI-certified CPMAI framework across all six phases to architect the Aesthetic Domain Intelligence model — governance-first, enterprise-ready.",
    date: "April 13, 2026",
    readingTime: "20 min read",
    category: "Methodology",
  },
  {
    slug: "cognitive-feedstock-15-data-sources",
    title: "Cognitive Feedstock: 15 Data Sources for Aesthetic AI",
    excerpt: "Moving beyond simple booking lists to tap into high-fidelity data that captures the 'human' element of wellness and grooming.",
    date: "April 12, 2026",
    readingTime: "15 min read",
    category: "Technical Brief",
  },
  {
    slug: "the-feasibility-premium",
    title: "The Feasibility Premium: Starting with 'No'",
    excerpt: "Why the most successful AI projects in wellness and grooming begin with a ruthless viability audit, not a dev sprint.",
    date: "April 12, 2026",
    readingTime: "10 min read",
    category: "Strategic View",
  },
  {
    slug: "autonomous-concierge-roi-analysis",
    title: "Autonomous Concierge: ROI Analysis",
    excerpt: "Quantifying the economic impact of AI-driven booking agents on clinical throughput and client retention.",
    date: "April 12, 2026",
    readingTime: "15 min read",
    category: "Industry Report",
  },
];

export const insightsCategories = ["All", "Industry Report", "Technical Brief", "Strategic View", "Methodology"];
