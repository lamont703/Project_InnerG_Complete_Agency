import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ad rotation — one ad shows per position, but WHICH one changes per render.
 *
 * Before this, every serving function took the first match of a created_at-DESC
 * list, so a placement effectively held exactly one campaign: the newest one
 * won every impression and everybody sold after it never appeared. Rotation
 * lets a position hold as many campaigns as we can sell.
 *
 * The formula (see supabase/migrations/20260727140000_add_ad_rotation.sql):
 *
 *     rotation_index = (served_count - 1) % pool_size
 *
 * over a block of AD_ROTATION_CYCLE (10) impressions per position. Round-robin
 * guarantees each eligible campaign at least floor(10 / pool_size) of every 10
 * consecutive serves, with the remainder carrying into the next block instead
 * of always landing on the same campaign.
 *
 * The cursor is keyed by the POOL (placement + hash of the eligible campaign
 * ids), not by page or geography — so a pool shared by many pages rotates as
 * one, and selling/pausing a campaign starts a fresh cycle.
 *
 * Every failure path here falls back to index 0 (the behaviour before
 * rotation): a rotation problem must never blank an advertiser's ad.
 */

/** Impressions per rotation block, per ad position. */
export const AD_ROTATION_CYCLE = 10;

export interface RotationSlot {
  /** Index into the id-sorted eligible pool. */
  index: number;
  /** Lifetime serves for this pool (0 when no cursor was claimed). */
  servedCount: number;
  /** Position within the current block of AD_ROTATION_CYCLE impressions. */
  cyclePosition: number;
}

const FIRST_SLOT: RotationSlot = { index: 0, servedCount: 0, cyclePosition: 0 };

/**
 * Identifies a rotation pool. Ids are sorted so the key is independent of the
 * order rows came back in, and hashed to keep the key short for pools of ten-
 * plus campaigns.
 */
export function adRotationKey(placement: string, campaignIds: string[]): string {
  const signature = createHash("sha1")
    .update([...campaignIds].sort().join(","))
    .digest("hex")
    .slice(0, 16);
  return `${placement}:${signature}`;
}

/**
 * Sorts a pool into the canonical rotation order. Rotation is only fair if the
 * index→campaign mapping is stable across renders, so it can't depend on query
 * order (created_at ties, changing sort) — id order is stable and matches the
 * ids the rotation key is built from.
 */
export function rotationOrder<T extends { id: string }>(pool: T[]): T[] {
  return [...pool].sort((a, b) => a.id.localeCompare(b.id));
}

/** Claims the next slot for this pool, incrementing its cursor by one serve. */
export async function claimRotationSlot(
  admin: SupabaseClient,
  placement: string,
  campaignIds: string[],
  cycleSize: number = AD_ROTATION_CYCLE
): Promise<RotationSlot> {
  // Nothing to rotate through — skip the write entirely so single-campaign
  // placements (most of them) cost exactly what they did before.
  if (campaignIds.length <= 1) return FIRST_SLOT;
  try {
    const { data, error } = await (admin as any).rpc("claim_ad_rotation_slot", {
      p_rotation_key: adRotationKey(placement, campaignIds),
      p_placement: placement,
      p_pool_ids: campaignIds,
      p_cycle_size: cycleSize,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) return FIRST_SLOT;
    return {
      index: Number(row.rotation_index) || 0,
      servedCount: Number(row.served) || 0,
      cyclePosition: Number(row.cycle_position) || 0,
    };
  } catch {
    return FIRST_SLOT;
  }
}

/** Rotates a pool so `index` is first, wrapping around. */
export function rotatedFrom<T>(pool: T[], index: number): T[] {
  if (pool.length <= 1) return pool;
  const start = ((index % pool.length) + pool.length) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)];
}

/**
 * The whole rotation in one call: takes the campaigns eligible for a position
 * and returns them ordered by this serve's rotation slot. Callers serve the
 * first entry, and can walk further down the list when a candidate turns out
 * to be unservable (missing entity, no photo) so a rotation tick never wastes
 * the slot on a broken ad.
 */
export async function rotateEligible<T extends { id: string }>(
  admin: SupabaseClient,
  placement: string,
  pool: T[]
): Promise<T[]> {
  if (pool.length <= 1) return pool;
  const ordered = rotationOrder(pool);
  const { index } = await claimRotationSlot(admin, placement, ordered.map((c) => c.id));
  return rotatedFrom(ordered, index);
}
