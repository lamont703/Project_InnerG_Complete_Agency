"use client";

import React, { useState, useEffect, useMemo } from "react";
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
// Browser client import removed as data is now fetched server-side
import Link from "next/link";
import { ArrowLeft, Scissors, Building, Users, GraduationCap } from "lucide-react";

export default function ShopDayMap({ initialShops, initialSchools }: { initialShops: any[], initialSchools: any[] }) {
  const shops = initialShops || [];
  const schools = initialSchools || [];
  const loading = false;
  const [selectedShop, setSelectedShop] = useState<any | null>(null);

  // Default viewport focusing on Texas
  const [viewState, setViewState] = useState({
    longitude: -97.7431, // Austin TX roughly center
    latitude: 31.2504,
    zoom: 5.5
  });

  // Server-side props have replaced the client-side fetch

  const schoolPins = useMemo(
    () =>
      schools.map((school, index) => (
        <Marker
          key={`school-${school.id || index}`}
          longitude={school.longitude}
          latitude={school.latitude}
          anchor="bottom"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...school, isSchool: true });
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

  const pins = useMemo(
    () =>
      shops.map((shop, index) => (
        <Marker
          key={`marker-${shop.id || index}`}
          longitude={shop.longitude}
          latitude={shop.latitude}
          anchor="bottom"
          onClick={(e) => {
            // If we let the click event propagates to the map, it will immediately close the popup
            // with `closeOnClick: true`
            e.originalEvent.stopPropagation();
            setSelectedShop({ ...shop, isSchool: false });
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

      <div className="absolute top-6 right-6 z-10">
         <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-xl shadow-lg border border-slate-200">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Shop Day Map</h1>
            <p className="text-slate-500 text-sm font-medium">
              {loading ? "Loading locations..." : `${shops.length} Shops & ${schools.length} Schools`}
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
                  {selectedShop.isSchool ? selectedShop.school_name : selectedShop.shop_name}
                </h3>
                <p className="text-slate-500 text-xs font-medium line-clamp-2">
                  {selectedShop.formatted_address || `${selectedShop.city}, TX`}
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
