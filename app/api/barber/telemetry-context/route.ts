import { NextResponse } from "next/server";
import { getRichTelemetryContext } from "@/lib/barber-intelligence/telemetry-context";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const supabase = await createServerClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const context = await getRichTelemetryContext(session.user.id);

        if (!context) {
            return NextResponse.json({ error: "No telemetry data found" }, { status: 404 });
        }

        return NextResponse.json(context);
    } catch (error) {
        console.error("[Telemetry Context API] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
