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

/** Matches only the four bookable entity routes, and only a detail page. */
const BOOKABLE_PATH = /^\/(shop|salons|barbers|cosmetologists)\/([^/?#]+)$/;

export async function getBannerBookingTarget(
  pathname: string
): Promise<BannerBookingTarget | null> {
  const m = pathname.match(BOOKABLE_PATH);
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
