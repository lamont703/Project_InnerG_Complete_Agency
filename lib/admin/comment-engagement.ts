import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * What the comment agent has said, and what it has not got to.
 *
 * READ-ONLY. Replying is the webhook's job; a page load must never post
 * anything to a public comment thread. Same discipline as the other admin
 * views in this codebase.
 */

export type CommentStatus = "pending" | "draft" | "replied" | "partial" | "failed" | "skipped";

export interface CommentThread {
  id: string;
  commentId: string;
  username: string | null;
  commentText: string;
  replyText: string | null;
  repliedAt: string | null;
  replyError: string | null;
  dmText: string | null;
  dmSentAt: string | null;
  dmError: string | null;
  priorComments: number;
  status: CommentStatus;
  createdAt: string;
  /** True the first time we ever heard from this person. */
  firstTime: boolean;
}

export interface CommentEngagement {
  threads: CommentThread[];
  /** Written, not sent. The queue this page exists to clear. */
  drafts: CommentThread[];
  autoReply: { enabled: boolean; changedBy: string | null; changedAt: string | null };
  /**
   * Comments that arrived before the agent existed, or that it could not
   * answer. These are the ones a person still owes a reply — and each carries
   * a private-reply window that expires 7 days after the comment.
   */
  unanswered: {
    commentId: string;
    username: string | null;
    text: string;
    receivedAt: string;
    hoursLeftInWindow: number;
  }[];
  counts: Record<CommentStatus, number> & { total: number };
  /** Distinct people who have commented more than once — the beginnings of a fan list. */
  repeatCommenters: { username: string | null; comments: number }[];
}

const PRIVATE_REPLY_WINDOW_HOURS = 7 * 24;

export async function fetchCommentEngagement(): Promise<CommentEngagement> {
  const db = createAdminClient() as any;

  const [{ data: rows }, { data: events }, { data: settings }] = await Promise.all([
    db
      .from("instagram_comment_replies")
      .select(
        "id, comment_id, commenter_id, commenter_username, comment_text, reply_text, replied_at, reply_error, dm_text, dm_sent_at, dm_error, commenter_prior_comments, status, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("instagram_events")
      .select("comment_id, username, text_body, received_at, replied_at, sender_id")
      .eq("kind", "comment")
      .order("received_at", { ascending: false })
      .limit(400),
    db.from("instagram_agent_settings").select("comment_auto_reply, comment_auto_reply_changed_by, comment_auto_reply_changed_at").eq("id", true).maybeSingle(),
  ]);

  const threads: CommentThread[] = (rows || []).map((r: any) => ({
    id: r.id,
    commentId: r.comment_id,
    username: r.commenter_username,
    commentText: r.comment_text,
    replyText: r.reply_text,
    repliedAt: r.replied_at,
    replyError: r.reply_error,
    dmText: r.dm_text,
    dmSentAt: r.dm_sent_at,
    dmError: r.dm_error,
    priorComments: r.commenter_prior_comments ?? 0,
    status: r.status,
    createdAt: r.created_at,
    firstTime: (r.commenter_prior_comments ?? 0) === 0,
  }));

  const answered = new Set(threads.filter((t) => t.repliedAt).map((t) => t.commentId));

  /*
   * The window is what makes this list urgent rather than merely untidy. One
   * private reply is available per commenter and it expires 7 days after THEIR
   * comment, not after we noticed — so a row that has sat for six days is worth
   * more attention than one that arrived this morning, and the page has to say
   * which is which.
   */
  const unanswered = (events || [])
    .filter((e: any) => e.comment_id && !answered.has(e.comment_id) && !e.replied_at)
    .map((e: any) => ({
      commentId: e.comment_id,
      username: e.username,
      text: e.text_body || "",
      receivedAt: e.received_at,
      hoursLeftInWindow:
        PRIVATE_REPLY_WINDOW_HOURS -
        (Date.now() - new Date(e.received_at).getTime()) / 3_600_000,
    }))
    .filter((u: any) => u.text);

  const counts = { pending: 0, draft: 0, replied: 0, partial: 0, failed: 0, skipped: 0, total: threads.length } as any;
  threads.forEach((t) => (counts[t.status] = (counts[t.status] || 0) + 1));

  const byPerson = new Map<string, { username: string | null; comments: number }>();
  for (const e of events || []) {
    if (!e.sender_id) continue;
    const cur = byPerson.get(e.sender_id) || { username: e.username, comments: 0 };
    cur.comments++;
    if (!cur.username && e.username) cur.username = e.username;
    byPerson.set(e.sender_id, cur);
  }

  return {
    threads: threads.filter((t) => t.status !== "draft"),
    drafts: threads.filter((t) => t.status === "draft"),
    /*
     * Anything unreadable resolves to false. A settings row that failed to load
     * must never read as permission to post in public — see the migration.
     */
    autoReply: {
      enabled: settings?.comment_auto_reply === true,
      changedBy: settings?.comment_auto_reply_changed_by ?? null,
      changedAt: settings?.comment_auto_reply_changed_at ?? null,
    },
    unanswered,
    counts,
    repeatCommenters: [...byPerson.values()]
      .filter((p) => p.comments > 1)
      .sort((a, b) => b.comments - a.comments)
      .slice(0, 20),
  };
}
