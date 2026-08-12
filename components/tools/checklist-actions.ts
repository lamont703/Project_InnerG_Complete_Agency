"use server";

import { currentMember } from "@/lib/member-context";
import { getCheckedItems, mergeChecklist, setCheckedItem } from "@/lib/member-context";

/**
 * Server side of the kit checklist, for members only.
 *
 * TICKING A BOX MUST NEVER REQUIRE AN ACCOUNT. Every function here returns
 * `{ isMember: false }` for an anonymous visitor and the component carries on
 * with localStorage exactly as it always has. The account buys one thing: the
 * same list on the phone in your bag as on the laptop you packed from.
 *
 * Lives beside the component rather than under a route because seven different
 * kit pages mount it, and duplicating the action into each route's actions.ts
 * is how seven copies drift apart.
 */

/**
 * Pull the member's saved ticks, folding in whatever this device had.
 *
 * The merge is a union and it happens on load, which is what makes signing up
 * mid-checklist non-destructive: the eight items ticked before creating an
 * account survive meeting the three saved from somewhere else.
 */
export async function syncChecklist(
  checklistKey: string,
  localItemKeys: string[]
): Promise<{ isMember: boolean; items: string[] }> {
  const member = await currentMember();
  if (!member) return { isMember: false, items: [] };
  const items = await mergeChecklist(member.id, checklistKey, localItemKeys.slice(0, 500));
  return { isMember: true, items };
}

/** Persist one tick. Silently a no-op when signed out. */
export async function toggleChecklistItem(
  checklistKey: string,
  itemKey: string,
  checked: boolean
): Promise<{ isMember: boolean }> {
  const member = await currentMember();
  if (!member) return { isMember: false };
  await setCheckedItem(member.id, checklistKey, itemKey, checked);
  return { isMember: true };
}

/** Clear every tick on one checklist for this member. */
export async function resetChecklist(checklistKey: string): Promise<{ isMember: boolean }> {
  const member = await currentMember();
  if (!member) return { isMember: false };
  const existing = await getCheckedItems(member.id, checklistKey);
  await Promise.all(existing.map((item) => setCheckedItem(member.id, checklistKey, item, false)));
  return { isMember: true };
}
