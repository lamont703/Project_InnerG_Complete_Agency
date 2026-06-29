"use client";

import { useState, useTransition, useEffect } from "react";
import { Search, MapPin, Building, Phone } from "lucide-react";
import { searchBarbershops } from "./actions";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { useTheme } from "next-themes";

export default function BarbershopSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        startTransition(async () => {
          const res = await searchBarbershops(query);
          if (res.success) {
            setResults(res.data || []);
          }
        });
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="min-h-screen flex flex-col light bg-slate-50 text-slate-900 selection:bg-blue-500/20">
      <Navbar />
      <main className="flex-1 flex flex-col items-center pt-32 px-4 sm:px-6 lg:px-8">
        
        {/* Search Header Area */}
        <div className={`w-full max-w-3xl transition-all duration-500 ease-in-out ${results.length > 0 || query ? 'mt-8' : 'mt-[20vh]'}`}>
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-4">
              Artificial Domain <span className="text-muted-foreground">Intelligence</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Search the largest network of barbershops and beauty professionals.
            </p>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className={`h-6 w-6 transition-colors ${isPending ? 'text-primary animate-pulse' : 'text-muted-foreground group-focus-within:text-primary'}`} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 sm:text-lg border border-border rounded-full bg-secondary/30 focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm focus:shadow-md outline-none"
              placeholder="Search by shop name, city, or state..."
            />
          </div>
        </div>

        {/* Results Area */}
        <div className="w-full max-w-3xl mt-12 space-y-4 pb-20">
          {results.length > 0 ? (
            results.map((shop) => (
              <div key={shop.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      {shop.shop_name || "Unknown Shop"}
                    </h3>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {shop.formatted_address ? (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {shop.formatted_address}
                        </p>
                      ) : (
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {shop.city || "Unknown City"}, {shop.state || "TX"}
                        </p>
                      )}
                      {shop.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {shop.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Future CTA button here */}
                  <Link 
                    href={`/shop/${shop.id}`}
                    className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))
          ) : query.trim().length >= 2 && !isPending ? (
            <div className="text-center py-12 text-muted-foreground">
              No results found for "{query}". Try a different city or shop name.
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
