"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ label = "Back to Matches" }: { label?: string }) {
  const router = useRouter();
  
  return (
    <button 
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-border rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
