import type { Metadata } from "next";
import { TradeRolePosting, type TradeRole } from "@/app/careers/components/TradeRolePosting";
import { SITE_URL } from "@/lib/site";

// Targets the barbering half of the hiring intent: "barbershops hiring in
// Houston", "barber jobs Houston", "barber chair for rent Houston". Kept
// separate from the cosmetologist posting on purpose — one page trying to rank
// for both barbershop and salon queries competes with itself, and the two
// licenses, requirements and venues genuinely differ.
export const metadata: Metadata = {
  title: "Barbershops Hiring in Houston | Barber Jobs & Chair Rentals — ShearQuery",
  description:
    "Barbershops hiring in Houston right now. We recruit licensed barbers for shops on ShearQuery — entry to mid-level, hourly, commission or chair rental. Create a free barber listing and apply.",
  keywords: [
    "barbershops hiring in Houston",
    "barber jobs Houston",
    "barber hiring near me",
    "barber chair for rent Houston",
    "licensed barber jobs Texas",
    "barber apprentice Houston",
  ],
  alternates: { canonical: "/careers/barber-jobs-houston" },
  openGraph: {
    title: "Barbershops Hiring in Houston | Barber Jobs — ShearQuery",
    description:
      "Licensed barbers: Houston shops on ShearQuery have chairs open. Create a free barber listing and approach them with your work, license and specialties.",
    url: `${SITE_URL}/careers/barber-jobs-houston`,
    type: "website",
  },
};

const ROLE: TradeRole = {
  slug: "barber-jobs-houston",
  headline: "Barbershops Hiring in Houston",
  subhead:
    "Licensed barbers — Houston shops on the ShearQuery platform have chairs, booths and staff positions open. We match you to them based on what you cut, where you are, and how you want to be paid.",
  licenseLabel: "Texas barber license",
  distinction:
    "This posting is for barbers: clipper work, fades, tapers, line-ups, beard and razor services, under a Texas barber license. If you hold a cosmetology license and work primarily in color, chemical services or extensions, the salon-side posting is the better fit.",
  siblingHref: "/careers/cosmetologist-jobs-houston",
  siblingLabel: "See hair & beauty salons hiring in Houston →",
  venueNoun: "barbershops, salons and beauty businesses",
  dayToDay: [
    "Fades, tapers, line-ups and scissor work on a walk-in or booked clientele",
    "Beard shaping, razor shaves and hot-towel services where the shop offers them",
    "Building your own book — most shops let you keep and grow your clients",
    "Sanitation and station upkeep to Texas TDLR standards",
    "Working the shop's booking system, whether that's an app or a walk-in board",
  ],
  requirements: [
    "Active Texas barber license, or class-A barber certificate in hand",
    "Confident with clippers: fades, tapers and line-ups without supervision",
    "Reliable on a schedule — shops lose money on an empty chair",
    "Comfortable talking to clients and handling rebooking",
    "0–3 years behind the chair, including recent graduates",
  ],
  niceToHave: [
    "An existing client book you can bring",
    "Your own clippers and trimmers",
    "Bilingual English/Spanish",
    "Enrolled barbers finishing their hours — several shops take apprentices",
  ],
  jobTitle: "Licensed Barber — Houston, TX",
  jobDescription:
    "ShearQuery recruits licensed barbers for barbershops and salons across Houston and the greater Houston area. Openings include full-time and part-time staff positions, commission arrangements, and chair or booth rentals, depending on the shop. Requirements: an active Texas barber license (or class-A barber certificate), confident clipper work including fades, tapers and line-ups, reliability on a schedule, and TDLR-standard sanitation practice. Experience level is entry to mid — roughly 0 to 3 years behind the chair, including recent graduates and newly licensed barbers. Apprentices still completing hours are welcome to create a profile. Barbers create a free professional listing on ShearQuery showing license status, specialties and photographs of their work, which shops review when filling a chair. Compensation varies by shop and is disclosed before introduction. The hiring employer is the individual barbershop or salon, not the agency.",
  occupationalCategory: "39-5011.00 Barbers",
};

export default function BarberJobsHoustonPage() {
  return (
    <TradeRolePosting role={ROLE} />
  );
}
