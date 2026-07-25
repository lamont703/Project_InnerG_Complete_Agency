"use client";

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

// Claiming routes into the free Community Membership signup — the platform
// grants entity-management access (and the green "Claimed" badge) to members
// later. Works for every entity type via `noun`; shop/salon keep their old
// call signature (shop={} entityType="shop"|"salon").
export function ClaimShopButton({
  shop,
  entityType = "shop",
  entityId,
  entityName,
  noun,
}: {
  shop?: any;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  noun?: string;
}) {
  const n = noun || (entityType === "salon" ? "salon" : "shop");
  const label = `Is this your ${n}? Claim your ${n}`;
  const id = entityId ?? shop?.id;
  const name = entityName ?? shop?.shop_name;

  return (
    <Link
      href="/membership"
      onClick={() => {
        if (typeof window !== "undefined" && (window as any).innerG?.track) {
          (window as any).innerG.track('claim_shop_initiated', { entity_id: id, entity_name: name, entity_type: entityType });
        }
      }}
      data-ig-click="outbound_lead"
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md mt-6"
    >
      <ShieldCheck className="w-4 h-4" />
      {label}
    </Link>
  );
}
