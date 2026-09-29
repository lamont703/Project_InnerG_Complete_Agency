import { AsyncLocalStorage } from "node:async_hooks";

/**
 * The pieces of demo mode that everything else checks. Pure: no database, no
 * network, so the guards can be tested and imported anywhere.
 *
 * THREE INDEPENDENT FENCES, so no single mistake reaches the real world:
 *  1. Credentials. A demo business's Google and Instagram tokens start with
 *     DEMO_TOKEN_PREFIX, and lib/outbound.ts sends any request carrying one
 *     to the fake — whether it comes from Claude, a cron or a script.
 *  2. Recipients. 555-0100–0199 numbers and the .invalid email domain are
 *     fiction by definition; the texting and email senders drop them.
 *  3. The request. While a demo tool call runs (runInDemo), outbound refuses
 *     every external host it doesn't fake — nothing leaves by a path nobody
 *     thought of.
 */

export const DEMO_TOKEN_PREFIX = "sqdemo_";
export const DEMO_EMAIL_DOMAIN = "demo.shearquery.invalid";

export const demoToken = (demoMemberId: string) => `${DEMO_TOKEN_PREFIX}${demoMemberId}`;

/** The demo member a token belongs to, or null for a real token. */
export function demoMemberFromToken(token: string | null | undefined): string | null {
  if (!token || !token.startsWith(DEMO_TOKEN_PREFIX)) return null;
  const id = token.slice(DEMO_TOKEN_PREFIX.length);
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export const isDemoEmail = (email: string | null | undefined) =>
  !!email && email.trim().toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);

/**
 * 555-0100 through 555-0199, in any area code: the range reserved for
 * fiction. Every demo client's number is in it.
 */
export function isFictionalPhone(phone: string | null | undefined): boolean {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return ten.length === 10 && /^\d{3}55501\d{2}$/.test(ten);
}

export interface DemoContext {
  /** The real, signed-in member running the demo (an agency, or an admin). */
  ownerMemberId: string;
  /** The made-up business the tools are acting as. */
  demoMemberId: string;
  demoEmail: string;
  businessType: string;
}

const store = new AsyncLocalStorage<DemoContext>();

export const runInDemo = <T>(ctx: DemoContext, fn: () => Promise<T>) => store.run(ctx, fn);
export const currentDemo = (): DemoContext | undefined => store.getStore();

/**
 * True only for the demo business whose demo is running in THIS request.
 * The private-testing gates (calendar, Instagram) let it through; outside a
 * demo — a cron, the website — a demo business is as locked out as anyone.
 */
export function isRunningDemoBusiness(email: string | null | undefined): boolean {
  const demo = currentDemo();
  return !!demo && isDemoEmail(email) && demo.demoEmail.toLowerCase() === String(email).trim().toLowerCase();
}
