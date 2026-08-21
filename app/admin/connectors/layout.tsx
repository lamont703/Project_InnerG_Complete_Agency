import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-allowlist";

/**
 * This page was reachable by anyone — it returned 200 in production to a plain
 * curl with no session.
 *
 * The controls on it were never the exposure: /api/instagram/connect and every
 * sibling callback check the allowlist server-side, so a stranger could look
 * but could not connect an account over ours. What they could see was the
 * shape of our integrations, and now the connected account panel as well —
 * its handle, its token expiry, and which permissions are granted. A page that
 * says when an integration is about to lapse is a page worth a session check.
 *
 * notFound() rather than a redirect: an admin surface should not confirm it
 * exists to someone who cannot use it.
 */
export default async function ConnectorsLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) notFound();
  } catch {
    /*
     * Fails CLOSED, unlike middleware.ts which fails open on an auth
     * exception. This is the only gate on this route, so an exception here
     * must not become access.
     */
    notFound();
  }
  return <>{children}</>;
}
