"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { Search, MapPin, Building, Phone, Briefcase, Users, Star, Target, Globe, AppWindow, PlayCircle } from "lucide-react";
import { searchBarbershops } from "./actions";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get("p")) || 1);
  const [filterTab, setFilterTab] = useState(searchParams.get("tab") || "All");
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
      // Sync State to URL so it remembers when we click "Back"
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (filterTab !== "All") params.set("tab", filterTab);
      if (page > 1) params.set("p", page.toString());
      window.history.replaceState(null, '', `?${params.toString()}`);

      if (query.trim().length >= 2) {
        // Intercept with Session Storage Cache to prevent re-fetching when hitting "Back"
        const cacheKey = `search_${query}_${filterTab}_${page}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
          const parsed = JSON.parse(cached);
          setResults(parsed.results);
          setTotal(parsed.total);
          return;
        }

        startTransition(async () => {
          const res = await searchBarbershops(query, page, filterTab);
          if (res.success && res.data) {
            setResults(res.data.results || []);
            setTotal(res.data.total || 0);
            sessionStorage.setItem(cacheKey, JSON.stringify({ results: res.data.results, total: res.data.total }));
          }
        });
      } else {
        setResults([]);
        setTotal(0);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, page, filterTab]);

  // Helper for Google-style results
  const generateTitleFromUrl = (urlStr: string) => {
    try {
      const urlObj = new URL(urlStr);
      if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.get('v')) {
        return `YouTube Video - ${urlObj.searchParams.get('v')}`;
      }
      let path = urlObj.pathname.replace(/\/$/, "");
      if (path === '' || path === '/') return urlObj.hostname.replace('www.', '').split('.')[0].toUpperCase();
      
      const segments = path.split('/');
      const lastSegment = segments[segments.length - 1];
      if (!lastSegment || lastSegment.length < 3) return urlObj.hostname.replace('www.', '');
      
      return lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\.Html$|\.Php$/, '')
        .substring(0, 80);
    } catch {
      return urlStr;
    }
  };

  const generateBreadcrumb = (urlStr: string) => {
    try {
      const urlObj = new URL(urlStr);
      let hostname = urlObj.hostname.replace('www.', '');
      let path = urlObj.pathname.replace(/\/$/, "");
      if (path === '' || path === '/') return hostname;
      
      const segments = path.split('/').filter(Boolean).slice(0, 2); // Max 2 segments
      let breadcrumb = `${hostname} › ${segments.join(' › ')}`;
      if (breadcrumb.length > 50) breadcrumb = breadcrumb.substring(0, 50) + '...';
      return breadcrumb;
    } catch {
      return urlStr;
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col light bg-slate-50 text-slate-900 selection:bg-blue-500/20">
      
      <main className={`flex-1 flex flex-col items-center px-4 sm:px-6 lg:px-8 w-full transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${results.length > 0 || query.trim().length > 0 ? 'justify-start pt-8 sm:pt-16' : 'justify-center pb-32'}`}>
        
        {/* Search Header Area */}
        <div className={`w-full transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${results.length > 0 || query.trim().length > 0 ? 'max-w-4xl' : 'max-w-3xl'}`}>
          <div className={`text-center transition-all duration-700 ${results.length > 0 || query.trim().length > 0 ? 'mb-6 sm:mb-8 scale-90 sm:scale-100 transform origin-top' : 'mb-8 sm:mb-10'}`}>
            <h1 className={`font-extrabold tracking-tight text-primary transition-all duration-700 ${results.length > 0 || query.trim().length > 0 ? 'text-3xl sm:text-4xl mb-2' : 'text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6'}`}>
              Barber & Cosmetology <br />
              <span className="text-black">Domain Intelligence</span>
            </h1>
            <p className={`text-muted-foreground px-2 transition-all duration-700 ${results.length > 0 || query.trim().length > 0 ? 'text-sm sm:text-base opacity-0 h-0 overflow-hidden' : 'text-base sm:text-xl opacity-100 h-auto'}`}>
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

          {/* Quick Search Suggestions */}
          {query.trim().length === 0 && results.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
              <span className="text-sm text-slate-500 font-medium">Try searching:</span>
              <button
                onClick={() => { setQuery("Shops hiring in Houston"); setPage(1); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <Search className="h-3 w-3 inline-block mr-1.5 opacity-50" />
                Shops hiring in Houston
              </button>
              <button
                onClick={() => { setQuery("Barbers in Houston looking for chairs"); setPage(1); }}
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <Search className="h-3 w-3 inline-block mr-1.5 opacity-50" />
                Barbers in Houston looking for chairs
              </button>
            </div>
          )}

          {/* Filter Tabs */}
          {(query.trim().length >= 2 || results.length > 0) && (
            <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide px-2">
              {['All', 'Barbershops', 'Articles', 'Videos', 'Tools'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setFilterTab(tab); setPage(1); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                    filterTab === tab
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
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
                <div key={`web-${item.id}`} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 sm:gap-6 relative group/webcard">
                  {item.og_image_url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-full sm:w-40 h-48 sm:h-28 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={item.og_image_url} alt="Article Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                      {item.is_video && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors group-hover/thumbnail:bg-black/20">
                          <PlayCircle className="h-10 w-10 text-white/90 drop-shadow-md" />
                        </div>
                      )}
                    </a>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <Globe className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">{generateBreadcrumb(item.url)}</span>
                    </div>
                    
                    {/* Prominent Title Link */}
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-2 truncate">
                      {generateTitleFromUrl(item.url)}
                    </a>
                    
                    {/* Snippet */}
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {item.snippet}
                    </p>
                  </div>
                </div>
              );
            }

            if (item.resultType === 'shop') {
              return (
                <div key={`shop-${item.id}`} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                  {item.hiring_need && item.booth_count_available > 0 && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 rounded-bl-lg shadow-sm z-10">
                      HIRING: {item.booth_count_available} Chairs
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 mt-4 sm:mt-0">
                    
                    {item.google_images && Array.isArray(item.google_images) && item.google_images.length > 0 && (
                      <div className="shrink-0 w-full sm:w-24 h-48 sm:h-24 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        <img src={item.google_images[0]} alt={item.shop_name} className="w-full h-full object-cover" />
                      </div>
                    )}

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

export default function BarbershopSearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Search Engine...</div>}>
      <SearchContent />
    </Suspense>
  );
}
