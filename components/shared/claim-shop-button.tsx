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

  // Carry the entity through to signup. Previously this linked to a bare
  // /membership, so the claim intent was lost the moment the user navigated —
  // they'd register, become a member, and never get the badge, because nothing
  // in the signup path ever wrote a community_member_entity_links row. Only an
  // admin could create that link by hand.
  const claimHref = id
    ? `/membership?claim_type=${encodeURIComponent(entityType)}&claim_id=${encodeURIComponent(id)}${
        name ? `&claim_name=${encodeURIComponent(name)}` : ""
      }`
    : "/membership";

  return (
    <Link
      href={claimHref}
      onClick={() => {
        if (typeof window !== "undefined" && (window as any).innerG?.track) {
          (window as any).innerG.track('claim_shop_initiated', { entity_id: id, entity_name: name, entity_type: entityType });
        }
      }}
      data-ig-click="outbound_lead"
      /*
       * THE TOKEN, NOT A HARDCODED BLUE. This has to match the "Search
       * ShearQuery" button in the navbar, which is `bg-primary`. Writing the
       * colour literally would match today and drift the first time the brand
       * blue moves, in a component rendered on eight page types where nobody
       * would think to look.
       *
       * The token is context-dependent and that is exactly why it works here:
       * `--primary` is #00b2de under the dark `:root` and #0051bd under
       * `.light`. Every entity page wraps itself — navbar included — in
       * `light`, so both buttons resolve to the same #0051bd on the same page.
       * A literal #0051bd would have been wrong on any dark-context page.
       */
      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors shadow-md mt-6"
    >
      <ShieldCheck className="w-4 h-4" />
      {label}
    </Link>
  );
}
