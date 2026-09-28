/**
 * What a gbp_change_requests row did, in words an owner reads.
 *
 * Two kinds of row share the table, and they carry different evidence:
 *
 *  - Drafted from Claude: `proposed.kind` plus `proposed.preview`, the exact
 *    before/after lines the owner approved. Those lines are the record.
 *  - Saved on the website: no kind and no preview — just the shape each
 *    /api/account/gbp-* route happened to store. The kind is derived from the
 *    surface, and the summary is built from what that route kept.
 *
 * Pure, so the website-row wording is tested without a database.
 */

export type ChangeKindName =
  | "description"
  | "regular_hours"
  | "holiday_hours"
  | "contact"
  | "categories"
  | "services"
  | "attributes"
  | "review_reply"
  | "booking_link"
  | "post"
  | "photo_add"
  | "photo_remove";

export interface ChangeRowLike {
  surface: string;
  origin?: string | null;
  proposed?: Record<string, any> | null;
}

/** Website rows predate `kind`; the surface names map one to one, except media. */
const KIND_BY_SURFACE: Record<string, ChangeKindName> = {
  description: "description",
  regularHours: "regular_hours",
  specialHours: "holiday_hours",
  contact: "contact",
  categories: "categories",
  serviceItems: "services",
  attributes: "attributes",
  reviews: "review_reply",
  placeActionLinks: "booking_link",
  localPosts: "post",
  media: "photo_add",
};

export function kindOf(row: ChangeRowLike): ChangeKindName | null {
  const k = row.proposed?.kind;
  if (typeof k === "string" && k) return k as ChangeKindName;
  if (row.surface === "media" && row.proposed?.action === "delete") return "photo_remove";
  return KIND_BY_SURFACE[row.surface] ?? null;
}

/** Booking links and photo deletions have no undo — see UNDO_NOTE in lib/gbp-changes.ts. */
export function isUndoable(kind: ChangeKindName | null): boolean {
  return !!kind && kind !== "booking_link" && kind !== "photo_remove";
}

export const KIND_TITLE: Record<ChangeKindName, string> = {
  description: "Business description",
  regular_hours: "Weekly hours",
  holiday_hours: "Holiday hours",
  contact: "Phone / website",
  categories: "Categories",
  services: "Services",
  attributes: "Attributes",
  review_reply: "Review reply",
  booking_link: "Booking link",
  post: "Google post",
  photo_add: "Photo added",
  photo_remove: "Photo removed",
};

export type ChangeSource = { via: "claude"; keyPrefix: string } | { via: "website" };

export function sourceOf(row: ChangeRowLike): ChangeSource {
  const o = String(row.origin || "");
  return o.startsWith("claude:") ? { via: "claude", keyPrefix: o.slice("claude:".length) } : { via: "website" };
}

const clip = (s: unknown, max = 220) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The lines shown under a change.
 *
 * Claude rows return their approved preview untouched: rewording what the owner
 * agreed to would make the record say something they never saw.
 */
export function describeChange(row: ChangeRowLike): string[] {
  const p = row.proposed || {};
  if (Array.isArray(p.preview) && p.preview.length) return p.preview.map((l: unknown) => String(l));

  switch (kindOf(row)) {
    case "description":
      return [`New description: "${clip(p.description, 400)}"`];
    case "holiday_hours": {
      const n = Array.isArray(p.specialHourPeriods) ? p.specialHourPeriods.length : 0;
      return [`Special hours saved — ${plural(n, "date")} on the listing afterwards.`];
    }
    case "categories": {
      const added = (p.added || []).map((c: any) => c?.displayName || c?.name).filter(Boolean);
      const removed = (p.removed || []).map((c: any) => String(c).split(":").pop()).filter(Boolean);
      return [
        added.length ? `Added: ${added.join(", ")}` : "",
        removed.length ? `Removed: ${removed.join(", ")}` : "",
      ].filter(Boolean);
    }
    case "services": {
      const n = Array.isArray(p.serviceItems) ? p.serviceItems.length : 0;
      return [`Service list saved — ${plural(n, "service")} afterwards.`];
    }
    case "attributes": {
      const list = Array.isArray(p.attributes) ? p.attributes : [];
      return list.length
        ? list.slice(0, 8).map((a: any) => `${String(a.name || "").replace(/^attributes\//, "").replace(/_/g, " ")}: ${a.values?.[0] ? "yes" : "no"}`)
        : ["Attributes saved."];
    }
    case "review_reply":
      return [`Reply: "${clip(p.comment, 400)}"`];
    case "booking_link":
      return [p.action === "delete" ? "Removed a booking link." : `${p.action === "create" ? "Added" : "Changed"} booking link: ${clip(p.uri, 200)}`];
    case "post":
      return [`Post: "${clip(p.summary, 300)}"`];
    case "photo_add":
      return [`Photo added to ${String(p.category || "the listing").toLowerCase().replace(/_/g, " ")}.`];
    default:
      return [];
  }
}
