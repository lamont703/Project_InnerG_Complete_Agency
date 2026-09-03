/**
 * GMAIL — reading the video-request mailbox and replying into the same thread.
 *
 * WHY PLAIN JAVASCRIPT IN A TYPESCRIPT REPO. Same reason as lib/broll-library.js
 * and lib/video-type.js: the callers are on both sides. The poller is a Next
 * route and the renderer that sends the "it's done" mail is a CommonJS script,
 * and a `.js` module with JSDoc is the only thing both can read.
 *
 * CREDENTIALS COME FROM THE PURPOSE CHAIN, NOT FROM process.env HERE. It reads
 * scripts/_google_clients.js — the CommonJS twin of lib/google-clients.ts —
 * because that file is the one place that knows a client id, its secret and its
 * refresh token are three values that must agree. Reaching for the environment
 * variables directly is exactly how GOOGLE_CLIENT_ID became four different
 * things. The odd import direction (lib -> scripts) is the cost of the twin
 * being CommonJS; keep it rather than growing a third copy of the chain.
 *
 * EVERYTHING GMAIL SPEAKS IS base64url, NOT base64 — '-' and '_' in place of
 * '+' and '/'. The two directions are not symmetrical, and only one of them can
 * actually hurt you:
 *
 *   ENCODING (send) IS THE REAL CONSTRAINT. Buffer.toString("base64") emits
 *   '+' and '/', which are not valid in the `raw` field. Always toB64url().
 *
 *   DECODING is tolerant — measured, not assumed: Node's Buffer.from(s,
 *   "base64") already accepts base64url input and returns identical bytes.
 *   b64urlToBuffer() normalises anyway, because relying on a decoder being
 *   lenient is a bet on an implementation detail, not on a documented contract.
 */

const { googleClient } = require("../scripts/_google_clients.js");

const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Access tokens last an hour; a Vercel function may serve several polls on one
 * warm instance. Cached with a 60s safety margin so a token cannot expire
 * between the check and the call it authorises.
 */
let cached = { token: null, expiresAt: 0 };

async function accessToken() {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const c = googleClient("gmail");
  if (!c.clientId || !c.clientSecret || !c.refreshToken) {
    throw new Error(
      "gmail purpose is not configured — set GOOGLE_GMAIL_CLIENT_ID, " +
        "GOOGLE_GMAIL_CLIENT_SECRET and GOOGLE_GMAIL_REFRESH_TOKEN. " +
        "Run: node scripts/google_clients_doctor.js"
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      refresh_token: c.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json().catch(() => ({}));

  if (!res.ok || !body.access_token) {
    /*
     * invalid_grant here has three causes worth naming, because the generic
     * message sends people looking in the wrong place:
     *   - the consent screen was left in "Testing" and the token aged out at 7 days
     *   - the mailbox password changed (Google revokes Gmail-scoped tokens on that)
     *   - access was revoked at myaccount.google.com/permissions
     * All three are fixed by re-running scripts/gmail_oauth_setup.js.
     */
    throw new Error(
      `Gmail token refresh failed (${res.status} ${body.error || "unknown"}): ` +
        `${body.error_description || ""}. If this is invalid_grant, re-mint with ` +
        `node scripts/gmail_oauth_setup.js — and check the consent screen is "In production".`
    );
  }

  cached = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cached.token;
}

async function api(path, init = {}) {
  const token = await accessToken();
  const res = await fetch(`${GMAIL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`gmail ${path} ${res.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
}

/** Gmail's base64url -> bytes. See the header note; this is not plain base64. */
function b64urlToBuffer(data) {
  return Buffer.from(String(data).replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** bytes/string -> base64url, for the `raw` field on send. */
function toB64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function header(payload, name) {
  const h = (payload?.headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : null;
}

/**
 * Walk the MIME tree for the plain-text body and the attachment parts.
 *
 * RECURSIVE BECAUSE REAL MAIL IS NESTED. A message with both text and files is
 * typically multipart/mixed wrapping a multipart/alternative wrapping the text,
 * so a single pass over payload.parts finds the alternative container and no
 * text at all. This returns text/plain in preference to text/html because the
 * model reads it and HTML is mostly styling noise.
 */
function walk(part, out) {
  if (!part) return out;
  const mime = part.mimeType || "";
  const filename = part.filename || "";

  if (filename && part.body?.attachmentId) {
    out.attachments.push({
      filename,
      mimeType: mime,
      sizeBytes: part.body.size || 0,
      attachmentId: part.body.attachmentId,
    });
  } else if (mime === "text/plain" && part.body?.data && !out.text) {
    out.text = b64urlToBuffer(part.body.data).toString("utf8");
  } else if (mime === "text/html" && part.body?.data && !out.html) {
    out.html = b64urlToBuffer(part.body.data).toString("utf8");
  }

  for (const child of part.parts || []) walk(child, out);
  return out;
}

/**
 * Thread ids for messages matching a Gmail search query.
 *
 * THREADS, NOT MESSAGES, is the unit everywhere in this module — one thread is
 * one video request, which is the entire reason this runs on Gmail rather than
 * on an inbound-webhook provider.
 */
async function search(query, { maxResults = 25 } = {}) {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const body = await api(`/messages?${params}`);
  return body.messages || [];
}

/** One message, flattened to the fields the agent actually reads. */
async function getMessage(id) {
  const msg = await api(`/messages/${id}?format=full`);
  const parsed = walk(msg.payload, { text: "", html: "", attachments: [] });
  return {
    id: msg.id,
    threadId: msg.threadId,
    labelIds: msg.labelIds || [],
    from: header(msg.payload, "From"),
    to: header(msg.payload, "To"),
    subject: header(msg.payload, "Subject"),
    messageIdHeader: header(msg.payload, "Message-ID"),
    date: header(msg.payload, "Date"),
    text: parsed.text,
    html: parsed.html,
    attachments: parsed.attachments,
    /** The whole thing, verbatim — stored in video_requests.raw. */
    raw: msg,
  };
}

/** Attachment bytes. Call only for the ones worth keeping — these are billed as quota and can be large. */
async function getAttachment(messageId, attachmentId) {
  const body = await api(`/messages/${messageId}/attachments/${attachmentId}`);
  return b64urlToBuffer(body.data);
}

/**
 * Reply inside an existing thread.
 *
 * BOTH HALVES ARE REQUIRED. `threadId` in the request body is what Gmail uses
 * to file the message, but mail clients thread on the In-Reply-To/References
 * headers — set only one and the conversation splits in your inbox, which
 * defeats the point of using threads as the job key. `subject` must also keep
 * the original text (Re: prefix is fine) or some clients start a new thread.
 */
async function replyInThread({ threadId, to, subject, body, inReplyTo }) {
  const lines = [
    `To: ${to}`,
    `Subject: ${subject.startsWith("Re:") ? subject : `Re: ${subject}`}`,
    inReplyTo ? `In-Reply-To: ${inReplyTo}` : null,
    inReplyTo ? `References: ${inReplyTo}` : null,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].filter(Boolean);

  return api("/messages/send", {
    method: "POST",
    body: JSON.stringify({ raw: toB64url(lines.join("\r\n")), threadId }),
  });
}

/**
 * Find or create a label, returning its id.
 *
 * The label set is the visible half of the state machine — the inbox becomes
 * the job board, so there is no dashboard to build and the current state of
 * every request is legible from a phone.
 */
async function ensureLabel(name) {
  const { labels = [] } = await api("/labels");
  const found = labels.find((l) => l.name === name);
  if (found) return found.id;
  const made = await api("/labels", {
    method: "POST",
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
  return made.id;
}

/** Add and/or remove labels on every message in a thread. */
async function labelThread(threadId, { add = [], remove = [] } = {}) {
  return api(`/threads/${threadId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
  });
}

/** Which mailbox this token actually reads. Used by the doctor and at startup. */
async function whoami() {
  const p = await api("/profile");
  return p.emailAddress;
}

module.exports = {
  accessToken,
  search,
  getMessage,
  getAttachment,
  replyInThread,
  ensureLabel,
  labelThread,
  whoami,
  b64urlToBuffer,
  toB64url,
};
