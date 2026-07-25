import { createServerClient } from "@/lib/supabase/server";

// Defense-in-depth for the ad-campaign server actions. Middleware already gates
// /admin/ad-campaigns, but it fails OPEN on an auth exception and the actions
// use the service-role client, so each mutating action re-verifies the caller
// here rather than trusting middleware alone.
const ADMIN_EMAIL = "lamont703@gmail.com";

export async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return !!user && user.email === ADMIN_EMAIL;
  } catch {
    return false;
  }
}
