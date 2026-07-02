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
  const [activeFilters, setActiveFilters] = useState<string[]>(searchParams.get("filters") ? searchParams.get("filters")!.split(',') : []);
  const [isLoading, setIsLoading] = useState(false);
  
  // AI Chat State
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setPage(1);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiLoading) return;
    
    const newMsg = { role: 'user', content: chatInput.trim() };
    const newHistory = [...chatMessages, newMsg];
    setChatMessages(newHistory);
    setChatInput("");
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setChatMessages([...newHistory, { role: 'model', content: data.error || 'Failed to connect.' }]);
        if (res.status === 429 && (window as any).innerG?.track) {
          (window as any).innerG.track('ai_rate_limit_hit', { limit: 5 });
        }
      } else {
        setChatMessages([...newHistory, { role: 'model', content: data.text }]);
        if ((window as any).innerG?.track) {
          (window as any).innerG.track('ai_chat_message_sent', { query_length: chatInput.length });
        }
      }
    } catch (err) {
      setChatMessages([...newHistory, { role: 'model', content: 'Connection error.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Sync State to URL so it remembers when we click "Back"
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (filterTab !== "All") params.set("tab", filterTab);
      if (page > 1) params.set("p", page.toString());
      if (activeFilters.length > 0) params.set("filters", activeFilters.join(','));
      window.history.replaceState(null, '', `?${params.toString()}`);

      if (query.trim().length >= 2) {
        // Custom VC Metrics Tracking: Track Search Intent
        if (typeof window !== "undefined") {
          if ((window as any).innerG?.track) {
            console.log("[Search Tracking] Firing search_executed event:", query.trim());
            (window as any).innerG.track('search_executed', { query: query.trim(), filter: filterTab, page: page, filters_used: activeFilters });
          } else {
            console.warn("[Search Tracking] window.innerG is not loaded yet!");
          }
        }

        // Intercept with Session Storage Cache to prevent re-fetching when hitting "Back"
        const cacheKey = `search_${query}_${filterTab}_${page}_${activeFilters.join(',')}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
          const parsed = JSON.parse(cached);
          setResults(parsed.results);
          setTotal(parsed.total);
          return;
        }

        setIsLoading(true);

        searchBarbershops(query, page, filterTab, activeFilters).then(res => {
          if (res.success && res.data) {
            setResults(res.data.results || []);
            setTotal(res.data.total || 0);
            sessionStorage.setItem(cacheKey, JSON.stringify({ results: res.data.results, total: res.data.total }));
          }
        }).finally(() => {
          setIsLoading(false);
        });
      } else {
        setResults([]);
        setTotal(0);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, page, filterTab, activeFilters]);

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
          {filterTab !== 'AI Mode' && (
            <>
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
                  {isLoading && (
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
            </>
          )}

          {/* Filter Tabs */}
          {(query.trim().length >= 2 || results.length > 0 || filterTab === 'AI Mode') && (
            <div className="flex flex-col gap-3 mt-6">
              {/* Category Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                {['AI Mode', 'All', 'Barbershops', 'Barbers', 'Articles', 'Videos', 'Tools'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { 
                      setFilterTab(tab); 
                      setPage(1); 
                      if (tab === 'AI Mode' && (window as any).innerG?.track) {
                        (window as any).innerG.track('ai_mode_activated');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                      filterTab === tab
                        ? (tab === 'AI Mode' ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-blue-50 border-blue-200 text-blue-700')
                        : (tab === 'AI Mode' ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')
                    }`}
                  >
                    {tab === 'AI Mode' && <span className="mr-1.5">✨</span>}
                    {tab}
                  </button>
                ))}
              </div>

              {/* Faceted Filters (Intent Tags) */}
              {(filterTab === 'All' || filterTab === 'Barbershops') && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Filters:</span>
                  {[
                    { id: 'hiring_now', label: 'Hiring Now' },
                    { id: 'booth_rent', label: 'Booth Rent' },
                    { id: 'commission', label: 'Commission' },
                    { id: 'rating_4.5', label: '4.5+ Stars' }
                  ].map((filter) => {
                    const isActive = activeFilters.includes(filter.id);
                    return (
                      <button
                        key={filter.id}
                        onClick={() => {
                          setActiveFilters(prev => 
                            isActive ? prev.filter(f => f !== filter.id) : [...prev, filter.id]
                          );
                          setPage(1);
                        }}
                        className={`px-3 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors border ${
                          isActive
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {isActive && <Target className="w-3 h-3 inline-block mr-1 opacity-70" />}
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results Area / AI Chat */}
        <div className={`w-full max-w-3xl flex flex-col ${filterTab === 'AI Mode' ? 'mt-4 pb-4 flex-1' : 'mt-12 space-y-4 pb-20'}`}>
          
          {filterTab === 'AI Mode' ? (
            <div className="flex flex-col w-full" style={{ height: 'calc(100dvh - 170px)', maxHeight: '850px' }}>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl">✨</span>
                    </div>
                    <p className="font-medium text-slate-700">How can I help you today?</p>
                    <p className="text-sm text-slate-500 max-w-sm mt-2">I am grounded in your proprietary search data. Ask me to summarize or find specific insights.</p>
                  </div>
                )}
                
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
              
              <form onSubmit={handleChatSubmit} className="p-4 bg-transparent pb-safe">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question..."
                    maxLength={150}
                    disabled={isAiLoading}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <button 
                    type="submit" 
                    disabled={isAiLoading || !chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                  </button>
                </div>
                <div className="text-xs text-slate-400 text-right mt-1.5 mr-2">
                  {chatInput.length}/150 characters
                </div>
              </form>
            </div>
          ) : (
            <>
              {results.length > 0 && results.map((item, idx) => {
            if (item.resultType === 'internal') {
              return (
                <div key={`internal-${idx}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {item.image_url && (
                    <Link href={item.href} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group/thumbnail p-4">
                      <img src={item.image_url} alt={item.label} className="w-full h-full object-contain transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <AppWindow className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">barberbeauty.net › {item.href.replace(/^\//, '').replace(/\//g, ' › ')}</span>
                    </div>
                    
                    {/* Prominent Title Link */}
                    <Link href={item.href} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-1.5 truncate">
                      {item.label}
                    </Link>
                    
                    {/* Snippet */}
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      <span className="font-medium text-blue-700 mr-1">Platform Tool.</span>
                      {item.description || "Access our proprietary platform tool to manage your barbershop operations."}
                    </p>
                  </div>
                </div>
              );
            }

            if (item.resultType === 'web') {
              const isVideo = item.is_video;
              return (
                <div key={`web-${item.id}`} className={`bg-white p-3 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row items-start gap-3 sm:gap-5 relative group/webcard`}>
                  {item.og_image_url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className={`shrink-0 overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail ${isVideo ? 'w-[45%] sm:w-48 md:w-56 lg:w-64 aspect-video rounded-lg' : 'w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-lg'}`}>
                      <img src={item.og_image_url} alt={isVideo ? "Video Preview" : "Article Preview"} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                      {isVideo && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center transition-colors group-hover/thumbnail:bg-black/20">
                          <PlayCircle className="h-8 w-8 sm:h-10 sm:w-10 text-white/90 drop-shadow-md" />
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
                <div key={`shop-${item.id}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {item.google_images && Array.isArray(item.google_images) && item.google_images.length > 0 && (
                    <Link href={`/shop/${item.id}`} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={item.google_images[0]} alt={item.shop_name} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    
                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <MapPin className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">barberbeauty.net › shops › {(item.city || 'local').toLowerCase().replace(/\s+/g, '-')}</span>
                    </div>

                    {/* Prominent Title Link */}
                    <Link href={`/shop/${item.id}`} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-0.5 truncate">
                      {item.shop_name || "Unknown Shop"}
                    </Link>

                    {/* Rating & Location Snippet */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1.5 flex-wrap">
                      {item.rating && (
                        <span className="flex items-center text-[13px]">
                          <span className="font-medium text-slate-700 mr-1">{item.rating}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="ml-1 opacity-80">({item.total_reviews || 0})</span>
                          <span className="mx-1.5 opacity-50">·</span>
                        </span>
                      )}
                      <span className="truncate max-w-[180px] sm:max-w-xs">{item.formatted_address || item.city}</span>
                    </div>
                    
                    {/* Details Snippet */}
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {item.hiring_need && item.booth_count_available > 0 ? (
                        <span className="font-medium text-green-700 mr-1">Hiring {item.booth_count_available} Chairs.</span>
                      ) : null}
                      {item.ai_culture_summary || item.opportunity_status || "Premium barbershop offering traditional cuts, hot towel shaves, and top-tier grooming services."}
                    </p>
                  </div>
                </div>
              );
            }

            if (item.resultType === 'barber') {
              const isLooking = item.status === 'interested_in_placement' && item.is_actively_looking === true;
              return (
                <div key={`barber-${item.id}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {item.passport_image_url ? (
                    <Link href={item.profile_url || '#'} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={item.passport_image_url} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  ) : (
                    <Link href={item.profile_url || '#'} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group/thumbnail">
                      <Users className="h-8 w-8 text-slate-400 transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    
                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <Users className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">barberbeauty.net › barbers › {(item.metro_area || 'local').toLowerCase().replace(/\s+/g, '-')}</span>
                    </div>

                    {/* Prominent Title Link */}
                    <Link href={item.profile_url || '#'} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-0.5 truncate">
                      {item.name || "Unknown Barber"}
                    </Link>

                    {/* Specialty & Location Snippet */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1.5 flex-wrap">
                      <span className="truncate max-w-[180px] sm:max-w-xs">{item.specialty_type || 'Professional Barber'}</span>
                      {item.metro_area && (
                        <>
                          <span className="mx-1.5 opacity-50">·</span>
                          <span className="truncate max-w-[180px] sm:max-w-xs">{item.metro_area}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Details Snippet */}
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {isLooking ? (
                        <span className="font-medium text-green-700 mr-1">Actively Looking For Placement.</span>
                      ) : null}
                      Professional barber based in the {item.metro_area || 'Texas'} area specializing in {item.specialty_type || 'grooming services'}.
                    </p>
                  </div>
                </div>
              );
            }

            return null;
          })}

          {/* Pagination Controls */}
          {total > 10 && (
            <div className="flex justify-center items-center gap-2 mt-12 pt-6 border-t border-slate-200 w-full flex-wrap">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isLoading}
                className="px-3 sm:px-4 py-2 h-10 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              
              <div className="hidden sm:flex gap-1">
                {Array.from({ length: Math.min(10, Math.ceil(total / 10)) }).map((_, i) => {
                  const totalPages = Math.ceil(total / 10);
                  let start = page - 5;
                  if (start < 1) start = 1;
                  if (start + 9 > totalPages) start = Math.max(1, totalPages - 9);
                  const pNum = start + i;
                  
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      disabled={isLoading}
                      className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors border ${
                        page === pNum 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50 disabled:opacity-50'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <span className="text-xs font-medium text-slate-600 px-2 sm:hidden">
                Page {page} of {Math.ceil(total / 10)}
              </span>
              
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(total / 10) || isLoading}
                className="px-3 sm:px-4 py-2 h-10 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Empty State */}
          {results.length === 0 && query.trim().length >= 2 && !isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              No results found for "{query}". Try a different term.
            </div>
          ) : null}
            </>
          )}
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
