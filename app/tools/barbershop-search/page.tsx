"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { Search, MapPin, Building, Phone, Briefcase, Users, Star, Target, Globe, AppWindow, PlayCircle, GraduationCap, Store, ChevronDown, ArrowUpRight } from "lucide-react";
import { searchBarbershops } from "./actions";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";

const ALL_TABS = ['AI Mode', 'All', 'Schools', 'Salons', 'Barbershops', 'Barbers', 'Cosmetologist', 'Stores', 'Articles', 'Videos', 'Tools'];
const PRIMARY_MOBILE_TABS = ['AI Mode', 'All'];

// Each tab surfaces the facets that matter for that entity type. 'All' reuses
// the Barbershops set since that's the entity its filters were built around.
const FILTERS_BY_TAB: Record<string, { id: string; label: string }[]> = {
  All: [
    { id: 'hiring_now', label: 'Hiring Now' },
    { id: 'booth_rent', label: 'Booth Rent' },
    { id: 'commission', label: 'Commission' },
    { id: 'rating_4.5', label: '4.5+ Stars' },
  ],
  Barbershops: [
    { id: 'hiring_now', label: 'Hiring Now' },
    { id: 'booth_rent', label: 'Booth Rent' },
    { id: 'commission', label: 'Commission' },
    { id: 'rating_4.5', label: '4.5+ Stars' },
  ],
  Schools: [
    { id: 'school_city_houston', label: 'In Houston' },
    { id: 'school_accredited', label: 'Accredited' },
    { id: 'school_high_pass_rate', label: '80%+ Pass Rate' },
    { id: 'school_affordable', label: 'Under $10k Tuition' },
    { id: 'rating_4.5', label: '4.5+ Stars' },
  ],
  Barbers: [
    { id: 'barber_actively_looking', label: 'Actively Looking' },
    { id: 'barber_wants_booth', label: 'Wants Booth Rent' },
    { id: 'barber_wants_commission', label: 'Wants Commission' },
    { id: 'rating_4.5', label: '4.5+ Stars' },
  ],
  Cosmetologist: [
    { id: 'cosmet_hair', label: 'Hair Stylist' },
    { id: 'cosmet_makeup', label: 'Makeup Artist' },
    { id: 'cosmet_nails', label: 'Nail Tech' },
    { id: 'cosmet_esthetician', label: 'Esthetician' },
    { id: 'cosmet_lashes', label: 'Lash Artist' },
    { id: 'rating_4.5', label: '4.5+ Stars' },
  ],
  Salons: [
    { id: 'rating_4.5', label: '4.5+ Stars' },
    { id: 'salon_100_reviews', label: '100+ Reviews' },
  ],
  Stores: [
    { id: 'rating_4.5', label: '4.5+ Stars' },
    { id: 'store_budget', label: 'Budget-Friendly' },
    { id: 'store_moderate', label: 'Mid-Range' },
  ],
};

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Number(searchParams.get("p")) || 1);
  const [filterTab, setFilterTab] = useState(searchParams.get("tab") || "All");
  const [activeFilters, setActiveFilters] = useState<string[]>(searchParams.get("filters") ? searchParams.get("filters")!.split(',') : []);
  const [isLoading, setIsLoading] = useState(false);
  const [showMoreTabs, setShowMoreTabs] = useState(false);
  
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

  const sendChatMessage = async (messageText: string) => {
    const trimmed = messageText.trim();
    if (!trimmed || isAiLoading) return;

    const newMsg = { role: 'user', content: trimmed };
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
          (window as any).innerG.track('ai_chat_message_sent', { query_length: trimmed.length });
        }
      }
    } catch (err) {
      setChatMessages([...newHistory, { role: 'model', content: 'Connection error.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChatMessage(chatInput);
  };

  const handleTabClick = (tab: string) => {
    setFilterTab(tab);
    setPage(1);
    setShowMoreTabs(false);
    if (tab === 'AI Mode') {
      if ((window as any).innerG?.track) {
        (window as any).innerG.track('ai_mode_activated');
      }
      // Carry the in-progress search query into AI Mode so the user can pick
      // up their research immediately instead of retyping it — but only when
      // starting a fresh chat, so switching tabs away and back doesn't
      // re-send/duplicate an already-ongoing conversation.
      if (query.trim().length > 0 && chatMessages.length === 0) {
        sendChatMessage(query);
      }
    }
  };

  useEffect(() => {
    // `ignore` guards against a stale in-flight search resolving after the
    // query has since changed (e.g. cleared) — without it, clearTimeout only
    // cancels a search that hasn't fired yet; once searchBarbershops() has
    // actually been called, its .then() would still land later and overwrite
    // the cleared results, making the screen look like it "snaps back" to a
    // results page on its own.
    let ignore = false;

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
          if (!ignore) {
            setResults(parsed.results);
            setTotal(parsed.total);
          }
          return;
        }

        setIsLoading(true);

        searchBarbershops(query, page, filterTab, activeFilters).then(res => {
          if (ignore) return;
          if (res.success && res.data) {
            setResults(res.data.results || []);
            setTotal(res.data.total || 0);
            sessionStorage.setItem(cacheKey, JSON.stringify({ results: res.data.results, total: res.data.total }));
          }
        }).finally(() => {
          if (!ignore) setIsLoading(false);
        });
      } else {
        setResults([]);
        setTotal(0);
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(delayDebounceFn);
    };
  }, [query, page, filterTab, activeFilters]);

  // Renders AI Mode responses with markdown-style [label](url) links turned
  // into real clickable links (relative paths use Next's client-side Link,
  // absolute URLs open in a new tab) and **bold** turned into <strong>.
  // Getting users to click through into our own tools from chat is the
  // whole point of grounding the model in tool URLs, so this can't just be
  // plain text.
  const renderChatContent = (content: string, keyPrefix: string) => {
    const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = pattern.exec(content)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(content.slice(lastIndex, match.index));
      }

      if (match[1] !== undefined) {
        const label = match[1];
        const url = match[2];
        const isExternal = /^https?:\/\//i.test(url);
        const linkClasses = "inline-flex items-center gap-0.5 text-blue-600 font-semibold underline decoration-blue-300 underline-offset-2 hover:text-blue-800 hover:decoration-blue-500 transition-colors";
        nodes.push(
          isExternal ? (
            <a key={`${keyPrefix}-${idx++}`} href={url} target="_blank" rel="noopener noreferrer" className={linkClasses}>
              {label}
              <ArrowUpRight className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <Link key={`${keyPrefix}-${idx++}`} href={url} className={linkClasses}>
              {label}
              <ArrowUpRight className="w-3 h-3 shrink-0" />
            </Link>
          )
        );
      } else if (match[3] !== undefined) {
        nodes.push(<strong key={`${keyPrefix}-${idx++}`}>{match[3]}</strong>);
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < content.length) {
      nodes.push(content.slice(lastIndex));
    }

    return nodes;
  };

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
                    placeholder="Search shops, barbers & more"
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
                    onClick={() => { setQuery("Open booth stations in Houston barbershops"); setPage(1); }}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <Search className="h-3 w-3 inline-block mr-1.5 opacity-50" />
                    Open booth stations in Houston barbershops
                  </button>
                  <button
                    onClick={() => { setQuery("Barbers in Houston looking for chairs"); setPage(1); }}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <Search className="h-3 w-3 inline-block mr-1.5 opacity-50" />
                    Barbers in Houston looking for chairs
                  </button>
                  <button
                    onClick={() => {
                      setQuery("Barber schools in Houston with the best pass rates");
                      setFilterTab("Schools");
                      setActiveFilters(["school_high_pass_rate", "school_city_houston"]);
                      setPage(1);
                    }}
                    className="px-4 py-1.5 rounded-full text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <Search className="h-3 w-3 inline-block mr-1.5 opacity-50" />
                    Best barber schools in Houston by Pass Rate
                  </button>
                </div>
              )}
            </>
          )}

          {/* Filter Tabs */}
          {(query.trim().length >= 2 || results.length > 0 || filterTab === 'AI Mode') && (
            <div className="flex flex-col gap-3 mt-6">
              {/* Category Tabs — Desktop: full horizontal-scroll list */}
              <div className="hidden sm:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                {ALL_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
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

              {/* Category Tabs — Mobile: primary tabs + "More" dropdown for the rest */}
              <div className="flex sm:hidden items-center gap-2 px-2 relative">
                {PRIMARY_MOBILE_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabClick(tab)}
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

                {/* If the active tab isn't one of the pinned primaries, show it too so selection stays visible */}
                {!PRIMARY_MOBILE_TABS.includes(filterTab) && (
                  <button
                    onClick={() => setShowMoreTabs((v) => !v)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border bg-blue-50 border-blue-200 text-blue-700 shrink-0"
                  >
                    {filterTab}
                  </button>
                )}

                <button
                  onClick={() => setShowMoreTabs((v) => !v)}
                  className="ml-auto shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  More
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showMoreTabs ? 'rotate-180' : ''}`} />
                </button>

                {showMoreTabs && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMoreTabs(false)} />
                    <div className="absolute top-full right-0 mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-2 w-52 max-h-80 overflow-y-auto">
                      {ALL_TABS.filter((tab) => !PRIMARY_MOBILE_TABS.includes(tab)).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            setFilterTab(tab);
                            setPage(1);
                            setShowMoreTabs(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                            filterTab === tab ? 'text-blue-700 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Faceted Filters (Intent Tags) — each tab surfaces the facets that
                  actually matter for that entity type, since a barbershop's
                  "Booth Rent" filter means nothing on the Schools tab. */}
              {FILTERS_BY_TAB[filterTab] && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Filters:</span>
                  {FILTERS_BY_TAB[filterTab].map((filter) => {
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
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm'}`}>
                      {msg.role === 'user' ? msg.content : renderChatContent(msg.content, `msg-${i}`)}
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
              const barberPhoto = item.booksy_photo_url || item.passport_image_url;
              const barberHref = `/barbers/${item.id}`;
              return (
                <div key={`barber-${item.id}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {barberPhoto ? (
                    <Link href={barberHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={barberPhoto} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  ) : (
                    <Link href={barberHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group/thumbnail">
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
                    <Link href={barberHref} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-0.5 truncate">
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
                      {item.booksy_rating && (
                        <>
                          <span className="mx-1.5 opacity-50">·</span>
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            {Number(item.booksy_rating).toFixed(1)}
                            {item.booksy_review_count ? ` (${item.booksy_review_count})` : ''}
                          </span>
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

            if (item.resultType === 'school') {
              const schoolPhoto = Array.isArray(item.google_photos) ? item.google_photos[0] : null;
              const schoolHref = `/schools/${item.id}`;
              return (
                <div key={`school-${item.id}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {schoolPhoto ? (
                    <Link href={schoolHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={schoolPhoto} alt={item.school_name} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  ) : (
                    <Link href={schoolHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group/thumbnail">
                      <GraduationCap className="h-8 w-8 text-slate-400 transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">

                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <GraduationCap className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">barberbeauty.net › schools › {(item.city || 'texas').toLowerCase().replace(/\s+/g, '-')}</span>
                    </div>

                    {/* Prominent Title Link */}
                    <Link href={schoolHref} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-0.5 truncate">
                      {item.school_name || "Barber School"}
                    </Link>

                    {/* Category & Location Snippet */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1.5 flex-wrap">
                      <span className="truncate max-w-[180px] sm:max-w-xs">{item.school_category || item.accreditation_status || 'Barber School'}</span>
                      {item.city && (
                        <>
                          <span className="mx-1.5 opacity-50">·</span>
                          <span className="truncate max-w-[180px] sm:max-w-xs">{item.city}</span>
                        </>
                      )}
                      {item.rating && (
                        <>
                          <span className="mx-1.5 opacity-50">·</span>
                          <span className="flex items-center gap-1 text-amber-600 font-medium">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            {Number(item.rating).toFixed(1)}
                            {item.google_review_count ? ` (${item.google_review_count})` : ''}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Details Snippet */}
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {item.written_pass_rate_2026 != null ? (
                        <span className="font-medium text-green-700 mr-1">
                          {Math.round(item.written_pass_rate_2026 * 100)}% 2026 Written Pass Rate
                          {item.practical_pass_rate_2026 != null ? ` · ${Math.round(item.practical_pass_rate_2026 * 100)}% Practical` : ''}.
                        </span>
                      ) : item.practical_pass_rate_2026 != null ? (
                        <span className="font-medium text-green-700 mr-1">
                          {Math.round(item.practical_pass_rate_2026 * 100)}% 2026 Practical Pass Rate.
                        </span>
                      ) : item.state_pass_rate ? (
                        <span className="font-medium text-green-700 mr-1">{item.state_pass_rate} State Board Pass Rate.</span>
                      ) : null}
                      {item.annual_tuition ? `Tuition ~$${Number(item.annual_tuition).toLocaleString()}. ` : ''}
                      {item.school_category || 'Barber/cosmetology school'}{item.city ? ` in ${item.city}` : ''}.
                    </p>
                  </div>
                </div>
              );
            }

            if (item.resultType === 'store') {
              const storePhoto = Array.isArray(item.google_images) ? item.google_images[0] : null;
              const storeHref = `/stores/${item.id}`;
              const isBeautyStore = item.store_type === 'beauty_supply';
              return (
                <div key={`store-${item.id}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {storePhoto ? (
                    <Link href={storeHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={storePhoto} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  ) : (
                    <Link href={storeHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group/thumbnail">
                      <Store className="h-8 w-8 text-slate-400 transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">

                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <Store className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">barberbeauty.net › stores › {(item.city || 'houston').toLowerCase().replace(/\s+/g, '-')}</span>
                    </div>

                    {/* Prominent Title Link */}
                    <Link href={storeHref} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-0.5 truncate">
                      {item.name || (isBeautyStore ? "Beauty Supply Store" : "Barber Supply Store")}
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
                      {isBeautyStore
                        ? `Beauty supply store offering hair care products, wigs, extensions, and styling supplies${item.city ? ` in ${item.city}` : ''}.`
                        : `Barber supply store offering clippers, shears, chemicals, and professional grooming products${item.city ? ` in ${item.city}` : ''}.`}
                    </p>
                  </div>
                </div>
              );
            }

            if (item.resultType === 'salon') {
              const salonPhoto = Array.isArray(item.google_images) ? item.google_images[0] : null;
              const salonHref = `/salons/${item.id}`;
              return (
                <div key={`salon-${item.id}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {salonPhoto ? (
                    <Link href={salonHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={salonPhoto} alt={item.shop_name} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  ) : (
                    <Link href={salonHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group/thumbnail">
                      <Users className="h-8 w-8 text-slate-400 transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">

                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <Users className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">barberbeauty.net › salons › {(item.city || 'houston').toLowerCase().replace(/\s+/g, '-')}</span>
                    </div>

                    {/* Prominent Title Link */}
                    <Link href={salonHref} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-0.5 truncate">
                      {item.shop_name || "Hair & Beauty Salon"}
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
                      Hair & beauty salon{item.city ? ` in ${item.city}` : ''}.
                    </p>
                  </div>
                </div>
              );
            }

            if (item.resultType === 'cosmetologist') {
              const cosmetPhoto = item.booksy_photo_url || (Array.isArray(item.booksy_gallery_urls) ? item.booksy_gallery_urls[0] : null);
              const cosmetHref = `/cosmetologists/${item.id}`;
              return (
                <div key={`cosmetologist-${item.id}`} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-row gap-4 sm:gap-5 relative group/webcard">
                  {cosmetPhoto ? (
                    <Link href={cosmetHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative block group/thumbnail">
                      <img src={cosmetPhoto} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  ) : (
                    <Link href={cosmetHref} className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full overflow-hidden bg-slate-100 border border-slate-200 relative flex items-center justify-center group/thumbnail">
                      <Users className="h-8 w-8 text-slate-400 transition-transform duration-500 group-hover/thumbnail:scale-105" />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">

                    {/* Breadcrumb (Google Style) */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 mb-1 truncate">
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <Users className="h-3 w-3 text-slate-500" />
                      </div>
                      <span className="truncate opacity-80">barberbeauty.net › cosmetologists › {(item.metro_area || 'houston').toLowerCase().replace(/\s+/g, '-')}</span>
                    </div>

                    {/* Prominent Title Link */}
                    <Link href={cosmetHref} className="text-[17px] sm:text-[20px] font-medium text-[#1a0dab] hover:underline block leading-tight mb-0.5 truncate">
                      {item.name || "Beauty Professional"}
                    </Link>

                    {/* Rating & Location Snippet */}
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-1.5 flex-wrap">
                      {item.booksy_rating && (
                        <span className="flex items-center text-[13px]">
                          <span className="font-medium text-slate-700 mr-1">{Number(item.booksy_rating).toFixed(1)}</span>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="ml-1 opacity-80">({item.booksy_review_count || 0})</span>
                          <span className="mx-1.5 opacity-50">·</span>
                        </span>
                      )}
                      <span className="truncate max-w-[180px] sm:max-w-xs">{item.address || item.metro_area}</span>
                    </div>

                    {/* Details Snippet */}
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {item.booksy_price_range ? `${item.booksy_price_range}. ` : ''}
                      Beauty professional{item.metro_area ? ` in ${item.metro_area}` : ''}.
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
