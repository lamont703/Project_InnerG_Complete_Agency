import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-allowlist";

/**
 * "View As" — admin visibility into what a given community member sees.
 *
 * This is NOT session impersonation. No token is minted, no session is swapped,
 * and the admin's own Supabase session stays exactly as it was. All that happens
 * is that the handful of server-side resolvers which answer "which member is
 * this request about?" answer with the selected member instead of the admin's
 * own, for the lifetime of a short cookie.
 *
 * Three properties make that safe, and all three matter:
 *
 *  1. The cookie is never trusted on its own. Every read re-verifies that the
 *     *real* Supabase session belongs to an admin (getViewAsContext below). A
 *     forged, copied or stale sq_view_as cookie sitting on any other account is
 *     completely inert — it can't be used to read someone else's listing,
 *     because the account holding it fails the admin check. Without this
 *     property the cookie would be a one-line account-takeover.
 *
 *  2. It is read-only. Mutating handlers call assertNotImpersonating() and
 *     refuse with a 403 while View As is active. The point of the feature is to
 *     *see* what a member sees; editing their listing while wearing their face
 *     is a different, far riskier feature, and one an admin would trip over by
 *     accident — you look at a form, fix a typo, and have silently rewritten
 *     someone's business record with no audit trail.
 *
 *  3. It expires on its own (VIEW_AS_MAX_AGE) and is a session cookie besides,
 *     so a forgotten View As doesn't persist indefinitely. "Temporarily" is
 *     enforced, not just intended.
 */

export const VIEW_AS_COOKIE = "sq_view_as";

/** Short on purpose — see property 3 above. */
export const VIEW_AS_MAX_AGE = 60 * 60 * 4;

export interface ViewAsMember {
  memberId: string;
  /** Supabase auth user id, if this member ever signed in. Null for records
   *  created by import/claim flows that never got an auth account. */
  userId: string | null;
  name: string;
  email: string | null;
}

export interface ViewAsContext {
  /** Email on the real session — the admin, never the impersonated member. */
  realEmail: string | null;
  isAdmin: boolean;
  viewingAs: ViewAsMember | null;
}

const MEMBER_COLUMNS = "id, user_id, first_name, last_name, email";

function memberName(row: any): string {
  const full = [row?.first_name, row?.last_name].filter(Boolean).join(" ").trim();
  return full || row?.email || "Unnamed member";
}

function toViewAsMember(row: any): ViewAsMember {
  return {
    memberId: row.id,
    userId: row.user_id ?? null,
    name: memberName(row),
    email: row.email ?? null,
  };
}

/**
 * The authoritative answer to "is this request impersonating, and as whom?".
 *
 * Everything else in this module — and every consumer — goes through here, so
 * the admin re-check in property 1 can't be forgotten at a call site.
 */
export async function getViewAsContext(): Promise<ViewAsContext> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const realEmail = user?.email ?? null;
  const isAdmin = isAdminEmail(realEmail);

  if (!isAdmin) return { realEmail, isAdmin: false, viewingAs: null };

  const jar = await cookies();
  const memberId = jar.get(VIEW_AS_COOKIE)?.value;
  if (!memberId) return { realEmail, isAdmin, viewingAs: null };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("community_members")
    .select(MEMBER_COLUMNS)
    .eq("id", memberId)
    .maybeSingle();

  // Member deleted while a cookie was still out: treat as not impersonating
  // rather than erroring, so the admin sees their own account again.
  if (!row) return { realEmail, isAdmin, viewingAs: null };

  return { realEmail, isAdmin, viewingAs: toViewAsMember(row) };
}

export type MemberContext =
  | { error: string; status: number }
  | {
      memberId: string;
      /** Auth user id to attribute this request to — the impersonated member's
       *  when viewing as someone, otherwise the real session's. */
      userId: string | null;
      impersonating: boolean;
      viewingAs: ViewAsMember | null;
    };

/**
 * "Which community member is this request about?" — the single seam through
 * which View As reaches the account surfaces.
 *
 * Callers that only read may use the returned memberId directly. Callers that
 * write must pass the result through assertNotImpersonating() first.
 */
export async function resolveMemberContext(): Promise<MemberContext> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", status: 401 };

  const isAdmin = isAdminEmail(user.email);

  if (isAdmin) {
    const jar = await cookies();
    const memberId = jar.get(VIEW_AS_COOKIE)?.value;
    if (memberId) {
      const admin = createAdminClient();
      const { data: row } = await admin
        .from("community_members")
        .select(MEMBER_COLUMNS)
        .eq("id", memberId)
        .maybeSingle();
      if (row) {
        const viewingAs = toViewAsMember(row);
        return {
          memberId: viewingAs.memberId,
          userId: viewingAs.userId,
          impersonating: true,
          viewingAs,
        };
      }
    }
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from("community_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { error: "No community membership found for this account.", status: 404 };

  return {
    memberId: (member as any).id,
    userId: user.id,
    impersonating: false,
    viewingAs: null,
  };
}

/**
 * Write guard — property 2. Returns an error payload to hand straight back to
 * the client when the request is in View As mode, or null when the write may
 * proceed.
 *
 * Duck-typed rather than tied to MemberContext so it also accepts the results of
 * resolveOwnedEntity / resolveOwnedProfessional / resolveOwnedListing, which
 * carry the same two fields. Every mutating handler on an account surface must
 * call this; a handler that forgets it is the one way this feature could edit
 * someone else's record.
 */
export function assertNotImpersonating(
  ctx: { impersonating?: boolean; viewingAs?: ViewAsMember | null }
): { error: string; status: number } | null {
  if (!ctx.impersonating) return null;
  return {
    error: `View As is read-only. Exit View As (currently ${ctx.viewingAs?.name ?? "another member"}) before making changes.`,
    status: 403,
  };
}

/** Members an admin may view as, with whatever each has claimed. Admin-only —
 *  the caller is responsible for having verified that. */
export async function listViewAsMembers(): Promise<
  Array<ViewAsMember & { claimedType: string | null }>
> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("community_members")
    .select(`${MEMBER_COLUMNS}, created_at`)
    .order("created_at", { ascending: false })
    .limit(200);

  const members = (rows || []).map(toViewAsMember);
  if (!members.length) return [];

  const { data: links } = await (admin.from("community_member_entity_links") as any)
    .select("community_member_id, entity_type")
    .in("community_member_id", members.map((m) => m.memberId));

  const claimByMember = new Map<string, string>();
  for (const link of links || []) {
    if (!claimByMember.has(link.community_member_id)) {
      claimByMember.set(link.community_member_id, link.entity_type);
    }
  }

  return members.map((m) => ({ ...m, claimedType: claimByMember.get(m.memberId) ?? null }));
}

/**
 * The projects the given user can actually see.
 *
 * The navbar gets this for free: its query runs on the browser client under the
 * user's own session, so the projects RLS policies (migration 012) scope the
 * result. We can't do that here — the admin's session can't read another user's
 * rows, so this has to run on the service-role client, which bypasses RLS
 * entirely. A plain `select *` would therefore hand back EVERY project in the
 * database and show the impersonated member a menu far larger than their own.
 *
 * So the three policies are reimplemented here by hand:
 *   • super_admin              → all projects
 *   • developer                → projects whose client is in developer_client_access
 *   • client_admin/viewer      → projects in project_user_access
 *   • anything else (community
 *     members, no role)        → none
 *
 * If those policies ever change, this function has to change with them.
 */
async function visibleProjects(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  role: string
): Promise<Array<{ slug: string; name: string | null }>> {
  const select = () => (admin.from("projects") as any).select("slug, name, status");

  let rows: any[] | null = null;

  if (role === "super_admin") {
    ({ data: rows } = await select());
  } else if (role === "developer") {
    const { data: access } = await (admin.from("developer_client_access") as any)
      .select("client_id")
      .eq("developer_id", userId);
    const clientIds = (access || []).map((a: any) => a.client_id).filter(Boolean);
    if (!clientIds.length) return [];
    ({ data: rows } = await select().in("client_id", clientIds));
  } else if (role === "client_admin" || role === "client_viewer") {
    const { data: access } = await (admin.from("project_user_access") as any)
      .select("project_id")
      .eq("user_id", userId);
    const projectIds = (access || []).map((a: any) => a.project_id).filter(Boolean);
    if (!projectIds.length) return [];
    ({ data: rows } = await select().in("id", projectIds));
  } else {
    // Community members have no project access at all, which is why their
    // dropdown is just their name and Log Out.
    return [];
  }

  // The navbar hides archived projects from everyone except super_admin and
  // developer; mirror that here rather than in the caller.
  const keepArchived = role === "super_admin" || role === "developer";
  return (rows || []).filter((p) => keepArchived || p.status !== "archived");
}

/**
 * The account menu the viewed-as member would see: their display name and their
 * project dashboards. Mirrors components/layout/navbar.tsx, so what the admin
 * sees under View As is what that member actually gets.
 */
export async function effectiveAccountMenu(member: ViewAsMember): Promise<{
  label: string;
  projects: Array<{ slug: string; name: string; href: string }>;
}> {
  if (!member.userId) return { label: member.name, projects: [] };

  const admin = createAdminClient();
  const { data: profile } = await (admin.from("users") as any)
    .select("full_name, role")
    .eq("id", member.userId)
    .maybeSingle();

  const projects = await visibleProjects(admin, member.userId, profile?.role || "");

  return {
    label: profile?.full_name || member.email || member.name,
    projects: projects.map((p) => ({
      slug: p.slug,
      name: p.name || p.slug,
      href: `/dashboard/${p.slug}`,
    })),
  };
}
