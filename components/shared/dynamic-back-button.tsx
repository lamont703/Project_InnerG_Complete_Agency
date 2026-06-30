"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function DynamicBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors py-2 group"
    >
      <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
      Back
    </button>
  );
}
