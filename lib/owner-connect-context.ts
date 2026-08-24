import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLAIM_ENTITY_TYPES, entityPath } from "@/lib/entity-claim";

/**
 * What the assistant knows about an owner's listing and their Google connection.
 *
 * WHY THIS EXISTS. Asked whether it could connect a shop owner's Google
 * Business Profile, the assistant said it could not — and it was not being
 * modest. Its entire instruction for owners is one sentence about hiring, booth
 * rent and their local market. The capability has shipped for months
 * (/api/google-business/start, and ten tools under /account/gbp-*), and the
 * benefit is described on /membership, but none of that ever reached the model.
 * A feature nobody is told about is indistinguishable from one that does not
 * exist: exactly one owner has ever connected, and it was our own account.
 *
 * IT ANSWERS THREE QUESTIONS, because the right next sentence depends on all
 * three: does this person have a listing on the site, is Google already
 * connected, and where do they go next. Without them the assistant can only
 * offer a generic "you can connect Google" — which is the kind of vague pitch
 * that makes people ignore an assistant.
 *
 * THE CEILING IS ONE CLICK, NOT ZERO, and the brief says so plainly. Google
 * requires the owner to authenticate on Google's own domain and approve the
 * consent screen; no assistant can do that step for them. Promising otherwise
 * would be the same failure as the booking rule in lib/agent-policy.ts — an
 * agent implying a capability that does not exist. What it CAN do is know which
 * listing is theirs and hand them a link that starts the flow.
 *
 * NOTHING IN HERE IS A PROMISE ABOUT FUTURE WORK. Every item in `unlocked` is a
 * page that exists today. The same discipline lib/audiences.ts keeps for its
 * benefit copy, for the same reason: the assistant repeats this to a customer.
 */

export interface OwnerConnectContext {
  /**
   * False for a visitor who is not signed in. They can still do all of this —
   * it just starts a step earlier, and the assistant has to say so rather than
   * talking as if an account already exists.
   */
  signed_in: boolean;
  /** Where a signed-out visitor creates an account. */
  signup_url: string;
  /** Where an existing user signs back in. */
  login_url: string;
  /** The listing this member has claimed, if any. */
  claimed_listing: { name: string; entity_type: string; profile_url: string | null } | null;
  google_connected: boolean;
  /** Which Google account is connected — so they are not told to connect twice. */
  google_account_email: string | null;
  /** "locations/{id}" of the profile they picked, when one is selected. */
  connected_location: string | null;
  /** Starts the OAuth flow. Redirects to login first if they are signed out. */
  connect_url: string;
  /** Where to claim a listing when they have not yet. */
  claim_url: string;
  /** Pages that already exist and open up once Google is connected. */
  unlocked: { label: string; url: string }[];
}

/** Only pages that ship today. See the note above about promises. */
const UNLOCKED: { label: string; url: string }[] = [
  { label: "Profile audit", url: "/account/gbp-audit" },
  { label: "Post scheduling", url: "/account/gbp-posts" },
  { label: "Review replies", url: "/account/gbp-reviews" },
  { label: "Hours and categories", url: "/account/gbp-hours" },
  { label: "Photos", url: "/account/gbp-photos" },
];

const ANON: OwnerConnectContext = {
  signed_in: false,
  signup_url: "/membership",
  login_url: "/login",
  claimed_listing: null,
  google_connected: false,
  google_account_email: null,
  connected_location: null,
  connect_url: "/api/google-business/start",
  claim_url: "/account/add-business",
  unlocked: [],
};

/**
 * BUILT FOR SIGNED-OUT VISITORS TOO, and that is not a detail.
 *
 * This returned null without a member, which left an anonymous visitor asking
 * "can we connect to Google Business Profile" with no context AND no audience
 * brief — the brief is keyed on member.audience, which nobody has before they
 * sign up. The assistant answered "yes, we offer that" from general knowledge
 * and then, having no URL, linked the nearest thing in context that had one:
 * an unrelated Shop Site AI Customizer. Withholding the facts did not make it
 * cautious, it made it improvise.
 *
 * A signed-out person is the MOST important case here — they are the shop owner
 * who has not signed up yet, which is the entire point of the feature.
 */
export async function ownerConnectContext(
  memberId: string | null | undefined
): Promise<OwnerConnectContext> {
  if (!memberId) return ANON;

  const db = createAdminClient();

  const [linkRes, gbpRes] = await Promise.all([
    (db.from("community_member_entity_links") as any)
      .select("entity_type, entity_id")
      .eq("community_member_id", memberId)
      .limit(1),
    (db.from("gbp_connections") as any)
      .select("status, google_account_email, selected_location, refresh_token")
      .eq("community_member_id", memberId)
      .maybeSingle(),
  ]);

  const link = linkRes?.data?.[0] ?? null;

  /*
   * The entity's name and slug live in a different table per type, so the type
   * decides which one to read. Resolved here rather than left as an id because
   * "your listing" is only useful to say out loud if it can be named — and the
   * profile_url is what makes it a link the LINKING RULE can render.
   */
  let claimed: OwnerConnectContext["claimed_listing"] = null;
  if (link) {
    const cfg = CLAIM_ENTITY_TYPES.find((c) => c.key === link.entity_type);
    if (cfg) {
      const { data: row } = await (db.from(cfg.table) as any)
        .select(`${cfg.nameCol}, slug`)
        .eq("id", link.entity_id)
        .maybeSingle();
      if (row) {
        claimed = {
          name: row[cfg.nameCol],
          entity_type: link.entity_type,
          profile_url: entityPath(link.entity_type, row.slug),
        };
      }
    }
  }

  /*
   * USABLE IS "NOT REVOKED", NOT "EQUALS CONNECTED".
   *
   * The status column carries at least five values across the flow — pending,
   * connected, pending_review, linked and revoked — and the live row uses
   * 'linked'. Testing for equality with 'connected' therefore reports a
   * genuinely connected owner as disconnected, and the assistant would tell
   * someone to connect an account they had already connected.
   *
   * This is the test the rest of the app already applies: both
   * api/google-business/performance and api/google-business/sync reject on
   * status === 'revoked' and accept everything else, alongside the presence of
   * a refresh token. Matching them means one definition of usable rather than a
   * sixth opinion.
   */
  const conn = gbpRes?.data ?? null;
  const connected = Boolean(conn?.refresh_token) && conn?.status !== "revoked";

  return {
    signed_in: true,
    signup_url: "/membership",
    login_url: "/login",
    claimed_listing: claimed,
    google_connected: connected,
    google_account_email: connected ? conn?.google_account_email ?? null : null,
    connected_location: connected ? conn?.selected_location ?? null : null,
    connect_url: "/api/google-business/start",
    // Claiming starts from the listing's own page when we know which it is;
    // otherwise they need to find or add it first.
    claim_url: claimed?.profile_url ?? "/account/add-business",
    unlocked: UNLOCKED,
  };
}
