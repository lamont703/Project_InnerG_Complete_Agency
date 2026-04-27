import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      schoolData, 
      role 
    } = body;

    const adminSupabase = createAdminClient();

    // 0. Create Auth User (Admin Level to bypass rate limits)
    console.log('[BarberRegister] Provisioning identity for:', email);
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        role: role
      }
    });

    if (authError) {
      console.error('[BarberRegister] Identity Provisioning Error:', authError);
      throw authError;
    }

    const authUser = authData.user;
    if (!authUser) throw new Error("Failed to create user identity");

    // 1. Log Registration
    const { data: registration, error: regError } = await (adminSupabase
      .from("barber_registrations") as any)
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        school_name: schoolData.name,
        school_city: schoolData.city,
        school_state: schoolData.state,
        role: role,
        status: 'deploying'
      })
      .select()
      .single();

    if (regError) throw regError;

    // 2. Perform Architecture Mapping (Deployment)
    function slugify(text: string) {
      if (!text) return "unnamed-school";
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const primaryContactName = `${firstName} ${lastName}`;
    const companyLegalName = schoolData.name;
    const dashboardDisplayName = `${firstName} ${lastName} Portal`;
    const instanceSlug = `${slugify(schoolData.name)}-${slugify(firstName)}-${slugify(lastName)}`;
    
    // Map role to Deployment Blueprint
    const deploymentBlueprint = role === 'student' ? 'barber_student' : 
                               role === 'instructor' ? 'barber_instructor' : 
                               'barber_owner';

    // 3. Create Client
    const { data: client, error: clientError } = await (adminSupabase
        .from("clients") as any)
        .insert({
            name: companyLegalName,
            industry: 'barbering',
            primary_contact_name: primaryContactName,
            primary_contact_email: email,
            status: "onboarding"
        })
        .select()
        .single();

    if (clientError) throw clientError;

    // 4. Create Project (The Architecture)
    const { data: project, error: projectError } = await (adminSupabase
        .from("projects") as any)
        .insert({
            client_id: client.id,
            name: dashboardDisplayName,
            slug: instanceSlug,
            type: deploymentBlueprint,
            status: "building"
        })
        .select()
        .single();

    if (projectError) throw projectError;

    // 5. Create Access Linkage (Atomic Handshake)
    // Lamont's ID is used as the grantor for autonomous institutional provisioning
    const LAMONT_ADMIN_ID = "24b43d1f-28a7-4067-b42a-6c3e3761cc21";
    const { error: accessError } = await (adminSupabase
        .from("project_user_access") as any)
        .insert({
            project_id: project.id,
            user_id: authUser.id,
            granted_by: LAMONT_ADMIN_ID
        });

    if (accessError) throw accessError;

    // 6. Update Registration with Project ID
    await (adminSupabase
      .from("barber_registrations") as any)
      .update({ 
        project_id: project.id,
        status: 'deployed'
      })
      .eq('id', registration.id);

    return NextResponse.json({ 
      success: true, 
      project,
      redirect: `/dashboard/${project.slug}`
    });

  } catch (error: any) {
    console.error("[BarberRegister] Orchestration Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to initialize architecture" },
      { status: 500 }
    );
  }
}
