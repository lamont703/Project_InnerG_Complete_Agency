import { describe, it, expect } from "vitest";
import { gbpEntityType, gbpStageBlocker, stageGbpLocation, type GbpLocation } from "@/lib/google-business";

// Fixtures are the REAL six locations returned by the live Business Information
// API for the connected test account (2026-07-28), not invented shapes. They're
// what taught us the three cases Door 2 has to handle: a generic primary
// category with the useful one listed second, service-area businesses with no
// storefrontAddress at all, and an unrelated non-beauty business sitting in the
// same Google account.
const loc = (over: Partial<GbpLocation>): GbpLocation => ({
  account: "accounts/1",
  name: "locations/1",
  title: "Test Business",
  address: "1 Main St, Houston, TX 77001",
  phone: "(713) 555-0100",
  website: null,
  placeId: "ChIJtest",
  mapsUri: null,
  city: "Houston",
  lat: null,
  lng: null,
  categoryIds: ["barber_shop"],
  categoryLabel: "Barber shop",
  ...over,
});

const SALON_SUITES = loc({
  name: "locations/salon-suites",
  title: "Salon Suites For The Culture",
  address: "664 11th St NW, Atlanta, GA, 30318",
  city: "Atlanta",
  phone: "(678) 661-1446",
  categoryIds: ["beauty_salon"],
  categoryLabel: "Beauty salon",
});

const SUCCESSFUL_BARBER = loc({
  name: "locations/successful-barber",
  title: "The Successful Barber Organization",
  address: null,
  city: null,
  phone: "(614) 732-6661",
  categoryIds: ["association_or_organization", "barber_shop"],
  categoryLabel: "Association / Organization",
});

const GA_RESTORATIONS = loc({
  name: "locations/ga-restorations",
  title: "GA Restorations LLC",
  address: null,
  city: null,
  placeId: null,
  categoryIds: ["water_damage_restoration_service"],
  categoryLabel: "Water damage restoration service",
});

const UNIQUE_IMAGE = loc({
  name: "locations/unique-image",
  title: "Unique Image Barber Salon",
  address: "2410 Home Acre Drive, Columbus, OH, 43231-1647",
  city: "Columbus",
  phone: "(614) 368-6069",
  lat: 40.0986323,
  lng: -82.9494948,
  categoryIds: ["barber_shop", "hair_salon", "barber_school", "barber_supply_store"],
  categoryLabel: "Barber shop",
});

describe("gbpEntityType", () => {
  it("maps the primary category to our table", () => {
    expect(gbpEntityType(SALON_SUITES)).toBe("salon");
    expect(gbpEntityType(UNIQUE_IMAGE)).toBe("shop");
  });

  it("falls back to an additional category when the primary isn't ours", () => {
    // Real listing filed under "Association / Organization" with "Barber shop"
    // second — dropping it would lose a legitimate owner's business.
    expect(gbpEntityType(SUCCESSFUL_BARBER)).toBe("shop");
  });

  it("returns null for a business that isn't ours at all", () => {
    expect(gbpEntityType(GA_RESTORATIONS)).toBeNull();
  });
});

describe("gbpStageBlocker", () => {
  it("passes a complete beauty business", () => {
    expect(gbpStageBlocker(SALON_SUITES)).toBeNull();
    expect(gbpStageBlocker(UNIQUE_IMAGE)).toBeNull();
  });

  it("blocks a non-beauty business", () => {
    expect(gbpStageBlocker(GA_RESTORATIONS)).toMatch(/not a barbering or beauty business/);
  });

  it("blocks a service-area business with no storefront address", () => {
    // Would otherwise stage a candidate that fails the publish gate's
    // city/formatted_address requirement much later.
    expect(gbpStageBlocker(SUCCESSFUL_BARBER)).toMatch(/no storefront address/);
  });

  it("blocks a listing with no phone", () => {
    expect(gbpStageBlocker(loc({ phone: null }))).toMatch(/no phone/);
  });
});

// Minimal stand-in for the Supabase admin client: enough of the chain for the
// duplicate lookup, the existing-directive check, and the insert.
function fakeAdmin({
  existingDirective = false,
  existingEvidence = {} as any,
  duplicates = [] as any[],
} = {}) {
  const inserted: any[] = [];
  const keysQueried: string[] = [];
  const api: any = {
    from(table: string) {
      const chain: any = {
        _table: table,
        select: () => chain,
        eq: (_col: string, val: any) => {
          if (table === "agent_directives") keysQueried.push(String(val));
          return chain;
        },
        ilike: () => chain,
        limit: async () => ({ data: table === "agent_directives" ? [] : duplicates }),
        maybeSingle: async () => {
          if (table !== "agent_directives" || !existingDirective) return { data: null };
          // Only the FIRST lookup (the base key) hits; a second lookup means we
          // moved on to a place_id-suffixed key, which is by definition new.
          return keysQueried.length > 1 ? { data: null } : { data: { id: "existing", evidence: existingEvidence } };
        },
        insert: async (row: any) => {
          inserted.push(row);
          return { error: null };
        },
      };
      return chain;
    },
    inserted,
    keysQueried,
  };
  return api;
}

describe("stageGbpLocation", () => {
  it("stages an unmatched business with everything publish requires", async () => {
    const admin = fakeAdmin();
    const res = await stageGbpLocation(admin, "member-1", UNIQUE_IMAGE);

    expect(res.outcome).toBe("staged");
    expect(res.entityType).toBe("shop");

    const row = admin.inserted[0];
    expect(row.status).toBe("pending");
    expect(row.agent_name).toBe("Website Business Discovery Agent");
    // Same subject_key shape Door 3 writes, so the two doors can't both stage
    // the same business.
    expect(row.subject_key).toBe("new_business::agent_barbershop_leads::unique image barber salon::columbus");

    // Every field the publish gate requires must be non-empty, or this candidate
    // dies at approval time.
    for (const f of ["city", "name", "phone", "formatted_address", "category"]) {
      expect(row.evidence[f], `evidence.${f}`).toBeTruthy();
    }
    expect(row.evidence.owner_source).toBe(true);      // exempts the 5-photo gate
    expect(row.evidence.owner_member_id).toBe("member-1"); // drives auto-link on approval
    expect(row.evidence.gbp_source).toBe(true);
    expect(row.evidence.place_id).toBe("ChIJtest");     // real place_id → future connects match exactly
    expect(row.evidence.latitude).toBe(40.0986323);
  });

  it("does not stage twice for the same business", async () => {
    // Same place_id as the already-staged directive → same storefront.
    const admin = fakeAdmin({ existingDirective: true, existingEvidence: { place_id: "ChIJtest" } });
    const res = await stageGbpLocation(admin, "member-1", UNIQUE_IMAGE);
    expect(res.outcome).toBe("already_staged");
    expect(admin.inserted).toHaveLength(0);
  });

  it("treats a same-name, same-city listing with a different place_id as a second storefront", async () => {
    // Multi-location owners are exactly who connects Google; name+city alone
    // would silently drop their second shop.
    const admin = fakeAdmin({ existingDirective: true, existingEvidence: { place_id: "ChIJ_other_branch" } });
    const res = await stageGbpLocation(admin, "member-1", UNIQUE_IMAGE);
    expect(res.outcome).toBe("staged");
    expect(admin.inserted[0].subject_key).toBe(
      "new_business::agent_barbershop_leads::unique image barber salon::columbus::ChIJtest"
    );
  });

  it("assumes duplicate when the existing directive has no place_id to compare", async () => {
    // e.g. the owner already typed this business into the Door 3 form. A missing
    // second location is recoverable by hand; a duplicate live listing isn't.
    const admin = fakeAdmin({ existingDirective: true, existingEvidence: {} });
    const res = await stageGbpLocation(admin, "member-1", UNIQUE_IMAGE);
    expect(res.outcome).toBe("already_staged");
    expect(admin.inserted).toHaveLength(0);
  });

  it("records a possible-duplicate hint without blocking the stage", async () => {
    const admin = fakeAdmin({
      duplicates: [{ slug: "unique-image-columbus-abc", city: "Columbus", shop_name: "Unique Image Barber Salon" }],
    });
    const res = await stageGbpLocation(admin, "member-1", UNIQUE_IMAGE);
    expect(res.outcome).toBe("staged");
    const row = admin.inserted[0];
    expect(row.evidence.possible_duplicates.length).toBeGreaterThan(0);
    expect(row.directive_text).toMatch(/Possible existing match/);
  });

  it("skips rather than stages what it can't publish", async () => {
    const admin = fakeAdmin();
    expect((await stageGbpLocation(admin, "m", GA_RESTORATIONS)).outcome).toBe("skipped");
    expect((await stageGbpLocation(admin, "m", SUCCESSFUL_BARBER)).outcome).toBe("skipped");
    expect(admin.inserted).toHaveLength(0);
  });
});
