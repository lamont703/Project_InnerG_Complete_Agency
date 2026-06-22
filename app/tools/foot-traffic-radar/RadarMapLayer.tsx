"use client";

import React from 'react';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Store } from "lucide-react";

export default function RadarMapLayer({ 
  viewState, 
  setViewState, 
  targetLat, 
  targetLng, 
  mapboxToken 
}: any) {
  return (
    <Map
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={mapboxToken}
    >
      <Marker latitude={targetLat} longitude={targetLng} anchor="bottom">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-2 bg-primary/20 rounded-full animate-ping"></div>
          <div className="relative h-10 w-10 bg-primary rounded-full border-4 border-white shadow-xl flex items-center justify-center">
            <Store className="h-4 w-4 text-white" />
          </div>
        </div>
      </Marker>
    </Map>
  );
}
