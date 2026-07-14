import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  const { id, status, reason } = await request.json().catch(() => ({}));

  if (!id || !["approved", "denied"].includes(status)) {
    return NextResponse.json({ error: "id and status ('approved'|'denied') are required" }, { status: 400 });
  }

  const update: Record<string, any> = { status, resolved_at: new Date().toISOString() };
  // Captured so future runs can adapt — e.g. a check that keeps getting
  // denied as "too minor" can raise its own threshold instead of repeating
  // the same low-value noise (see lib/agent-directives.ts).
  if (status === "denied" && reason) update.deny_reason = reason;

  const { error } = await supabase.from("agent_directives").update(update).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
