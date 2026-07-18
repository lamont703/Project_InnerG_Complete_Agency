"use client"

import React, { useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

const DynamicRadarMap = dynamic(() => import('@/app/tools/foot-traffic-radar/RadarMapLayer'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-400">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
      <p>Loading Map Engine...</p>
    </div>
  )
});

export default function MarketAnalysisMap({ shopData }: { shopData: any }) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_API_KEY;
  
  const targetLat = shopData.latitude ? parseFloat(shopData.latitude) : 29.552846;
  const targetLng = shopData.longitude ? parseFloat(shopData.longitude) : -95.1190174;

  const [viewState, setViewState] = useState({
    latitude: targetLat,
    longitude: targetLng,
    zoom: 14,
    pitch: 45,
    bearing: 0
  });

  return (
    <div className="w-full h-full absolute inset-0 rounded-2xl overflow-hidden">
      {mapboxToken ? (
        <DynamicRadarMap
          viewState={viewState}
          setViewState={setViewState}
          targetLat={targetLat}
          targetLng={targetLng}
          mapboxToken={mapboxToken}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
          <MapPin className="h-8 w-8 mb-2 opacity-50" />
          <p>Mapbox Token Required</p>
        </div>
      )}
    </div>
  );
}
