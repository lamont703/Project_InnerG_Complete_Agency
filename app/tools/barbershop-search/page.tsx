"use client";

import { useState, useTransition, useEffect } from "react";
import { Search, MapPin, Building, Phone, Briefcase, Users, Star, Target, Globe, AppWindow } from "lucide-react";
import { searchBarbershops } from "./actions";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function BarbershopSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setPage(1);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length >= 2) {
        startTransition(async () => {
          const res = await searchBarbershops(query, page);
          if (res.success && res.data) {
            setResults(res.data.results || []);
            setTotal(res.data.total || 0);
          }
        });
      } else {
        setResults([]);
        setTotal(0);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, page]);

  return (
    <div className="min-h-screen flex flex-col light bg-slate-50 text-slate-900 selection:bg-blue-500/20">
      
      <main className="flex-1 flex flex-col items-center pt-16 sm:pt-32 px-4 sm:px-6 lg:px-8 w-full">
        
        {/* Search Header Area */}
        <div className={`w-full max-w-3xl transition-all duration-500 ease-in-out ${results.length > 0 || query ? 'mt-8' : 'mt-[20vh]'}`}>
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-primary mb-3 sm:mb-4">
              Barber & Cosmetology <br />
              <span className="text-black">Domain Intelligence</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground px-2">
              Search the worlds largest collection of barber, beauty & wellness data.
            </p>
          </div>

          <div className="relative group w-full">
            <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-all"></div>
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-6 w-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                className="block w-full pl-12 pr-4 py-4 sm:text-lg border border-border rounded-full bg-secondary/30 focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm focus:shadow-md outline-none"
                placeholder="Search by shop name, city, hiring, rent type, or culture..."
              />
              {isPending && (
                <div className="absolute right-4">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="w-full max-w-3xl mt-12 space-y-4 pb-20">
          
          {results.length > 0 && results.map((item, idx) => {
            if (item.resultType === 'internal') {
              return (
                <div key={`internal-${idx}`} className="bg-gradient-to-r from-blue-50 to-white p-5 sm:p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 w-full">
                    <div className="shrink-0 h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <AppWindow className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">{item.label}</h3>
                      <p className="text-xs sm:text-sm text-slate-500">Internal Platform Tool</p>
                    </div>
                  </div>
                  <Link 
                    href={item.href}
                    className="shrink-0 w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors shadow-sm text-center"
                  >
                    Open Tool
                  </Link>
                </div>
              );
            }

            if (item.resultType === 'web') {
              return (
                <div key={`web-${item.id}`} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-2 truncate">
                    <Globe className="shrink-0 h-4 w-4" />
                    <span className="truncate">{item.domain_url || (item.url ? new URL(item.url).hostname : "")}</span>
                  </div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-base sm:text-lg font-bold text-blue-600 hover:underline break-all block">
                    {item.url}
                  </a>
                  <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-3">
                    "{item.snippet}"
                  </p>
                </div>
              );
            }

            if (item.resultType === 'shop') {
              return (
                <div key={`shop-${item.id}`} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                  {item.hiring_need && item.booth_count_available > 0 && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-bl-lg shadow-sm">
                      HIRING: {item.booth_count_available} Chairs
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mt-4 sm:mt-0">
                    <div className="flex-1 w-full min-w-0">
                      <div className="flex items-start sm:items-center gap-2 mb-1 flex-col sm:flex-row">
                        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate w-full sm:w-auto">
                          {item.shop_name || "Unknown Shop"}
                        </h3>
                        {item.rating && (
                          <span className="shrink-0 flex items-center text-xs sm:text-sm font-medium text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Star className="h-3.5 w-3.5 mr-1 fill-current" />
                            {item.rating}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 mt-2 sm:mt-3 text-xs sm:text-sm text-slate-600">
                        {item.formatted_address ? (
                          <p className="flex items-start gap-2">
                            <MapPin className="shrink-0 h-4 w-4 text-slate-400 mt-0.5" />
                            <span className="truncate">{item.formatted_address}</span>
                          </p>
                        ) : (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-400" />
                            {item.city || "Unknown City"}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-3 mt-3">
                          {(item.rent_type || item.rent_rate) && (
                            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md font-medium text-xs">
                              <Briefcase className="h-3.5 w-3.5" />
                              {item.rent_type || "Unknown"} {item.rent_rate ? `• ${item.rent_rate}` : ""}
                            </span>
                          )}
                          
                          {item.ai_culture_summary && (
                            <span className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md font-medium text-xs">
                              <Users className="h-3.5 w-3.5" />
                              {item.ai_culture_summary}
                            </span>
                          )}
                          
                          {item.opportunity_status && (
                            <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium text-xs">
                              <Target className="h-3.5 w-3.5" />
                              {item.opportunity_status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Link 
                      href={`/shop/${item.id}`}
                      className="shrink-0 w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm text-center mt-4 sm:mt-0"
                    >
                      View Shop
                    </Link>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* Pagination Controls */}
          {total > 10 && (
            <div className="flex justify-center items-center gap-2 sm:gap-4 mt-8 pt-4 w-full flex-wrap">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isPending}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs sm:text-sm font-medium text-slate-600 px-2">
                Page {page} of {Math.ceil(total / 10)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 10) || isPending}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Empty State */}
          {results.length === 0 && query.trim().length >= 2 && !isPending ? (
            <div className="text-center py-12 text-muted-foreground">
              No results found for "{query}". Try a different term.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
