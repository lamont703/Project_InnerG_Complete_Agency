"use client";

import { useState } from 'react';
import { Award } from 'lucide-react';
import { PassportModal } from './passport-modal';

// Generic trigger for the same Career Passport data-capture flow
// RequestShopDayButton already uses, just framed toward the professional/
// student themselves rather than toward "requesting a shop day at X" —
// used on barber, cosmetologist, and school profile pages where the most
// likely high-intent visitor is the professional/student, not someone
// evaluating a business.
export function CreatePassportButton({
  label,
  subtext,
  className,
}: {
  label: string;
  subtext?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        data-ig-click="create_passport"
        className={
          className ||
          "w-full inline-flex flex-col items-center justify-center gap-1 px-5 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-md"
        }
      >
        <span className="inline-flex items-center gap-2 font-extrabold text-sm uppercase tracking-wider">
          <Award className="w-4 h-4" />
          {label}
        </span>
        {subtext && <span className="text-xs font-medium text-white/70">{subtext}</span>}
      </button>

      <PassportModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
