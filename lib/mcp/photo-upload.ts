import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { draftChange } from "@/lib/gbp-changes";
import { validateUpload, PHOTO_CATEGORIES } from "@/lib/gbp-photos";
import type { McpIdentity } from "@/lib/mcp/connection";

/**
 * Photo uploads from Claude.
 *
 * upload_photo opens a session; the owner's photo arrives at
 * /api/mcp-upload/<token> — from the upload box inside Claude or from the
 * fallback page — and becomes a photo_add DRAFT. It is never published here:
 * the owner still sees the draft and approves it, exactly like every other
 * change. See supabase/migrations/20260929120000_mcp_upload_sessions.sql.
 *
 * Same storage bucket and path shape as the website's photo page
 * (app/api/account/gbp-photos), because Google fetches the photo from that
 * public URL when it is published.
 */

const BUCKET = "shop-images";
export const UPLOAD_SESSION_MINUTES = 30;

const hash = (t: string) => createHash("sha256").update(t, "utf8").digest("hex");

export const isCategory = (c: unknown): c is string =>
  typeof c === "string" && PHOTO_CATEGORIES.some((p) => p.category === c);

export async function createUploadSession(args: {
  identity: McpIdentity;
  category?: string | null;
}): Promise<{ token: string; expiresAt: string }> {
  const token = `squp_${randomBytes(24).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + UPLOAD_SESSION_MINUTES * 60_000).toISOString();
  const { error } = await (createAdminClient().from("mcp_upload_sessions") as any).insert({
    token_hash: hash(token),
    community_member_id: args.identity.memberId,
    key_prefix: args.identity.keyPrefix,
    can_publish: args.identity.scopes.includes("publish"),
    category: isCategory(args.category) ? args.category : null,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`could not open an upload session: ${error.message}`);
  return { token, expiresAt };
}

export interface SessionView {
  ok: true;
  category: string | null;
  expiresAt: string;
}

/** What the fallback page needs to render, without consuming the session. */
export async function peekUploadSession(token: string): Promise<SessionView | { ok: false; message: string }> {
  if (!/^squp_[A-Za-z0-9_-]{32}$/.test(token)) return { ok: false, message: "That upload link isn't valid." };
  const { data } = await (createAdminClient().from("mcp_upload_sessions") as any)
    .select("category, expires_at, used_at")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (!data) return { ok: false, message: "That upload link isn't valid." };
  if (data.used_at) return { ok: false, message: "This link has already been used for a photo. Ask Claude for a new one to add another." };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, message: "This upload link has expired. Ask Claude for a new one." };
  return { ok: true, category: data.category, expiresAt: data.expires_at };
}

export type UploadResult =
  | { ok: true; changeId: string; category: string; canPublish: boolean; draftText: string }
  | { ok: false; status: number; message: string };

/**
 * Store the photo and turn it into a draft.
 *
 * The session is claimed atomically BEFORE the file is stored, so one token
 * cannot create two drafts even if the box and the fallback page are both
 * used at once. If the store or the draft then fails, the claim is released
 * so the owner can retry with the same link.
 */
export async function acceptUpload(args: { token: string; file: File; category: string }): Promise<UploadResult> {
  if (!/^squp_[A-Za-z0-9_-]{32}$/.test(args.token)) return { ok: false, status: 404, message: "That upload link isn't valid." };
  if (!isCategory(args.category)) return { ok: false, status: 400, message: "Choose where the photo goes on your listing." };

  const check = validateUpload({ type: args.file.type, size: args.file.size });
  if (!check.ok) return { ok: false, status: 400, message: check.issues.find((i) => i.level === "error")?.message || "That photo can't be used." };

  const admin = createAdminClient();
  const tokenHash = hash(args.token);
  const now = new Date().toISOString();

  const { data: claimed } = await (admin.from("mcp_upload_sessions") as any)
    .update({ used_at: now })
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .gt("expires_at", now)
    .select("community_member_id, key_prefix, can_publish");
  const session = claimed?.[0];
  if (!session) {
    const peek = await peekUploadSession(args.token);
    return { ok: false, status: 410, message: peek.ok ? "That link can't be used right now. Ask Claude for a new one." : peek.message };
  }

  const release = () =>
    (admin.from("mcp_upload_sessions") as any).update({ used_at: null }).eq("token_hash", tokenHash);

  const ext = args.file.type === "image/png" ? "png" : args.file.type === "image/webp" ? "webp" : "jpg";
  const path = `gbp/${session.community_member_id}/${Date.now()}-${args.category.toLowerCase()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(await args.file.arrayBuffer()), { contentType: args.file.type, upsert: false });
  if (uploadError) {
    await release();
    return { ok: false, status: 502, message: `Could not store the photo: ${uploadError.message}` };
  }
  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const draft = await draftChange({
    memberId: session.community_member_id,
    keyPrefix: session.key_prefix,
    canPublish: !!session.can_publish,
    kind: "photo_add",
    input: { image_url: publicUrl, category: args.category },
  });
  if (!draft.ok || !draft.id) {
    await release();
    return { ok: false, status: 502, message: draft.text.replace(/^Not drafted\.\s*/, "") };
  }

  await (admin.from("mcp_upload_sessions") as any).update({ change_id: draft.id }).eq("token_hash", tokenHash);
  return { ok: true, changeId: draft.id, category: args.category, canPublish: !!session.can_publish, draftText: draft.text };
}
