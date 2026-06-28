"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { ArrowLeft, Scissors, Building, Users, GraduationCap, UserCheck, Search, MapPin } from "lucide-react";

export default function ShopDayMap({ initialShops, initialSchools, initialBarbers, invitesCount = 0, requestsCount = 0, claimedShopsCount = 0 }: { initialShops: any[], initialSchools: any[], initialBarbers: any[], invitesCount?: number, requestsCount?: number, claimedShopsCount?: number }) {
  const shops = initialShops || [];
  const schools = initialSchools || [];
  const barbers = initialBarbers || [];
  
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "shops" | "schools" | "pros">("all");

  const [viewState, setViewState] = useState({
    longitude: -97.7431,
    latitude: 31.2504,
    zoom: 5.5
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Normalize all items for the unified feed
  const allItems = useMemo(() => {
    const s = shops.map((s: any) => ({ ...s, isSchool: false, isBarber: false, type: 'Shop', name: s.shop_name, addr: s.formatted_address || `${s.city}, TX` }));
    const sc = schools.map((s: any) => ({ ...s, isSchool: true, isBarber: false, type: 'School', name: s.school_name, addr: s.formatted_address || `${s.city}, TX` }));
    const b = barbers.map((b: any) => ({ ...b, isSchool: false, isBarber: true, type: 'Barber', name: b.name, addr: b.address }));
    return [...s, ...sc, ...b];
  }, [shops, schools, barbers]);

  // Filter feed based on search query and active tab
  const displayedItems = useMemo(() => {
    let filtered = allItems;
    
    // Filter by tab
    if (activeTab === "shops") {
      filtered = filtered.filter(item => !item.isSchool && !item.isBarber);
    } else if (activeTab === "schools") {
      filtered = filtered.filter(item => item.isSchool);
    } else if (activeTab === "pros") {
      filtered = filtered.filter(item => item.isBarber);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(query) || 
        item.addr?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [searchQuery, allItems, activeTab]);

  const handleSelectResult = (result: any) => {
    setViewState({
      longitude: Number(result.longitude),
      latitude: Number(result.latitude),
      zoom: 14
    });
    setSelectedShop(result);
  };

  const schoolPins = useMemo(
    () => {
      if (activeTab !== "all" && activeTab !== "schools") return null;
      return schools.map((school, index) => (
        <Marker
          key={`school-${school.id || index}`}
          longitude={Number(school.longitude)}
          latitude={Number(school.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...school, isSchool: true, isBarber: false, name: school.school_name, addr: school.formatted_address || `${school.city}, TX` });
          }}
        >
          <div className="cursor-pointer transform hover:scale-110 transition-transform duration-200 z-20">
            <div className={`w-10 h-10 ${selectedShop?.id === school.id ? 'bg-red-800 scale-110 ring-4 ring-red-500/30' : 'bg-red-600'} rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all`}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
          </div>
        </Marker>
      ));
    },
    [schools, selectedShop, activeTab]
  );

  const barberPins = useMemo(
    () => {
      if (activeTab !== "all" && activeTab !== "pros") return null;
      return barbers.map((barber, index) => (
        <Marker
          key={`barber-${barber.id || index}`}
          longitude={Number(barber.longitude)}
          latitude={Number(barber.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...barber, isSchool: false, isBarber: true, name: barber.name, addr: barber.address });
          }}
        >
          <div className="cursor-pointer transform hover:scale-110 transition-transform duration-200 z-20">
            <div className={`w-10 h-10 ${selectedShop?.id === barber.id ? 'bg-green-700 scale-110 ring-4 ring-green-500/30' : 'bg-green-500'} rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all`}>
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          </div>
        </Marker>
      ));
    },
    [barbers, selectedShop, activeTab]
  );

  const pins = useMemo(
    () => {
      if (activeTab !== "all" && activeTab !== "shops") return null;
      return shops.map((shop, index) => (
        <Marker
          key={`marker-${shop.id || index}`}
          longitude={Number(shop.longitude)}
          latitude={Number(shop.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...shop, isSchool: false, isBarber: false, name: shop.shop_name, addr: shop.formatted_address || `${shop.city}, TX` });
          }}
        >
          <div className="cursor-pointer transform hover:scale-110 transition-transform duration-200 z-10">
            <div className={`w-10 h-10 ${selectedShop?.id === shop.id ? 'bg-blue-800 scale-110 ring-4 ring-blue-500/30' : 'bg-blue-600'} rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-all`}>
              <Scissors className="w-5 h-5 text-white" />
            </div>
          </div>
        </Marker>
      ));
    },
    [shops, selectedShop, activeTab]
  );

  // Scroll to selected item in feed when pin is clicked on map
  useEffect(() => {
    if (selectedShop && scrollRef.current) {
      const el = document.getElementById(`feed-item-${selectedShop.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedShop]);

  return (
    <div className="flex flex-col lg:flex-row-reverse h-screen w-full overflow-hidden bg-slate-50">
      
      {/* RIGHT PANEL: FEED */}
      <div className="w-full lg:w-[400px] xl:w-[460px] flex flex-col h-[50vh] lg:h-full bg-white border-l border-slate-200 shadow-2xl z-20 shrink-0">
        
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
                  {shops.length} Shops · {schools.length} Schools · {barbers.length} Pros
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

          {/* Type Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("all")}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab("shops")}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "shops" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Shops
            </button>
            <button
              onClick={() => setActiveTab("schools")}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "schools" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Schools
            </button>
            <button
              onClick={() => setActiveTab("pros")}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === "pros" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Pros
            </button>
          </div>
        </div>

        {/* Scrollable Feed List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
          {displayedItems.length === 0 ? (
             <div className="text-center py-10">
               <p className="text-slate-500 text-sm font-medium">No results found for "{searchQuery}"</p>
             </div>
          ) : (
            displayedItems.map((item: any, idx: number) => {
              const isSelected = selectedShop?.id === item.id;
              
              return (
                <button
                  key={`${item.type}-${item.id || idx}`}
                  id={`feed-item-${item.id}`}
                  onClick={() => handleSelectResult(item)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    isSelected 
                      ? 'bg-blue-50/50 border-blue-300 shadow-md ring-1 ring-blue-500/20 transform scale-[1.01]' 
                      : 'bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`mt-0.5 w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                      item.isSchool ? 'bg-red-50 text-red-600 border-red-100' : 
                      item.isBarber ? 'bg-green-50 text-green-600 border-green-100' : 
                      'bg-blue-50 text-blue-600 border-blue-100'
                    }`}>
                      {item.isSchool ? <GraduationCap className="w-5 h-5" /> : item.isBarber ? <UserCheck className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[15px] font-bold truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {item.name}
                      </h4>
                      
                      <div className="flex items-start gap-1 mt-1 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                        <span className="line-clamp-2 leading-tight">{item.addr}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.isSchool ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                            Validated School
                          </span>
                        ) : item.isBarber ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                            {item.desired_pay_structure || "Seeking Placement"}
                          </span>
                        ) : (
                          <>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {item.rent_type || "Booth Rent"}
                            </span>
                            {item.hiring_need && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                                Actively Hiring
                              </span>
                            )}
                          </>
                        )}
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
      <div className="flex-1 h-[50vh] lg:h-full relative z-10 bg-slate-200">
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_API_KEY}
          style={{ width: "100%", height: "100%" }}
        >
          <FullscreenControl position="bottom-right" />
          <NavigationControl position="bottom-right" />
          
          {pins}
          {schoolPins}
          {barberPins}

          {selectedShop && (
            <Popup
              anchor="bottom"
              longitude={Number(selectedShop.longitude)}
              latitude={Number(selectedShop.latitude)}
              offset={24}
              onClose={() => setSelectedShop(null)}
              closeOnClick={false}
              className="rounded-2xl overflow-hidden shadow-2xl z-50"
              maxWidth="320px"
            >
              <div className="p-1 space-y-4">
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 mb-1 leading-tight">
                    {selectedShop.name}
                  </h3>
                  <p className="text-slate-500 text-xs font-medium line-clamp-2">
                    {selectedShop.addr}
                  </p>
                </div>

                {selectedShop.isSchool ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 col-span-2">
                      <div className="flex items-center gap-1.5 text-red-500 mb-1">
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Institution</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {selectedShop.accreditation_status || "Barber School"}
                      </p>
                    </div>
                  </div>
                ) : selectedShop.isBarber ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 p-3 rounded-xl border border-green-100 col-span-2">
                      <div className="flex items-center gap-1.5 text-green-600 mb-1">
                        <UserCheck className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Desired Structure</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {selectedShop.desired_pay_structure || "Open to Options"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Building className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Type</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {selectedShop.rent_type || "Booth Rent"}
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Chairs</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {selectedShop.booth_count_available || 0} Open
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
