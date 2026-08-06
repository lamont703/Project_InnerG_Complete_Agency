import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Library, ArrowRight } from "lucide-react";
import { DIRECTORY_TYPES } from "@/lib/directory-config";
import { getDirectoryCounts } from "@/lib/directory-data";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

const CANONICAL = `${SITE_URL}/directory`;

export const metadata: Metadata = {
  title: "Full Directory — Barbershops, Salons, Barbers, Schools & Supply Stores",
  description:
    "Browse every barbershop, hair salon, barber, cosmetologist, barber and cosmetology school, and supply store in our directory — the complete A–Z index.",
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: "Full Directory — Every Barbershop, Salon, Barber, School & Supply Store",
    description:
      "The complete A–Z index of every business and professional in our directory.",
    url: CANONICAL,
    type: "website",
  },
};

export default async function DirectoryIndexPage() {
  const counts = await getDirectoryCounts();
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="min-h-screen light bg-slate-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-4">
            <Library className="w-3 h-3" />
            Complete Index
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 leading-tight mb-3">
            Full Directory
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Browse every business and professional in our directory —{" "}
            {total.toLocaleString()} listings across {DIRECTORY_TYPES.length} categories. Pick a
            category to page through the complete list.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {DIRECTORY_TYPES.map((t) => (
            <Link
              key={t.key}
              href={`/directory/${t.key}`}
              className="group flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-4 hover:border-indigo-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-900">{t.label}</h2>
                  <span className="text-xs font-bold text-slate-400">
                    {(counts[t.key] ?? 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 text-indigo-600 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
