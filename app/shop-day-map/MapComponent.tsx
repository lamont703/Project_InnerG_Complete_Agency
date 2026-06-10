"use client";

import React, { useState, useEffect, useMemo } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
// Browser client import removed as data is now fetched server-side
import Link from "next/link";
import { ArrowLeft, Scissors, Building, Users, GraduationCap, UserCheck, Search, MapPin } from "lucide-react";

export default function ShopDayMap({ initialShops, initialSchools, initialBarbers, invitesCount = 0, requestsCount = 0, claimedShopsCount = 0 }: { initialShops: any[], initialSchools: any[], initialBarbers: any[], invitesCount?: number, requestsCount?: number, claimedShopsCount?: number }) {
  const shops = initialShops || [];
  const schools = initialSchools || [];
  const barbers = initialBarbers || [];
  const loading = false;
  const [selectedShop, setSelectedShop] = useState<any | null>(null);

  // Default viewport focusing on Texas
  const [viewState, setViewState] = useState({
    longitude: -97.7431, // Austin TX roughly center
    latitude: 31.2504,
    zoom: 5.5
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    
    const matchedShops = shops.filter((s: any) => 
      s.shop_name?.toLowerCase().includes(query) || 
      s.formatted_address?.toLowerCase().includes(query) ||
      s.city?.toLowerCase().includes(query)
    ).map((s: any) => ({ ...s, isSchool: false, isBarber: false, type: 'Shop', name: s.shop_name, addr: s.formatted_address || `${s.city}, TX` }));

    const matchedSchools = schools.filter((s: any) => 
      s.school_name?.toLowerCase().includes(query) || 
      s.formatted_address?.toLowerCase().includes(query) ||
      s.city?.toLowerCase().includes(query)
    ).map((s: any) => ({ ...s, isSchool: true, isBarber: false, type: 'School', name: s.school_name, addr: s.formatted_address || `${s.city}, TX` }));

    const matchedBarbers = barbers.filter((b: any) => 
      b.name?.toLowerCase().includes(query) || 
      b.address?.toLowerCase().includes(query)
    ).map((b: any) => ({ ...b, isSchool: false, isBarber: true, type: 'Barber', name: b.name, addr: b.address }));

    return [...matchedShops, ...matchedSchools, ...matchedBarbers].slice(0, 8);
  }, [searchQuery, shops, schools, barbers]);

  const handleSelectResult = (result: any) => {
    setViewState({
      longitude: Number(result.longitude),
      latitude: Number(result.latitude),
      zoom: 14
    });
    setSelectedShop(result);
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const schoolPins = useMemo(
    () =>
      schools.map((school, index) => (
        <Marker
          key={`school-${school.id || index}`}
          longitude={Number(school.longitude)}
          latitude={Number(school.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...school, isSchool: true, isBarber: false });
          }}
        >
          <div className="cursor-pointer transform hover:scale-110 transition-transform duration-200 z-20">
            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
          </div>
        </Marker>
      )),
    [schools]
  );

  const barberPins = useMemo(
    () =>
      barbers.map((barber, index) => (
        <Marker
          key={`barber-${barber.id || index}`}
          longitude={Number(barber.longitude)}
          latitude={Number(barber.latitude)}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...barber, isSchool: false, isBarber: true });
          }}
        >
          <div className="cursor-pointer transform hover:scale-110 transition-transform duration-200 z-20">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
          </div>
        </Marker>
      )),
    [barbers]
  );

  const pins = useMemo(
    () =>
      shops.map((shop, index) => (
        <Marker
          key={`marker-${shop.id || index}`}
          longitude={Number(shop.longitude)}
          latitude={Number(shop.latitude)}
          anchor="bottom"
          onClick={(e) => {
            // If we let the click event propagates to the map, it will immediately close the popup
            // with `closeOnClick: true`
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...shop, isSchool: false, isBarber: false });
          }}
        >
          <div className="cursor-pointer transform hover:scale-110 transition-transform duration-200 z-10">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <Scissors className="w-5 h-5 text-white" />
            </div>
          </div>
        </Marker>
      )),
    [shops]
  );

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50 relative">
      <div className="absolute top-6 left-6 z-10 flex gap-4">
        <Link 
          href="/barber-beauty-network"
          className="bg-white/90 backdrop-blur-md px-4 py-3 rounded-xl shadow-lg border border-slate-200 text-slate-800 font-bold text-sm flex items-center gap-2 hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Network
        </Link>
      </div>

      {/* Floating Smart Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 w-[400px] max-w-[90vw]">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="w-full bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-900 text-sm rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 block pl-12 p-4 shadow-xl transition-all"
            placeholder="Search by name, city, or address..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery("");
                setIsDropdownOpen(false);
              }}
              className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600"
            >
              <span className="text-xl leading-none">&times;</span>
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div className="absolute w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
            <ul className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {searchResults.map((result: any, idx) => (
                <li key={`search-res-${idx}`}>
                  <button
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl transition-colors flex items-start gap-3"
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${result.isSchool ? 'bg-red-100 text-red-600' : result.isBarber ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {result.isSchool ? <GraduationCap className="w-4 h-4" /> : result.isBarber ? <UserCheck className="w-4 h-4" /> : <Scissors className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 truncate">{result.name}</h4>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{result.addr}</span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {isDropdownOpen && searchQuery && searchResults.length === 0 && (
          <div className="absolute w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-center z-50">
            <p className="text-slate-500 text-sm font-medium">No locations found for "{searchQuery}"</p>
          </div>
        )}
      </div>

      <div className="absolute top-6 right-6 z-10 hidden lg:block">
         <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-slate-200">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Shop Day Map</h1>
            <p className="text-slate-500 text-sm font-medium">
              {loading ? "Loading locations..." : `${shops.length} Shops, ${schools.length} Schools, ${barbers.length} Barbers | ${invitesCount} Invites, ${requestsCount} Requests, ${claimedShopsCount} Claimed Shops`}
            </p>
         </div>
      </div>

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
            anchor="top"
            longitude={Number(selectedShop.longitude)}
            latitude={Number(selectedShop.latitude)}
            onClose={() => setSelectedShop(null)}
            closeOnClick={false}
            className="rounded-2xl overflow-hidden shadow-2xl"
            maxWidth="320px"
          >
            <div className="p-1 space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 mb-1 leading-tight">
                  {selectedShop.isSchool ? selectedShop.school_name : selectedShop.isBarber ? selectedShop.name : selectedShop.shop_name}
                </h3>
                <p className="text-slate-500 text-xs font-medium line-clamp-2">
                  {selectedShop.isBarber ? selectedShop.address : (selectedShop.formatted_address || `${selectedShop.city}, TX`)}
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

              <div className="pt-2">
                {selectedShop.isSchool ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                    Validated Partner School
                  </span>
                ) : selectedShop.isBarber ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    Seeking Placement
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    selectedShop.hiring_need 
                      ? "bg-green-100 text-green-700" 
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {selectedShop.hiring_need ? "Actively Hiring" : "Not Hiring"}
                  </span>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
