import {
  WHO_WE_ARE, WHO_WE_SERVE, WHAT_WE_SELL, DREAM_CLIENT, BAD_FIT,
  PRIORITIES, RULES_OF_OPERATION,
} from "@/lib/business-brain";
import { VOICE_SUMMARY, BELIEFS, CALIBRATION_SAMPLE } from "@/lib/voice-dna";

/**
 * Assemble the identity block the chat route injects, per channel.
 *
 * WHY THIS IS NOT JUST "APPEND BOTH FILES". Together the Voice DNA and Business
 * Brain are about 10,000 tokens. The chat route already ships up to 120,000
 * characters of context on every request, and the busiest consumer by far is
 * public AI Mode — somebody asking which barbershops are open in Houston. That
 * person does not need Lamont's beliefs, his stories, or the price of a school
 * build. Sending them anyway is pure cost on the highest-volume path.
 *
 * SO IT SPLITS ON A REAL DISTINCTION, not on size:
 *
 *   BRAND FACTS   what ShearQuery is, who it serves, what is free and what is
 *                 paid. Everyone gets this, because any channel can be asked
 *                 "what does this cost" and every channel can get it wrong.
 *
 *   LAMONT'S VOICE  how he sounds and what he believes. Only where we are
 *                 SPEAKING AS HIM — comment replies, DMs, published content.
 *
 * THE DISTINCTION MATTERS MORE THAN THE SAVING. AI Mode is a product
 * assistant answering questions about a directory. It is not Lamont. Giving it
 * his personal voice — his faith, his stories, his rhythm — would be putting
 * words in a real person's mouth on a surface he is not actually speaking on.
 * The voice belongs where he is the author.
 *
 * THE RAW TRANSCRIPTS ARE DELIBERATELY NOT INJECTED. BELIEFS_RAW, STORIES_RAW
 * and SOUND_RAW are another ~4,400 tokens and they are reference material for a
 * human diagnosing a draft that sounds wrong, not instructions for a model.
 * VOICE_SUMMARY is the reading of them, and CALIBRATION_SAMPLE is the worked
 * example — those two carry the signal at a fraction of the cost.
 */

/** Everything the business is, for any channel. ~725 tokens. */
const BRAND_FACTS = `
=== WHAT SHEARQUERY IS ===
${WHO_WE_ARE}
${WHO_WE_SERVE}
${WHAT_WE_SELL}
`.trim();

/** How Lamont sounds and what he believes. Only where we speak as him. */
const LAMONT_VOICE = `
=== WRITING AS LAMONT ===
${VOICE_SUMMARY}

=== WHAT HE BELIEVES ===
${BELIEFS}

=== WORKED EXAMPLE: a draft, and his correction of it ===
Diff any draft against this before deciding it sounds right.
${CALIBRATION_SAMPLE}
`.trim();

/** Who we want, who we do not, what matters now, and the standing rules. */
const OPERATING_CONTEXT = `
=== DREAM CLIENT ===
${DREAM_CLIENT}
=== BAD FIT ===
${BAD_FIT}
${PRIORITIES}
${RULES_OF_OPERATION}
`.trim();

/**
 * Channels where the agent is speaking AS the brand in Lamont's voice.
 *
 * Kept as a list rather than an "everything except AI Mode" default, so a new
 * channel added later gets the cheap, safe treatment until somebody decides it
 * should carry his voice. Defaulting the other way would silently put his
 * personal register on a surface nobody chose.
 */
const VOICE_CHANNELS = new Set(["instagram_dm", "instagram_comment", "content"]);

export function identityForChannel(channel?: string | null): string {
  if (channel && VOICE_CHANNELS.has(channel)) {
    return `${BRAND_FACTS}\n\n${LAMONT_VOICE}\n\n${OPERATING_CONTEXT}`;
  }
  return BRAND_FACTS;
}
