"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { ArrowLeft, Scissors, Building2, Users, GraduationCap, UserCheck, Search, MapPin, ShoppingBag } from "lucide-react";

type LayerKey = "shop" | "barberSchool" | "cosmetologySchool" | "barber" | "cosmetologist" | "salon" | "supplyStore";

// Tailwind class names are written out in full here (not built via string
// interpolation like `bg-${color}-600`) because Tailwind's static analysis
// needs to see the literal class name somewhere in the source to include it
// in the production build — a dynamically-constructed class name would
// silently render unstyled.
const LAYER_CONFIG: Record<LayerKey, {
  label: string;
  icon: any;
  pinBg: string;
  pinBgActive: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dot: string;
}> = {
  shop: { label: "Barbershops", icon: Scissors, pinBg: "bg-blue-600", pinBgActive: "bg-blue-800", ring: "ring-blue-500/30", badgeBg: "bg-blue-50", badgeText: "text-blue-600", badgeBorder: "border-blue-100", dot: "bg-blue-600" },
  barberSchool: { label: "Barber Schools", icon: GraduationCap, pinBg: "bg-red-600", pinBgActive: "bg-red-800", ring: "ring-red-500/30", badgeBg: "bg-red-50", badgeText: "text-red-500", badgeBorder: "border-red-100", dot: "bg-red-600" },
  cosmetologySchool: { label: "Cosmetology Schools", icon: GraduationCap, pinBg: "bg-purple-600", pinBgActive: "bg-purple-800", ring: "ring-purple-500/30", badgeBg: "bg-purple-50", badgeText: "text-purple-600", badgeBorder: "border-purple-100", dot: "bg-purple-600" },
  barber: { label: "Barbers", icon: UserCheck, pinBg: "bg-green-500", pinBgActive: "bg-green-700", ring: "ring-green-500/30", badgeBg: "bg-green-50", badgeText: "text-green-600", badgeBorder: "border-green-100", dot: "bg-green-500" },
  cosmetologist: { label: "Cosmetologists", icon: UserCheck, pinBg: "bg-pink-500", pinBgActive: "bg-pink-700", ring: "ring-pink-500/30", badgeBg: "bg-pink-50", badgeText: "text-pink-600", badgeBorder: "border-pink-100", dot: "bg-pink-500" },
  salon: { label: "Salons", icon: Building2, pinBg: "bg-orange-500", pinBgActive: "bg-orange-700", ring: "ring-orange-500/30", badgeBg: "bg-orange-50", badgeText: "text-orange-600", badgeBorder: "border-orange-100", dot: "bg-orange-500" },
  supplyStore: { label: "Supply Stores", icon: ShoppingBag, pinBg: "bg-amber-600", pinBgActive: "bg-amber-800", ring: "ring-amber-500/30", badgeBg: "bg-amber-50", badgeText: "text-amber-600", badgeBorder: "border-amber-100", dot: "bg-amber-600" },
};

const ALL_LAYER_KEYS = Object.keys(LAYER_CONFIG) as LayerKey[];

// Barbers/cosmetologists are no longer filtered to an "interested in
// placement" subset, so most now carry an outreach-pipeline status
// (pending_outreach, contacted, etc.) rather than a placement preference —
// show that status, humanized, instead of a "Seeking Placement" badge that
// would misrepresent someone we haven't even talked to yet.
function humanizeStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface MapComponentProps {
  initialShops: any[];
  initialSchools: any[];
  initialBarbers: any[];
  initialCosmetologySchools: any[];
  initialCosmetologists: any[];
  initialSalons: any[];
  initialSupplyStores: any[];
  invitesCount?: number;
  requestsCount?: number;
  claimedShopsCount?: number;
}

export default function ShopDayMap({
  initialShops,
  initialSchools,
  initialBarbers,
  initialCosmetologySchools,
  initialCosmetologists,
  initialSalons,
  initialSupplyStores,
  invitesCount = 0,
  requestsCount = 0,
  claimedShopsCount = 0,
}: MapComponentProps) {
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleLayers, setVisibleLayers] = useState<Record<LayerKey, boolean>>(
    Object.fromEntries(ALL_LAYER_KEYS.map((k) => [k, true])) as Record<LayerKey, boolean>
  );
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const [viewState, setViewState] = useState({
    longitude: -97.7431,
    latitude: 31.2504,
    zoom: 5.5
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleLayer = (key: LayerKey) => {
    setVisibleLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllLayers = (value: boolean) => {
    setVisibleLayers(Object.fromEntries(ALL_LAYER_KEYS.map((k) => [k, value])) as Record<LayerKey, boolean>);
  };

  // Normalize every entity type into one common shape so pins, popups, and
  // the feed list can all be driven off `layerKey` + LAYER_CONFIG instead of
  // a growing pile of isSchool/isBarber-style boolean special-cases.
  const allItems = useMemo(() => {
    const shops = (initialShops || []).map((s: any) => ({
      ...s, layerKey: "shop" as LayerKey, name: s.shop_name, addr: s.formatted_address || `${s.city}, TX`,
      phone: s.phone, email: s.email, image: s.shop_image_url, rating: s.rating, total_reviews: s.total_reviews,
      profileUrl: s.shop_profile_page_url,
    }));
    const barberSchools = (initialSchools || []).map((s: any) => ({
      ...s, layerKey: "barberSchool" as LayerKey, name: s.school_name, addr: s.formatted_address || `${s.city}, TX`,
      profileUrl: `/schools/${s.id}`,
    }));
    const cosmetologySchools = (initialCosmetologySchools || []).map((s: any) => ({
      ...s, layerKey: "cosmetologySchool" as LayerKey, name: s.school_name, addr: s.formatted_address || `${s.city}, TX`,
      profileUrl: `/schools/${s.id}`,
    }));
    const barbers = (initialBarbers || []).map((b: any) => ({
      ...b, layerKey: "barber" as LayerKey, name: b.name, addr: b.address, profileUrl: `/barbers/${b.id}`,
    }));
    const cosmetologists = (initialCosmetologists || []).map((c: any) => ({
      ...c, layerKey: "cosmetologist" as LayerKey, name: c.name, addr: c.address, profileUrl: `/cosmetologists/${c.id}`,
    }));
    const salons = (initialSalons || []).map((s: any) => ({
      ...s, layerKey: "salon" as LayerKey, name: s.shop_name, addr: s.formatted_address || `${s.city}, TX`,
      phone: s.phone, email: s.email, rating: s.rating, total_reviews: s.total_reviews, profileUrl: `/salons/${s.id}`,
    }));
    const supplyStores = (initialSupplyStores || []).map((s: any) => ({
      ...s, layerKey: "supplyStore" as LayerKey, name: s.name, addr: s.formatted_address || `${s.city}, TX`,
      phone: s.phone, website: s.website, rating: s.rating, total_reviews: s.total_reviews, profileUrl: `/stores/${s.id}`,
    }));
    return [...shops, ...barberSchools, ...cosmetologySchools, ...barbers, ...cosmetologists, ...salons, ...supplyStores];
  }, [initialShops, initialSchools, initialCosmetologySchools, initialBarbers, initialCosmetologists, initialSalons, initialSupplyStores]);

  const itemsByLayer = useMemo(() => {
    const map = {} as Record<LayerKey, any[]>;
    for (const key of ALL_LAYER_KEYS) map[key] = [];
    for (const item of allItems) map[item.layerKey as LayerKey].push(item);
    return map;
  }, [allItems]);

  const displayedItems = useMemo(() => {
    let filtered = allItems.filter((item) => visibleLayers[item.layerKey as LayerKey]);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.name?.toLowerCase().includes(query) ||
        item.addr?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, allItems, visibleLayers]);

  const handleSelectResult = (result: any) => {
    setViewState({
      longitude: Number(result.longitude),
      latitude: Number(result.latitude),
      zoom: 14
    });
    setSelectedItem(result);
  };

  const pinsByLayer = useMemo(() => {
    return ALL_LAYER_KEYS.map((key) => {
      if (!visibleLayers[key]) return null;
      const cfg = LAYER_CONFIG[key];
      return itemsByLayer[key].map((item, index) => (
        <Marker
          key={`${key}-${item.id || index}`}
          longitude={Number(item.longitude)}
          latitude={Number(item.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedItem(item);
          }}
        >
          <div className="cursor-pointer transform hover:scale-110 transition-transform duration-200 z-20">
            <div className={`w-9 h-9 ${selectedItem?.id === item.id && selectedItem?.layerKey === key ? `${cfg.pinBgActive} scale-110 ring-4 ${cfg.ring}` : cfg.pinBg} rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all`}>
              <cfg.icon className="w-4 h-4 text-white" />
            </div>
          </div>
        </Marker>
      ));
    });
  }, [itemsByLayer, visibleLayers, selectedItem]);

  // Scroll to selected item in feed when pin is clicked on map
  useEffect(() => {
    if (selectedItem && scrollRef.current) {
      const el = document.getElementById(`feed-item-${selectedItem.layerKey}-${selectedItem.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedItem]);

  const totalVisible = ALL_LAYER_KEYS.reduce((sum, k) => sum + (visibleLayers[k] ? itemsByLayer[k].length : 0), 0);

  return (
    <div className="flex flex-col lg:flex-row-reverse h-screen w-full overflow-hidden bg-slate-50 relative">

      {/* RIGHT PANEL: FEED */}
      <div className={`w-full lg:w-[400px] xl:w-[460px] flex flex-col h-full bg-white border-l border-slate-200 shadow-2xl z-20 shrink-0 ${mobileView === 'map' ? 'hidden lg:flex' : 'flex'}`}>

        {/* Sidebar Header & Search */}
        <div className="p-4 border-b border-slate-100 shrink-0 space-y-4 shadow-sm z-10 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/barber-beauty-network"
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Shop Day Network</h1>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1.5">
                  {totalVisible} shown of {allItems.length} total
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span className="shrink-0 bg-blue-50 text-blue-700 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-lg border border-blue-100">
              {invitesCount} Invites
            </span>
            <span className="shrink-0 bg-purple-50 text-purple-700 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-lg border border-purple-100">
              {requestsCount} Requests
            </span>
            <span className="shrink-0 bg-green-50 text-green-700 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1.5 rounded-lg border border-green-100">
              {claimedShopsCount} Claimed
            </span>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 block pl-10 p-3 transition-all"
              placeholder="Search by name, address, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            )}
          </div>

          {/* Layer Key / Legend — each type toggles independently rather than
              a single-select tab, so any combination can be viewed together. */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map Key</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setAllLayers(true)} className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800">All</button>
                <span className="text-slate-300">·</span>
                <button onClick={() => setAllLayers(false)} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">None</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_LAYER_KEYS.map((key) => {
                const cfg = LAYER_CONFIG[key];
                const count = itemsByLayer[key].length;
                const active = visibleLayers[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggleLayer(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-400 border-slate-200"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${active ? cfg.dot : "bg-slate-300"}`} />
                    {cfg.label}
                    <span className={active ? "text-white/60" : "text-slate-300"}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable Feed List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
          {displayedItems.length === 0 ? (
             <div className="text-center py-10">
               <p className="text-slate-500 text-sm font-medium">
                 {searchQuery ? `No results found for "${searchQuery}"` : "No layers selected — toggle one above to see results"}
               </p>
             </div>
          ) : (
            displayedItems.map((item: any, idx: number) => {
              const cfg = LAYER_CONFIG[item.layerKey as LayerKey];
              const isSelected = selectedItem?.id === item.id && selectedItem?.layerKey === item.layerKey;
              const isSchoolType = item.layerKey === "barberSchool" || item.layerKey === "cosmetologySchool";
              const isProType = item.layerKey === "barber" || item.layerKey === "cosmetologist";
              const isVenueType = item.layerKey === "shop" || item.layerKey === "salon";

              return (
                <button
                  key={`${item.layerKey}-${item.id || idx}`}
                  id={`feed-item-${item.layerKey}-${item.id}`}
                  onClick={() => handleSelectResult(item)}
                  className={`w-full text-left rounded-2xl border transition-all overflow-hidden ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-300 shadow-md ring-1 ring-blue-500/20 transform scale-[1.01]'
                      : 'bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md hover:scale-[1.01]'
                  }`}
                >
                  {/* Real Estate Style Image Banner */}
                  {item.image && (
                    <div className="w-full h-40 bg-slate-100 relative">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                      <div className="absolute top-3 left-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${cfg.pinBg} text-white`}>
                          <cfg.icon className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {!item.image && (
                        <div className={`mt-0.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}>
                          <cfg.icon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`text-[15px] font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                          {item.name}
                        </h4>
                      </div>
                      <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder}`}>
                        {cfg.label.replace(/s$/, "")}
                      </span>

                      <div className="flex items-start gap-1 mt-1.5 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span className="line-clamp-2 leading-tight">{item.addr}</span>
                      </div>

                      {item.rating && (
                        <div className="flex items-center gap-1 mt-1">
                           <span className="text-yellow-400 font-bold text-sm">★</span>
                           <span className="text-sm font-bold text-slate-700">{item.rating}</span>
                           {item.total_reviews && (
                             <span className="text-xs text-slate-500">({item.total_reviews} reviews)</span>
                           )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {isSchoolType ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {item.accreditation_status || "Validated School"}
                          </span>
                        ) : isProType ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {item.desired_pay_structure || humanizeStatus(item.status) || "Barber Professional"}
                          </span>
                        ) : isVenueType ? (
                          <>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {item.rent_type || "Booth Rent"}
                            </span>
                            {item.booth_count_available > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                                {item.booth_count_available} {item.booth_count_available === 1 ? 'Chair' : 'Chairs'} Available
                              </span>
                            )}
                            {item.hiring_need && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                                Actively Hiring
                              </span>
                            )}
                          </>
                        ) : null}
                        {(item.phone || item.email || item.website || item.profileUrl) && (
                          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 w-full pt-3 border-t border-slate-100/60">
                            <div className="flex gap-2">
                              {item.phone && (
                                <a
                                  href={`tel:${item.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-[11px] font-bold uppercase tracking-wider border border-blue-200"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                  Call
                                </a>
                              )}
                              {item.email && (
                                <a
                                  href={`mailto:${item.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-[11px] font-bold uppercase tracking-wider border border-slate-200"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                  Email
                                </a>
                              )}
                              {!item.phone && !item.email && item.website && (
                                <a
                                  href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-[11px] font-bold uppercase tracking-wider border border-slate-200"
                                >
                                  Website
                                </a>
                              )}
                            </div>
                            {item.profileUrl && (
                              <a
                                href={item.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors text-[11px] font-bold uppercase tracking-wider shadow-sm ml-auto"
                              >
                                View Profile
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: MAP */}
      <div className={`flex-1 h-full relative z-10 bg-slate-200 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
          style={{ width: "100%", height: "100%" }}
        >
          <FullscreenControl position="bottom-right" />
          <NavigationControl position="bottom-right" />

          {pinsByLayer}

          {selectedItem && (() => {
            const cfg = LAYER_CONFIG[selectedItem.layerKey as LayerKey];
            const isSchoolType = selectedItem.layerKey === "barberSchool" || selectedItem.layerKey === "cosmetologySchool";
            const isProType = selectedItem.layerKey === "barber" || selectedItem.layerKey === "cosmetologist";
            const isVenueType = selectedItem.layerKey === "shop" || selectedItem.layerKey === "salon";

            return (
              <Popup
                anchor="bottom"
                longitude={Number(selectedItem.longitude)}
                latitude={Number(selectedItem.latitude)}
                offset={24}
                onClose={() => setSelectedItem(null)}
                closeOnClick={false}
                className="rounded-2xl overflow-hidden shadow-2xl z-50"
                maxWidth="320px"
              >
                <div className="p-1 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 mb-1 leading-tight">
                      {selectedItem.name}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium line-clamp-2">
                      {selectedItem.addr}
                    </p>
                  </div>

                  {isSchoolType ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`${cfg.badgeBg} p-3 rounded-xl border ${cfg.badgeBorder} col-span-2`}>
                        <div className={`flex items-center gap-1.5 ${cfg.badgeText} mb-1`}>
                          <cfg.icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Institution</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedItem.accreditation_status || cfg.label.replace(/s$/, "")}
                        </p>
                      </div>
                    </div>
                  ) : isProType ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`${cfg.badgeBg} p-3 rounded-xl border ${cfg.badgeBorder} col-span-2`}>
                        <div className={`flex items-center gap-1.5 ${cfg.badgeText} mb-1`}>
                          <cfg.icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {selectedItem.desired_pay_structure ? "Desired Structure" : "Status"}
                          </span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedItem.desired_pay_structure || humanizeStatus(selectedItem.status) || "Open to Options"}
                        </p>
                      </div>
                    </div>
                  ) : isVenueType ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Building2 className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Type</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedItem.rent_type || "Booth Rent"}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                          <Users className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Chairs</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedItem.booth_count_available || 0} Open
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`${cfg.badgeBg} p-3 rounded-xl border ${cfg.badgeBorder} col-span-2`}>
                        <div className={`flex items-center gap-1.5 ${cfg.badgeText} mb-1`}>
                          <cfg.icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Retail Partner</span>
                        </div>
                        <p className="font-bold text-slate-800 text-sm">
                          {selectedItem.rating ? `★ ${selectedItem.rating} (${selectedItem.total_reviews || 0} reviews)` : "Supply Store"}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedItem.profileUrl && (
                    <a
                      href={selectedItem.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors text-xs font-bold uppercase tracking-wider shadow-sm w-full"
                    >
                      View Profile
                    </a>
                  )}
                </div>
              </Popup>
            );
          })()}
        </Map>
      </div>

      {/* MOBILE TOGGLE BUTTON */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
        <button
          onClick={() => setMobileView(mobileView === 'map' ? 'list' : 'map')}
          className="bg-slate-900 text-white hover:bg-slate-800 shadow-2xl px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 transition-all ring-4 ring-slate-900/10"
        >
          {mobileView === 'map' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              Show List
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Show Map
            </>
          )}
        </button>
      </div>
    </div>
  );
}
