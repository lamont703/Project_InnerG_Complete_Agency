import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TradeRolePosting, type TradeRole } from "@/app/careers/components/TradeRolePosting";

// Targets the salon half of the hiring intent: "hair salons hiring in Houston",
// "beauty salons hiring in Houston", "cosmetologist jobs Houston", "salon suite
// for rent Houston". Deliberately a separate page from the barber posting so
// each can rank for its own venue query instead of splitting relevance.
export const metadata: Metadata = {
  title: "Hair & Beauty Salons Hiring in Houston | Cosmetologist & Stylist Jobs — ShearQuery",
  description:
    "Hair salons and beauty salons hiring in Houston right now. We recruit licensed cosmetologists and stylists for salons on ShearQuery — entry to mid-level, commission, hourly or suite rental. Create a free listing and apply.",
  keywords: [
    "hair salons hiring in Houston",
    "beauty salons hiring in Houston",
    "cosmetologist jobs Houston",
    "hair stylist jobs Houston",
    "salon suite for rent Houston",
    "licensed cosmetologist Texas",
  ],
  alternates: { canonical: "/careers/cosmetologist-jobs-houston" },
  openGraph: {
    title: "Hair & Beauty Salons Hiring in Houston | Cosmetologist Jobs — ShearQuery",
    description:
      "Licensed cosmetologists and stylists: Houston salons on ShearQuery have chairs and suites open. Create a free listing and approach them with your portfolio.",
    url: "https://agency.innergcomplete.com/careers/cosmetologist-jobs-houston",
    type: "website",
  },
};

const ROLE: TradeRole = {
  slug: "cosmetologist-jobs-houston",
  headline: "Hair & Beauty Salons Hiring in Houston",
  subhead:
    "Licensed cosmetologists and stylists — Houston salons on the ShearQuery platform have chairs, suites and staff positions open. We match you to them based on your specialties, location, and how you want to be paid.",
  licenseLabel: "Texas cosmetology license",
  distinction:
    "This posting is for cosmetologists and stylists: cutting, colour, chemical services, styling, and the skin and nail work your licence covers. If you work primarily with clippers — fades, tapers, line-ups and beard services under a barber licence — the barbershop posting is the better fit.",
  siblingHref: "/careers/barber-jobs-houston",
  siblingLabel: "See barbershops hiring in Houston →",
  venueNoun: "hair salons, beauty salons and grooming businesses",
  dayToDay: [
    "Cutting, styling and finishing on a booked or walk-in clientele",
    "Colour work: single process, highlights, balayage and corrective, depending on the salon",
    "Chemical services — relaxers, perms, smoothing treatments — where offered",
    "Consultations, and rebooking clients before they leave",
    "Sanitation and station upkeep to Texas TDLR standards",
  ],
  requirements: [
    "Active Texas cosmetology or hair-stylist license",
    "Solid fundamentals in cutting and blow-dry finishing",
    "Basic colour competence — formulation, application, timing",
    "Reliable on a schedule, and comfortable with client consultations",
    "0–3 years behind the chair, including recent graduates",
  ],
  niceToHave: [
    "A portfolio of your work — photos matter more than a résumé here",
    "An existing client book you can bring",
    "Extensions, braiding, natural hair or textured-hair specialisation",
    "Esthetician or manicurist licence alongside cosmetology",
  ],
  jobTitle: "Licensed Cosmetologist / Hair Stylist — Houston, TX",
  jobDescription:
    "ShearQuery recruits licensed cosmetologists and hair stylists for hair salons, beauty salons and grooming businesses across Houston and the greater Houston area. Openings include full-time and part-time staff positions, commission arrangements, and chair or salon-suite rentals, depending on the salon. Requirements: an active Texas cosmetology or hair-stylist license, solid cutting and finishing fundamentals, basic colour competence including formulation and application, reliability on a schedule, and TDLR-standard sanitation practice. Experience level is entry to mid — roughly 0 to 3 years behind the chair, including recent graduates and newly licensed stylists. Specialisation in extensions, braiding or textured hair is welcome but not required. Stylists create a free professional listing on ShearQuery showing license status, specialties and portfolio photographs, which salons review when filling a chair or suite. Compensation varies by salon and is disclosed before introduction. The hiring employer is the individual salon, not the agency.",
  occupationalCategory: "39-5012.00 Hairdressers, Hairstylists, and Cosmetologists",
};

export default function CosmetologistJobsHoustonPage() {
  return (
    <>
      <Navbar />
      <TradeRolePosting role={ROLE} />
      <Footer />
    </>
  );
}
