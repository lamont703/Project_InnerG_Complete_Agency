"use client";

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

// Claiming used to open a lead-gen "list your shop" modal directly. Every
// claim now routes into the free Community Membership signup instead —
// the platform grants entity-management access to members later, rather
// than treating "claim" as its own separate intake form.
export function ClaimShopButton({ shop, entityType = "shop" }: { shop?: any; entityType?: "shop" | "salon" }) {
  const label = entityType === "salon" ? "Is this your salon? Claim your salon" : "Is this your shop? Claim your shop";

  return (
    <Link
      href="/membership"
      onClick={() => {
        if (typeof window !== "undefined" && (window as any).innerG?.track) {
          (window as any).innerG.track('claim_shop_initiated', { shop_id: shop?.id, shop_name: shop?.shop_name, entity_type: entityType });
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
