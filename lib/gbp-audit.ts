/**
 * Local SEO audit for a connected Google Business Profile.
 *
 * Read-only and deliberately pure: this module never calls Google. It takes
 * whatever the fetchers gathered and turns it into scored findings, so the
 * scoring can be tested against fixtures and so the same engine can later run
 * for any connected location rather than just the one we're demoing.
 *
 * On the thresholds below: they're informed heuristics, not Google-published
 * numbers. Google doesn't disclose ranking weights, and anyone claiming a
 * precise "profile completeness score" is inventing it. What's defensible is
 * the direction — a profile with a description outperforms one without — so
 * every check states the observed gap plainly and the score is presented as a
 * prioritisation aid, not a measurement.
 */

export type AuditArea = "Foundation" | "Discovery" | "Engagement" | "Trust";
export type AuditStatus = "pass" | "warn" | "fail" | "info";

export interface AuditCheck {
  id: string;
  area: AuditArea;
  label: string;
  status: AuditStatus;
  /** What we actually found — always concrete, never "could be improved". */
  detail: string;
  /** What to do about it. Absent on passes. */
  fix?: string;
  weight: number;
  earned: number;
}

export interface AuditReport {
  score: number;
  grade: string;
  checks: AuditCheck[];
  /** Failing/warning checks, heaviest first — the actual work order. */
  priorities: AuditCheck[];
  areas: Record<AuditArea, { earned: number; possible: number }>;
}

export interface SearchKeyword {
  keyword: string;
  /** Exact monthly impressions, or null when Google only gave a threshold. */
  value: number | null;
  /** Google buckets low-volume queries as "fewer than N". */
  threshold: number | null;
}

export interface GbpAuditInput {
  location: any;
  attributesSet: any[];
  attributesAvailable: any[];
  photos: { count: number };
  reviews: { total: number; average: number | null; sampled: number; unanswered: number };
  posts: { count: number; latestIso: string | null };
  performance:
    | { impressions: number; callClicks: number; websiteClicks: number; directionRequests: number; days: number }
    | null;
  searchKeywords: SearchKeyword[];
  googleUpdated: { diffMask: string | null };
  verification: { hasVoiceOfMerchant?: boolean; hasBusinessAuthority?: boolean } | null;
  placeActions: any[];
  /** For "posted recently?" — injected so the report is reproducible. */
  now?: Date;
}

/** Partial credit, so a profile with 4 of 10 photos isn't scored the same as one with none. */
const scaled = (actual: number, target: number, weight: number) =>
  Math.round(Math.min(1, target <= 0 ? 1 : actual / target) * weight * 100) / 100;

function grade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function buildGbpAudit(input: GbpAuditInput): AuditReport {
  const loc = input.location || {};
  const checks: AuditCheck[] = [];
  const add = (c: AuditCheck) => checks.push(c);

  // ── Foundation: the fields a listing is unusable without ──────────────────

  const primary = loc.categories?.primaryCategory?.displayName || null;
  add({
    id: "primary-category", area: "Foundation", label: "Primary category", weight: 5,
    earned: primary ? 5 : 0,
    status: primary ? "pass" : "fail",
    detail: primary ? `Set to "${primary}".` : "No primary category set.",
    fix: primary ? undefined : "Set the primary category — it drives which searches the listing is eligible for.",
  });

  const desc: string = loc.profile?.description || "";
  // 750 is Google's hard cap. The 250 target is ours: enough room to name the
  // services and the neighbourhood without padding.
  add({
    id: "description", area: "Foundation", label: "Business description", weight: 8,
    earned: scaled(desc.length, 250, 8),
    status: desc.length === 0 ? "fail" : desc.length < 250 ? "warn" : "pass",
    detail: desc.length === 0
      ? "Empty — no description at all."
      : `${desc.length} of 750 characters used.`,
    fix: desc.length >= 250 ? undefined
      : "Write 250–750 characters covering the actual services and the neighbourhood. Keep it readable — keyword stuffing risks suspension.",
  });

  const services: any[] = loc.serviceItems || [];
  add({
    id: "services", area: "Foundation", label: "Services listed", weight: 8,
    earned: scaled(services.length, 5, 8),
    status: services.length === 0 ? "fail" : services.length < 5 ? "warn" : "pass",
    detail: services.length === 0 ? "No services defined." : `${services.length} service(s) defined.`,
    fix: services.length >= 5 ? undefined
      : "Add services. This is where specialties that have no Google category live — braiding, weaves, natural hair, silk press.",
  });

  const periods: any[] = loc.regularHours?.periods || [];
  const daysCovered = new Set(periods.map((p) => p.openDay)).size;
  add({
    id: "hours", area: "Foundation", label: "Regular hours", weight: 6,
    earned: scaled(daysCovered, 7, 6),
    status: daysCovered === 0 ? "fail" : daysCovered < 5 ? "warn" : "pass",
    detail: daysCovered === 0 ? "No hours set." : `${daysCovered} day(s) of the week have hours.`,
    fix: daysCovered >= 5 ? undefined : "Set hours for every trading day — incomplete hours suppress the listing in 'open now' searches.",
  });

  const website = loc.websiteUri || null;
  add({
    id: "website", area: "Foundation", label: "Website link", weight: 4,
    earned: website ? 4 : 0, status: website ? "pass" : "fail",
    detail: website ? String(website) : "No website URL.",
    fix: website ? undefined : "Add a website URL — without one the listing can't send traffic anywhere.",
  });

  const phone = loc.phoneNumbers?.primaryPhone || null;
  add({
    id: "phone", area: "Foundation", label: "Primary phone", weight: 4,
    earned: phone ? 4 : 0, status: phone ? "pass" : "fail",
    detail: phone ? String(phone) : "No primary phone number.",
    fix: phone ? undefined : "Add a primary phone — call clicks are the main conversion for this category.",
  });

  // ── Discovery: what widens the set of searches you can appear in ──────────

  const addl: any[] = loc.categories?.additionalCategories || [];
  add({
    id: "additional-categories", area: "Discovery", label: "Additional categories", weight: 8,
    earned: scaled(addl.length, 3, 8),
    status: addl.length === 0 ? "fail" : addl.length < 3 ? "warn" : "pass",
    detail: `${addl.length} of 9 additional categories used${addl.length ? `: ${addl.map((c: any) => c.displayName).join(", ")}` : ""}.`,
    fix: addl.length >= 3 ? undefined
      : "Add relevant secondary categories from Google's taxonomy — e.g. Loctician service, Hair extension technician, Wig shop. Only ones that genuinely apply.",
  });

  const setCount = input.attributesSet.length;
  const availCount = input.attributesAvailable.length;
  // Half the available set is a deliberately soft target: many attributes won't
  // apply to a given business, and claiming ones that don't is its own problem.
  const attrTarget = Math.max(1, Math.round(availCount * 0.5));
  add({
    id: "attributes", area: "Discovery", label: "Attributes (amenities, accessibility, identity)", weight: 12,
    earned: scaled(setCount, attrTarget, 12),
    status: setCount === 0 ? "fail" : setCount < attrTarget ? "warn" : "pass",
    detail: `${setCount} of ${availCount} available attributes are set.`,
    fix: setCount >= attrTarget ? undefined
      : "Fill the applicable attributes. Identity attributes (Black-owned, Latino-owned, LGBTQ+ friendly) and accessibility are live filters on Maps — an unset attribute makes the business invisible to anyone filtering on it.",
  });

  const special = loc.specialHours?.specialHourPeriods || [];
  add({
    id: "special-hours", area: "Discovery", label: "Holiday / special hours", weight: 4,
    earned: special.length ? 4 : 0,
    status: special.length ? "pass" : "warn",
    detail: special.length ? `${special.length} special period(s) set.` : "None set.",
    fix: special.length ? undefined : "Set holiday hours ahead of closures — wrong hours generate one-star reviews and Google flags listings users report as inaccurate.",
  });

  add({
    id: "place-actions", area: "Discovery", label: "Booking / action links", weight: 6,
    earned: input.placeActions.length ? 6 : 0,
    status: input.placeActions.length ? "pass" : "warn",
    detail: input.placeActions.length ? `${input.placeActions.length} action link(s).` : "No booking or action links.",
    fix: input.placeActions.length ? undefined : "Add an appointment link so people can book from the listing without a second click.",
  });

  // ── Engagement: freshness and responsiveness ──────────────────────────────

  add({
    id: "photos", area: "Engagement", label: "Photos", weight: 8,
    earned: scaled(input.photos.count, 10, 8),
    status: input.photos.count === 0 ? "fail" : input.photos.count < 10 ? "warn" : "pass",
    detail: `${input.photos.count} photo(s) on the profile.`,
    fix: input.photos.count >= 10 ? undefined
      : "Add at least 10 real photos — exterior, interior, and finished work. This is the highest-effort item and the one clients must supply.",
  });

  const now = input.now ? input.now.getTime() : Date.now();
  const latest = input.posts.latestIso ? new Date(input.posts.latestIso).getTime() : null;
  const daysSincePost = latest ? Math.floor((now - latest) / 86_400_000) : null;
  add({
    id: "posts", area: "Engagement", label: "Recent posts", weight: 6,
    earned: daysSincePost !== null && daysSincePost <= 30 ? 6 : 0,
    status: input.posts.count === 0 ? "fail" : daysSincePost !== null && daysSincePost <= 30 ? "pass" : "warn",
    detail: input.posts.count === 0
      ? "No posts published."
      : `${input.posts.count} post(s); most recent ${daysSincePost} day(s) ago.`,
    fix: daysSincePost !== null && daysSincePost <= 30 ? undefined
      : "Post at least monthly — offers, new services, before/afters.",
  });

  const { total, sampled, unanswered, average } = input.reviews;
  const replyRate = sampled > 0 ? (sampled - unanswered) / sampled : 1;
  add({
    id: "review-replies", area: "Engagement", label: "Review replies", weight: 6,
    earned: scaled(replyRate, 1, 6),
    status: sampled === 0 ? "info" : replyRate === 0 ? "fail" : replyRate < 0.8 ? "warn" : "pass",
    detail: sampled === 0
      ? `${total} review(s); none sampled.`
      : `${total} review(s), ${average ?? "?"} average. ${unanswered} of the ${sampled} most recent have no reply.`,
    fix: replyRate >= 0.8 ? undefined
      : "Reply to every review. Unanswered five-star reviews are wasted goodwill, and replies are visible to everyone comparing shops.",
  });

  // ── Trust: whether the listing is healthy enough to rank at all ───────────

  const openStatus = loc.openInfo?.status || null;
  const openOk = !openStatus || openStatus === "OPEN";
  add({
    id: "open-status", area: "Trust", label: "Open status", weight: 5,
    earned: openOk ? 5 : 0, status: openOk ? "pass" : "fail",
    detail: openStatus ? `Status is ${openStatus}.` : "Status not reported.",
    fix: openOk ? undefined : "Listing is not marked OPEN. Temporarily-closed listings are heavily suppressed — fix this before anything else.",
  });

  const vom = input.verification?.hasVoiceOfMerchant;
  add({
    id: "voice-of-merchant", area: "Trust", label: "Verification standing", weight: 6,
    earned: vom ? 6 : 0,
    status: vom === undefined ? "info" : vom ? "pass" : "fail",
    detail: vom === undefined ? "Verification state unavailable."
      : vom ? "Verified — the profile has full standing with Google."
      : "Not in good standing. Google limits what an unverified profile can do.",
    fix: vom === false ? "Complete verification before investing in optimisation — an unverified profile's edits may not take effect." : undefined,
  });

  const diff = input.googleUpdated.diffMask;
  const diffFields = diff ? diff.split(",").filter(Boolean) : [];
  add({
    id: "google-drift", area: "Trust", label: "Agreement with Google's own data", weight: 4,
    earned: diffFields.length === 0 ? 4 : 0,
    status: diffFields.length === 0 ? "pass" : "warn",
    detail: diffFields.length === 0
      ? "Google's record matches the profile."
      : `Google's record differs on ${diffFields.length} field(s): ${diffFields.join(", ")}.`,
    fix: diffFields.length === 0 ? undefined
      : "Review Google's version of these fields. Divergence usually means user-suggested edits or Google's own crawl overriding what the owner set.",
  });

  // ── Score ─────────────────────────────────────────────────────────────────

  const areas = {} as Record<AuditArea, { earned: number; possible: number }>;
  for (const c of checks) {
    areas[c.area] ||= { earned: 0, possible: 0 };
    areas[c.area].earned += c.earned;
    areas[c.area].possible += c.weight;
  }

  const possible = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + c.earned, 0);
  const score = Math.round((earned / possible) * 100);

  const priorities = checks
    .filter((c) => c.status === "fail" || c.status === "warn")
    .sort((a, b) => (b.weight - b.earned) - (a.weight - a.earned));

  return { score, grade: grade(score), checks, priorities, areas };
}

/**
 * Words that appear in business names but carry no brand signal in this trade.
 *
 * Without this list the split is worthless for exactly the businesses we serve:
 * "Unique Image Barber Salon" would treat "barber shops near me" as branded
 * because the name contains "barber", turning the single most valuable discovery
 * query into evidence of brand awareness. Anything generic to the industry or to
 * company names is stripped before matching.
 */
const GENERIC_NAME_WORDS = new Set([
  "barber", "barbers", "barbershop", "salon", "salons", "shop", "shops", "hair",
  "beauty", "studio", "studios", "spa", "nail", "nails", "cuts", "cut", "style",
  "styles", "styling", "lounge", "parlor", "parlour", "boutique", "suite", "suites",
  "agency", "company", "group", "center", "centre", "house", "the", "and", "for",
  "llc", "inc", "co", "ltd",
]);

/**
 * Branded queries are ones containing a distinctive part of the business name.
 * Separating them matters because branded traffic isn't evidence that SEO is
 * working — someone searching your name already knew you existed.
 *
 * A business whose name is entirely generic ("The Barber Shop") has no
 * distinctive tokens left, so everything counts as discovery. That's the honest
 * answer: for that name the two genuinely can't be told apart.
 */
export function splitKeywords(keywords: SearchKeyword[], businessTitle: string) {
  const words = businessTitle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !GENERIC_NAME_WORDS.has(w));
  const isBranded = (k: string) => words.some((w) => k.toLowerCase().includes(w));
  const branded = keywords.filter((k) => isBranded(k.keyword));
  const discovery = keywords.filter((k) => !isBranded(k.keyword));
  const impressions = (k: SearchKeyword) => k.value ?? 0;
  return {
    branded,
    discovery,
    brandedImpressions: branded.reduce((s, k) => s + impressions(k), 0),
    discoveryImpressions: discovery.reduce((s, k) => s + impressions(k), 0),
  };
}
