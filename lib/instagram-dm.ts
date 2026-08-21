/**
 * Sending a direct message on Instagram, and the one constraint that shapes
 * everything about how the agent writes.
 *
 * A MESSAGE IS 1000 BYTES. Not 1000 characters — the docs say the text "must be
 * UTF-8 and be a 1000 bytes or less", and that distinction is the whole reason
 * this file exists rather than a `.slice(0, 1000)` at the call site. An em dash
 * is 3 bytes, a curly quote 3, an emoji 4 and often more once a skin-tone or
 * ZWJ sequence is involved. A reply that measures 990 characters can be well
 * over the limit, and the failure arrives as a rejected send rather than as a
 * truncated one.
 *
 * PLAIN TEXT ONLY. No markdown, no tables, no bullet lists that render. The
 * agent prompt has to be told this; there is nothing to strip here that would
 * not also mangle legitimate prose.
 *
 * Takes the token and account id as arguments rather than reading the
 * environment, the same as lib/instagram-publish.ts and for the same reason:
 * nothing here is worth leaking into a client bundle, and scripts need to
 * import it.
 */

const IG = "https://graph.instagram.com";

/** Meta's documented cap. */
export const DM_MAX_BYTES = 1000;

/**
 * Headroom against the cap.
 *
 * The limit is documented as 1000 bytes but the exact accounting is not — it is
 * not stated whether it counts the raw text or an encoded form. Sending 950
 * costs nothing and removes an entire class of failure that would only show up
 * on the specific messages containing enough multi-byte characters to cross the
 * line, which is the worst kind of bug to find in production.
 */
const SAFE_BYTES = 950;

/**
 * How many messages one answer may become.
 *
 * A long answer chunked into six messages does not read as thorough — it reads
 * as a bot dumping on you, and in a DM thread it looks like spam. Three is
 * already generous. Beyond it the answer is trimmed and says so, which is more
 * honest than silently dropping the end.
 */
const MAX_CHUNKS = 3;

const bytes = (s: string) => new TextEncoder().encode(s).length;

/**
 * Flatten the chat model's markdown into something a DM can actually show.
 *
 * FOUND BY SENDING A REAL QUESTION THROUGH. The answer came back as
 * "[Ogle School Hair Skin Nails](/schools/ogle-school-hair-skin-nails-houston-…)"
 * — correct, useful, and completely wrong for this surface. Instagram renders
 * plain text, so that arrives as literal square brackets wrapped around a path
 * that is not clickable and does not even name a host.
 *
 * The system prompt could be told to avoid markdown, but it is shared with the
 * website where markdown is exactly right, and a channel-specific instruction
 * bolted onto a 900-line prompt is a thing that gets diluted by the next edit.
 * Converting after the fact is deterministic and testable.
 *
 * RELATIVE LINKS ARE MADE ABSOLUTE. A path is meaningful inside a page and
 * meaningless in a message. The prompt's linking rule already guarantees the
 * model only emits paths that exist, so prefixing the site origin is safe.
 */
export function plainForDm(input: string, origin = "https://shearquery.com"): string {
  return (
    input
      // [label](target) -> label (absolute target). The label is what a person
      // reads; the URL has to survive because it is the only way to act on it.
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, href: string) => {
        const abs = href.startsWith("/") ? `${origin}${href}` : href;
        return `${label} — ${abs}`;
      })
      // Emphasis markers carry no meaning once they cannot render.
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(^|\s)\*([^*\n]+)\*/g, "$1$2")
      .replace(/(^|\s)_([^_\n]+)_/g, "$1$2")
      // Bullets: markdown's asterisk or dash becomes a character that reads as
      // a bullet in a plain-text message rather than as a typo.
      .replace(/^[ \t]*[*-][ \t]+/gm, "• ")
      // Headings have nothing to be in a DM.
      .replace(/^#{1,6}[ \t]+/gm, "")
      // Collapse the blank-line runs markdown encourages; in a message they are
      // just wasted bytes against a 1000-byte budget.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/**
 * Split a reply into sendable messages.
 *
 * Pure and exported so the byte arithmetic can be tested without a network
 * call — this is the part that is easy to get subtly wrong and impossible to
 * notice until a specific message fails.
 *
 * Breaks at paragraph, then sentence, then word, then code point. It never
 * splits inside a character: iteration is over code points via the spread, not
 * over UTF-16 units, so an emoji cannot be cut into two halves that each render
 * as a replacement glyph.
 */
export function chunkForDm(input: string, maxBytes: number = SAFE_BYTES): string[] {
  const text = input.trim();
  if (!text) return [];
  if (bytes(text) <= maxBytes) return [text];

  const chunks: string[] = [];
  let rest = text;

  while (rest && chunks.length < MAX_CHUNKS) {
    if (bytes(rest) <= maxBytes) {
      chunks.push(rest);
      rest = "";
      break;
    }

    // Longest prefix that fits, measured in bytes, built by code point.
    let take = "";
    for (const ch of rest) {
      if (bytes(take + ch) > maxBytes) break;
      take += ch;
    }

    /*
     * Prefer a natural boundary inside what fits. Cutting mid-sentence reads as
     * a transmission fault; cutting at a full stop reads as a pause. Only
     * accept a boundary that is not uselessly early — a break at 10% of the
     * budget wastes the message and doubles the number of them.
     */
    const floor = Math.floor(take.length * 0.5);
    const candidates = [take.lastIndexOf("\n\n"), take.lastIndexOf(". "), take.lastIndexOf("? "), take.lastIndexOf("! ")];
    const boundary = Math.max(...candidates);
    const cut = boundary > floor ? boundary + 1 : take.lastIndexOf(" ") > floor ? take.lastIndexOf(" ") : take.length;

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }

  /*
   * Anything left after MAX_CHUNKS is dropped, and the last chunk says so. A
   * silent truncation invites the reader to act on half an answer believing it
   * is whole — which on this subject can mean turning up to an exam without
   * something, or ruling out a school on a partial figure.
   */
  if (rest) {
    const note = "… (trimmed — ask me to carry on)";
    let last = chunks[chunks.length - 1];
    while (last && bytes(last + " " + note) > maxBytes) {
      last = last.slice(0, -1);
    }
    chunks[chunks.length - 1] = `${last.trimEnd()} ${note}`;
  }

  return chunks;
}

export interface SendDmInput {
  igUserId: string;
  accessToken: string;
  /** The Instagram-scoped id of the person being replied to. */
  recipientId: string;
  text: string;
}

export type SendDmResult = { ok: true; sent: number } | { ok: false; error: string; sent: number };

/**
 * Send one reply, chunked.
 *
 * SEQUENTIAL, NOT PARALLEL. The chunks are one answer in order, and firing them
 * concurrently would let them arrive out of order — a paragraph two before
 * paragraph one is worse than a slow reply. The rate limit is 100 calls a
 * second per account, so the ordering costs nothing.
 *
 * A PARTIAL SEND IS REPORTED, NOT SWALLOWED. If chunk two fails the caller
 * needs to know that chunk one is already sitting in someone's inbox, because
 * the recovery for "nothing sent" and "half sent" are opposites.
 */
export async function sendDm(input: SendDmInput): Promise<SendDmResult> {
  // Flattened before chunking, never after: the conversion changes length in
  // both directions (a markdown link gets longer, emphasis markers get shorter),
  // so chunking first would measure a string that is not the one being sent.
  const parts = chunkForDm(plainForDm(input.text));
  if (!parts.length) return { ok: false, error: "nothing to send", sent: 0 };

  let sent = 0;
  for (const part of parts) {
    try {
      const res = await fetch(`${IG}/${input.igUserId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: input.recipientId },
          message: { text: part },
          access_token: input.accessToken,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        return {
          ok: false,
          sent,
          error: body?.error?.message || `send failed (${res.status})`,
        };
      }
      sent++;
    } catch (err: any) {
      return { ok: false, sent, error: err?.message || "send threw" };
    }
  }

  return { ok: true, sent };
}
