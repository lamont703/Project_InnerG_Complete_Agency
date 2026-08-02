import React from 'react';
import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';
import ContinuingEducationClient from './ContinuingEducationClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Texas Barber & Cosmetology Continuing Education Portal (2026)",
  description:
    "Maintain your active Texas barber or cosmetology license — a TDLR-approved 2026 continuing education course catalog covering infection control, chemistry, Texas barber law, and styling technique, with instant verified CE credit.",
  keywords: [
    "texas barber continuing education",
    "cosmetology continuing education texas",
    "tdlr continuing education",
    "tdlr ce hours",
    "barber license ce credit texas",
    "cosmetology license renewal ce hours",
  ],
  openGraph: {
    title: "Texas Barber & Cosmetology Continuing Education Portal",
    description:
      "TDLR-approved 2026 continuing education course catalog for Texas barbers and cosmetologists — instant verified CE credit.",
    url: "https://agency.innergcomplete.com/barber-cos-continuing-education",
    type: "website",
  },
  alternates: { canonical: "https://agency.innergcomplete.com/barber-cos-continuing-education" },
};

interface RawSchool {
  license_type: string;
  license_number: string;
  business_county: string;
  business_name: string;
  business_address_line1: string;
  business_city_state_zip: string;
  business_telephone: string;
  license_expiration_date_mmddccyy: string;
  owner_name: string;
}

export default async function BarberCosContinuingEducationPage() {
  let schoolsList: RawSchool[] = [];
  let errorMsg = '';

  try {
    const schoolsPath = path.join(process.cwd(), 'public/Texas_API_Barber_Schools.json');
    if (fs.existsSync(schoolsPath)) {
      const content = fs.readFileSync(schoolsPath, 'utf-8');
      schoolsList = JSON.parse(content);
    } else {
      console.warn('Texas_API_Barber_Schools.json not found in public directory. Initializing with fallback.');
    }
  } catch (err: any) {
    console.error('Error loading barber schools list:', err.message);
    errorMsg = `Failed to load school registers: ${err.message}`;
  }

  const courseListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Texas Barber & Cosmetology Continuing Education Course Catalog",
    itemListElement: [
      {
        "@type": "Course",
        position: 1,
        name: "State Board Mastery: Infection Control & Safe Working Practices",
        description: "TDLR-approved continuing education covering bacteriology, OSHA standards, EPA-registered disinfectants, and cross-contamination prevention.",
        provider: { "@type": "Organization", name: "Inner G Complete Agency" },
      },
      {
        "@type": "Course",
        position: 2,
        name: "State Board Mastery: Anatomy, Physiology & Chemical Mechanics",
        description: "TDLR-approved continuing education covering anatomy, the pH scale, cosmetic chemistry, and chemical restructuring.",
        provider: { "@type": "Organization", name: "Inner G Complete Agency" },
      },
      {
        "@type": "Course",
        position: 3,
        name: "State Board Mastery: Texas Barber Laws & TDLR Regulations",
        description: "TDLR-approved continuing education covering Texas barbering statutes, facility licensing, and inspection readiness.",
        provider: { "@type": "Organization", name: "Inner G Complete Agency" },
      },
      {
        "@type": "Course",
        position: 4,
        name: "State Board Mastery: Shaving & Facial Hair Design",
        description: "TDLR-approved continuing education covering shaving technique and facial hair design theory.",
        provider: { "@type": "Organization", name: "Inner G Complete Agency" },
      },
      {
        "@type": "Course",
        position: 5,
        name: "State Board Mastery: Hair Cutting & Styling Theory",
        description: "TDLR-approved continuing education covering hair cutting and styling theory.",
        provider: { "@type": "Organization", name: "Inner G Complete Agency" },
      },
      {
        "@type": "Course",
        position: 6,
        name: "State Board Mastery: Hair & Scalp Disorders",
        description: "TDLR-approved continuing education covering hair and scalp disorder identification.",
        provider: { "@type": "Organization", name: "Inner G Complete Agency" },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseListJsonLd) }} />
      <ContinuingEducationClient
        schools={schoolsList}
        errorMsg={errorMsg}
      />
    </>
  );
}
