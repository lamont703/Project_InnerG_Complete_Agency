import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { NotFoundTracker } from "@/components/shared/not-found-tracker";
import { Search, Home, Library, MapPin, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Page Not Found (404) | Inner G Complete",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/directory", label: "Full Directory", icon: Library },
  { href: "/texas", label: "Texas Hub", icon: MapPin },
  { href: "/california", label: "California Hub", icon: Compass },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 light">
      <Navbar />
      <NotFoundTracker />
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-40 pb-24 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">404</p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 mb-3">
          We couldn&rsquo;t find that page
        </h1>
        <p className="text-slate-600 leading-relaxed mb-8">
          The link may be old, or the business or school you&rsquo;re looking for is no longer listed. Try a search, or
          jump to one of these.
        </p>

        <Link
          href="/tools/barbershop-search"
          data-ig-click="notfound_search"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 text-white font-bold text-sm px-6 py-3.5 hover:bg-indigo-700 transition-colors mb-10"
        >
          <Search className="w-4 h-4" />
          Search the directory
        </Link>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300 transition-colors"
            >
              <l.icon className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
              <span className="block text-sm font-bold text-slate-900">{l.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
