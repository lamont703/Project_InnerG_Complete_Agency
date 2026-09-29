/**
 * Booking handles, pure: "Marcus Cuts & Co." -> "marcus-cuts-co", made unique
 * with a number. Short and readable, because it's said out loud to a client
 * and printed under a QR code. Tested in booking-handle-rules.test.ts.
 */

export const isBookingHandle = (h: string) => /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(h);

export function makeBookingHandle(name: string, taken: Set<string>): string {
  const base = (String(name || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "")) || "book";
  const padded = base.length < 3 ? `${base}-book` : base;
  if (!taken.has(padded)) return padded;
  for (let n = 2; n < 1000; n++) {
    const h = `${padded}-${n}`;
    if (!taken.has(h)) return h;
  }
  throw new Error("could not make a unique booking handle");
}
