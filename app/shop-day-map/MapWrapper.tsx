"use client";

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the map component with SSR disabled.
// Mapbox-gl and react-map-gl use Web Workers and WebGL which crash Next.js SSR (especially Turbopack).
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">Loading Map Engine...</p>
      </div>
    </div>
  )
});

interface MapWrapperProps {
  initialShops: any[];
  initialSchools: any[];
  initialBarbers: any[];
}

export default function MapWrapper({ initialShops, initialSchools, initialBarbers }: MapWrapperProps) {
  return <MapComponent initialShops={initialShops} initialSchools={initialSchools} initialBarbers={initialBarbers} />;
}
