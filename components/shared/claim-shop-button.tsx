"use client";

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ClaimShopModal } from './claim-shop-modal';

export function ClaimShopButton({ shop }: { shop?: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => {
          if (typeof window !== "undefined" && (window as any).innerG?.track) {
            (window as any).innerG.track('claim_shop_initiated', { shop_id: shop?.id, shop_name: shop?.shop_name });
          }
          setIsOpen(true);
        }}
        data-ig-click="outbound_lead"
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-md mt-6"
      >
        <ShieldCheck className="w-4 h-4" />
        Is this your shop? Claim your shop
      </button>

      <ClaimShopModal 
        shop={shop}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
