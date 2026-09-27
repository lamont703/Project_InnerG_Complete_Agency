"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import {
  TOOL_BY_ID,
  TOOL_REGISTRY,
  clearToolAccessCache,
  getToolAccess,
  mcpAllowed,
  type ToolSurface,
} from "@/lib/tool-access";

export interface ToolRow {
  id: string;
  enabledMcp: boolean;
  enabledChat: boolean;
  stored: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function loadToolRows(): Promise<ToolRow[]> {
  const state = await getToolAccess();
  return TOOL_REGISTRY.map((entry) => {
    const row = state.rows.get(entry.id);
    return {
      id: entry.id,
      enabledMcp: state.mcp.has(entry.id),
      enabledChat: state.chat.has(entry.id),
      stored: !!row,
      updatedAt: row?.updated_at ?? null,
      updatedBy: row?.updated_by ?? null,
    };
  });
}

/**
 * Flip one tool on one door.
 *
 * THE SENSITIVE REFUSAL IS HERE TOO, not only in the UI and not only at read
 * time. The page disables the control, lib/tool-access.ts drops the tool from
 * the MCP set whatever the row says, and this refuses to write the row at all —
 * three independent places, because the cost of one of them being wrong is
 * publishing named individuals to a public connector. Defence in depth is the
 * right shape when the failure is not recoverable: you cannot un-answer a
 * question an assistant already answered.
 */
export async function setToolAccess(
  toolId: string,
  surface: ToolSurface,
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };

  const entry = TOOL_BY_ID.get(toolId);
  if (!entry) return { ok: false, error: `Unknown tool: ${toolId}` };

  if (surface === "mcp" && enabled && !mcpAllowed(entry)) {
    return {
      ok: false,
      error:
        "This tool returns data about named individuals, so it cannot be opened on the public connector from here. That takes a code change in lib/tool-access.ts.",
    };
  }
  if (!entry.implemented.includes(surface)) {
    return {
      ok: false,
      error: `${toolId} has no implementation on the ${surface === "mcp" ? "connector" : "site chat"} yet.`,
    };
  }

  const state = await getToolAccess();
  const current = state.rows.get(toolId);
  const next = {
    tool_id: toolId,
    mcp_enabled: surface === "mcp" ? enabled : current?.mcp_enabled ?? entry.defaultMcp,
    chat_enabled: surface === "chat" ? enabled : current?.chat_enabled ?? entry.defaultChat,
    updated_at: new Date().toISOString(),
    updated_by: "admin",
  };

  /* tool_access postdates types/database.ts, like several live tables — the
     cast is the existing house pattern for those, not a new shortcut. */
  const db = createAdminClient() as any;
  const { error } = await db.from("tool_access").upsert(next, { onConflict: "tool_id" });
  if (error) return { ok: false, error: error.message };

  clearToolAccessCache();
  revalidatePath("/admin/tool-access");
  return { ok: true };
}

/** Drop the row so the tool goes back to the default in lib/tool-access.ts. */
export async function resetToolAccess(
  toolId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await isAdmin())) return { ok: false, error: "Not authorized." };
  const db = createAdminClient() as any;
  const { error } = await db.from("tool_access").delete().eq("tool_id", toolId);
  if (error) return { ok: false, error: error.message };
  clearToolAccessCache();
  revalidatePath("/admin/tool-access");
  return { ok: true };
}
