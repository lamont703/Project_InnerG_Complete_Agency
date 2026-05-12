import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const redirectUrl = searchParams.get("redirect") || "/dashboard/agency-global";
    
    const supabase = await createServerClient();

    try {
        // 1. Fetch User Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.redirect(new URL("/login", request.url));

        const { data: profile } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle() as any;

        const role = profile?.role || "";

        // 2. Logic: Super Admins & Developers go to Agency Global
        if (role === 'super_admin' || role === 'developer') {
            console.log(`[AuthProvision] Admin/Dev detected. Redirecting to Agency Global.`);
            return NextResponse.redirect(new URL("/dashboard/agency-global", request.url));
        }

        // 3. Logic: Check Project Associations
        const { data: projects } = await supabase
            .from("projects")
            .select("slug")
            .neq("status", "archived") as any;

        // 4. Determine Destination
        if (projects && projects.length === 1) {
            console.log(`[AuthProvision] Single architecture found. Redirecting to: ${projects[0].slug}`);
            return NextResponse.redirect(new URL(`/dashboard/${projects[0].slug}`, request.url));
        } else if (projects && projects.length > 1) {
            console.log(`[AuthProvision] Multiple architectures found. Falling back to Selector.`);
            return NextResponse.redirect(new URL("/select-portal", request.url));
        }

        // 5. Default Fallback
        return NextResponse.redirect(new URL("/dashboard/agency-global", request.url));

    } catch (error) {
        console.error("[AuthProvision] Orchestration Error:", error);
        return NextResponse.redirect(new URL("/select-portal", request.url));
    }
}
