/**
 * Which model failures are worth waiting out, and which are not.
 *
 * WHY THIS IS SHARED AND NOT COPIED. It began inside scripts/edit_avatar.js,
 * where the agent is asked for a plan AFTER a HeyGen render is already paid
 * for. render_queued.js needed exactly the same protection and did not have it:
 * a "currently experiencing high demand" on the very first call killed a
 * clicked render outright. One classification, both callers.
 *
 * THE DISTINCTION IS THE POINT. "High demand" is a spike and clears in seconds.
 * "You exceeded your current quota" is the day's allowance gone and will not
 * clear on any timescale worth blocking for — backing off 4s, 8s, 12s against
 * it wastes half a minute and then fails anyway, reading like a flaky network
 * rather than an exhausted budget.
 */

/** Spikes and per-minute limits. Worth waiting for. */
const TRANSIENT = /high demand|overload|unavailable|try again|rate limit|timed out|503/i;

/** The allowance is gone. Waiting changes nothing. */
const EXHAUSTED = /exceeded your current quota|billing/i;

function isTransient(message) { return TRANSIENT.test(String(message ?? "")); }
function isExhausted(message) { return EXHAUSTED.test(String(message ?? "")); }

/**
 * @param {() => Promise<any>} fn
 * @param {{tries?:number, waitMs?:number, onWait?:(attempt:number,ms:number)=>void}} [o]
 */
async function withRetry(fn, o = {}) {
  const tries = o.tries ?? 4;
  const waitMs = o.waitMs ?? 4000;
  let last;
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) {
      last = e;
      if (isExhausted(e.message)) {
        throw new Error(
          `${e.message}\n\nThe Gemini quota for this key is spent — retrying will not help.`
        );
      }
      if (!isTransient(e.message) || i === tries) throw e;
      const wait = waitMs * i;
      if (o.onWait) o.onWait(i, wait);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

module.exports = { withRetry, isTransient, isExhausted };
