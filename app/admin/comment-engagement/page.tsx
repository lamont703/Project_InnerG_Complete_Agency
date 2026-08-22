import { notFound } from "next/navigation";
import { isAdmin } from "@/app/admin/ad-campaigns/auth";
import { Navbar } from "@/components/layout/navbar";
import { fetchCommentEngagement } from "@/lib/admin/comment-engagement";
import { MessageCircle, AlertTriangle, CheckCircle2, Clock, Send } from "lucide-react";
import { AutoReplySwitch, CommentDraftList } from "@/components/admin/comment-draft-list";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Comment Engagement | Inner G Complete",
  robots: { index: false, follow: false },
};

/**
 * What the comment agent said back, and what nobody has answered.
 *
 * THE UNANSWERED LIST IS THE POINT OF THE PAGE. Replies are pleasant to read
 * and mostly need no supervision; a comment nobody answered is the thing that
 * costs something, and it costs more the longer it sits — one private reply is
 * available per commenter and it expires seven days after THEIR comment.
 * So that list is first and it is sorted by how little time is left.
 *
 * Gated by isAdmin() as well as middleware, because middleware fails OPEN on an
 * auth exception and this shows other people's messages.
 */
export default async function CommentEngagementPage() {
  if (!(await isAdmin())) notFound();

  const { threads, drafts, autoReply, unanswered, counts, repeatCommenters } = await fetchCommentEngagement();
  const urgent = unanswered.filter((u) => u.hoursLeftInWindow < 48).length;

  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-3">
          <MessageCircle className="w-3 h-3" />
          Internal · Comment Engagement
        </span>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-2">
          {drafts.length > 0 ? `${drafts.length} awaiting review` : `${counts.replied} replied`}
          {unanswered.length > 0 && (
            <span className="text-amber-700"> · {unanswered.length} unanswered</span>
          )}
        </h1>
        <p className="text-slate-500 text-sm mb-10 max-w-2xl">
          The agent replies publicly under every comment. Anything clickable is
          moved out of the reply and sent as a direct message instead — one per
          commenter, which is all Instagram allows, and only when there is
          genuinely a link to hand over.
        </p>

        <AutoReplySwitch
          enabled={autoReply.enabled}
          changedBy={autoReply.changedBy}
          changedAt={autoReply.changedAt}
        />

        <CommentDraftList
          drafts={drafts.map((d) => ({
            commentId: d.commentId,
            username: d.username,
            commentText: d.commentText,
            replyText: d.replyText,
            dmText: d.dmText,
            priorComments: d.priorComments,
            firstTime: d.firstTime,
          }))}
        />

        {unanswered.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-amber-800">
              Nobody has answered these ({unanswered.length})
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              The private-reply window closes 7 days after the comment. After
              that you can still reply publicly, but the one direct message is
              gone.
              {urgent > 0 && (
                <strong className="text-amber-800"> {urgent} have under 48 hours left.</strong>
              )}
            </p>
            <ul className="space-y-3">
              {unanswered
                .slice()
                .sort((a, b) => a.hoursLeftInWindow - b.hoursLeftInWindow)
                .map((u) => (
                  <li
                    key={u.commentId}
                    className={`rounded-xl border p-4 ${
                      u.hoursLeftInWindow < 48 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-sm font-bold text-slate-900">
                        @{u.username ?? "unknown"}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {u.hoursLeftInWindow <= 0
                          ? "window closed"
                          : `${Math.floor(u.hoursLeftInWindow)}h left`}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{u.text}</p>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <section className="mb-12">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">
            Replies {threads.length > 0 && <span className="text-slate-900">({threads.length})</span>}
          </h2>
          {threads.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing yet. The agent answers on the webhook, so the first reply
              appears the next time somebody comments.
            </p>
          ) : (
            <ul className="space-y-4">
              {threads.map((t) => (
                <li key={t.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wide">
                    {t.status === "replied" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Replied
                      </span>
                    ) : t.status === "partial" ? (
                      <span className="inline-flex items-center gap-1 text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" /> One half only
                      </span>
                    ) : t.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-rose-700">
                        <AlertTriangle className="h-3.5 w-3.5" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock className="h-3.5 w-3.5" /> Pending
                      </span>
                    )}
                    <span className="text-slate-400 font-medium normal-case tracking-normal">
                      @{t.username ?? "unknown"}
                      {t.firstTime ? " · first time" : ` · ${t.priorComments + 1} comments`}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 mb-3 pl-3 border-l-2 border-slate-200">
                    {t.commentText}
                  </p>

                  {t.replyText && (
                    <p className="text-sm font-medium text-slate-900 mb-2">↳ {t.replyText}</p>
                  )}
                  {t.replyError && <p className="text-xs text-rose-700 mb-2">{t.replyError}</p>}

                  {t.dmText && (
                    <p className="text-xs text-indigo-700 inline-flex items-start gap-1.5 mt-1">
                      <Send className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        {t.dmSentAt ? "Sent by DM: " : "DM failed: "}
                        <span className="text-slate-600">{t.dmError || t.dmText}</span>
                      </span>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {repeatCommenters.length > 0 && (
          <section>
            <h2 className="mb-1 text-sm font-black uppercase tracking-widest text-slate-500">
              Coming back
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              People who have commented more than once. Everyone is treated as
              new until they appear here.
            </p>
            <div className="flex flex-wrap gap-2">
              {repeatCommenters.map((p) => (
                <span
                  key={p.username ?? Math.random()}
                  className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700"
                >
                  @{p.username ?? "unknown"} · {p.comments}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
