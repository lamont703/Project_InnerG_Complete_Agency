"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Directive {
  id: string;
  agent_name: string;
  mission: string;
  directive_text: string;
  evidence: Record<string, any>;
  status: "pending" | "approved" | "denied" | "resolved";
  created_at: string;
  first_seen_at: string | null;
  times_recurred: number;
  deny_reason: string | null;
}

export async function fetchDirectives(): Promise<Directive[]> {
  const { data, error } = await supabase
    .from("agent_directives")
    .select("id, agent_name, mission, directive_text, evidence, status, created_at, first_seen_at, times_recurred, deny_reason")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("fetchDirectives error:", error);
    return [];
  }

  return data || [];
}
