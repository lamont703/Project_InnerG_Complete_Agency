/**
 * The booking target behind the scroll banner, resolved from a pathname alone.
 *
 * WHY THIS EXISTS RATHER THAN PROPS. ScrollCTA lives in the root layout, so it
 * knows the URL and nothing else — no entity, no services, no id. The banner
 * already solves this for its ad slot (lib/profile-ad resolves the same way for
 * getEntityBottomBannerAd), and this is the same shape for the same reason.
 * Moving the banner into four page files instead would duplicate the scroll,
 * dismissal and ad logic four times.
 *
 * ONLY THE FOUR BOOKABLE ROUTES. Schools and stores render the banner too, and
 * they must keep the directory-search CTA: you do not book an appointment with
 * a beauty supply store. The regex here is deliberately narrower than the one
 * that decides whether the banner appears at all.
 *
 * NULL IS THE COMMON CASE AND MEANS "SHOW THE OLD CTA". servicesForEntity
 * returns null for anything not bookable, and that null is load-bearing — see
 * its own doc comment. A banner offering to book an appointment with a business
 * that has no bookable services is worse than the generic CTA it replaced.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKABLE_ENTITY_PATH, SCHOOL_TOUR_PATH } from "@/lib/bookable-routes";
import {
  servicesForEntity,
  type BookableService,
  type BookingEntityType,
} from "@/lib/booking-services";

export interface BannerBookingTarget {
  entityType: BookingEntityType;
  entityId: string;
  entityName: string;
  services: BookableService[];
  /** Businesses only. Null for barbers and cosmetologists — see below. */
  phone: string | null;
  website: string | null;
}

/**
 * Route segment -> table and columns. Mirrors SOURCES in app/api/bookings and
 * BANNER_ROUTE_RESOLVE in lib/profile-ad; the tables are not uniform and the
 * column names differ per table, which is why none of these can be derived.
 */
const ROUTES: Record<
  string,
  {
    type: BookingEntityType;
    table: string;
    nameCol: string;
    websiteCol: string;
    categoryCol: "google_category" | null;
    servicesCol: "booksy_services" | null;
    /**
     * PHONE IS PUBLISHED FOR BUSINESSES, PRIVATE FOR PEOPLE.
     * lib/public-columns.ts omits `phone` from the barber and cosmetologist
     * column sets on purpose: a shop's number is its published contact detail,
     * an individual's is private lead data in a CRM table. The entity pages
     * enforce this by passing no fallbackPhone on those two types, and this
     * flag is how the banner keeps the same promise.
     */
    phoneIsPublic: boolean;
  }
> = {
  shop: {
    type: "shop",
    table: "agent_barbershop_leads",
    nameCol: "shop_name",
    websiteCol: "website",
    categoryCol: "google_category",
    servicesCol: null,
    phoneIsPublic: true,
  },
  salons: {
    type: "salon",
    table: "agent_salon_leads",
    nameCol: "shop_name",
    websiteCol: "website",
    categoryCol: "google_category",
    servicesCol: null,
    phoneIsPublic: true,
  },
  barbers: {
    type: "barber",
    table: "agent_barber_leads",
    nameCol: "name",
    websiteCol: "website_url",
    categoryCol: null,
    servicesCol: "booksy_services",
    phoneIsPublic: false,
  },
  cosmetologists: {
    type: "cosmetologist",
    table: "agent_cosmetologist_leads",
    nameCol: "name",
    websiteCol: "website_url",
    categoryCol: null,
    servicesCol: "booksy_services",
    phoneIsPublic: false,
  },
};

export async function getBannerBookingTarget(
  pathname: string
): Promise<BannerBookingTarget | null> {
  const m = pathname.match(BOOKABLE_ENTITY_PATH);
  if (!m) return null;

  const cfg = ROUTES[m[1]];
  if (!cfg) return null;
  const slug = m[2];

  try {
    const admin = createAdminClient();
    const cols = [
      "id",
      cfg.nameCol,
      cfg.websiteCol,
      cfg.categoryCol,
      cfg.servicesCol,
      cfg.phoneIsPublic ? "phone" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const { data } = await admin.from(cfg.table).select(cols).eq("slug", slug).maybeSingle();
    if (!data) return null;

    const row = data as Record<string, any>;
    const services = servicesForEntity({
      entityType: cfg.type,
      googleCategory: cfg.categoryCol ? row[cfg.categoryCol] : null,
      booksyServices: cfg.servicesCol ? row[cfg.servicesCol] : undefined,
    });
    // Null means "never bookable". No CTA, and the banner keeps its old one.
    if (!services) return null;

    const name = row[cfg.nameCol];
    if (!name) return null;

    return {
      entityType: cfg.type,
      entityId: String(row.id),
      entityName: String(name),
      services,
      phone: cfg.phoneIsPublic ? row.phone ?? null : null,
      website: row[cfg.websiteCol] ?? null,
    };
  } catch {
    // A banner is decoration. It must never take a page down, and falling back
    // to the directory CTA is a complete, working experience on its own.
    return null;
  }
}

/**
 * The school behind a /schools/[slug] page, for the banner's tour CTA.
 *
 * SEPARATE FROM getBannerBookingTarget, for the same reason SCHOOL_TOUR_PATH is
 * separate from BOOKABLE_ENTITY_PATH: there are no services to resolve, so the
 * null-means-not-bookable contract above does not apply. Here a null means only
 * "no such school", and the banner falls back to its directory CTA.
 *
 * IT SEARCHES BOTH TABLES because schools are split by trade —
 * agent_barber_school_leads and agent_cosmetology_school_leads — exactly as
 * app/schools/[slug]/page.tsx and app/api/school-tours/route.ts both do. A
 * lookup that checked only one would work on most pages and silently fail on
 * the rest, which is the worst shape this bug could take.
 *
 * PHONE IS PUBLIC HERE. A school's number is its published contact detail, the
 * same as a shop's — unlike the barber and cosmetologist tables, where the
 * number is private lead data and lib/public-columns.ts omits it.
 */
export interface BannerTourTarget {
  entityId: string;
  entityName: string;
  phone: string | null;
  website: string | null;
  /**
   * The school's call-routing row, when it has one.
   *
   * The banner offers a CALL now rather than a tour, and a call needs the
   * routing id, not the school id — routing is what knows the destination and
   * carries the labels the whisper uses. Null means this school has no usable
   * phone on file, and the banner falls through to the directory CTA rather
   * than showing a button that cannot dial.
   */
  routingId: string | null;
}

const SCHOOL_TABLES = ["agent_barber_school_leads", "agent_cosmetology_school_leads"] as const;

export async function getBannerTourTarget(pathname: string): Promise<BannerTourTarget | null> {
  const m = pathname.match(SCHOOL_TOUR_PATH);
  if (!m) return null;
  const slug = m[1];

  try {
    const admin = createAdminClient();
    for (const table of SCHOOL_TABLES) {
      const { data } = await admin
        .from(table)
        .select("id, school_name, phone, website")
        .eq("slug", slug)
        .maybeSingle();
      const row = data as Record<string, any> | null;
      if (row?.school_name) {
        const { data: routing } = await admin
          .from("school_call_routing")
          .select("id")
          .eq("school_id", row.id)
          .eq("status", "active")
          .maybeSingle();
        return {
          entityId: String(row.id),
          entityName: String(row.school_name),
          phone: row.phone ?? null,
          website: row.website ?? null,
          routingId: (routing as any)?.id ?? null,
        };
      }
    }
    return null;
  } catch {
    // A banner is decoration. It must never take a page down.
    return null;
  }
}
