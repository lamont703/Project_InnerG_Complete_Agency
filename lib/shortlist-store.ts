"use client";

/**
 * The browser half of the shortlist.
 *
 * NO ACCOUNT, NO NETWORK, until the visitor asks to save. Someone comparing
 * three salons should not be asked who they are to do it — the email ask belongs
 * at "save this list", where it buys them something. So the working copy lives
 * in localStorage and the server never hears about it until then.
 *
 * A CustomEvent rather than React context because the button on an entity page
 * and the bar in the layout are in different trees, and threading a provider
 * through both means touching every entity page for a feature that is
 * fundamentally one array in one browser.
 */
import { MAX_ITEMS, type ShortlistItem, type ShortlistEntityType } from "./shortlist";

const KEY = "shearquery.shortlist.v1";
export const SHORTLIST_EVENT = "shearquery:shortlist";

/** SSR-safe: returns empty on the server rather than throwing. */
export function readShortlist(): ShortlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Anything malformed is dropped rather than rendered. localStorage is
    // writable by anything on the origin and survives deploys, so a shape from
    // an older version has to fail closed.
    return parsed.filter(
      (i): i is ShortlistItem =>
        i && typeof i.slug === "string" && (i.entityType === "shop" || i.entityType === "salon"),
    ).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

function write(items: ShortlistItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Private browsing, or the quota is full. The in-memory list still works for
    // this page view; losing it on navigation is better than a thrown error on
    // a click.
  }
  window.dispatchEvent(new CustomEvent(SHORTLIST_EVENT, { detail: items }));
}

export function isInShortlist(entityType: ShortlistEntityType, slug: string): boolean {
  return readShortlist().some((i) => i.entityType === entityType && i.slug === slug);
}

/** Add or remove; returns the new membership state so a button can render it. */
export function toggleShortlist(item: Omit<ShortlistItem, "addedAt">): boolean {
  const items = readShortlist();
  const at = items.findIndex((i) => i.entityType === item.entityType && i.slug === item.slug);
  if (at >= 0) {
    items.splice(at, 1);
    write(items);
    return false;
  }
  if (items.length >= MAX_ITEMS) {
    // Silently dropping the click would look broken. The caller surfaces this.
    write(items);
    return false;
  }
  items.push({ ...item, addedAt: new Date().toISOString() });
  write(items);
  return true;
}

export function clearShortlist() {
  write([]);
}

/** Subscribe to changes from any component on the page. Returns an unsubscribe. */
export function onShortlistChange(fn: (items: ShortlistItem[]) => void): () => void {
  const handler = () => fn(readShortlist());
  window.addEventListener(SHORTLIST_EVENT, handler);
  // `storage` fires when ANOTHER tab writes — someone comparing salons very
  // plausibly has three tabs open, and the count should agree across them.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(SHORTLIST_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
