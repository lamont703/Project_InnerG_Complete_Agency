"use client";

import { useState } from 'react';
import { Award } from 'lucide-react';
import { PassportModal } from './passport-modal';

export function RequestShopDayButton({ shop, className }: { shop: any; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        data-ig-click="outbound_lead"
        className={
          className ||
          "inline-flex items-center justify-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-lg hover:bg-blue-50 hover:scale-105 transition-all shadow-xl shadow-blue-900/20 w-full md:w-auto"
        }
      >
        <Award className="w-5 h-5" />
        Request A Shop Day at {shop.shop_name}
      </button>

      <PassportModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
